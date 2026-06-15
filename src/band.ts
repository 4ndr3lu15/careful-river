/**
 * band.ts — agent + vibe data model.
 *
 * Single source of truth shared by `app/` (legend, vibe cards, edit forms,
 * compose request) and `stage/` (3D characters). Like `types.ts`, this is a
 * top-level shared module: both modules import it, neither reaches into the
 * other's internals.
 *
 * The roster is no longer fixed: the user can create, edit and delete agents
 * and vibes at runtime (forms in `app/`, persisted to localStorage). What
 * stays fixed is the four `NoteEvent` instrument categories
 * (`drums | bass | keys | horns`) — that is the stable contract that drives
 * the per-note animation (see `stage/Musician.tsx` and
 * `musician/instrument-map.ts`). Every agent must declare one of the four so
 * its character knows when to pulse; names, roles, colours and style
 * instructions are free-form.
 */
import type { NoteEvent } from './types';

/** The four animatable instrument categories (everything else is `'other'`). */
export type PersonaInstrument = Exclude<NoteEvent['instrument'], 'other'>;

export const PERSONA_INSTRUMENTS: readonly PersonaInstrument[] = [
  'drums',
  'bass',
  'keys',
  'horns',
];

/** A user-definable band member. */
export interface BandAgent {
  /** Stable id — referenced by vibes and the active-agent set. */
  id: string;
  /** The `NoteEvent.instrument` category this agent reacts to. */
  instrument: PersonaInstrument;
  /** Stage name, shown above the character and in the legend. */
  name: string;
  /** One-line futuristic job title. */
  role: string;
  /** Neon accent — drives emissive material + UI accent. */
  accent: string;
  /**
   * Musical instruction for this agent's part. Sent to the composer alongside
   * the vibe prompt, so the final prompt is assembled from vibe + agents.
   */
  style: string;
}

/** A user-definable scene/mood that puts a chosen set of agents on stage. */
export interface Vibe {
  /** Stable id. */
  id: string;
  name: string;
  description: string;
  /** Card accent colour. */
  accent: string;
  /** The natural-language brief sent to the composer. */
  prompt: string;
  /** Agents this vibe puts on stage. Empty = every agent currently defined. */
  agentIds: string[];
}

/** The four default agents — the original cyberpunk electro-jazz house band. */
export const DEFAULT_AGENTS: readonly BandAgent[] = [
  {
    id: 'volt',
    instrument: 'drums',
    name: 'VOLT',
    role: 'Rhythm Automaton',
    accent: '#ff2d6f',
    style: 'Tight, groovy drum programming with human feel — ghost notes and swing welcome.',
  },
  {
    id: 'abyss',
    instrument: 'bass',
    name: 'ABYSS',
    role: 'Subsonic Leviathan',
    accent: '#2dd4ff',
    style: 'Deep monophonic bass lines that lock with the kick and stay out of the keys.',
  },
  {
    id: 'oracle',
    instrument: 'keys',
    name: 'ORACLE',
    role: 'Holographic Keysmith',
    accent: '#39ff8b',
    style: 'Lush chordal comping in mid octaves — leaves space for the lead.',
  },
  {
    id: 'nova',
    instrument: 'horns',
    name: 'NOVA',
    role: 'Plasma Brass',
    accent: '#ffb454',
    style: 'Singable single-line melodies high in the register, with breathing room.',
  },
];

/** The six default vibes. `agentIds: []` means "everyone on the roster". */
export const DEFAULT_VIBES: readonly Vibe[] = [
  {
    id: 'neon-electro-jazz',
    name: 'Neon Electro-Jazz',
    description: 'Swung hats, warm Rhodes, smoky horns',
    accent: '#2dd4ff',
    prompt:
      'Neon cyberpunk electro-jazz at 110 bpm: swung hi-hats, warm Rhodes chords, a walking sub bass, and smoky muted horn lines.',
    agentIds: [],
  },
  {
    id: 'intergalactic-bossa',
    name: 'Intergalactic Bossa',
    description: 'Dreamy lounge, brushed & mellow',
    accent: '#39ff8b',
    prompt:
      'Intergalactic lounge bossa nova at 82 bpm: soft brushed drums, dreamy lydian keys, a gentle upright bass, and a mellow horn melody.',
    agentIds: [],
  },
  {
    id: 'deep-space-funk',
    name: 'Deep Space Funk',
    description: 'Heavy sub bass, punchy & syncopated',
    accent: '#ff2d6f',
    prompt:
      'Deep space funk at 118 bpm: heavy syncopated sub bass, tight punchy drums, stabby clavinet-style keys, and bright horn hits.',
    agentIds: [],
  },
  {
    id: 'nebula-drift',
    name: 'Nebula Drift',
    description: 'Ambient, no pulse, lots of space',
    accent: '#9b6bff',
    prompt:
      'Nebula ambient drift with no clear pulse: shimmering pads, sparse sine keys, a slow drone bass, and distant horn swells with lots of space.',
    // No drummer — the vibe itself decides who is on stage.
    agentIds: ['abyss', 'oracle', 'nova'],
  },
  {
    id: 'noir-swing',
    name: 'Noir Swing',
    description: 'Moody minor-7, lonely trumpet',
    accent: '#ffb454',
    prompt:
      'Noir detective swing at 96 bpm: brushed swing drums, a walking bass, moody minor-7 piano comping, and a lonely muted trumpet.',
    agentIds: [],
  },
  {
    id: 'quantum-dnb',
    name: 'Quantum DnB',
    description: 'Rolling breaks, deep reese bass',
    accent: '#2dd4ff',
    prompt:
      'Fast quantum drum and bass at 168 bpm: rolling breakbeat drums, a deep reese sub bass, glassy key stabs, and occasional horn stabs.',
    agentIds: [],
  },
];

/** Resolve a vibe's roster: empty `agentIds` means every agent defined. */
export function agentsForVibe(vibe: Vibe, agents: readonly BandAgent[]): BandAgent[] {
  if (vibe.agentIds.length === 0) return [...agents];
  const picked = agents.filter((a) => vibe.agentIds.includes(a.id));
  // A vibe whose agents were all deleted falls back to the full roster.
  return picked.length > 0 ? picked : [...agents];
}

/**
 * Floor position for the agent at `index` of a roster of `count`, spread
 * left→right along a shallow arc (matches the original four fixed spots).
 */
export function stagePosition(index: number, count: number): [number, number, number] {
  if (count <= 1) return [0, 0, 0];
  const spacing = Math.min(2.2, 7.2 / (count - 1));
  const x = (index - (count - 1) / 2) * spacing;
  const xMax = ((count - 1) / 2) * spacing;
  const z = xMax > 0 ? -1.2 * (x / xMax) ** 2 : 0;
  return [x, 0, z];
}

/** Generate a fresh agent/vibe id from a display name. */
export function makeId(name: string, taken: Iterable<string>): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  const existing = new Set(taken);
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
