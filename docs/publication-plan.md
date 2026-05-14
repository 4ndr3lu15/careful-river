# Publication Plan

> "I want to publish this at a conference, soon. What does the artifact need to look like?"

This document is a working draft. Treat dates as TBD and venue choices as candidates — the goal is to keep the engineering work pointing at a coherent publication target.

## What's novel (the contribution framing)

The contribution is **the architectural pattern**, not any individual component:

1. **Single-runtime composer ↔ scene ↔ XR loop.** Everything in one browser process, no IPC/OSC bridges. Each piece (LLM call, Strudel runtime, R3F scene, WebXR session) is off-the-shelf; the recipe for fusing them is the contribution.
2. **Model-agnostic creative agent.** A single system prompt + OpenRouter routing turns any frontier model into a competent live-coding composer. Reviewers can rerun the comparison with their own keys.
3. **Multi-CLI dev harness as a reproducibility artifact.** The same repo is navigable by Claude Code, Gemini CLI, Copilot CLI, OpenCode, Aider. The paper's "Reproducibility" section can point at this as a generalizable pattern for agentic-coding projects.

What we **do not** claim:

- That this is musically superior to live coders, TidalCycles users, or generative music research projects.
- That WebXR is the best VR stack for production work.
- That OpenRouter is uniquely suitable.

The honest framing: "Here is a small, reproducible artifact that fuses agentic music generation with embodied XR rendering; we describe the architectural decisions; we measure where current frontier LLMs land on this task."

## Candidate venues

Pick at most one primary target by Sprint 1; line up two fallbacks.

| Venue | Track / format | Why it fits | Why it might not |
|---|---|---|---|
| **NIME** (New Interfaces for Musical Expression) | Demo / Late-Breaking | Music + interaction + novel interface — bullseye | Reviewer base may want sound-quality depth we don't have |
| **CHI** | Late-Breaking Work / Interactivity | HCI + agents + XR | Higher bar; tight deadlines |
| **IEEE VR / IEEE ISMAR** | Posters / Workshop | XR audience | They want VR-research depth |
| **ICCC** (Computational Creativity) | Short paper / Demo | Generative + creative agents | Smaller audience |
| **AIxMusic / AIMC** workshops | Workshop paper | Agentic + music | Niche, but high fit |
| **Web3D** | Short paper | WebXR core | Aging community |

Default plan: **target NIME demo + a workshop fallback** unless the timeline forces a different choice.

## Demo script (for paper video + live presentation)

A reproducible script the reviewer can replay verbatim. ~90 seconds end to end.

```
00:00  Clean browser, https://localhost:5173 open.
00:05  Type: "slow melancholic jazz at 90bpm with piano and bass."
       Press Compose.
00:10  Generated Strudel code appears in the right panel.
       (Visible: model name "anthropic/claude-sonnet-4.6".)
00:15  Press Play. Audio starts. Four boxes pulse in sync.
       Camera orbits with mouse.
00:30  Press Stop. Edit prompt to "fast funk with heavy drums".
       Compose. Play. Same loop, different vibe.
00:50  Press Enter VR (Quest screen-capture cuts in here).
00:55  Viewer is in front of the band in the headset. The same animation
       happens, head-locked to the room.
01:10  Take headset off. Open .env.local, change OPENROUTER_MODEL to
       openai/gpt-4o, restart dev server.
01:25  Same prompt ("fast funk..."). Compose. Visibly different code.
       Play.
01:30  Fade out.
```

## Comparison artifact (for the paper's results section)

Run the same set of prompts against multiple models, capture results, report.

**Prompts (locked for the comparison):**

1. "slow melancholic jazz at 90bpm with piano and bass"
2. "fast funk with heavy drums and a syncopated bass line"
3. "ambient meditative texture with no clear pulse"
4. "uptempo bossa nova in a minor key"
5. "tense soundtrack for a chase scene, around 120bpm"

**Models (locked for the comparison):**

1. `anthropic/claude-sonnet-4.6`
2. `openai/gpt-4o`
3. `google/gemini-2.5-pro`

**Captured per (prompt, model):**

- Strudel code as emitted (verbatim)
- Wall-clock latency from request to first byte
- Syntactic validity (does `evaluate(code)` throw?)
- Musical-fit rating (3-point Likert from 3 reviewers blinded to model name)
- Token cost (input + output)

Save to `docs/experiments/<date>-comparison.md`. The procedure to regenerate is in `.claude/skills/compose-experiment/SKILL.md`.

## What lands in the paper

- **Section 1 — Introduction**: the loop, the framing.
- **Section 2 — Related work**: TidalCycles + visual coupling (cite Sorensen, McLean), agentic music (cite Magenta, MusicLM, MusicGen), browser-based music synthesis (Web Audio API papers), WebXR research demos.
- **Section 3 — System architecture**: figure from `docs/architecture.md` "Component view"; description of each module; the `NoteEvent` contract.
- **Section 4 — LLM provider abstraction**: the rationale for OpenRouter + Vercel AI SDK; the swap recipe; the cost guardrails.
- **Section 5 — Implementation**: stack table, ~1500 LoC core; HTTPS + WebXR constraints; the multi-CLI harness as a reproducibility lever.
- **Section 6 — Comparison results**: the experiment above as a table; qualitative observations.
- **Section 7 — Limitations and future work**: link to POC-2 (procedural without LLM) and POC-3 (audio analysis driving the prompt).
- **Appendix A — Reproducibility**: clone → run in <10 minutes; the `compose-experiment` skill.

## Pre-submission checklist

- [ ] All five demo-script steps reproducible on a clean Linux laptop and on a Quest 3.
- [ ] `docs/experiments/<date>-comparison.md` filled with real data, not placeholders.
- [ ] Screen recording (desktop) and Quest screen-capture saved (uncompressed source + a compressed mp4 for the proceedings).
- [ ] Repo is public (or anonymized for double-blind), CI badge passing.
- [ ] `README.md` reviewed by one person who hasn't touched the project.
- [ ] License file present (MIT default, see `README.md`).
- [ ] Citation file (`CITATION.cff`) added.
- [ ] If double-blind: replace author info with placeholders in `package.json` and any header comments.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Quest 3 unavailable on submission day | Medium | High | Pre-record VR footage; use Wolvic on a spare device |
| OpenRouter rate-limits mid-demo | Low | High | Pre-cache a few generations; offer to play "saved" outputs |
| Frontier model deprecated between submission and presentation | Medium | Medium | Lock exact model ids in the paper; pin them in `.env.example` comments |
| WebXR API breaking change in Chrome/Firefox | Low | High | Test in stable channels; record the demo against the version used to write the paper |
| Reviewer can't reproduce because no OpenRouter key | Medium | Medium | Provide a small playback mode that replays a cached generation (POC-2 work) |
| Conference deadline slips | TBD | TBD | Workshop fallback identified above |
