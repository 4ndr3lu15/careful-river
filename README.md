# virtual.band

> An LLM agent composes music in [Strudel](https://strudel.cc); a WebXR scene renders a virtual band playing it in sync — same browser, same event loop, runs on desktop and standalone VR headsets (Quest 3 / Wolvic).


## One-sentence vision

You describe a vibe in natural language → an LLM picks a model and writes Strudel → music plays in the browser → 3D characters animate in sync with each note → optionally, you enter VR.

## Stack

| Layer | Tech | Why |
|---|---|---|
| Language | TypeScript (strict) | Types guide both humans and coding agents |
| Bundler / dev server | Vite | HMR, trivial local HTTPS (WebXR requires it) |
| 3D scene | Three.js + @react-three/fiber | Declarative scene, fast iteration |
| VR | WebXR via @react-three/xr | W3C standard; runs on any compatible browser |
| Music runtime | @strudel/web | Live-coding music engine, per-note callbacks |
| LLM layer | Vercel AI SDK + OpenRouter | One interface, any commercial or open model |
| Event bus | Native `EventTarget` | Decouples music ↔ scene without a dep |
| Dev tooling | Multi-agent (Claude Code, Gemini CLI, Copilot CLI, OpenCode, Aider…) | Author can pick the tool that fits the task |

## Document map

| File | Purpose |
|---|---|
| `README.md` | This file — entry point, executive view |
| `AGENTS.md` | Canonical instructions for any AI coding agent |
| `CLAUDE.md` / `GEMINI.md` / `.github/copilot-instructions.md` | Per-tool pointers to `AGENTS.md` plus tool-specific notes |
| `docs/requirements.md` | What POC-1 must do, acceptance criteria |
| `docs/architecture.md` | Module contracts, the `NoteEvent` bus, LLM-provider abstraction |
| `docs/workflow.md` | Sprint plan + how to drive each coding-agent CLI |
| `docs/llm-providers.md` | OpenRouter setup, model comparison, swap recipe |
| `docs/publication-plan.md` | Conference angle, demo script, what to record |
| `prompts/composer-system-prompt.md` | System prompt for the runtime composer agent |
| `prompts/strudel-cheatsheet.md` | Strudel reference fed to the composer |
| `.claude/skills/` | Reusable Claude Code skills (validator, experiment runner, VR preflight) |
| `.mcp.json` | MCP server configuration shared across MCP-aware tools |

## Getting started

> **Status:** Sprints 0–5 done; Sprint 6 (polish) in progress. You can compose via OpenRouter, see Strudel code, press Play for audio, watch the 3D stage pulse in sync, swap models per-compose from the UI, and use Enter VR on WebXR-capable browsers. Invalid patterns and provider errors surface in the UI; Stop always silences a running pattern.

Prerequisites: Node ≥ 20 and `pnpm` (`corepack enable` provides it).

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create your local env file:
   ```bash
   cp .env.example .env.local
   ```
   Add a real `OPENROUTER_API_KEY` to `.env.local` — required for composing. Optionally set `OPENROUTER_MODEL` (default `anthropic/claude-sonnet-4.6`); you can also override the model per-request from the "Model override" input in the UI without restarting the dev server.
3. Start the dev server:
   ```bash
   pnpm dev
   ```
   Open `https://localhost:5173` and accept the self-signed certificate warning once (WebXR mandates HTTPS; the cert is generated locally). The page shows **"virtual.band"**.

Other commands: `pnpm typecheck` (type-check), `pnpm build` (production build), `pnpm preview` (serve the build).

### For contributors / coding agents

1. Read `docs/requirements.md` for POC-1 scope and `docs/architecture.md` for module contracts and the `NoteEvent` bus.
2. Pick a coding-agent CLI (`claude`, `gemini`, `gh copilot`, `opencode`, `aider`, …) and read its per-tool pointer if it has one.
3. Follow `docs/workflow.md` from the next open sprint (see **Status** below).

## Status

- [x] Planning + harness scaffolded
- [x] Sprint 0 — project bootstrap (Vite, HTTPS, deps, env)
- [x] Sprint 1 — composer module (Vercel AI SDK + OpenRouter proxy)
- [x] Sprint 2 — musician module (Strudel runtime + NoteEvent bus)
- [x] Sprint 3 — static 3D scene (4 toy characters)
- [x] Sprint 4 — music ↔ animation sync ⭐
- [x] Sprint 5 — WebXR (Quest button + framing)
- [ ] Sprint 6 — polish + recorded demo for the paper

## License

To be decided. Defaulting to MIT for the conference release unless something requires otherwise.
