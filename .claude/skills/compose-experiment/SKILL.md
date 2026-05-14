---
name: compose-experiment
description: Run the same prompt against multiple OpenRouter models, capture Strudel output + latency + validity, and write results to docs/experiments/<date>-comparison.md. Use when preparing the paper's comparison table or sanity-checking how a new model behaves on the composer task.
---

# Compose Experiment

When the user asks you to "run a comparison", "compare models on this prompt", "generate the paper's comparison table", or similar, follow this procedure.

## Inputs (ask if missing)

- **Prompts** — at least one, ideally the locked set from `docs/publication-plan.md` → "Comparison artifact":
  1. "slow melancholic jazz at 90bpm with piano and bass"
  2. "fast funk with heavy drums and a syncopated bass line"
  3. "ambient meditative texture with no clear pulse"
  4. "uptempo bossa nova in a minor key"
  5. "tense soundtrack for a chase scene, around 120bpm"
- **Models** — at least one, ideally the locked set:
  1. `anthropic/claude-sonnet-4.6`
  2. `openai/gpt-4o`
  3. `google/gemini-2.5-pro`
- **Output path** — default `docs/experiments/<YYYY-MM-DD>-comparison.md`.

## Preconditions

- `pnpm dev` must be running (the experiment hits `/api/compose`).
- `.env.local` must have a valid `OPENROUTER_API_KEY`.
- The composer endpoint must accept a `modelOverride` field (`ComposeRequest.modelOverride` in `docs/architecture.md`). If `/api/compose` doesn't honor it yet, stop and tell the user — that's a Sprint 1 task.

## Procedure

For each (prompt, model) pair:

1. Capture `t0 = Date.now()`.
2. `curl -k -X POST https://localhost:5173/api/compose -H 'content-type: application/json' -d '{"prompt":"<prompt>","modelOverride":"<model>"}'`
3. Capture `t1 = Date.now()`. Latency = `t1 - t0` ms.
4. Parse the JSON response. Extract `code` and `model`.
5. Run `/strudel-validator` on `code`. Capture the verdict (VALID / INVALID).
6. Record the row.

If any single call fails (non-200, JSON parse error, timeout), record the failure as a row with a `status` column, do not abort the run.

Between calls, sleep ~500 ms to avoid hammering OpenRouter.

## Output format

Write `docs/experiments/<YYYY-MM-DD>-comparison.md` with this shape (Markdown):

```markdown
# Composer comparison — <YYYY-MM-DD>

Run from commit `<short sha>`. Operator: `<git user.name>`.
Models tested: `<comma-separated list>`.
Composer system prompt SHA: `<sha256 of prompts/composer-system-prompt.md>`.

## Summary table

| Prompt | Model | Latency (ms) | Validator | Tokens (in/out) | Notes |
|---|---|---|---|---|---|
| slow jazz | anthropic/claude-sonnet-4.6 | 1820 | VALID | 612/487 | |
| slow jazz | openai/gpt-4o | 950 | VALID | 612/421 | |
| slow jazz | google/gemini-2.5-pro | 2410 | INVALID (3) | 612/512 | wrapped in code fence; used setCpm; defined const |
| ...

## Per-call details

### slow jazz × anthropic/claude-sonnet-4.6

```js
stack(
  s("bd ~ ~ sd").bank("RolandTR909").gain(0.5),
  ...
).cpm(90).swingBy(0.15, 4)
```

### slow jazz × openai/gpt-4o

[code]

### ...

## Observations

[free-form: which model picked which key, which produced the most rhythmically interesting drum patterns, which over-generated, etc. This is the qualitative input for the paper's results section — don't leave it empty.]
```

## After the run

- Commit the experiment file: `git add docs/experiments/<file>.md && git commit -m "experiment: compose comparison <date>"`.
- If any validator failure pattern is **new** (not already in `prompts/strudel-cheatsheet.md` → "Things the model frequently gets wrong"), append it there in the same commit.
- If costs were unexpected, note them in `docs/llm-providers.md` → "Cost guardrails".

## Don't

- Don't run this with random ad-hoc prompts when preparing the paper. Stick to the locked set, otherwise the paper is no longer reproducible.
- Don't include the raw HTTP response (it's noisy and leaks the model's reasoning). Extract just `code`, `model`, latency, validator verdict.
- Don't run more than ~50 (prompt × model) combinations in a single run. OpenRouter rate limits will kick in and the comparison becomes lopsided.
