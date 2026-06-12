# LLM Provider Layer

> Anything that knows the name of an LLM vendor lives here. The rest of the code talks to `composer/`.

## Why this layering

Two pieces:

1. **Vercel AI SDK** (`ai`) is the **call site abstraction**. Code anywhere calls `generateText({ model, system, prompt })`. The same call works against OpenAI, Anthropic, Google, Mistral, OpenRouter, Bedrock, Ollama, etc., depending on which provider you constructed.
2. **OpenRouter** (`@openrouter/ai-sdk-provider`) is the **fan-out**. One API key, one URL, dozens of models routed transparently. Comparable error shapes across vendors.

Picking both gives you:
- One key to provision (`OPENROUTER_API_KEY`) for the POC and the publication's comparison.
- One line change to swap models for an experiment.
- An exit ramp later: replace `createOpenRouter(...)` with `createOpenAI(...)` / `createAnthropic(...)` / etc. without touching `composer/`.

## Supported providers

| `COMPOSE_PROVIDER` value | SDK package | Key env var | Model env var | Default model |
|---|---|---|---|---|
| `openrouter` (default) | `@openrouter/ai-sdk-provider` | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` | `anthropic/claude-sonnet-4.6` |
| `deepseek` | `@ai-sdk/deepseek` | `DEEPSEEK_API_KEY` | `DEEPSEEK_MODEL` | `deepseek-chat` |

Set `COMPOSE_PROVIDER` in `.env.local` to switch. Omitting it keeps OpenRouter as the default.

## Setup

### 1. Get an OpenRouter key

1. Sign up at https://openrouter.ai/.
2. Add credit (a few dollars is enough for the entire POC; Sonnet/4o calls are fractions of a cent each at 1024 output tokens).
3. Generate a key in https://openrouter.ai/keys.

### 2. Install deps

Already specified in `docs/workflow.md` → Sprint 0. The relevant packages:

```bash
pnpm add ai @openrouter/ai-sdk-provider zod
```

### 3. Configure env

`.env.local` (gitignored) — OpenRouter (default):

```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-sonnet-4.6
OPENROUTER_SITE_URL=https://localhost:5173
OPENROUTER_APP_NAME=virtual.band
```

`OPENROUTER_SITE_URL` and `OPENROUTER_APP_NAME` are recommended by OpenRouter for routing analytics. They are sent as `HTTP-Referer` and `X-Title` headers and are visible on your OpenRouter dashboard.

`.env.local` — DeepSeek:

```
COMPOSE_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat
```

Available DeepSeek models: `deepseek-chat` (DeepSeek-V3, default) and `deepseek-reasoner` (DeepSeek-R1).

### 4. The provider construction (reference — actual code lives in `server/compose-handler.ts`)

```ts
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  headers: {
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? '',
    'X-Title': process.env.OPENROUTER_APP_NAME ?? '',
  },
});

