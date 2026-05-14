# Requirements — POC-1

## Why this POC exists

To prove, with the smallest possible technical surface, that the loop

> **[LLM]** → **[Strudel code]** → **[music playing]** → **[3D band animating in sync]** → **[optionally VR]**

is feasible in a single browser process, cross-platform (Linux/macOS/Windows desktop + Meta Quest 3 + Wolvic), with an iteration loop measured in seconds.

The POC is **the deliverable** for a conference publication. Quality is judged by whether a reviewer can reproduce the demo on their hardware in under 10 minutes after cloning the repo. Sophisticated music, photoreal characters, multiplayer, audio analysis are explicitly **out of scope** — they are listed at the bottom of this document.

## Functional requirements

### RF-01 — Natural-language prompt input
The user can type a description ("slow melancholic jazz at 90bpm with piano and bass") and trigger composition with a button.
**Acceptance:** the input is always visible; the Compose button submits to the agent; a visible "composing..." state appears while the API responds.

### RF-02 — Provider-agnostic composer
The agent receives the description and returns syntactically valid Strudel code. The provider (OpenAI, Anthropic, Google, Mistral, Meta, …) is selectable at runtime via an environment variable; no provider's SDK is hard-coded.
**Acceptance:** changing `OPENROUTER_MODEL` in `.env.local` (e.g. from `anthropic/claude-sonnet-4.6` to `openai/gpt-4o`) and restarting `pnpm dev` is enough to switch the model. The generated code is shown to the user in a `<pre>` block (transparency: the demo shows the agent's work).

### RF-03 — Music plays in the browser
The Strudel code executes and audio comes out of the speakers/headphones.
**Acceptance:** after pressing Play, audio starts in < 2 s. Pressing Stop silences within 500 ms.

### RF-04 — Structured per-note events
Each note emits an event containing at minimum: instrument category, note (MIDI or name), absolute start time, duration.
**Acceptance:** an `<EventLog>` panel (visible only in `import.meta.env.DEV`) shows the last 20 events in real time; the scene consumes them without re-parsing them.

### RF-05 — 3D band rendered
Four toy characters representing drums / bass / keys / horns are visible, arranged as a stage. POC art is intentionally minimal — labeled cubes, primitive shapes, or low-poly free assets.
**Acceptance:** the four characters are visible with floating text labels identifying each instrument.

### RF-06 — Animation in sync with music
Each character reacts visually when its instrument plays. Minimum acceptable reaction: a scale pulse (1 → 1.2 → 1 in ~200 ms) and/or a brief color flash.
**Acceptance:** in a 30-second clip, a viewer can correctly identify which instrument is playing at each moment without looking at the code.

### RF-07 — VR mode (optional path)
An "Enter VR" button activates WebXR.
**Acceptance:** in a WebXR-capable browser (Quest Browser, Wolvic, Chrome with WebXR enabled) the button is enabled and pressing it places the user in the scene. In a non-capable browser the button is disabled with an explanatory tooltip. Comfort and aesthetics are *not* part of the acceptance — only that it works.

### RF-08 — Reload-free iteration
The user can compose multiple pieces in sequence without reloading.
**Acceptance:** Stop → edit prompt → Compose → Play works indefinitely with no audio leaks (old notes don't overlap new ones).

## Non-functional requirements

### RNF-01 — Real cross-platform
Same `pnpm build` artifact runs on:
- Chrome and Firefox on Linux (primary dev reference)
- Chrome on Windows 10/11 and macOS recent
- Meta Browser on Quest 2/3 (VR mode)
- Wolvic on Quest / Pico (VR mode)

**Acceptance:** the same URL, same build, loads and plays music in all of the above. VR activates only where supported.

### RNF-02 — Local HTTPS for dev
WebXR demands a secure context.
**Acceptance:** `pnpm dev` brings up `https://localhost:5173` with a self-signed cert auto-trusted after first acceptance.

### RNF-03 — Fast iteration loop
HMR works. Editing scene code reflects in < 2 s without losing audio state. Editing the composer prompt is picked up on the next compose call without restarting the dev server.

### RNF-04 — Audio↔visual latency
Difference between a note sounding and the matching character animating < 100 ms perceptual.
**Acceptance:** in a subjective test with 3 viewers on a 30 s clip, none flag visible desynchronization. **Strategy:** `audioContext.currentTime` is the master clock; animation is scheduled at `event.startTime - audioContext.currentTime` ms ahead.

### RNF-05 — Error recovery
Invalid Strudel or LLM failures don't crash the app. Simulate and recover from:
1. Agent returns text that isn't valid Strudel
2. LLM provider returns 429 / 500
3. User presses Play before composing anything

### RNF-06 — API key safety
`OPENROUTER_API_KEY` never reaches the browser bundle.
**Acceptance:** the key lives in `.env.local` (gitignored), consumed by a server-side Vite middleware (`/api/compose`) that forwards to OpenRouter. Production build uses the same proxy pattern (serverless function); no key in client JS.

### RNF-07 — Reproducibility for reviewers
A reviewer runs `git clone`, `pnpm install`, copies `.env.example` to `.env.local`, adds their own `OPENROUTER_API_KEY`, runs `pnpm dev` — and is producing compositions within 10 minutes.
**Acceptance:** the README's "Getting started" section, followed verbatim on a clean machine, leads to a working demo.

### RNF-08 — Modest line count
POC core (TypeScript under `src/` + `server/`) fits in < 1500 lines (excluding generated types and node_modules). Forces simplicity.

## Publication-specific requirements

### RNF-P1 — Demo video as fallback
A 60–90 s screen-capture demo (desktop + VR) lives in `docs/publication-plan.md` references, so the paper can ship even if the reviewer's hardware can't run WebXR.

### RNF-P2 — Reproducible LLM comparison
The demo can run the same prompt against ≥3 different OpenRouter models and visibly show the differences. (See `.claude/skills/compose-experiment/SKILL.md`.)

### RNF-P3 — Clear contribution framing
`docs/publication-plan.md` states what is novel (the loop, not any individual piece) and what the contribution is (the architecture and reproducible artifact).

## Out of scope (explicit)

To prevent scope creep, **these are NOT in POC-1**:

- Persistence (compose → save → reopen)
- Composition history / multi-prompt workflows
- Sharing (public URL of a composition)
- Inline Strudel code editor (user sees code, doesn't edit)
- Multiple cameras / complex controls (static scene, user looks around in VR)
- Custom shaders / advanced lighting / textures
- Procedural music without LLM (POC-2 idea)
- Audio analysis / sentiment (POC-3 idea)
- VR locomotion (user stays put, watches the band)
- Spatial 3D audio (stereo flat only)
- Automated tests
- Real-time multi-user

## "POC-1 done" checklist

POC-1 is complete when, on a clean machine, a reviewer can:

1. Clone the repo, follow `README.md` → "Getting started", and reach a running app.
2. Type 3 different prompts ("slow jazz", "fast funk", "ambient meditative") and for each:
   - See valid Strudel code rendered
   - Press Play, hear music
   - See the four characters animate in sync
3. Press "Enter VR" on a Quest 3 and see the band in front of them, with audio and synced animations.
4. Exit VR, stop, generate another composition, play it — without a reload.
5. Open `.env.local`, change `OPENROUTER_MODEL` to a different provider (e.g. `openai/gpt-4o`), restart, and reproduce step 2.

If those five succeed, POC-1 ships.
