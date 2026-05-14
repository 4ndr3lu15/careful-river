# AGENTS.md

Canonical operating instructions for **any AI coding agent** working in this repository. Tool-specific files (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `opencode.json`, etc.) point here and add only the deltas they need.

If you are a coding agent reading this for the first time, read it end-to-end before editing files.

## Project in one paragraph

`banda-virtual` is a WebXR + LLM proof of concept: a model-agnostic composer agent generates [Strudel](https://strudel.cc) code at runtime; the browser executes it; a Three.js / React Three Fiber scene animates four toy musicians in sync with the audio; the same build runs on desktop browsers and on Meta Quest / Wolvic. The aim is a reproducible demo for a conference publication — not a polished product.

## Target audience for the demo

A reviewer who clones the repo, runs `pnpm install && pnpm dev`, opens `https://localhost:5173`, types a prompt, presses Compose, presses Play, hears music, sees four characters animate, and optionally presses Enter VR. End-to-end in under 10 minutes from clone.

## Stack and conventions

- **Language**: TypeScript, `strict: true`. No `any` in public interfaces.
- **Package manager**: `pnpm` (do not use `npm` or `yarn` — `pnpm-lock.yaml` is the source of truth).
- **Bundler**: Vite 6.x. HTTPS is mandatory (WebXR requires a secure context). Use `@vitejs/plugin-basic-ssl` or `mkcert`.
- **UI**: React 19 + `@react-three/fiber` + `@react-three/drei` + `@react-three/xr`.
- **Music runtime**: `@strudel/web` 1.3.x (NOT `@strudel/repl` — that ships the editor and is 2 MB heavier).
- **LLM layer**: Vercel AI SDK (`ai`) configured against OpenRouter via `@openrouter/ai-sdk-provider`. Never hard-code a single vendor.
- **Event bus**: native `new EventTarget()` + `CustomEvent<NoteEvent>`. No Redux/Zustand/Jotai/RxJS in POC-1.
- **Module shape**: each top-level folder under `src/` is a module that exposes a tiny public interface via `index.ts`. Nothing imports from inner subpaths of another module.

### Naming

- React components: PascalCase (`Musician.tsx`)
- Other TS modules: kebab-case (`instrument-map.ts`)
- Shared types live in `src/types.ts`. The central one is `NoteEvent` — modifying it requires updating `docs/architecture.md` in the same change.

## Commands

| Command | What it does |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Vite dev server on `https://localhost:5173` |
| `pnpm tsc --noEmit` | Type-check |
| `pnpm build` | Production build |
| `pnpm preview` | Serve the prod build locally |

No automated tests in POC-1. Verification is manual + per-sprint acceptance criteria in `docs/requirements.md`.

## Module map (planned)

```
src/
├── composer/        # natural language → Strudel code, via OpenRouter
├── musician/        # Strudel runtime + NoteEvent emitter
├── stage/           # 3D scene + WebXR
├── app/             # React UI glue
├── types.ts         # NoteEvent + shared types
└── main.tsx         # entry point

server/
└── compose-handler.ts  # Vite middleware proxy that injects OPENROUTER_API_KEY

prompts/
├── composer-system-prompt.md   # what the runtime agent reads
└── strudel-cheatsheet.md       # reference fed alongside

docs/                # requirements, architecture, workflow, llm-providers, publication-plan
```

## Hard rules

These are non-negotiable. Violations break the demo or leak secrets.

1. **`OPENROUTER_API_KEY` never reaches the browser.** All LLM calls go through `/api/compose`, a server-side Vite middleware that injects the key.
2. **Animation clock is `audioContext.currentTime`, not `Date.now()` or `performance.now()`.** Strudel schedules notes in the future; animations must use the same clock to stay in sync (see `docs/architecture.md` → "Contract of events").
3. **WebXR requires HTTPS.** Do not "just test in HTTP". `@vitejs/plugin-basic-ssl` or `mkcert` from the start.
4. **Autoplay needs a user gesture.** The first user click must call `audioContext.resume()`. Don't try to start audio on mount.
5. **No automated tests in POC-1.** Manual verification only. Adding Vitest setup is out of scope until POC-2.

## Soft rules (defaults — override only with a reason in the commit message)

- Don't introduce a state library; lift state to `App.tsx` or use the event bus.
- Don't embed the full Strudel REPL.
- Don't use `OrbitControls` while an XR session is active — they conflict.
- Don't add `framer-motion`/`gsap` for a simple scale pulse — `useFrame` from R3F is enough.
- Don't optimize before profiling. POC is POC.
- Keep the core under ~1500 lines of TypeScript (excluding `node_modules` and generated types).

## Multi-agent harness

This repo is meant to be navigated by several coding-agent CLIs. The convention:

- **Universal**: any agent reads `AGENTS.md` first.
- **Tool-specific deltas** (only what differs from this file) live in:
  - `CLAUDE.md` — Claude Code (also reads `.claude/skills/` and `.mcp.json`)
  - `GEMINI.md` — Gemini CLI
  - `.github/copilot-instructions.md` — GitHub Copilot (CLI + IDE)
  - `opencode.json` — OpenCode CLI
- If you find yourself adding a project rule to a tool-specific file, ask whether it belongs in `AGENTS.md` instead. Tool-specific files should only contain *tool-specific* guidance, not project-wide rules.

When in doubt about which CLI to use for a task, see `docs/workflow.md` → "Picking a coding agent".

## Where to look for what

| Question | File |
|---|---|
| "What does POC-1 have to do?" | `docs/requirements.md` |
| "How are the modules supposed to interact?" | `docs/architecture.md` |
| "What's the sprint I'm working on?" | `docs/workflow.md` |
| "Which model / how do I swap providers?" | `docs/llm-providers.md` |
| "What's the demo script for the paper?" | `docs/publication-plan.md` |
| "What does the composer agent see as system prompt?" | `prompts/composer-system-prompt.md` |
| "What Strudel features can the composer assume?" | `prompts/strudel-cheatsheet.md` |
| "Is this Strudel code I generated valid?" | `.claude/skills/strudel-validator/SKILL.md` |
| "Did I forget anything before testing in VR?" | `.claude/skills/webxr-preflight/SKILL.md` |
| "How do I compare two LLMs on the same prompt?" | `.claude/skills/compose-experiment/SKILL.md` |

## When in doubt

Ask the user before assuming. Especially: scope creep (anything in `docs/requirements.md` → "Out of scope"), changes to `NoteEvent`, swapping libraries, anything that touches `OPENROUTER_API_KEY` handling.
