/**
 * App — root UI glue for the neon-stage demo.
 *
 * The UI is split into two tabs (no router — plain state):
 *  - **Builder**: manage the band — create/edit/delete agents (with their
 *    music-theory sound rules) and vibes.
 *  - **Stage**: pick which agents are on stage, pick a vibe, and perform. Global
 *    Play/Stop drives the `musician/` runtime; left-clicking a character mutes
 *    its part live, right-clicking shows its info.
 *
 * State lives here (no state library, per AGENTS.md):
 *  - `roster`: user-definable agents + vibes (seeded with defaults, persisted).
 *  - `stageAgentIds`: who is on stage (rendered in 3D + sent to the composer).
 *  - `mutedAgentIds`: whose part is silenced live (subset of stage). Preserved
 *    across a global Stop, so Resume restores exactly what was playing.
 *  - `selectedVibeId`: the vibe whose brief the band plays.
 *  - composer result (code/model/status/error) + transport (isPlaying).
 *
 * The compose request is assembled from the selected vibe's brief plus, per
 * on-stage agent, its `style` folded with `describeAgentRules`. Live per-agent
 * muting re-evaluates a filtered `stack(...)` (see `musician/stack-parts.ts`)
 * without a recompose — part index = on-stage lineup order.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compose, ComposeError, type DevOverride } from '../composer';
import { describeAgentRules, makeId, type BandAgent, type Vibe } from '../band';
import { buildPlayable, errors, init, play, stop } from '../musician';
import { defaultRoster, loadRoster, saveRoster, type Roster } from './roster-storage';
import { AgentForm } from './AgentForm';
import { VibeForm } from './VibeForm';
import { AgentInfo } from './AgentInfo';
import { BuilderTab } from './BuilderTab';
import { StageTab } from './StageTab';
import { VRButton } from '../stage';

export type ComposerStatus = 'idle' | 'composing' | 'ready' | 'error';

type Tab = 'builder' | 'stage';

/** Which editor modal is open, if any. `value: null` = create new. */
type Editor =
  | { kind: 'agent'; value: BandAgent | null }
  | { kind: 'vibe'; value: Vibe | null }
  | null;

const DEV_OVERRIDE_KEY = 'virtualband.devOverride';

/** Dev-only: load a persisted provider override from localStorage. */
function loadDevOverride(): DevOverride | null {
  if (!import.meta.env.DEV) return null;
  try {
    const raw = localStorage.getItem(DEV_OVERRIDE_KEY);
    return raw ? (JSON.parse(raw) as DevOverride) : null;
  } catch {
    return null;
  }
}

/** A dev override only takes effect once it has the bits needed to call out. */
function isUsableOverride(o: DevOverride | null): o is DevOverride {
  if (!o || !o.apiKey.trim() || !o.model.trim()) return false;
  if (o.provider === 'custom' && !o.baseURL?.trim()) return false;
  return true;
}

