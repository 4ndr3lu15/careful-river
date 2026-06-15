import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
import { findPreset } from '../src/composer/providers';
import { buildPersonaDocs } from '../src/composer/persona-docs';

const PERSONA_INSTRUMENTS = ['drums', 'bass', 'keys', 'horns'] as const;
type PersonaInstrument = (typeof PERSONA_INSTRUMENTS)[number];

/** Instrument category → default persona name (legacy `roles` requests only). */
const PERSONA_NAMES: Record<PersonaInstrument, string> = {
  drums: 'VOLT',
  bass: 'ABYSS',
  keys: 'ORACLE',
  horns: 'NOVA',
};

const devOverrideSchema = z.object({
  provider: z.string().trim().min(1),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1),
  baseURL: z.string().trim().url().optional(),
});

/** A user-defined performer (see src/composer/index.ts → AgentSpec). */
const agentSpecSchema = z.object({
  name: z.string().trim().min(1).max(60),
  instrument: z.enum(PERSONA_INSTRUMENTS),
  style: z.string().trim().max(500).optional(),
});

const composeRequestSchema = z.object({
  prompt: z.string().trim().min(1),
  bpm: z.number().finite().positive().optional(),
  duration: z.number().finite().positive().optional(),
  modelOverride: z.string().trim().min(1).optional(),
  devOverride: devOverrideSchema.optional(),
  agents: z.array(agentSpecSchema).max(16).optional(),
  roles: z.array(z.enum(PERSONA_INSTRUMENTS)).optional(),
});

const OPENROUTER_DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6';
const DEEPSEEK_DEFAULT_MODEL = 'deepseek-chat';
const REQUEST_TIMEOUT_MS = 30_000;
// Reasoning models (deepseek-reasoner, deepseek-v4-flash, …) spend output
// tokens *thinking* before they emit a single character of the answer, and
// that reasoning is drawn from the same budget as the response. A reasoner
// routinely burns 500–2000+ tokens before writing code, so a tight cap
// truncates the answer to empty/garbage (finishReason: 'length'). The actual
// Strudel expression is only ~50–100 tokens, so the headroom is nearly free.
const MAX_OUTPUT_TOKENS = 8192;

type ComposeRequest = z.infer<typeof composeRequestSchema>;
type ComposeErrorCode =
  | 'invalid_request'
  | 'rate_limited'
  | 'model_unavailable'
  | 'invalid_response'
  | 'unknown';

interface ComposeErrorPayload {
  code: ComposeErrorCode;
  message: string;
  providerStatus?: number;
  retryable: boolean;
}

/**
 * POST /api/compose — natural language → Strudel code.
 *
 * Kept free of Vite imports so the same function can be redeployed as a
 * serverless function in production — only the dev mounting lives in
 * vite.config.ts.
 */
