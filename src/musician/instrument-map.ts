/**
 * instrument-map.ts — maps Strudel sample / synth names to the four on-stage
 * instrument categories. Anything unmapped resolves to `'other'`.
 *
 * Extend `INSTRUMENT_MAP` as new sample names show up in generated code
 * (docs/workflow.md → Sprint 2, "You do manually").
 */
import type { NoteEvent } from '../types';
import type { StrudelValue } from '@strudel/web';

type Instrument = NoteEvent['instrument'];

/**
 * Sample / synth name → instrument category. Names are matched lower-cased
 * and after stripping any `bank:` prefix (see `classifyInstrument`).
 */
export const INSTRUMENT_MAP: Record<string, Instrument> = {
  // drums — Strudel's built-in drum samples (prompts/strudel-cheatsheet.md)
  bd: 'drums',
  sd: 'drums',
  hh: 'drums',
  oh: 'drums',
  cp: 'drums',
  cb: 'drums',
  rim: 'drums',
  tom: 'drums',
  // bass
  bass: 'bass',
  sawtooth: 'bass',
  // keys
  piano: 'keys',
  rhodes: 'keys',
  epiano: 'keys',
  // horns
  sax: 'horns',
  trumpet: 'horns',
  gm_alto_sax: 'horns',
  gm_trumpet: 'horns',
};

/**
 * Resolves the instrument category for a Strudel hap value by inspecting its
 * sound name. Tolerates a `bank:name` prefix (e.g. `"RolandTR909:bd"`).
 * Anything unknown — including a value with no sound name — is `'other'`.
 */
export function classifyInstrument(value: StrudelValue): Instrument {
  const raw =
    typeof value.s === 'string'
      ? value.s
      : typeof value.sound === 'string'
        ? value.sound
        : undefined;
  if (raw === undefined) return 'other';

  const colon = raw.lastIndexOf(':');
  const name = (colon === -1 ? raw : raw.slice(colon + 1)).toLowerCase();
  return INSTRUMENT_MAP[name] ?? 'other';
}
