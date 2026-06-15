/**
 * appearance.ts — how a `BandAgent` becomes a *look*.
 *
 * The 3D characters are built entirely from Three.js primitives (no asset
 * files, per AGENTS.md). To keep `Musician.tsx` declarative, every visual knob
 * a character needs — shell colour, build, head silhouette, height, the seeds
 * that make two agents of the same instrument look different — is derived here,
 * deterministically, from the agent's stable fields.
 *
 * THIS IS THE SEAM FOR USER-CREATED ASSETS (the next step, intentionally not
 * built yet). Today `deriveAppearance` *computes* an `AgentAppearance` from
 * `agent.id` + `agent.accent` + `agent.instrument`. Tomorrow a user who designs
 * their own character just supplies an explicit `AgentAppearance` (or a richer
 * descriptor that resolves to one) on the agent, and `Musician.tsx` renders it
 * without changing. Keeping derivation pure and in one place is what makes that
 * later swap a one-field change rather than a rewrite.
 */
import { Color } from 'three';
import type { BandAgent, PersonaInstrument } from '../band';

/** Head silhouette variants — picked per agent so a roster reads as distinct. */
export type HeadStyle = 'orb' | 'dome' | 'crest' | 'antenna';

/** Everything `Musician.tsx` needs to build one character, fully resolved. */
export interface AgentAppearance {
  /** Stable 0..1 seed driving per-agent variation (phase, jitter, choices). */
  seed: number;
  /** Dark body shell colour (a deep, desaturated tint of the accent). */
  shell: string;
  /** Neon emissive accent — mirrors `agent.accent`, the character's "glow". */
  accent: string;
  /** Brighter core colour for the chest/visor light (accent pushed to white). */
  core: string;
  metalness: number;
  roughness: number;
  /** Overall height multiplier (~0.9..1.1) so the lineup isn't a clone army. */
  heightScale: number;
  /** Torso girth, 0 (slim) .. 1 (bulky). */
  build: number;
  /** Head silhouette. */
  head: HeadStyle;
}

/** xmur3 string hash → 32-bit seed. */
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 PRNG factory — deterministic 0..1 stream from a 32-bit seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEADS: readonly HeadStyle[] = ['orb', 'dome', 'crest', 'antenna'];

/**
 * Each instrument family leans toward a build so the silhouette telegraphs the
 * role even before you see the prop: drummers are bulkier, horn players slim and
 * tall. The per-agent seed then nudges around that centre.
 */
const BUILD_BIAS: Record<PersonaInstrument, { build: number; height: number }> = {
  drums: { build: 0.85, height: 0.98 },
  bass: { build: 0.65, height: 1.0 },
  keys: { build: 0.45, height: 1.0 },
  horns: { build: 0.3, height: 1.06 },
};

/**
 * Resolve an agent's full visual description. Pure and deterministic: the same
 * agent always looks the same across reloads and across desktop/VR.
 */
export function deriveAppearance(agent: BandAgent): AgentAppearance {
  const h = hashSeed(agent.id || agent.name || agent.instrument);
  const rand = rng(h);
  const seed = rand();

  const bias = BUILD_BIAS[agent.instrument];

  // Shell = the accent dragged most of the way toward a near-black blue, so the
  // body stays dark and metallic while still carrying a hint of the agent hue.
  const accent = new Color(agent.accent);
  const shell = accent.clone().lerp(new Color('#070a16'), 0.86);
  const core = accent.clone().lerp(new Color('#ffffff'), 0.55);

  return {
    seed,
    shell: `#${shell.getHexString()}`,
    accent: agent.accent,
    core: `#${core.getHexString()}`,
    metalness: 0.7,
    roughness: 0.3 + seed * 0.15,
    heightScale: bias.height * (0.95 + seed * 0.1),
    build: Math.min(1, Math.max(0, bias.build + (rand() - 0.5) * 0.25)),
    head: HEADS[Math.floor(rand() * HEADS.length) % HEADS.length],
  };
}
