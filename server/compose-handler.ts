import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * POST /api/compose — natural language → Strudel code.
 *
 * Sprint 0 skeleton: returns a fixed stub and never touches an LLM or the
 * OPENROUTER_API_KEY. Sprint 1 replaces the body with a real OpenRouter call
 * via the Vercel AI SDK (see docs/architecture.md → "server/compose-handler.ts").
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
      error: { code: 'method_not_allowed', message: 'POST only.', retryable: false },
    });
    return;
  }

  // Drain the request body so the socket closes cleanly. Sprint 1 parses it
  // into a ComposeRequest; for now the prompt is intentionally ignored.
  await drain(req);

  sendJson(res, 200, { code: 'note("c4").s("sine")', model: 'stub' });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function drain(req: IncomingMessage): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    req.on('data', () => {});
    req.on('end', () => resolve());
    req.on('error', reject);
  });
}
