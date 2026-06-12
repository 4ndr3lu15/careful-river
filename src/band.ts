/**
 * band.ts — the persona roster.
 *
 * Single source of truth shared by `app/` (legend + compose request) and
 * `stage/` (3D characters). Like `types.ts`, this is a top-level shared module:
 * both modules import it, neither reaches into the other's internals.
 *
 * The four personas are a *display + role* layer over the four `NoteEvent`
 * instrument categories. The category ids (`drums | bass | keys | horns`) are
 * the stable contract that drives the per-note animation (see
 * `stage/Musician.tsx` and `musician/instrument-map.ts`); the persona names are
 * pure flavour and can be renamed freely without touching `NoteEvent`.
 */
import type { NoteEvent } from './types';

/** The four animatable instrument categories (everything else is `'other'`). */
export type PersonaInstrument = Exclude<NoteEvent['instrument'], 'other'>;

export interface Persona {
  /** The `NoteEvent.instrument` category this persona reacts to. */
  instrument: PersonaInstrument;
  /** Stage name, shown above the character and in the legend. */
  name: string;
  /** One-line futuristic job title. */
  role: string;
  /** Neon accent — drives emissive material + UI accent. */
  accent: string;
  /** Floor position `[x, y, z]` along the bar stage. */
  position: readonly [number, number, number];
}

/**
 * Cyberpunk electro-jazz house band. Order = left→right across the stage.
 * Names/colours are intentionally easy to swap.
 */
export const BAND: readonly Persona[] = [
  {
    instrument: 'drums',
    name: 'VOLT',
    role: 'Rhythm Automaton',
    accent: '#ff2d6f',
    position: [-3.4, 0, -1.2],
  },
  {
    instrument: 'bass',
    name: 'ABYSS',
    role: 'Subsonic Leviathan',
    accent: '#2dd4ff',
    position: [-1.2, 0, 0],
  },
  {
    instrument: 'keys',
    name: 'ORACLE',
    role: 'Holographic Keysmith',
    accent: '#39ff8b',
    position: [1.2, 0, 0],
  },
  {
    instrument: 'horns',
    name: 'NOVA',
    role: 'Plasma Brass',
    accent: '#ffb454',
    position: [3.4, 0, -1.2],
  },
];

/** Persona lookup by instrument category. */
export function personaFor(instrument: PersonaInstrument): Persona {
  const persona = BAND.find((p) => p.instrument === instrument);
  if (!persona) throw new Error(`No persona for instrument "${instrument}".`);
  return persona;
}
