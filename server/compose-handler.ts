import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

const composeRequestSchema = z.object({
  prompt: z.string().trim().min(1),
  bpm: z.number().finite().positive().optional(),
  duration: z.number().finite().positive().optional(),
  modelOverride: z.string().trim().min(1).optional(),
});

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_TOKENS = 1024;

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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, {
      error: {
        code: 'unknown',
        message: 'Missing OPENROUTER_API_KEY.',
        retryable: false,
      },
    });
    return;
  }

  const model =
    requestBody.modelOverride?.trim() ||
    process.env.OPENROUTER_MODEL ||
    DEFAULT_MODEL;

  let system: string;
  try {
    system = await loadSystemPrompt();
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

  const openrouter = createOpenRouter({
    apiKey,
    headers: {
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? '',
      'X-Title': process.env.OPENROUTER_APP_NAME ?? '',
    },
  });

  const start = Date.now();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

  try {
    const result = await generateText({
      model: openrouter(model),
      system,
      prompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: abortController.signal,
    });

    const code = result.text.trim();
    if (!code) {
      sendJson(res, 502, {
        error: {
          code: 'invalid_response',
          message: 'Model returned an empty response.',
          retryable: true,
        },
      });
      return;
    }

    const durationMs = Date.now() - start;
    const tokenCount = result.usage?.totalTokens;
    const tokenNote = typeof tokenCount === 'number' ? ` (~${tokenCount} tokens)` : '';
    console.log(`[compose] ${model} ok in ${durationMs}ms${tokenNote}`);

    sendJson(res, 200, { code, model });
  } catch (error) {
    const durationMs = Date.now() - start;
    const mapped = mapComposeError(error);
    console.error(
      `[compose] ${model} error in ${durationMs}ms`,
      error instanceof Error ? error.message : error,
    );
    sendJson(res, 502, { error: mapped });
  } finally {
    clearTimeout(timeout);
  }
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

function buildUserPrompt(request: ComposeRequest): string {
  const parts: string[] = [request.prompt.trim()];
  if (typeof request.bpm === 'number') {
    parts.push(`BPM: ${clampBpm(request.bpm)}.`);
  }
  if (typeof request.duration === 'number') {
    parts.push(`Duration: ${Math.round(request.duration)} seconds.`);
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
      message: 'Model not available. Check OPENROUTER_MODEL.',
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
