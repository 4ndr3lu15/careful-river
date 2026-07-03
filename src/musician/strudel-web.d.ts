/**
 * Ambient types for `@strudel/web` — the package ships no `.d.ts`.
 *
 * Only the surface that `src/musician/` actually touches is declared, and it
 * is intentionally loose: Strudel's internals are out of scope for this POC's
 * type safety. If musician/ starts using more of the API, declare it here
 * rather than reaching for `any`.
 */
declare module '@strudel/web' {
  /** Raw value object carried by a hap (sound name, pitch, gain, …). */
  export interface StrudelValue {
    /** Sample / synth name, e.g. `'bd'`, `'piano'`, `'RolandTR909:bd'`. */
    s?: unknown;
    /** Alternate spelling of `s` used by some patterns. */
    sound?: unknown;
    /** Pitch as MIDI number or note name. */
    note?: number | string;
    /** Sample-index variation, also used as a pitch fallback. */
    n?: number | string;
    /** Per-voice gain, 0..1. */
    gain?: number;
    [key: string]: unknown;
  }

  /** A Strudel hap — one scheduled event produced by the pattern engine. */
  export interface StrudelHap {
    value: StrudelValue;
    /** Event length in cycles; a Fraction — coerce with `Number()`. */
    duration: { valueOf(): number };
    /** Throws if `value` is not an object; called defensively before reads. */
    ensureObjectValue(): void;
  }

  /**
   * Per-hap callback. Signature per `@strudel/core` `getTrigger`:
   * `(hap, currentTime, cps, targetTime)`. `targetTime` is the absolute
   * `audioContext` time at which the note sounds.
   */
  export type StrudelTrigger = (
    hap: StrudelHap,
    currentTime: number,
    cps: number,
    targetTime: number,
  ) => void;

  /** A Strudel pattern. Opaque here except for the per-hap trigger hook. */
  export interface StrudelPattern {
    /**
     * Registers a per-hap callback. With `dominant = false` the default
     * webaudio output still runs, so audio keeps playing while we observe.
     */
    onTrigger(onTrigger: StrudelTrigger, dominant?: boolean): StrudelPattern;
  }

  export interface InitStrudelOptions {
    /** Extra async setup (e.g. sample loading) run after the default prebake. */
    prebake?: () => Promise<void> | void;
    /** Called with every pattern before it is scheduled. */
    editPattern?: (pattern: StrudelPattern) => StrudelPattern;
    /** Invoked when transpiling/evaluating code fails. */
    onEvalError?: (error: unknown) => void;
    [key: string]: unknown;
  }

  /** Loads the pattern engine + default sounds. Resolves when ready. */
  export function initStrudel(options?: InitStrudelOptions): Promise<unknown>;
  /** Transpiles and (by default) plays `code` on the shared scheduler. */
  export function evaluate(code: string, autoplay?: boolean): Promise<unknown>;
  /** Stops the scheduler — silence. */
  export function hush(): void;
  /** Returns the shared Web Audio context (created lazily, suspended). */
  export function getAudioContext(): AudioContext;
  /**
   * Registers a sample pack so its sounds become playable. `source` is a strudel
   * sample-map URL (a `*.json` with a `_base`) or a `github:user/repo` shorthand.
   * Resolves when the manifest is fetched; the audio itself loads lazily per
   * sound on first use.
   */
  export function samples(source: string): Promise<void>;
}
