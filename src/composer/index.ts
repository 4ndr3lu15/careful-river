import { z } from 'zod';
import type { DevOverride } from './providers';

export type { DevOverride, ProviderPreset } from './providers';
export { PROVIDER_PRESETS, findPreset } from './providers';
export { buildPersonaDocs } from './persona-docs';

/**
 * One performer in the compose request. The final prompt is assembled from the
 * vibe's brief plus one of these per active agent: the server lists each agent
 * by name/category and appends its `style` instruction.
 */
export interface AgentSpec {
  name: string;
  instrument: 'drums' | 'bass' | 'keys' | 'horns';
  /** Free-form musical instruction for this agent's part. */
  style?: string;
}

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
   * Active performers. The server turns these into an "Active performers"
   * instruction (one part per agent, styled per its `style`) and injects the
   * per-category Strudel docs for exactly the categories present (keeps the
   * per-instrument stage animation honest).
   */
  agents?: AgentSpec[];
  /**
   * Legacy form of `agents`: bare instrument categories with the default
   * persona names. Ignored when `agents` is present.
   */
  roles?: Array<'drums' | 'bass' | 'keys' | 'horns'>;
}

export interface ComposeResult {
  code: string;
  model: string;
  rationale?: string;
}

/**
 * Shared musical parameters chosen once by the conductor pass and threaded into
 * every per-agent call so the independently-generated parts stay coherent.
 */
export interface SharedContext {
  bpm: number;
  key: string;
  scale: string;
  groove: string;
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

const conductorResponseSchema = z.object({
  shared: z.object({
    bpm: z.number(),
    key: z.string(),
    scale: z.string(),
    groove: z.string(),
  }),
  model: z.string(),
});

const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    providerStatus: z.number().optional(),
    retryable: z.boolean(),
  }),
});

/** POST to /api/compose, mapping HTTP/error payloads to ComposeError. */
async function postCompose(body: unknown): Promise<unknown> {
  const response = await fetch('/api/compose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
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

  return payload;
}

/**
 * Legacy single-call compose: one request → a full `stack(...)`. Kept for the
 * compose-experiment skill and the `roles`/`agents` contract. The live app now
 * uses {@link composeConductor} + {@link composeAgentPart} instead.
 */
export async function compose(request: ComposeRequest): Promise<ComposeResult> {
  const payload = await postCompose(request);

  const parsed = composeResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ComposeError({
      code: 'invalid_response',
      message: 'Invalid response from composer.',
      retryable: true,
    });
  }

  const sanitizedCode = stripCodeFences(parsed.data.code);
  if (!looksLikeStrudel(sanitizedCode)) {
    throw new ComposeError({
      code: 'invalid_response',
      message: 'Model did not return Strudel code.',
      retryable: true,
    });
  }

  return { ...parsed.data, code: sanitizedCode };
}

/**
 * Conductor pass — one cheap call that picks shared `{bpm,key,scale,groove}` for
 * the whole lineup. The result is threaded into every {@link composeAgentPart}
 * call so the independently-generated parts lock together.
 */
export async function composeConductor(request: {
  prompt: string;
  agents: AgentSpec[];
  bpm?: number;
  modelOverride?: string;
  devOverride?: DevOverride;
}): Promise<{ shared: SharedContext; model: string }> {
  const payload = await postCompose({ ...request, mode: 'conductor' });
  const parsed = conductorResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ComposeError({
      code: 'invalid_response',
      message: 'Invalid conductor response.',
      retryable: true,
    });
  }
  return parsed.data;
}

/**
 * Per-agent pass — generate ONE performer's bare part, given the shared context.
 * The caller assembles the parts into a single `stack(...).cpm(bpm)`, so a part
 * must not carry its own tempo. Rather than reject a non-compliant reply (which
 * would silence the whole performer), tempo calls are stripped and the audio is
 * kept; only an empty/non-Strudel reply is rejected.
 */
export async function composeAgentPart(request: {
  prompt: string;
  agent: AgentSpec;
  shared: SharedContext;
  modelOverride?: string;
  devOverride?: DevOverride;
}): Promise<{ code: string; model: string }> {
  const payload = await postCompose({ ...request, mode: 'agent' });
  const parsed = composeResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ComposeError({
      code: 'invalid_response',
      message: 'Invalid response from composer.',
      retryable: true,
    });
  }

  // The host assembles every part into one stack(...) and sets a single global
  // tempo. A part that smuggles in its own tempo would fight the host clock, so
  // tempo calls are STRIPPED rather than the part rejected — dropping it would
  // silence a whole performer, the exact bug this avoids. A nested stack(...) is
  // harmless (valid Strudel, still one top-level entry for live muting) and is
  // left intact.
  const code = sanitizeAgentPart(stripCodeFences(parsed.data.code));
  if (!looksLikeStrudel(code)) {
    throw new ComposeError({
      code: 'invalid_response',
      message: 'Model did not return a usable part.',
      retryable: true,
    });
  }

  return { code, model: parsed.data.model };
}

/**
 * A safe, on-character default part per instrument category. Used when a
 * per-agent compose call fails so the performer still plays and animates —
 * each sound name is in `musician/instrument-map.ts`, so the right character
 * moves — instead of going silent. Bare pattern (no stack, no tempo), matching
 * the {@link composeAgentPart} contract so it drops straight into the stack.
 */
const FALLBACK_PARTS: Record<AgentSpec['instrument'], string> = {
  drums: 's("bd ~ sd ~, hh*8").bank("RolandTR909").gain(0.7)',
  bass: 'note("<c2 g2 a2 f2>").s("sawtooth").lpf(600).gain(0.7)',
  keys: 'note("<[c3,e3,g3] [a2,c3,e3] [f2,a2,c3] [g2,b2,d3]>").s("piano").gain(0.5)',
  horns: 'note("c5 ~ e5 g5 ~ e5").s("sax").gain(0.6)',
};

export function fallbackPart(instrument: AgentSpec['instrument']): string {
  return FALLBACK_PARTS[instrument];
}

/**
 * Remove host-controlled tempo calls (`.cpm(...)`, `.cps(...)`, `setcpm(...)`)
 * from a per-agent part so it can't fight the single global tempo the host
 * applies when it wraps all parts in one `stack(...).cpm(bpm)`.
 */
function sanitizeAgentPart(code: string): string {
  return code
    .replace(/\.cp[sm]\s*\([^)]*\)/g, '')
    .replace(/\bsetcpm\s*\([^)]*\)\s*;?/g, '')
    .trim();
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

/**
 * Cheap gate: is this a Strudel pattern rather than prose or a refusal? A real
 * part makes at least one pattern call with a quoted argument — `note("…")`,
 * `s("…")`, `n("…")`, `sound("…")`, `arp("…")`, `"…".s("…")`, … — so we look
 * for that shape instead of allow-listing a handful of call names. The old
 * allow-list rejected valid idioms like `n("0 3").scale(…).sound(…)` and
 * `sound("bd*4")`, which silenced whole performers. Explicit `silence` passes
 * so a deliberate rest is never mistaken for junk.
 */
function looksLikeStrudel(value: string): boolean {
  const code = value.trim();
  if (!code) return false;
  if (/\bsilence\b/.test(code)) return true;
  return /[A-Za-z_$][\w$]*\s*\(\s*["'`]/.test(code);
}