export async function composeHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, {
      error: { code: 'invalid_request', message: 'POST only.', retryable: false },
    });
    return;
  }

  let requestBody: ComposeRequest;
  try {
    const rawBody = await readJson(req);
    const parsed = composeRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      sendJson(res, 400, {
        error: {
          code: 'invalid_request',
          message: 'Invalid request payload.',
          retryable: false,
        },
      });
      return;
    }
    requestBody = parsed.data;
  } catch (error) {
    sendJson(res, 400, {
      error: {
        code: 'invalid_request',
        message: error instanceof Error ? error.message : 'Invalid JSON payload.',
        retryable: false,
      },
    });
    return;
  }

  let languageModel: LanguageModel;
  let modelId: string;
  try {
    ({ languageModel, modelId } = resolveModel(requestBody));
  } catch (err) {
    sendJson(res, 500, {
      error: {
        code: 'unknown',
        message: err instanceof Error ? err.message : 'Provider configuration error.',
        retryable: false,
      },
    });
    return;
  }

  let system: string;
  try {
    const basePrompt = await loadSystemPrompt();
    // Append focused Strudel docs for only the categories that will play. Weaker
    // models lean on these worked examples; strong models ignore the redundancy.
    const personaDocs = buildPersonaDocs(activeCategories(requestBody));
    system = personaDocs ? `${basePrompt}\n\n${personaDocs}` : basePrompt;
  } catch (error) {
    sendJson(res, 500, {
      error: {
        code: 'unknown',
        message: error instanceof Error ? error.message : 'Failed to load system prompt.',
        retryable: false,
      },
    });
    return;
  }
  const prompt = buildUserPrompt(requestBody);

  const start = Date.now();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

  try {
    const result = await generateText({
      model: languageModel,
      system,
      prompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: abortController.signal,
    });

    const code = result.text.trim();
    if (!code) {
      // Most common cause: a reasoning model spent the whole output budget
      // thinking and got cut off before writing the answer (finishReason
      // 'length'). Surface that so it isn't mistaken for a provider outage.
      const truncated = result.finishReason === 'length';
      console.warn(
        `[compose] ${modelId} empty text (finishReason=${result.finishReason}, ` +
          `reasoningTokens=${result.usage?.reasoningTokens ?? '?'})`,
      );
      sendJson(res, 502, {
        error: {
          code: 'invalid_response',
          message: truncated
            ? 'Model hit the output token limit while reasoning and returned no code. Try a non-reasoning model or shorter request.'
            : 'Model returned an empty response.',
          retryable: true,
        },
      });
      return;
    }

    const durationMs = Date.now() - start;
    const tokenCount = result.usage?.totalTokens;
    const tokenNote = typeof tokenCount === 'number' ? ` (~${tokenCount} tokens)` : '';
    console.log(`[compose] ${modelId} ok in ${durationMs}ms${tokenNote}`);

    sendJson(res, 200, { code, model: modelId });
  } catch (error) {
    const durationMs = Date.now() - start;
    const mapped = mapComposeError(error);
    console.error(
      `[compose] ${modelId} error in ${durationMs}ms`,
      error instanceof Error ? error.message : error,
    );
    sendJson(res, 502, { error: mapped });
  } finally {
    clearTimeout(timeout);
  }
}

function resolveModel(request: ComposeRequest): { languageModel: LanguageModel; modelId: string } {
  // Dev-only escape hatch: a client may supply its own provider/key/model.
  // NEVER honored in production — hard rule #1 (the serverless redeploy must
  // not trust a client-supplied key).
  if (process.env.NODE_ENV !== 'production' && request.devOverride) {
    return resolveDevOverride(request.devOverride);
  }

  const provider = (process.env.COMPOSE_PROVIDER ?? 'openrouter').toLowerCase().trim();

  if (provider === 'deepseek') {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('Missing DEEPSEEK_API_KEY.');
    const modelId = request.modelOverride?.trim() || process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL;
    return { languageModel: createDeepSeek({ apiKey })(modelId), modelId };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY.');
  const modelId = request.modelOverride?.trim() || process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL;
  const openrouter = createOpenRouter({
    apiKey,
    headers: {
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? '',
      'X-Title': process.env.OPENROUTER_APP_NAME ?? '',
    },
  });
  return { languageModel: openrouter(modelId), modelId };
}

/**
 * Build a one-off OpenAI-compatible model from a dev override. The base URL
 * comes from the request (custom provider) or the shared preset table.
 */
function resolveDevOverride(
  override: NonNullable<ComposeRequest['devOverride']>,
): { languageModel: LanguageModel; modelId: string } {
  console.log(`[compose] dev-override ${override.provider}/${override.model}`);

  // DeepSeek's models are reasoners: route them through the dedicated provider
  // (same as the production env path) so reasoning_content is parsed correctly
  // and kept out of the answer text. The generic openai-compatible adapter
  // works too, but mismatches the prod path and DeepSeek's usage accounting.
  if (override.provider === 'deepseek') {
    const client = createDeepSeek({
      apiKey: override.apiKey,
      ...(override.baseURL?.trim() ? { baseURL: override.baseURL.trim() } : {}),
    });
    return { languageModel: client(override.model), modelId: override.model };
  }

  const baseURL = override.baseURL?.trim() || findPreset(override.provider)?.baseURL;
  if (!baseURL) {
    throw new Error(`No base URL for provider "${override.provider}".`);
  }
  const client = createOpenAICompatible({
    name: override.provider,
    apiKey: override.apiKey,
    baseURL,
  });
  return { languageModel: client(override.model), modelId: override.model };
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON payload.');
  }
}

