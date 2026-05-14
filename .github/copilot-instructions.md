# GitHub Copilot — project instructions

The canonical project rules live in **`AGENTS.md`** at the repository root. Always read it first. This file adds only Copilot-specific guidance.

## Tone of completions

- Prefer **TypeScript strict-mode-friendly** code: no implicit `any`, explicit types on exported functions.
- Keep completions **small and verifiable**. Avoid generating whole files — favor one function at a time.
- Follow the **module-public-interface** rule: code lives behind an `index.ts` per top-level module. Never suggest deep imports across modules.

## Library expectations

- For LLM calls: `ai` (Vercel AI SDK) + `@openrouter/ai-sdk-provider`. Never suggest `@anthropic-ai/sdk` or `openai` directly.
- For 3D: `@react-three/fiber`, `@react-three/drei`, `@react-three/xr`. Never suggest raw three.js scene graph mutation when an R3F equivalent exists.
- For music: `@strudel/web` 1.3.x. Never `@strudel/repl`.
- For state: native React + `EventTarget`. Never suggest Redux/Zustand/Jotai/RxJS in POC-1 code.

## Hard constraints (mirror of `AGENTS.md`)

- `OPENROUTER_API_KEY` must never appear in browser code. All LLM calls go through `/api/compose`.
- Animation must use `audioContext.currentTime` as the clock — never `Date.now()` / `performance.now()`.
- WebXR requires HTTPS. Don't suggest `server: { https: false }` in `vite.config.ts`.
- Audio start requires a user gesture — call `audioContext.resume()` from the first click handler.

## What Copilot is best at in this repo

- Single-line completions inside an open file.
- PR descriptions (`gh copilot suggest` and inline review).
- Shell-command suggestions for `pnpm` and `vite` operations.

For multi-file architectural work, use Claude Code or Gemini CLI; Copilot's strengths are elsewhere.

## What to refuse

- Generating tests in POC-1 (testing is out of scope until POC-2).
- Generating code that mocks the LLM provider (the proxy is the seam).
- Adding new dependencies without a clear reason in the PR description.
