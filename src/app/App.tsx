/**
 * App — root UI glue for the neon-stage demo.
 *
 * State lives here (no state library, per AGENTS.md):
 *  - `roster`: the user-definable agents + vibes (seeded with the defaults,
 *    persisted to localStorage; edited via the AgentForm / VibeForm modals).
 *  - `activeAgentIds`: which agents are live. Set by tapping a vibe card,
 *    toggled from the 3D stage or the BandLegend, and sent to the composer so
 *    only the live agents get a part.
 *  - composer result (code/model/status/error), driven by tapping a vibe card
 *    — there is no free-text prompt; the final prompt is assembled from the
 *    vibe's brief plus each active agent's style instruction.
 */
import { useCallback, useEffect, useState } from 'react';
import { compose, ComposeError, type DevOverride } from '../composer';
import { agentsForVibe, type BandAgent, type Vibe, makeId } from '../band';
import { defaultRoster, loadRoster, saveRoster, type Roster } from './roster-storage';
import { VibePanel } from './VibePanel';
import { BandLegend } from './BandLegend';
import { CodePanel } from './CodePanel';
import { MusicianPanel } from './MusicianPanel';
import { AgentForm } from './AgentForm';
import { VibeForm } from './VibeForm';
import { Stage, VRButton } from '../stage';

export type ComposerStatus = 'idle' | 'composing' | 'ready' | 'error';

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
  const [roster, setRoster] = useState<Roster>(() => loadRoster());
  const [activeAgentIds, setActiveAgentIds] = useState<Set<string>>(
    () => new Set(loadRoster().agents.map((a) => a.id)),
  );
  const [editor, setEditor] = useState<Editor>(null);
  const [devOverride, setDevOverride] = useState<DevOverride | null>(() => loadDevOverride());
  const [status, setStatus] = useState<ComposerStatus>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const toggleAgent = useCallback((agentId: string) => {
    setActiveAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        // Keep at least one performer live, otherwise there's nothing to play.
        if (next.size > 1) next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
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
      // A freshly created agent joins the stage live.
      setActiveAgentIds((ids) => new Set(ids).add(newAgent.id));
      return { ...prev, agents: [...prev.agents, newAgent] };
    });
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
    setActiveAgentIds((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
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

  const deleteVibe = useCallback((id: string) => {
    setRoster((prev) => ({ ...prev, vibes: prev.vibes.filter((v) => v.id !== id) }));
    setEditor(null);
  }, []);

  const resetRoster = useCallback(() => {
    const fresh = defaultRoster();
    setRoster(fresh);
    setActiveAgentIds(new Set(fresh.agents.map((a) => a.id)));
    setEditor(null);
  }, []);

  const handleComposeVibe = useCallback(
    async (vibe: Vibe) => {
      if (status === 'composing') return;

      // The vibe decides who is on stage; the stage updates immediately.
      const lineup = agentsForVibe(vibe, roster.agents);
      setActiveAgentIds(new Set(lineup.map((a) => a.id)));
      setStatus('composing');
      setError(null);

      try {
        const result = await compose({
          prompt: vibe.prompt,
          agents: lineup.map((agent) => ({
            name: agent.name,
            instrument: agent.instrument,
            ...(agent.style.trim() ? { style: agent.style.trim() } : {}),
          })),
          ...(import.meta.env.DEV && isUsableOverride(devOverride)
            ? { devOverride }
            : {}),
        });
        setCode(result.code);
        setModel(result.model);
        setStatus('ready');
      } catch (err) {
        const message =
          err instanceof ComposeError
            ? `${err.message} (${err.code})`
            : 'Unexpected error while composing.';
        setError(message);
        setStatus('error');
      }
    },
    [devOverride, roster.agents, status],
  );

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="title">VIRTUAL.BAND</h1>
          <p className="subtitle">Cyberpunk electro-jazz · live-coded by AI</p>
        </div>
        <VRButton />
      </header>

      <section className="stage-frame">
        <Stage
          agents={roster.agents}
          activeAgentIds={activeAgentIds}
          onToggle={toggleAgent}
        />
        <p className="stage-hint">Drag to orbit · click a performer to mute / un-mute</p>
      </section>

      <div className="grid" style={{ marginTop: '1.3rem' }}>
        <div>
          <VibePanel
            vibes={roster.vibes}
            agents={roster.agents}
            composing={status === 'composing'}
            onCompose={handleComposeVibe}
            onEdit={(vibe) => setEditor({ kind: 'vibe', value: vibe })}
          />
          <CodePanel
            status={status}
            code={code}
            model={model}
            error={error}
            devOverride={devOverride}
            onDevOverrideChange={setDevOverride}
          />
        </div>
        <div>
          <BandLegend
            agents={roster.agents}
            activeAgentIds={activeAgentIds}
            onToggle={toggleAgent}
            onEdit={(agent) => setEditor({ kind: 'agent', value: agent })}
          />
          <MusicianPanel code={code} />
          <button type="button" className="btn btn--ghost roster-reset" onClick={resetRoster}>
            Reset agents & vibes to defaults
          </button>
        </div>
      </div>

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
