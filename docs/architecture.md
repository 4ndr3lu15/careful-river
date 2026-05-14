# Architecture — POC-1

## Guiding principle

**Everything in the same runtime (the browser) to eliminate bridges.** The cost of crossing process boundaries — Unity ↔ Strudel via WebSocket, TidalCycles ↔ scene via OSC — is high in complexity, latency, and fragility. We keep music, scene, agent in the same JS event loop. The agent runs on a small server-side proxy (Vite middleware) for one reason only: to hide the LLM API key.

## Component view

```
┌──────────────────────────────────────────────────────────────────┐
│                       BROWSER (single page)                      │
│                                                                  │
│  ┌──────────────────────┐                                        │
│  │   UI (React)         │                                        │
│  │   - prompt input     │                                        │
│  │   - Compose button   │                                        │
│  │   - Play/Stop        │  ─── handlers call ───┐                │
│  │   - Enter VR         │                       │                │
│  │   - code panel       │                       ▼                │
│  └──────────────────────┘            ┌────────────────────┐      │
│                                      │  composer/         │      │
│                                      │  - POST /api/compose ──┐  │
│                                      │  - validate syntax │   │  │
│                                      │  - return code     │   │  │
│                                      └────────────────────┘   │  │
│                                                ▼              │  │
│                                      ┌────────────────────┐   │  │
│                                      │  musician/         │   │  │
│                                      │  - init Strudel    │   │  │
│                                      │  - evaluate(code)  │   │  │
│                                      │  - emit NoteEvents │   │  │
│                                      └─────────┬──────────┘   │  │
│                                                │              │  │
│                                                ▼              │  │
│                                          ┌──────────┐         │  │
│                                          │ EventBus │         │  │
│                                          │  (native │         │  │
│                                          │  EventTarget)      │  │
│                                          └────┬─────┘         │  │
│                                               │ subscribe     │  │
│                                               ▼               │  │
│                                     ┌────────────────────┐    │  │
│                                     │  stage/  (R3F)     │    │  │
│                                     │  - 4 Musicians     │    │  │
│                                     │  - Floor           │    │  │
│                                     │  - WebXR canvas    │    │  │
│                                     └────────────────────┘    │  │
└───────────────────────────────────────────────────────────────│──┘
                                                                │
                          ┌─────────────────────────────────────┘
                          ▼
              ┌──────────────────────────┐
              │  Vite middleware         │     server/compose-handler.ts
              │  /api/compose            │
              │  - injects API key       │
              │  - calls Vercel AI SDK   │
              │  - SDK → OpenRouter      │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │  OpenRouter              │
              │  fan-out to:             │
              │  - openai/gpt-4o         │
              │  - anthropic/claude-*    │
              │  - google/gemini-*       │
              │  - mistralai/*           │
              │  - meta-llama/*          │
              │  - …                     │
              └──────────────────────────┘
```

## Modules

Each top-level folder under `src/` is a module. Each module exposes a small public interface via `index.ts`. Nothing imports from a sibling module's subpaths.

### `src/composer/`

**Responsibility:** turn a natural-language description into valid Strudel code.

**Public interface:**

```ts
export interface ComposeRequest {
  prompt: string;
  bpm?: number;      // optional hint
  duration?: number; // optional hint, seconds
  modelOverride?: string;  // optional, e.g. "openai/gpt-4o" — wins over env
}

export interface ComposeResult {
  code: string;          // ready for evaluate()
  model: string;         // the model that actually answered
  rationale?: string;    // optional, the agent's brief reasoning (debug)
}

export async function compose(req: ComposeRequest): Promise<ComposeResult>;
```

**Internals:** `POST /api/compose`, validates that the response shape looks like Strudel (contains at least one of `note(`, `s(`, `stack(`, `seq(`, `cat(`). No automatic retry in POC-1.

### `server/compose-handler.ts`

**Responsibility:** the *only* place that knows the OpenRouter API key. Runs as a Vite middleware in dev; deploys as a serverless function in production.

**Behavior:**

