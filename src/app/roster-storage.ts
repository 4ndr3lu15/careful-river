/**
 * roster-storage.ts — localStorage persistence for user-defined agents/vibes.
 *
 * The roster (agents + vibes) is plain serialisable data owned by `App` state
 * (no state library, per AGENTS.md). This module only loads/saves it, seeding
 * the defaults from `band.ts` on first run, and validates loosely so a stale
 * or hand-edited payload degrades to the defaults instead of crashing.
 */
import {
  DEFAULT_AGENTS,
  DEFAULT_VIBES,
  PERSONA_INSTRUMENTS,
  SOUND_CATALOG,
  makeDefaultSound,
  type AgentSound,
  type BandAgent,
  type PersonaInstrument,
  type Vibe,
} from '../band';

const STORAGE_KEY = 'virtualband.roster.v1';

export interface Roster {
  agents: BandAgent[];
  vibes: Vibe[];
}

export function defaultRoster(): Roster {
  return { agents: [...DEFAULT_AGENTS], vibes: [...DEFAULT_VIBES] };
}

export function loadRoster(): Roster {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultRoster();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return defaultRoster();
    const { agents, vibes } = parsed as { agents?: unknown; vibes?: unknown };
    if (!Array.isArray(agents) || !Array.isArray(vibes)) return defaultRoster();
    const validAgents = agents.filter(isAgent).map(backfillSound);
    const validVibes = vibes.filter(isVibe);
    if (validAgents.length === 0) return defaultRoster();
    return { agents: validAgents, vibes: validVibes };
  } catch {
    return defaultRoster();
  }
}

export function saveRoster(roster: Roster): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
  } catch {
    // Ignore storage errors (private mode, quota) — roster stays in memory.
  }
}

/**
 * Ensure an agent has a valid `sound` block. Rosters saved before sound rules
 * existed have none — give them the category default. A present-but-stale block
 * is sanitised against the catalog so the form/composer never see junk.
 */
function backfillSound(agent: BandAgent): BandAgent {
  const cat = SOUND_CATALOG[agent.instrument];
  const raw = agent.sound as Partial<AgentSound> | undefined;
  if (!raw || typeof raw !== 'object') {
    return { ...agent, sound: makeDefaultSound(agent.instrument) };
  }
  const fallback = makeDefaultSound(agent.instrument);
  const low = typeof raw.octaveLow === 'number' ? raw.octaveLow : fallback.octaveLow;
  const high = typeof raw.octaveHigh === 'number' ? raw.octaveHigh : fallback.octaveHigh;
  const sounds = Array.isArray(raw.sounds)
    ? raw.sounds.filter((s): s is string => typeof s === 'string' && cat.sounds.includes(s))
    : [];
  const sound: AgentSound = {
    octaveLow: Math.min(low, high),
    octaveHigh: Math.max(low, high),
    sounds,
    density: raw.density ?? 'medium',
    ...(raw.bank && cat.banks?.includes(raw.bank) ? { bank: raw.bank } : {}),
  };
  return { ...agent, sound };
}

function isAgent(value: unknown): value is BandAgent {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.name === 'string' &&
    typeof a.role === 'string' &&
    typeof a.accent === 'string' &&
    typeof a.style === 'string' &&
    PERSONA_INSTRUMENTS.includes(a.instrument as PersonaInstrument)
  );
}

function isVibe(value: unknown): value is Vibe {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.description === 'string' &&
    typeof v.accent === 'string' &&
    typeof v.prompt === 'string' &&
    Array.isArray(v.agentIds) &&
    v.agentIds.every((id) => typeof id === 'string')
  );
}
