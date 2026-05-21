# Antigravity CLI — project pointer

The canonical project rules live in **`AGENTS.md`** (root). Read that first.

This file adds only the Antigravity-CLI-specific deltas.

## Strengths to lean on here

Antigravity's strongest capabilities in this repo involve deep orchestration, multi-file planning, and parallel research. Use it when:

- **Complex Feature Planning**: Sprints like Sprint 4 (Music ↔ animation sync) that require careful orchestration between modules. Antigravity will automatically create `implementation_plan.md` artifacts, seek approval, and execute tracking via `task.md`.
- **Parallel Codebase Research**: If you need an agent to read deep into `docs/` and `prompts/` while continuing work, Antigravity can spawn background `research` subagents.
- **Deep Alignment**: Use the `/grill-me` slash command when you have a vague idea and want Antigravity to interview you interactively down the design tree until a concrete architecture is decided.
- **Background Timers**: Use the `/schedule` command if you need an agent to periodically check the status of an ongoing task.

Example invocations:

```bash
# General use
antigravity

# Inside the chat UI, for deep alignment on a new feature
/grill-me

# Inside the chat UI, for delegating a long-running robust execution
/goal "Refactor the composer module to support Mistral"
```

## Constraints specific to Antigravity

- Antigravity relies heavily on its own persistent workspace state located at `~/.gemini/antigravity-cli/brain/`. Its plans and walkthroughs will live outside the repo tree as artifacts.
- Antigravity will NOT execute bash commands directly without user approval unless pre-approved (like Claude Code). It uses the `run_command` tool which requires interaction.
- Does not natively read `.claude/skills/` without manual reading.

## Sprint fit

Best in this repo for: **Sprint 4** (Orchestration/Sync) and acting as the **Primary Orchestrator** for complex multi-agent flows or when you're starting a highly ambiguous feature.
