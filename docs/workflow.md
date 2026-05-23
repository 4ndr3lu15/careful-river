# Workflow — Multi-Agent Development Plan

> "I have a deadline, multiple coding-agent CLIs installed, and a fresh repo. Now what?"

This document covers (a) the sprint plan to ship POC-1 and (b) how to drive different coding-agent CLIs against the same repository without contradicting yourself.

## Principles

1. **You are the architect, the agent is the implementer.** Design decisions stay with you. Agents write code for decisions you've already made.
2. **Small verifiable steps.** Each delegation has a "did it work?" test runnable in under 5 minutes. If not, split.
3. **Learn by reading what the agent generates.** Don't accept blind diffs. Ask "why this and not X?" and rewrite when you disagree. This POC is also a TS / Three.js / WebXR / Strudel learning project.
4. **Commit early, commit often.** Every working feature is a commit. You can roll back to any point. Every agent respects `git status` — use it.
5. **The harness is shared; the runtime is not.** All agents read `AGENTS.md`. Each tool's per-tool file (`CLAUDE.md`, `GEMINI.md`, …) only adds tool-specific deltas.

## Sprint plan

Each sprint fits in ~2–3 days of real work. Total: 12–14 days, within a two-week conference push with slack.

### Sprint 0 — Bootstrap (1 day) — ✅ done

**Goal:** environment runs; browser shows a "hello"; LLM proxy answers a curl.

Tasks:

- [x] `pnpm install` works against the placeholder `package.json` (deps added: `pnpm add three @react-three/fiber @react-three/drei @react-three/xr @strudel/web react react-dom ai @openrouter/ai-sdk-provider zod`; `pnpm add -D vite typescript @types/react @types/react-dom @types/three @types/node @vitejs/plugin-basic-ssl @vitejs/plugin-react`)
- [x] HTTPS in `vite.config.ts` via `@vitejs/plugin-basic-ssl`
- [x] `.env.local` with `OPENROUTER_API_KEY` (gitignored — already)
- [x] Empty `src/main.tsx` + `src/app/App.tsx` (title-only page)
- [x] `server/compose-handler.ts` skeleton that returns `{ code: 'note("c4").s("sine")' }` without calling any LLM yet
- [x] `https://localhost:5173` loads without errors
- [x] `curl -k -X POST https://localhost:5173/api/compose -H 'content-type: application/json' -d '{"prompt":"test"}'` returns the stub

**Done when:** browser opens to "Banda Virtual"; curl returns the stub JSON. — **met** (Vite 8; `@types/node` added to devDeps; `packageManager` field corrected `pnpm@9` → `pnpm@10.33.0`).

### Sprint 1 — Composer + OpenRouter wiring (2 days) — ✅ done

**Goal:** type a prompt → see Strudel code generated.

Delegate to a coding agent:

- `src/composer/index.ts` with `compose()` that POSTs to `/api/compose`
- `server/compose-handler.ts` real implementation using `ai` + `@openrouter/ai-sdk-provider`
- `<ComposerPanel>` React component with textarea + button + `<pre>` for the code

You do manually:

- Refine `prompts/composer-system-prompt.md` and test 5–10 prompts.
- Pick the default `OPENROUTER_MODEL` for the demo (see `docs/llm-providers.md`).

**Done when:** three different prompts produce three different, plausible Strudel snippets visible on screen. — **met**

### Sprint 2 — Musician (Strudel runtime + event bus) (2 days) — ✅ done

**Goal:** generated code actually plays, and emits per-note events.

Delegate:

