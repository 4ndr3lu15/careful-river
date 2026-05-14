# Gemini CLI — project pointer

The canonical project rules live in **`AGENTS.md`** (root). Read that first.

This file adds only the Gemini-CLI-specific deltas.

## Strengths to lean on here

Gemini's strong suit in this repo is its long context window. Use it when:

- Iterating on `prompts/composer-system-prompt.md` — paste the full Strudel docs and the prompt together; ask for refinements.
- Comparing many generated outputs at once for the paper's results section.
- Reading a whole module (`src/musician/` end to end) and proposing edits.

Example invocations:

```bash
gemini "read docs/architecture.md plus prompts/composer-system-prompt.md and \
       suggest three concrete edits to the system prompt that would reduce \
       the rate of invalid Strudel on the 'ambient' prompt class."

gemini "summarize the differences between Strudel and TidalCycles for a \
       paragraph in the related-work section. Cite which Strudel functions \
       exist that don't have a TidalCycles equivalent."
```

## Constraints specific to Gemini CLI

- Gemini CLI does not understand `.claude/skills/`. If you need the equivalent of a Claude skill, run the procedure manually following the SKILL.md as instructions.
- MCP servers in `.mcp.json` are read by some Gemini CLI builds but support is uneven. If you rely on the filesystem MCP for context, paste the files into the prompt instead.
- Permissions / tool-use behavior is different from Claude Code. Confirm what tool actions Gemini will take before approving.

## Sprint fit

Best in this repo for: **Sprint 1** (composer system-prompt iteration) and **Sprint 6** (paper comparison runs). For multi-file edits, prefer Claude Code or Aider.