1. Reads `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME` from env.
2. Loads `prompts/composer-system-prompt.md` (everything after the `## PROMPT` marker).
3. Calls `generateText({ model, system, prompt, maxOutputTokens: 1024 })` via the Vercel AI SDK with the `@openrouter/ai-sdk-provider` provider.
4. Returns `{ code, model }` to the client.
5. On error, returns 502 with a structured payload `{ error: { code, message, providerStatus?, retryable: boolean } }`.

### `src/musician/`

**Responsibility:** run Strudel and emit per-note events.

**Public interface:**

```ts
export interface NoteEvent {
  instrument: 'drums' | 'bass' | 'keys' | 'horns' | 'other';
  note?: number | string;       // MIDI or name
  velocity?: number;             // 0..1
  startTime: number;             // audioContext.currentTime when the note plays
  duration: number;              // seconds
  raw: unknown;                  // original Strudel hap, for debug
}

export function init(): Promise<void>;
export function play(code: string): Promise<void>;
export function stop(): void;
export const events: EventTarget;     // CustomEvent<NoteEvent> on type 'note'
export const audioContext: AudioContext;  // exposed so the scene shares the clock
```

**Internals:** uses `@strudel/web` with `initStrudel({ prebake: ... })`. Per-note events come from `onTrigger` (Strudel's per-hap callback). A small `instrument-map.ts` maps Strudel sample names (`'bd'`, `'sd'`, `'piano'`, …) to the simplified `NoteEvent['instrument']` categories.

```ts
const INSTRUMENT_MAP: Record<string, NoteEvent['instrument']> = {
  bd: 'drums', sd: 'drums', hh: 'drums', oh: 'drums', cp: 'drums', cb: 'drums',
  bass: 'bass', sawtooth: 'bass',
  piano: 'keys', rhodes: 'keys', epiano: 'keys',
  gm_alto_sax: 'horns', gm_trumpet: 'horns', sax: 'horns', trumpet: 'horns',
  // anything unknown → 'other'
};
```

### `src/stage/`

**Responsibility:** render the 3D scene, subscribe to events, animate characters.

**Components (in `src/stage/components/`):**

- `Stage.tsx` — orchestrator; sets up Canvas + XR, positions characters
- `Musician.tsx` — generic character; subscribes to its instrument's events and animates
- `Floor.tsx` — reference plane
- `VRButton.tsx` — Enter VR

Each `<Musician>` receives `instrument` as a prop and uses `useEffect` to subscribe to `events.addEventListener('note', handler)` with a filter on its instrument.

### `src/app/`

**Responsibility:** glue. React UI, current composition state, button handlers.

`App.tsx` holds:

- `prompt: string` (controlled input)
- `code: string | null` (latest generated code)
- `model: string | null` (which model actually answered, for the UI)
- `status: 'idle' | 'composing' | 'ready' | 'playing' | 'error'`
- `error: string | null`

## The event contract (heart of the sync)

`NoteEvent` is the **only** point of contact between `musician/` and `stage/`. If this contract is right, either side can be replaced without touching the other.

Temporal flow of one note:

```
T0:   Strudel scheduler decides 'bd' will play at audioCtx.currentTime + 0.1
T0:   musician/ receives the onTrigger callback (time, value)
T0:   musician/ dispatches NoteEvent { instrument: 'drums', startTime: time, ... }
T0:   stage/ (drums Musician) receives the event,
      schedules animation at (time - audioCtx.currentTime) ms
T0+100ms:  'bd' actually sounds
T0+100ms:  drum character's scale pulses
```

**Critical detail:** the `time` from Strudel is in the *future* (lookahead is typically 50–150 ms). You don't animate immediately on receiving the event — you `setTimeout(animate, (event.startTime - audioContext.currentTime) * 1000)`. This is how the sync stays tight.

## LLM provider abstraction

We do **not** import `@anthropic-ai/sdk` or `openai`. We import:

```ts
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
```

The provider is constructed once per request using env vars, then handed to `generateText`. The model id is a string like `openai/gpt-4o` or `anthropic/claude-sonnet-4.6` — OpenRouter's namespace.

Why this layering:

- **Vercel AI SDK** is the *call site* abstraction. Tools, structured output, streaming, retries all live in one API regardless of provider.
- **OpenRouter** is the *fan-out* abstraction. One key, one URL, dozens of models.
- Together they make model comparison trivial: change a string, restart, repeat.

Details and the full model list are in `docs/llm-providers.md`.

## Initialization flow

```
1. App mounts
2. UI renders (input + buttons)
3. stage/ initializes three.js scene (canvas hidden until first compose)
4. musician/.init() loads @strudel/web + default samples   ← can take 1–3 s
5. User types a prompt, clicks Compose
6. composer/.compose(prompt) → POST /api/compose
7. Middleware injects key, calls OpenRouter via Vercel AI SDK
8. Response returns, composer validates shape
9. App sets state.code = result.code; the code panel renders
10. User clicks Play
11. musician/.play(code) evaluates; scheduler starts
12. Events start firing, stage animates in lock-step
13. User clicks Stop → musician.stop() → silence
```

## Justified technical decisions

### Why React + R3F, not raw three.js
R3F makes the scene declarative. "Four musicians" is JSX; React reconciles. Iteration speed dominates for a POC. Cost: ~30 KB, irrelevant.

### Why EventTarget, not RxJS / Zustand / Redux
For POC-1, `new EventTarget()` + `CustomEvent` is enough. Zero deps, native API, every web dev knows it. If POC-2 needs complex stream combinators, justify them then.

### Why a server-side proxy, not direct browser calls
API keys cannot reach the browser bundle. Vite has built-in middleware support; one tiny file (`server/compose-handler.ts`) handles it in dev. In production the same handler becomes a serverless function (Vercel, Cloudflare, Netlify).

### Why TypeScript strict
1. Coding agents (Claude Code, Gemini CLI, Copilot, OpenCode) generate dramatically better code under strict TS — the types guide them.
2. Catches bugs JS would only surface at runtime.
3. `NoteEvent` as a shared type prevents drift between `musician/` and `stage/`.

### Why not the full Strudel REPL
`@strudel/repl` bundles the strudel.cc editor (~2 MB). We don't want a user editor — we want an agent editor. `@strudel/web` ships the pattern engine + audio only.

### Why OpenRouter, not direct provider SDKs
- One API key, many providers — cheaper to manage during research.
- Comparable error semantics across vendors (OpenRouter normalizes a lot).
- One line change to swap models for the publication's comparison table.
- Tradeoff: small markup, slight latency. Acceptable for POC; revisit if costs explode.

### Why Vercel AI SDK over raw OpenRouter HTTP
- Built-in retries, streaming, tool use, structured output — anything POC-2/POC-3 might need without rearchitecting.
- Provider-agnostic call sites: if we ever drop OpenRouter, we change the provider construction, not every call.
- Battle-tested, well-typed, actively maintained.

## Known failure points

1. **Strudel takes seconds on first load (samples).** Call `musician.init()` at boot with a visible loading state.
2. **WebXR requires HTTPS.** Use `@vitejs/plugin-basic-ssl` or `mkcert` from Sprint 0.
3. **Quest Browser has Web Audio quirks.** Autoplay requires gesture. Test on real Quest by Sprint 5, not Sprint 6.
4. **Animation jitter at 30 fps in VR.** Up to 33 ms wobble. Acceptable for POC; document it.
5. **Bad Strudel from the agent breaks the scheduler.** Strudel can loop forever on certain patterns. Wrap `evaluate` in try/catch, and keep Stop always reachable.
6. **OpenRouter model name typos return 400, not 404.** Validate the model name in the middleware and return a clear error to the UI.
7. **Long generations time out.** Set `maxOutputTokens: 1024` and a 30 s request timeout.

## Forward-looking contract notes

`NoteEvent` is minimal on purpose. Future POCs can extend without breaking this one:

- POC-2 may add `intensity: number` driving scale/brightness of the animation.
- POC-3 may add a separate per-composition `mood: { tension, energy, romance }` that drives ambient lighting.

Keep `NoteEvent` lean in POC-1; extend only when a real need shows up.