async function loadSystemPrompt(): Promise<string> {
  const file = new URL('../prompts/composer-system-prompt.md', import.meta.url);
  const raw = await readFile(file, 'utf8');
  const marker = '## PROMPT';
  const index = raw.indexOf(marker);
  if (index === -1) {
    throw new Error('System prompt marker not found.');
  }
  const prompt = raw.slice(index + marker.length).trim();
  if (!prompt) {
    throw new Error('System prompt is empty.');
  }
  return prompt;
}

/**
 * Instrument categories that will actually play, in stable stage order.
 * Derived from `agents` when present, else the legacy `roles` array.
 */
function activeCategories(request: ComposeRequest): PersonaInstrument[] | undefined {
  if (request.agents && request.agents.length > 0) {
    return PERSONA_INSTRUMENTS.filter((cat) =>
      request.agents!.some((agent) => agent.instrument === cat),
    );
  }
  if (request.roles && request.roles.length > 0) {
    return PERSONA_INSTRUMENTS.filter((cat) => request.roles!.includes(cat));
  }
  return undefined;
}

function buildUserPrompt(request: ComposeRequest): string {
  const parts: string[] = [request.prompt.trim()];
  if (typeof request.bpm === 'number') {
    parts.push(`BPM: ${clampBpm(request.bpm)}.`);
  }
  if (typeof request.duration === 'number') {
    parts.push(`Duration: ${Math.round(request.duration)} seconds.`);
  }

  // The final prompt is vibe brief + one line per agent: each user-defined
  // agent contributes its name, category and style instruction.
  if (request.agents && request.agents.length > 0) {
    const lines = request.agents.map((agent) => {
      const style = agent.style?.trim();
      return `- ${agent.name} (${agent.instrument})${style ? `: ${style}` : ''}`;
    });
    parts.push(
      'Active performers — write EXACTLY one part per performer inside the stack, ' +
        'using only their instrument categories, and omit every other instrument:\n' +
        lines.join('\n'),
    );
    return parts.join('\n');
  }

  // Legacy form: bare categories with the default persona names.
  const roles = PERSONA_INSTRUMENTS.filter((cat) => request.roles?.includes(cat));
  if (roles.length > 0) {
    const performers = roles.map((cat) => `${PERSONA_NAMES[cat]} (${cat})`).join(', ');
    parts.push(
      `Active performers: ${performers}. Write a part ONLY for these instrument ` +
        `categories — one entry per performer inside the stack — and omit every other instrument.`,
    );
  }

  return parts.join('\n');
}

function clampBpm(value: number): number {
  return Math.min(180, Math.max(60, Math.round(value)));
}

function mapComposeError(error: unknown): ComposeErrorPayload {
  const status = extractStatus(error);
  if (status === 429) {
    return {
      code: 'rate_limited',
      message: 'Rate limited by provider.',
      providerStatus: status,
      retryable: true,
    };
  }
  if (status === 400 || status === 404) {
    return {
      code: 'model_unavailable',
      message: 'Model not available. Check COMPOSE_PROVIDER / *_MODEL env var.',
      providerStatus: status,
      retryable: false,
    };
  }

  return {
    code: 'unknown',
    message: error instanceof Error ? error.message : 'Unknown error.',
    providerStatus: status,
    retryable: status === undefined || status >= 500,
  };
}

function extractStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
    cause?: { status?: number; response?: { status?: number } };
  };

  return (
    candidate.status ??
    candidate.statusCode ??
    candidate.response?.status ??
    candidate.cause?.status ??
    candidate.cause?.response?.status
  );
}
