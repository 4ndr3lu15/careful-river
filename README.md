# Banda Virtual — Composer Agent in Virtual Reality

> An LLM agent composes music in [Strudel](https://strudel.cc); a WebXR scene renders a virtual band playing it in sync — same browser, same event loop, runs on desktop and standalone VR headsets (Quest 3 / Wolvic).

This is a **clean v2** of an earlier proof of concept ([archived sketch](../../Downloads/banda-virtual)). Goals of v2:

1. **Model-agnostic agent** — runtime composer talks to LLMs via OpenRouter through the Vercel AI SDK, not a single vendor SDK. Swap GPT-4o ↔ Claude Opus 4.7 ↔ Gemini 2.5 ↔ open models in one line.
2. **Multi-CLI dev harness** — the repo is set up so Claude Code, Gemini CLI, GitHub Copilot CLI, OpenCode, Aider and similar tools all behave consistently when invoked here.
3. **Conference-ready** — the demo is the artifact. Reproducible from `git clone` to "band playing in Quest" in under 10 minutes.

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

## Getting started (planning phase)

The repo currently contains **no application code** — only planning documents and the agent harness. The next session implements POC-1:

1. Read `docs/requirements.md` to understand POC-1 scope (do this even if you're an AI agent).
2. Read `docs/architecture.md` for module boundaries and the `NoteEvent` contract.
3. Pick a coding-agent CLI (`claude`, `gemini`, `gh copilot`, `opencode`, `aider`, …) and read its per-tool pointer if it has one.
4. Follow `docs/workflow.md` starting from Sprint 0.

## Status

- [x] Planning + harness scaffolded
- [ ] Sprint 0 — project bootstrap (Vite, HTTPS, deps, env)
- [ ] Sprint 1 — composer module (Vercel AI SDK + OpenRouter proxy)
- [ ] Sprint 2 — musician module (Strudel runtime + NoteEvent bus)
- [ ] Sprint 3 — static 3D scene (4 toy characters)
- [ ] Sprint 4 — music ↔ animation sync ⭐
- [ ] Sprint 5 — WebXR (Quest button + framing)
- [ ] Sprint 6 — polish + recorded demo for the paper

## License

To be decided. Defaulting to MIT for the conference release unless something requires otherwise.
