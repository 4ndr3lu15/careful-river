import { z } from 'zod';
import type { DevOverride } from './providers';

export type { DevOverride, ProviderPreset } from './providers';
export { PROVIDER_PRESETS, findPreset } from './providers';
export { buildPersonaDocs } from './persona-docs';

export interface ComposeRequest {
  prompt: string;
  bpm?: number;
  duration?: number;
  modelOverride?: string;
  /**
   * Dev-only provider/key/model override. Honored by the server only when
   * NODE_ENV !== 'production'; ignored in the production build. See
   * src/composer/providers.ts.
   */
  devOverride?: DevOverride;
  /**
   * Active persona instrument categories. The server turns these into an
   * "Active performers" instruction so the model writes a part only for the
   * live personas (keeps the per-instrument stage animation honest).
   */
  roles?: Array<'drums' | 'bass' | 'keys' | 'horns'>;
}

export interface ComposeResult {
  code: string;
  model: string;
  rationale?: string;
}

export interface ComposeErrorPayload {
  code: string;
  message: string;
  providerStatus?: number;
  retryable: boolean;
}

export class ComposeError extends Error {
  readonly code: string;
  readonly providerStatus?: number;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(payload: ComposeErrorPayload, status?: number) {
    super(payload.message);
    this.code = payload.code;
    this.providerStatus = payload.providerStatus;
    this.retryable = payload.retryable;
    this.status = status;
  }
}

const composeResponseSchema = z.object({
  code: z.string(),
  model: z.string(),
  rationale: z.string().optional(),
});

const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    providerStatus: z.number().optional(),
    retryable: z.boolean(),
  }),
});

const strudelTokens = ['note(', 's(', 'stack(', 'seq(', 'cat('];

export async function compose(request: ComposeRequest): Promise<ComposeResult> {
  const response = await fetch('/api/compose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(payload);
    if (parsedError.success) {
      throw new ComposeError(parsedError.data.error, response.status);
    }
    throw new ComposeError(
      {
        code: 'unknown',
        message: `Compose request failed (${response.status}).`,
        retryable: response.status >= 500,
      },
      response.status,
    );
  }

  const parsed = composeResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ComposeError(
      {
        code: 'invalid_response',
        message: 'Invalid response from composer.',
        retryable: true,
      },
      response.status,
    );
  }

  const sanitizedCode = stripCodeFences(parsed.data.code);
  if (!looksLikeStrudel(sanitizedCode)) {
    throw new ComposeError(
      {
        code: 'invalid_response',
        message: 'Model did not return Strudel code.',
        retryable: true,
      },
      response.status,
    );
  }

  return { ...parsed.data, code: sanitizedCode };
}

function stripCodeFences(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```[\w-]*\n([\s\S]*?)\n```$/);
  if (fenced) return fenced[1].trim();

  if (trimmed.startsWith('```')) {
    const withoutStart = trimmed.replace(/^```[\w-]*\n?/, '');
    return withoutStart.replace(/```$/, '').trim();
  }

  return trimmed;
}

function looksLikeStrudel(value: string): boolean {
  const lowered = value.toLowerCase();
  return strudelTokens.some((token) => lowered.includes(token));
}
