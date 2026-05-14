# Claude Code — project pointer

The canonical project rules live in **`AGENTS.md`** (root). Read that first; it covers stack, conventions, hard rules, module layout, and where to look for what.

This file adds only the Claude-Code-specific deltas.

## Skills available in this repo

Invoke via `/<skill-name>`:

- `/strudel-validator` — validate a Strudel snippet (syntax shape, banned patterns, instrument coverage). Use after generating code, before pasting it into the running app.
- `/compose-experiment` — run the same prompt against multiple OpenRouter models and capture results for the paper's comparison table.
- `/webxr-preflight` — checklist before testing in VR (HTTPS, audio gesture, OrbitControls disable, etc.).

Definitions: `.claude/skills/<name>/SKILL.md`.

## MCP servers

Defined in `.mcp.json`. They activate automatically when you start in this directory:

- **filesystem** (read-only) over the `docs/` and `prompts/` folders — fast access to the planning docs and the system prompt.
- **fetch** — for grabbing live Strudel docs at https://strudel.cc/learn/ during system-prompt iteration.

If a server fails to start, check that `npx` is on PATH and that node ≥ 20 is in use.

## Settings

`.claude/settings.json` declares pre-approved permissions for `pnpm`, `git status`/`diff`, type-checking, and reading project files. Anything destructive (rm, git reset, force push) still prompts.

## Working pattern that fits this repo

1. Open with `claude` in the repo root. Confirm `AGENTS.md` and `CLAUDE.md` were read (`/memory` or just ask).
2. Pick a sprint from `docs/workflow.md`.
3. Use the matching prompt pattern from `docs/workflow.md` → "Prompt patterns".
4. After each delegated change, run `git diff` before accepting.
5. Use `/clear` between sprints.

## Don'ts

- Don't run `/init` here — it overwrites this curated `CLAUDE.md`.
- Don't use `--dangerously-skip-permissions` until you've watched at least one full sprint go through without surprises.
- Don't add new project-wide rules to *this* file. Add them to `AGENTS.md`. Only Claude-specific guidance belongs here.
