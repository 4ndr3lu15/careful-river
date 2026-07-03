/**
 * musician/ — Strudel runtime + per-note event bus.
 *
 * Public interface (docs/architecture.md → "src/musician/"):
 *   init()        load @strudel/web once, at app boot
 *   play(code)    transpile + schedule Strudel code; audio starts
 *   stop()        silence the scheduler
 *   events        EventTarget; dispatches CustomEvent<NoteEvent> on 'note'
 *   audioContext  the shared Web Audio clock
 *
 * This module is the *only* place that imports `@strudel/web`. Per-note
 * events are captured with a non-dominant `onTrigger` so the default webaudio
 * output still plays the note (see `handleTrigger`).
 */
import { initStrudel, evaluate, hush, getAudioContext, samples } from '@strudel/web';
import type { StrudelHap, StrudelValue } from '@strudel/web';
import type { NoteEvent } from '../types';
import { classifyInstrument } from './instrument-map';

export { buildPlayable, countStackParts } from './stack-parts';

/**
 * The shared Web Audio clock. `stage/` schedules animations against this same
 * `currentTime`, which is how audio and visuals stay in sync (AGENTS.md hard
 * rule 2). Created suspended; `play()` resumes it on the first user gesture.
 */
export const audioContext: AudioContext = getAudioContext();

/**
 * Per-note event bus. Subscribe with:
 *   `events.addEventListener('note', e => (e as NoteCustomEvent).detail)`
 */
export const events: EventTarget = new EventTarget();

/**
 * Runtime errors from the Strudel transpiler/evaluator. The UI listens here so
 * an invalid pattern surfaces as a visible message instead of a silent console
 * log (RNF-05 scenario 1). `detail` is the human-readable message.
 */
export const errors: EventTarget = new EventTarget();

/** `initStrudel()` mutates global state — guard so it runs exactly once. */
let initPromise: Promise<void> | null = null;

/**
 * Sample packs to register before any pattern plays.
 *
 * `@strudel/web`'s default prebake registers ONLY raw synth waveforms
 * (`sine`/`sawtooth`/`square`/`triangle`) — its `registerSoundfonts()` is
 * commented out and it loads no samples. So without this, every part except a
 * `sawtooth` synth (our bass) is silent: drums, `piano`, and the `sax` lead all
 * resolve to nothing. These are the same sources strudel.cc loads:
 *   - `tidal-drum-machines` — drum kits addressed via `.bank("RolandTR909"…)`
 *   - `EmuSP12` — bare drum names (`bd sd hh oh cp cb rim`) when no bank is set
 *   - `piano` — the `piano` sound for the keys category
 *   - `VCSL` — the `sax` sample used by the horns category
 * The matching sound ids live in `musician/instrument-map.ts`,
 * `composer/persona-docs.ts`, and `band.ts` (SOUND_CATALOG); keep them in sync.
 */
const SAMPLE_BASE = 'https://raw.githubusercontent.com/felixroos/dough-samples/main';
const SAMPLE_PACKS: readonly string[] = [
  `${SAMPLE_BASE}/tidal-drum-machines.json`,
  `${SAMPLE_BASE}/EmuSP12.json`,
  `${SAMPLE_BASE}/piano.json`,
  `${SAMPLE_BASE}/vcsl.json`,
];

/**
 * Loads `@strudel/web` (pattern engine + synth sounds) and registers the sample
 * packs the band's instruments need. Idempotent: the first call wins, later
 * calls return the same promise. A cold load can take 1–3 s (plus the sample
 * manifests), so call this at boot behind a visible loading state.
 */
export function init(): Promise<void> {
  initPromise ??= (async () => {
    await initStrudel({
      // Runs after the default prebake. Sample audio is fetched lazily per sound
      // on first use; here we only register the manifests. Best-effort: a pack
      // that fails to fetch leaves its sounds silent rather than breaking audio
      // for everything else (and never rejects init).
      prebake: async () => {
        const results = await Promise.allSettled(SAMPLE_PACKS.map((url) => samples(url)));
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed > 0) {
          console.warn(
            `[musician] ${failed}/${SAMPLE_PACKS.length} sample packs failed to load — ` +
              'some instruments may be silent. Check the network connection.',
          );
        }
      },
      // Every evaluated pattern is wired with a NON-dominant onTrigger: the
      // default webaudio output still plays the note, and we additionally
      // observe each hap to emit a NoteEvent. See @strudel/core `getTrigger`.
      editPattern: (pattern) => pattern.onTrigger(handleTrigger, false),
      onEvalError: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[musician] invalid Strudel code:', error);
        errors.dispatchEvent(new CustomEvent<string>('error', { detail: message }));
      },
    });
  })();
  return initPromise;
}

/**
 * Evaluates Strudel `code` and starts playback. Calls `init()` first, so it
 * is safe to call before an explicit init. Invalid code is reported through
 * `onEvalError` and does not throw — the scheduler keeps running (RNF-05).
 */
export async function play(code: string): Promise<void> {
  await init();
  // play() runs inside a user gesture (a button click), so resuming here
  // satisfies the browser autoplay policy (AGENTS.md hard rule 4).
  await audioContext.resume();
  await evaluate(code);
}

/** Silences the scheduler. No-op if `init()` was never called. */
export function stop(): void {
  if (initPromise === null) return;
  hush();
}

/**
 * Per-hap callback. Translates a Strudel hap into a `NoteEvent` and dispatches
 * it on `events`. `targetTime` is the absolute `audioContext` time at which
 * the note sounds — i.e. in the future relative to `currentTime`.
 */
function handleTrigger(
  hap: StrudelHap,
  _currentTime: number,
  cps: number,
  targetTime: number,
): void {
  try {
    const value = hap.value;
    if (typeof value !== 'object' || value === null) return;
    const detail: NoteEvent = {
      instrument: classifyInstrument(value),
      note: pitchOf(value),
      velocity: typeof value.gain === 'number' ? value.gain : undefined,
      startTime: targetTime,
      duration: cps > 0 ? Number(hap.duration) / cps : 0,
      raw: hap,
    };
    events.dispatchEvent(new CustomEvent<NoteEvent>('note', { detail }));
  } catch (error) {
    // A single malformed hap must never break the scheduler.
    console.error('[musician] could not read hap:', error);
  }
}

/** Pitch of a hap value: prefer the note name, fall back to the sample index. */
function pitchOf(value: StrudelValue): number | string | undefined {
  if (value.note !== undefined) return value.note;
  if (value.n !== undefined) return value.n;
  return undefined;
}