const result = await generateText({
  model: openrouter(process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.6'),
  system: SYSTEM_PROMPT,
  prompt: userPrompt,
  maxOutputTokens: 1024,
});
```

## Recommended models for POC-1

The system prompt is in English and code-generation-shaped, which most modern models handle well. Pick by cost/quality fit for the demo:

| OpenRouter id | Approx. quality on Strudel tasks | Approx. cost / call (1k in, 1k out) | When to pick it |
|---|---|---|---|
| `anthropic/claude-sonnet-4.6` | High; clean code, good musical reasoning | ~$0.005 | **Default for the demo.** Best price/quality. |
| `anthropic/claude-opus-4.7` | Highest; subtly better composition | ~$0.025 | When defaults sound bland. Save for the recorded demo take. |
| `openai/gpt-4o` | High; very fast | ~$0.005 | **Comparison run.** Common reviewer baseline. |
| `openai/gpt-4.1-mini` | Medium; cheap and fast | ~$0.001 | Iterate on the system prompt cheaply. |
| `google/gemini-2.5-pro` | High; strong on long structure | ~$0.006 | **Comparison run.** Different stylistic flavor. |
| `mistralai/mistral-large` | Medium-high | ~$0.005 | **Comparison run.** European data residency option. |
| `meta-llama/llama-3.3-70b-instruct` | Medium | ~$0.001 | Open-weights baseline; cheaper. |
| `qwen/qwen-2.5-coder-32b-instruct` | Medium-high on code, weaker on musicality | ~$0.0005 | Curiosity run; code is fine, music is plain. |

For the **comparison table** in the paper, pick three: Sonnet 4.6, GPT-4o, Gemini 2.5 Pro. They cover the three biggest labs and tend to produce noticeably different musical choices on the same prompt.

The full live list is at https://openrouter.ai/models — IDs may shift. Lock the exact id you used in the paper.

## Swap recipe

For demos, comparison runs, or "this model is being weird, let me try another":

1. Edit `.env.local`, change `OPENROUTER_MODEL`.
2. Stop and restart `pnpm dev` (env reload).
3. The next Compose call uses the new model. The UI shows which model actually answered (`result.model`).

For per-call override without restarting dev — pass `modelOverride` in the `ComposeRequest`. Useful from `.claude/skills/compose-experiment/SKILL.md`.

## Dev provider override (dev only)

For fast A/B testing of providers and models **without editing `.env.local` or
restarting the dev server**, the running app exposes a dev-only override form.

- Open the **Composer** panel → expand **"Dev · provider override"** (only
  rendered when `import.meta.env.DEV`, i.e. under `pnpm dev`).
- Pick a provider preset (OpenRouter, DeepSeek, OpenAI, or **Custom** for any
  OpenAI-compatible base URL), paste that provider's API key, and set the model
  id. The selection is sent with each Compose call as a `devOverride` on the
  `ComposeRequest`.
- The server (`server/compose-handler.ts` → `resolveModel()`) builds a one-off
  model via `@ai-sdk/openai-compatible` and **bypasses the env path** for that
  call. It logs `[compose] dev-override <provider>/<model>`.

Persistence and safety:

- The selection (including the key) is stored in `localStorage` under
  `virtualband.devOverride`, so it survives reloads during a dev session. Use
  **Clear override** to wipe it. Treat it like any plaintext local secret.
- **Production guard.** The form is compiled out of `pnpm build`, and the server
  ignores any client `devOverride` when `NODE_ENV === 'production'`. The
  serverless redeploy never trusts a client-supplied key (hard rule #1).
- The registry of presets lives in `src/composer/providers.ts` — add a row to
  extend it.

This is a testing convenience; it does **not** replace the env path. A reviewer
cloning the repo still configures `.env.local` as below.

## Cost guardrails

- `maxOutputTokens: 1024` per call. Strudel snippets are always tiny.
- 30-second request timeout.
- The dev server prints `[compose] <model> ok in <ms>ms (~<tokens> tokens)` so you can spot runaway costs.
- For the full demo recording session, budget ~$0.50 — even with Opus, ~20 compositions cost cents.

## Error semantics

OpenRouter normalizes a lot of provider differences but not all. The middleware returns a structured payload the UI can render:

```ts
{
  error: {
    code: 'rate_limited' | 'model_unavailable' | 'invalid_response' | 'unknown',
    message: string,
    providerStatus?: number,  // HTTP status from the upstream
    retryable: boolean,
  }
}
```

Handle in the UI:

- `rate_limited` → show "Try again in a moment." (retryable)
- `model_unavailable` → show "Model not available — check `.env.local`." (not retryable in this session)
- `invalid_response` → show the raw response in a collapsed panel; offer Compose again (retryable)
- `unknown` → show the message verbatim

## Exit ramp (later)

If OpenRouter ever becomes a bottleneck (rate limits during the demo, unexpected cost, an enterprise concern), the migration is:

1. `pnpm remove @openrouter/ai-sdk-provider`
2. `pnpm add @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google`
3. Replace `createOpenRouter({...})` in `server/compose-handler.ts` with a provider-selector that returns the right adapter based on a prefix in `OPENROUTER_MODEL` (e.g. `openai/...` → `createOpenAI()`).
4. Everything else stays the same.

That's the whole point of the layering — none of the rest of the code knows or cares.