export function App() {
  const [tab, setTab] = useState<Tab>('stage');
  const [roster, setRoster] = useState<Roster>(() => loadRoster());
  const [stageAgentIds, setStageAgentIds] = useState<Set<string>>(
    () => new Set(loadRoster().agents.map((a) => a.id)),
  );
  const [mutedAgentIds, setMutedAgentIds] = useState<Set<string>>(() => new Set());
  const [selectedVibeId, setSelectedVibeId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [infoAgent, setInfoAgent] = useState<BandAgent | null>(null);
  const [devOverride, setDevOverride] = useState<DevOverride | null>(() => loadDevOverride());
  const [status, setStatus] = useState<ComposerStatus>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsCompose, setNeedsCompose] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // On-stage agents in roster order — the single source for what the 3D scene
  // renders, what the composer receives, and the part order for live muting.
  const stageAgents = useMemo(
    () => roster.agents.filter((a) => stageAgentIds.has(a.id)),
    [roster.agents, stageAgentIds],
  );
  const mutedIndices = useMemo(() => {
    const set = new Set<number>();
    stageAgents.forEach((a, i) => {
      if (mutedAgentIds.has(a.id)) set.add(i);
    });
    return set;
  }, [stageAgents, mutedAgentIds]);

  // Refs so the click handlers (passed to memo'd 3D components) stay stable and
  // never read stale state when re-evaluating the running pattern.
  const stageRef = useRef(stageAgentIds);
  stageRef.current = stageAgentIds;
  const mutedRef = useRef(mutedAgentIds);
  mutedRef.current = mutedAgentIds;
  const codeRef = useRef(code);
  codeRef.current = code;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const stageAgentsRef = useRef(stageAgents);
  stageAgentsRef.current = stageAgents;

  // Boot the audio engine once and surface invalid-pattern errors.
  useEffect(() => {
    let cancelled = false;
    init().catch((err: unknown) => {
      console.error('[musician] init failed:', err);
      if (!cancelled) setPlaybackError('Audio engine failed to load. Reload to retry.');
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const handler = (event: Event) => {
      setPlaybackError(`Invalid Strudel: ${(event as CustomEvent<string>).detail}`);
    };
    errors.addEventListener('error', handler);
    return () => errors.removeEventListener('error', handler);
  }, []);

  // Persist the roster so user-defined agents/vibes survive reloads.
  useEffect(() => {
    saveRoster(roster);
  }, [roster]);

  // Dev-only: persist the provider override so it survives reloads.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    try {
      if (devOverride) {
        localStorage.setItem(DEV_OVERRIDE_KEY, JSON.stringify(devOverride));
      } else {
        localStorage.removeItem(DEV_OVERRIDE_KEY);
      }
    } catch {
      // Ignore storage errors (private mode, quota) — override stays in memory.
    }
  }, [devOverride]);

  const selectVibe = useCallback((id: string) => {
    setSelectedVibeId(id);
    setNeedsCompose(true);
  }, []);

  const toggleStage = useCallback((agentId: string) => {
    const next = new Set(stageRef.current);
    if (next.has(agentId)) {
      if (next.size <= 1) return; // keep at least one performer on stage
      next.delete(agentId);
      const m = new Set(mutedRef.current);
      m.delete(agentId);
      mutedRef.current = m;
      setMutedAgentIds(m);
    } else {
      next.add(agentId);
    }
    stageRef.current = next;
    setStageAgentIds(next);
    setNeedsCompose(true);
  }, []);

  // Left-click a character: mute/un-mute its part, re-evaluating the running
  // pattern in place (no recompose) so the change is instant.
  const toggleMute = useCallback((agentId: string) => {
    const next = new Set(mutedRef.current);
    if (next.has(agentId)) next.delete(agentId);
    else next.add(agentId);
    mutedRef.current = next;
    setMutedAgentIds(next);

    if (isPlayingRef.current && codeRef.current) {
      const indices = new Set<number>();
      stageAgentsRef.current.forEach((a, i) => {
        if (next.has(a.id)) indices.add(i);
      });
      void play(buildPlayable(codeRef.current, indices)).catch((err: unknown) => {
        setPlaybackError(err instanceof Error ? err.message : 'Failed to update playback.');
      });
    }
  }, []);

  const saveAgent = useCallback((draft: Omit<BandAgent, 'id'>, id: string | null) => {
    setRoster((prev) => {
      if (id) {
        return {
          ...prev,
          agents: prev.agents.map((a) => (a.id === id ? { ...a, ...draft } : a)),
        };
      }
      const newAgent: BandAgent = {
        ...draft,
        id: makeId(draft.name, prev.agents.map((a) => a.id)),
      };
      // A freshly created agent joins the stage.
      const next = new Set(stageRef.current).add(newAgent.id);
      stageRef.current = next;
      setStageAgentIds(next);
      return { ...prev, agents: [...prev.agents, newAgent] };
    });
    setNeedsCompose(true);
    setEditor(null);
  }, []);

  const deleteAgent = useCallback((id: string) => {
    setRoster((prev) => {
      if (prev.agents.length <= 1) return prev;
      return {
        agents: prev.agents.filter((a) => a.id !== id),
        // Cascade: vibes drop the deleted agent (empty list = whole roster).
        vibes: prev.vibes.map((v) => ({
          ...v,
          agentIds: v.agentIds.filter((agentId) => agentId !== id),
        })),
      };
    });
    const nextStage = new Set(stageRef.current);
    nextStage.delete(id);
    stageRef.current = nextStage;
    setStageAgentIds(nextStage);
    const nextMuted = new Set(mutedRef.current);
    nextMuted.delete(id);
    mutedRef.current = nextMuted;
    setMutedAgentIds(nextMuted);
    setNeedsCompose(true);
    setEditor(null);
  }, []);

  const saveVibe = useCallback((draft: Omit<Vibe, 'id'>, id: string | null) => {
    setRoster((prev) => {
      if (id) {
        return {
          ...prev,
          vibes: prev.vibes.map((v) => (v.id === id ? { ...v, ...draft } : v)),
        };
      }
      const newVibe: Vibe = { ...draft, id: makeId(draft.name, prev.vibes.map((v) => v.id)) };
      return { ...prev, vibes: [...prev.vibes, newVibe] };
    });
    setEditor(null);
  }, []);

  const deleteVibe = useCallback(
    (id: string) => {
      setRoster((prev) => ({ ...prev, vibes: prev.vibes.filter((v) => v.id !== id) }));
      if (selectedVibeId === id) setSelectedVibeId(null);
      setEditor(null);
    },
    [selectedVibeId],
  );

  const resetRoster = useCallback(() => {
    const fresh = defaultRoster();
    setRoster(fresh);
    const next = new Set(fresh.agents.map((a) => a.id));
    stageRef.current = next;
    setStageAgentIds(next);
    mutedRef.current = new Set();
    setMutedAgentIds(new Set());
    setSelectedVibeId(null);
    setCode(null);
    setStatus('idle');
    setNeedsCompose(true);
    stop();
    setIsPlaying(false);
    setEditor(null);
  }, []);

  // Compose from the selected vibe's brief + each on-stage agent's style folded
  // with its sound rules. Returns the fresh code so Play can use it immediately.
  const doCompose = useCallback(async (): Promise<string | null> => {
    const vibe = roster.vibes.find((v) => v.id === selectedVibeId);
    if (!vibe || stageAgents.length === 0) return null;
    setStatus('composing');
    setError(null);
    try {
      const result = await compose({
        prompt: vibe.prompt,
        agents: stageAgents.map((agent) => {
          const combined = [agent.style.trim(), describeAgentRules(agent)]
            .filter(Boolean)
            .join(' ')
            .slice(0, 500);
          return {
            name: agent.name,
            instrument: agent.instrument,
            ...(combined ? { style: combined } : {}),
          };
        }),
        ...(import.meta.env.DEV && isUsableOverride(devOverride) ? { devOverride } : {}),
      });
      setCode(result.code);
      setModel(result.model);
      setStatus('ready');
      setNeedsCompose(false);
      return result.code;
    } catch (err) {
      const message =
        err instanceof ComposeError
          ? `${err.message} (${err.code})`
          : 'Unexpected error while composing.';
      setError(message);
      setStatus('error');
      return null;
    }
  }, [roster.vibes, selectedVibeId, stageAgents, devOverride]);

  const handlePlay = useCallback(async () => {
    if (status === 'composing') return;
    let current = codeRef.current;
    if (needsCompose || !current) {
      current = await doCompose();
    }
    if (!current) return;
    setPlaybackError(null);
    try {
      await play(buildPlayable(current, mutedIndices));
      setIsPlaying(true);
    } catch (err) {
      setPlaybackError(err instanceof Error ? err.message : 'Failed to start playback.');
    }
  }, [status, needsCompose, doCompose, mutedIndices]);

  const handleStop = useCallback(() => {
    stop();
    setIsPlaying(false);
    setPlaybackError(null);
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="title">VIRTUAL.BAND</h1>
          <p className="subtitle">Cyberpunk electro-jazz · live-coded by AI</p>
        </div>
        <nav className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="tab"
            data-active={tab === 'stage'}
            aria-selected={tab === 'stage'}
            onClick={() => setTab('stage')}
          >
            Stage
          </button>
          <button
            type="button"
            role="tab"
            className="tab"
            data-active={tab === 'builder'}
            aria-selected={tab === 'builder'}
            onClick={() => setTab('builder')}
          >
            Builder
          </button>
        </nav>
        <VRButton />
      </header>

      {tab === 'stage' ? (
        <StageTab
          agents={roster.agents}
          stageAgents={stageAgents}
          stageAgentIds={stageAgentIds}
          mutedAgentIds={mutedAgentIds}
          vibes={roster.vibes}
          selectedVibeId={selectedVibeId}
          onSelectVibe={selectVibe}
          onToggleStage={toggleStage}
          onMute={toggleMute}
          onInfo={setInfoAgent}
          composerStatus={status}
          isPlaying={isPlaying}
          playbackError={playbackError}
          onPlay={handlePlay}
          onStop={handleStop}
          code={code}
          model={model}
          error={error}
          devOverride={devOverride}
          onDevOverrideChange={setDevOverride}
        />
      ) : (
        <BuilderTab
          agents={roster.agents}
          vibes={roster.vibes}
          onEditAgent={(agent) => setEditor({ kind: 'agent', value: agent })}
          onEditVibe={(vibe) => setEditor({ kind: 'vibe', value: vibe })}
          onReset={resetRoster}
        />
      )}

      {infoAgent && (
        <AgentInfo
          agent={infoAgent}
          onEdit={(agent) => setEditor({ kind: 'agent', value: agent })}
          onClose={() => setInfoAgent(null)}
        />
      )}
      {editor?.kind === 'agent' && (
        <AgentForm
          agent={editor.value}
          lastAgent={roster.agents.length <= 1}
          onSave={saveAgent}
          onDelete={deleteAgent}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.kind === 'vibe' && (
        <VibeForm
          vibe={editor.value}
          agents={roster.agents}
          onSave={saveVibe}
          onDelete={deleteVibe}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
