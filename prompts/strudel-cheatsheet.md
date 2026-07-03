# Strudel Cheatsheet — Reference for the Composer Agent

> A condensed reference for the composer's system prompt. If you change something here, consider whether `prompts/composer-system-prompt.md` needs the same edit.

This file is **not** automatically fed to the LLM in POC-1 — the system prompt is self-contained. This is a reference for *you* (and other agents) when refining the system prompt or debugging generated code.

## Basics

- A Strudel program is a single expression. Whitespace is irrelevant.
- Most functions are chainable: `note("c d e").s("piano").gain(0.5).room(0.4)`.
- `stack(a, b, c)` plays patterns in parallel; `cat(a, b, c)` plays them in sequence (one bar each); `seq(a, b, c)` shorthand similar to cat.
- The mini-notation between quotes is the heart of Strudel:
  - `"c3 e3 g3"` — three notes, one per beat.
  - `"c3*4"` — c3 four times per beat.
  - `"c3/2"` — c3 every two beats.
  - `"~"` — rest.
  - `"<c3 g3 a3 f3>"` — cycle: one element per measure.
  - `"[c3,e3,g3]"` — chord (all simultaneously).
  - `"[c3 e3 g3]"` — fast subdivision.

## Function reference (subset that matters here)

| Function | What it does |
|---|---|
| `note("pat")` | pitch pattern (mini-notation) |
| `s("sample")` | sample / synth name |
| `n("pat")` | sample index variation |
| `bank("RolandTR909")` | drum bank selection |
| `stack(a, b, ...)` | play in parallel |
| `cat(a, b, ...)` | play in sequence, one bar each |
| `gain(0.7)` | volume per voice |
| `cpm(120)` | tempo in cycles per minute (≈ BPM for 4-beat patterns) |
| `setcps(0.5)` | tempo in cycles per second (alternative to cpm) |
| `slow(N)` | play N times slower |
| `fast(N)` | play N times faster |
| `swingBy(0.2, 4)` | apply swing |
| `sometimes(fn)`, `often(fn)`, `rarely(fn)` | probabilistic variation |
| `lpf(freq)` | low-pass filter cutoff |
| `hpf(freq)` | high-pass filter cutoff |
| `room(0.5)` | reverb amount |
| `delay(0.3)` | delay amount |
| `pan(0.5)` | stereo position (0 = left, 1 = right) |

## Sample names available in this app

`@strudel/web`'s `initStrudel()` registers ONLY the synth waveforms below by default — no drums, no piano, no soundfonts (its `registerSoundfonts()` is commented out). This app therefore loads sample packs in `src/musician/index.ts` (`init()` → `prebake`). These are the names that actually produce audio:

**Synth waveforms (always, from `registerSynthSounds`):** `sine`, `sawtooth`, `square`, `triangle`. Only `sawtooth` is mapped to a stage character (the bass).

**Drums (loaded: EmuSP12 + tidal-drum-machines):** `bd`, `sd`, `hh`, `oh`, `cp`, `cb`, `rim` — bare, or kitted with `.bank("RolandTR909" | "RolandTR808" | "RolandTR707")`.

**Keys (loaded: dough-samples piano + VCSL):** `piano`, `fmpiano`.

**Horns (loaded: VCSL):** `sax`.

A name that isn't loaded produces **silence**, not a synth fallback. Don't invent sample names. To add a timbre: register its pack in `init()` AND map its name in `musician/instrument-map.ts` (otherwise the right character won't animate).

## Where Strudel diverges from TidalCycles

- Strudel is JS-native; TidalCycles is Haskell + SuperCollider.
- Strudel runs in the browser; TidalCycles requires a local audio server.
- Mini-notation is the same syntax in practice; function names mostly match.
- Strudel has fewer DSP primitives than TidalCycles. Most jazz "feel" tools work; complex granular synthesis does not.

## Things the model frequently gets wrong (collected over the POC's life — update as you find more)

1. **Inserts `play(...)`** — banned by the system prompt; sometimes still appears. Validate and strip in `composer/`.
2. **Wraps output in code fences** — ` ```js ... ``` `. Same: strip in `composer/`.
3. **Uses `setCpm` (camelCase)** — wrong, it's `.cpm(N)` as a chain method.
4. **Imports** — `import { stack } from '@strudel/core'` — banned, runs already-imported.
5. **Multi-line const declarations** — `const drums = ...; const bass = ...; stack(drums, bass)` — not a single expression. Banned but slips through.
6. **Random sample names** — invents `s("trumpet_loud")`. Not loaded ⇒ plays nothing (silence). Stick to the names in "Sample names available in this app".

When you see one of these, add it to the "Edge cases" section of the system prompt and to the validator skill (`.claude/skills/strudel-validator/SKILL.md`).

## Source of truth

The official Strudel docs are at https://strudel.cc/learn/ and https://strudel.cc/technical-manual/. When the cheatsheet contradicts the docs, the docs win.
