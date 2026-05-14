---
name: strudel-validator
description: Validate a Strudel snippet produced by the composer agent. Catches common LLM mistakes (banned calls, code fences, named-const blocks, single-expression violation, unknown samples) without executing the code. Use after generating Strudel, before pasting into the running app or saving as a paper artifact.
---

# Strudel Validator

When the user asks you to validate Strudel code (e.g. "is this valid?", "check this output", "validate the snippet"), walk through the checks below. Report each as PASS / FAIL with the exact line that triggered the failure. End with a single-line verdict: `VALID` or `INVALID (<n> issues)`.

If invoked without a snippet, ask the user to paste one.

## Input

A Strudel code string. Either inline in the user message or in a file path the user gives you.

## Checks (run in order; stop reporting after the first FAIL in each section only if the FAIL makes later checks impossible)

### 1. Wrapping

- **FAIL** if the string starts with ` ``` ` or ends with ` ``` ` — the model wrapped the answer in a code fence. Strip and continue.
- **FAIL** if there's any prose before or after the code (e.g. "Here is your music:"). Strip and continue.

### 2. Banned calls

The runtime owns playback. The composer must not invoke it.

- **FAIL** on any occurrence of `play(`, `stop(`, `hush(`.
- **FAIL** on any `import` statement.
- **FAIL** on `setCpm(` (camelCase). Should be `.cpm(...)`.

### 3. Single expression

The code must be a single JS expression — no `const`/`let`/`var` declarations, no semicolons separating top-level statements.

- **FAIL** if `;` appears outside of a string. (Trailing `;` is allowed.)
- **FAIL** if a top-level `const`/`let`/`var` keyword appears.

### 4. Required ingredients

The composer must produce at least one of `note(`, `s(`, `stack(`, `seq(`, `cat(`. Otherwise it's not Strudel — it's some unrelated JS.

- **FAIL** if none of those calls is present.

### 5. Tempo

- **WARN** (not FAIL) if neither `.cpm(` nor `setcps(` appears. Strudel will use a default but the composer was instructed to set tempo.

### 6. Sample / instrument coverage

Extract every `s("...")` call. For each:

- **PASS** if the sample is in the known-safe list: `bd`, `sd`, `hh`, `oh`, `cp`, `cb`, `rim`, `tom`, `sine`, `sawtooth`, `triangle`, `square`, `piano`, `rhodes`, `epiano`, `bass`, `gm_alto_sax`, `gm_trumpet`.
- **WARN** otherwise. The sample *may* exist but the composer was instructed to prefer the safe list.

### 7. Drum/bass/keys/horns coverage (informational)

Map each `s("...")` to a `NoteEvent['instrument']` category using the table in `docs/architecture.md` → "src/musician/". Report which of `drums`, `bass`, `keys`, `horns` are present.

This isn't a pass/fail — but if the user asked for a "jazz with piano and bass" and only `drums` shows up, flag it as a likely musical-fit issue.

## Output format

```
strudel-validator
─────────────────
[1/7] wrapping ............ PASS
[2/7] banned calls ........ PASS
[3/7] single expression ... PASS
[4/7] ingredients ......... PASS  (found: note, s, stack)
[5/7] tempo ............... WARN  (no .cpm() — runtime will default)
[6/7] samples ............. WARN  (unknown: "epic_synth")
[7/7] coverage ............ PASS  (drums, bass, keys)

Verdict: VALID (2 warnings)
```

## When to add a check

If you find a new failure mode in the wild (e.g. the model starts emitting `// @ts-check` headers), add a numbered check above and append a one-line note to `prompts/strudel-cheatsheet.md` → "Things the model frequently gets wrong".