- `src/musician/index.ts` with `init()`, `play(code)`, `stop()`, `events`, `audioContext`
- Event capture via `onTrigger` (see [Strudel technical manual](https://strudel.cc/technical-manual/repl/))
- `src/musician/instrument-map.ts`
- Temporary `<EventLog>` (dev-only) showing the last 20 events

You do manually:

- Validate `audioContext.currentTime` is consistent between Strudel and your code.
- Extend the instrument map as new samples appear.

**Done when:** Play produces audio + the EventLog fills with coherent timestamps (~125 ms between hits at 120 bpm). — **met**

### Sprint 3 — Static 3D scene (1–2 days) — ✅ done

**Goal:** four characters visible, no audio coupling yet.

Delegate:

- `<Stage>` in `src/stage/`
- `<Musician>` (a labeled box for POC), `<Floor>`
- `<ambientLight>` + `<directionalLight>`
- `OrbitControls` from drei (desktop only)

**Done when:** page shows four colored boxes in an arc on a plane; mouse-drag rotates the view; each box has a readable label. — **met**

### Sprint 4 — Music ↔ animation sync (2–3 days) ⭐ — ✅ done

**Goal:** boxes pulse when their instrument plays.

Delegate:

- Subscribe in `<Musician>` to `events`, filter by instrument
- Compute `delay = (event.startTime - audioContext.currentTime) * 1000`
- `setTimeout(triggerPulse, Math.max(0, delay))`
- Pulse via `useFrame` + `useRef` (no `framer-motion`)

**Done when:** RF-06 and RNF-04 from `docs/requirements.md` are met. — **met**

### Sprint 5 — WebXR (1–2 days) — ✅ done

**Goal:** "Enter VR" works on Quest 3.

Delegate:

- Wrap `<Canvas>` with `<XR>`/`createXRStore`
- VR button → `store.enterVR()`
- Disable the button if `navigator.xr` is absent or `isSessionSupported('immersive-vr')` returns false
- Position the user ~3 m from the band, ~1.6 m height

You do manually:

- Test on Quest 3. If no Quest, use the Chrome WebXR emulator extension.

**Done when:** RF-07 from `docs/requirements.md` is met.

### Sprint 6 — Polish + recorded demo (1–2 days)

**Goal:** every "POC-1 done" checkbox in `docs/requirements.md` ticks.

Tasks:

- Error recovery (RNF-05) — run the three scenarios
- Loading states on buttons
- README "Getting started" verified on a clean machine
- 60–90 s screen recording (desktop + VR) saved next to `docs/publication-plan.md`
- The "swap model" demo — show prompt A on three different models, save outputs

## Picking a coding agent

You have multiple CLIs. Use the right one per task; none of them is "the best at everything." The repo's harness is shared (`AGENTS.md`); only the invocation differs.

| Tool | Best at | Worst at | Invoke |
|---|---|---|---|
| **Antigravity** (`antigravity`) | Deep orchestration, multi-file planning, background research (`research` subagent), `/grill-me` alignment | Quick single-line edits | `antigravity` in repo root |
| **Claude Code** (`claude`) | Multi-file refactors, planning, deep reasoning, tool-using tasks, this project's primary | Quick single-line edits | `claude` in repo root |
| **Gemini CLI** (`gemini`) | Massive context (1M+ tokens) — paste an entire module to discuss; cheap exploration | Multi-file editing flow | `gemini` in repo root |
| **GitHub Copilot CLI** (`gh copilot`) | Quick shell command suggestions; PR descriptions | Project-level architectural work | `gh copilot suggest "..."` |
| **OpenCode** (`opencode`) | Open-source workflow; provider-flexible; works with the same OpenRouter key you already have | Less polished UX than Claude Code | `opencode` in repo root |
| **Aider** (`aider`) | Surgical git-aware edits; explicit file selection | Open-ended exploration | `aider src/composer/index.ts` |
| **Cursor / Continue / Roo** (IDE) | In-editor inline edits | Long autonomous sessions | Inside the editor |

Suggested mapping to sprints:

- Sprint 0 (bootstrap): **Claude Code** — multi-file scaffold, env wiring, runs commands.
- Sprint 1 (composer): **Claude Code** for the architecture, **Gemini CLI** to discuss the system prompt with full Strudel docs pasted in.
- Sprint 2 (musician): **Claude Code** — needs to read multiple Strudel sources and synthesize.
- Sprint 3 (scene): **Aider** or **Cursor** — small, well-scoped per-component edits.
- Sprint 4 (sync): **Antigravity** or **Claude Code** — this sprint is the brain of the project. Use Antigravity to plan (`/grill-me`) and manage the overall orchestrator tasks.
- Sprint 5 (XR): **Claude Code** + Aider for follow-ups.
- Sprint 6 (polish): mix; **gh copilot** for one-liners and PR descriptions.

Don't agonize. Try one, if it stalls switch.

## Driving each agent

### Claude Code (`claude`)

Reads `CLAUDE.md` automatically. The `.claude/skills/` folder is available — invoke via `/strudel-validator`, `/compose-experiment`, `/webxr-preflight`. MCP servers in `.mcp.json` activate automatically.

Useful built-ins:
- `/init` — generates a CLAUDE.md (don't use here; we already have a curated one)
- `/clear` — clear conversation, keep file context
- `/compact` — compress history
- `git diff` — always review before accepting

### Gemini CLI (`gemini`)

Reads `GEMINI.md` and falls back to `AGENTS.md`. Strength: huge context window. Workflow that plays to it: `gemini "read docs/architecture.md, prompts/composer-system-prompt.md, and src/composer/index.ts and propose changes to the system prompt to handle the 'ambient' prompt class better."`

### GitHub Copilot CLI (`gh copilot`)

Reads `.github/copilot-instructions.md`. Use for:

- `gh copilot suggest "vite https config with mkcert certs"`
- `gh copilot explain "pnpm tsc --noEmit"`
- Inline IDE editing in VS Code / JetBrains.

### OpenCode (`opencode`)

Reads `AGENTS.md` and `opencode.json`. Same OpenRouter key as the runtime — set `OPENROUTER_API_KEY` in your shell.

### Aider (`aider`)

Reads `AGENTS.md`. Pass files explicitly: `aider src/composer/index.ts server/compose-handler.ts`. Use `/ask` for read-only discussion, `/code` for edits, `/commit` for git.

## Prompt patterns that work in this repo

### Pattern: scoped feature implementation

```
Context: I'm in Sprint 2 of this repo (banda-virtual POC). I need the
musician/ module.

Task: implement src/musician/ as specified in docs/architecture.md (section
"src/musician/"). Only modify files under src/musician/. Use TypeScript
strict. No tests.

Done when: calling musician.init() then musician.play('s("bd ~ sd ~")')
makes audio play and dispatches at least four 'note' events on
musician.events. I'll verify by adding a console.log temporarily.

If anything in the NoteEvent contract is ambiguous, stop and ask.
```

### Pattern: provider swap experiment

```
For the conference comparison table, I need to run the same prompt against
three different OpenRouter models and capture (a) the Strudel code
generated, (b) wall-clock latency, (c) a yes/no on "is this valid Strudel".

Read .claude/skills/compose-experiment/SKILL.md and follow it. Use prompts:
"slow melancholic jazz at 90bpm", "fast funk with heavy drums",
"ambient meditative".

Save results as docs/experiments/<date>-comparison.md.
```

### Pattern: debugging

```
When I run `pnpm dev` and click Play with this Strudel code generated by
the agent:

[paste full code]

I see the following error in the console:

[paste full stack trace]

Read src/musician/index.ts and tell me what's happening — don't propose a
fix yet, just explain.
```

### Anti-patterns

- ❌ "Build the whole POC" — the agent generates noise and you don't learn.
- ❌ "Refactor for cleanliness" — it'll touch everything.
- ❌ "Add tests" — out of scope in POC-1.
- ❌ Granting `--dangerously-skip-permissions` (Claude Code) or equivalents before you trust the workflow.

## Per-platform setup notes

### Linux (Arch is the dev reference)

- Use `nvm` for Node, not `pacman`. `nvm install --lts`.
- `corepack enable && corepack prepare pnpm@latest --activate`.
- `mkcert` from the AUR. `mkcert -install && mkcert localhost`.
- Quest USB debug: `sudo pacman -S android-tools android-udev`. `adb devices` should list the headset.

### macOS

- Node via Homebrew or nvm; `corepack enable`.
- `brew install mkcert nss && mkcert -install`.

### Windows

- Node via `nvm-windows`; `corepack enable` from an admin shell.
- `choco install mkcert` (or download binary); `mkcert -install`.
- Quest debugging: install the Meta OEM USB driver.

## When something goes wrong

| Symptom | Probable cause | What to do |
|---|---|---|
| Blank page | JS error at boot | DevTools console, read the stack |
| HTTPS cert warning | mkcert CA not installed | `mkcert -install` again |
| `/api/compose` 401 | Missing `OPENROUTER_API_KEY` | Edit `.env.local`, restart dev |
| `/api/compose` 400 with "model not found" | Typo in `OPENROUTER_MODEL` | Check exact id on openrouter.ai/models |
| Audio doesn't start | Autoplay policy | First user click must call `audioContext.resume()` |
| Black 3D scene | No lights | Add `<ambientLight />` + `<directionalLight />` |
| WebXR button disabled in desktop Chrome | WebXR flag off | `chrome://flags` → "WebXR" |
| Quest not in `adb devices` | USB debug off | Headset → Settings → Developer → USB Debug ON |
| First note takes 5 s+ | Strudel loading samples | Show a loading state; samples cache after first load |
| Animation lags audio | Used `Date.now()` instead of `audioContext.currentTime` | See `docs/architecture.md` "Contract of events" |

## Metrics to track (one line per sprint)

In a `NOTES.md` you keep (not committed):

- Time spent vs estimated (calibrates future estimates).
- LOC added (keep core < 1500 — RNF-08).
- Things the agent got wrong (these become CLAUDE.md / AGENTS.md updates).
- Which model worked best for which sprint (input for the paper's comparison).
