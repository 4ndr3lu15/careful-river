# GitHub Copilot — project instructions

The canonical project rules live in **`AGENTS.md`** at the repository root. Always read it first; this file is the Copilot-specific delta.

This repo is currently in **planning / Sprint 0**: there is no application code yet. Use `docs/workflow.md` to drive the bootstrap steps and `docs/requirements.md` for scope.

## Build, test, lint

| Task | Command |
|---|---|
| Install deps | `pnpm install` |
| Dev server | `pnpm dev` (HTTPS required) |
| Build | `pnpm build` |
| Preview | `pnpm preview` |
| Type-check | `pnpm tsc --noEmit` |

Notes: `package.json` scripts currently exit 1 until Sprint 0 is implemented. There are **no automated tests** in POC-1 (single-test command not applicable) and no lint script defined.

## High-level architecture (POC-1)

- **Single-runtime browser app**: React UI calls `composer/` to POST `/api/compose`, `musician/` evaluates Strudel and emits `NoteEvent`s via a native `EventTarget`, and `stage/` (R3F + XR) subscribes and animates.
- **Server-side proxy only for secrets**: `server/compose-handler.ts` is the sole place the OpenRouter API key lives. It uses Vercel AI SDK + OpenRouter and returns `{ code, model }` to the browser.
- **Sync contract**: animation timing is driven by `audioContext.currentTime`; `NoteEvent.startTime` is in the future and must be scheduled against that clock.

## Key conventions & constraints

- **TypeScript strict**; no implicit `any` and no `any` in public interfaces.
- **Module-public-interface rule**: each top-level `src/` module exports from `index.ts`; never import from sibling subpaths.
- **LLM calls**: use `ai` (Vercel AI SDK) + `@openrouter/ai-sdk-provider`; never direct `openai`/`@anthropic-ai/sdk` SDK usage.
- **Music**: use `@strudel/web` 1.3.x (never `@strudel/repl`).
- **State**: native React + `EventTarget`; no Redux/Zustand/Jotai/RxJS in POC-1.
- **Hard rules**: `OPENROUTER_API_KEY` never reaches the browser; WebXR requires HTTPS; audio must start on a user gesture; animation clock is `audioContext.currentTime`.

## Agent tooling signals to keep in mind

- `.mcp.json` defines shared MCP servers (filesystem for `docs/` + `prompts/`, fetch for Strudel docs, git fallback, and Playwright automation).
- `CLAUDE.md`, `GEMINI.md`, and `opencode.json` all point back to `AGENTS.md` plus tool-specific notes.

## What Copilot is best at in this repo

- Single-line completions inside an open file.
- PR descriptions (`gh copilot suggest` and inline review).
- Shell-command suggestions for `pnpm` and `vite` operations.

For multi-file architectural work, prefer Claude Code or Gemini CLI.

## What to refuse

- Generating tests in POC-1 (testing is out of scope until POC-2).
- Generating code that mocks the LLM provider (the proxy is the seam).
- Adding new dependencies without a clear reason in the PR description.
