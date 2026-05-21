/**
 * Shared types.
 *
 * The central type is `NoteEvent` — the single contract between the
 * `musician/` and `stage/` modules (see docs/architecture.md → "The event
 * contract"). Changing `NoteEvent` requires updating docs/architecture.md in
 * the same change (AGENTS.md → Naming).
 */

/** One note as observed from the Strudel scheduler. */
export interface NoteEvent {
  /** Coarse instrument category — drives which character animates. */
  instrument: 'drums' | 'bass' | 'keys' | 'horns' | 'other';
  /** Pitch as a MIDI number or note name. Absent for unpitched hits. */
  note?: number | string;
  /** Loudness, 0..1. Absent when the pattern sets no gain. */
  velocity?: number;
  /**
   * Absolute `audioContext.currentTime` (seconds) at which the note sounds.
   * Always in the future when the event is dispatched, so consumers schedule
   * animations at `startTime - audioContext.currentTime` (AGENTS.md rule 2).
   */
  startTime: number;
  /** Note length in seconds. */
  duration: number;
  /** The original Strudel hap, kept for debugging only. */
  raw: unknown;
}

/** The `CustomEvent` carrying a `NoteEvent`, dispatched on `musician.events`. */
export type NoteCustomEvent = CustomEvent<NoteEvent>;
