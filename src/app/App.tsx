/**
 * App — root UI glue for the neon-stage demo.
 *
 * State lives here (no state library, per AGENTS.md):
 *  - `activeInstruments`: which personas are live. Toggled from the 3D stage or
 *    the BandLegend, and sent to the composer so only active roles get a part.
 *  - composer result (code/model/status/error), driven by tapping a PresetPanel
 *    card — there is no free-text prompt anymore.
 */
import { useCallback, useEffect, useState } from 'react';
import { compose, ComposeError, type DevOverride } from '../composer';
import { BAND, type PersonaInstrument } from '../band';
import { PresetPanel } from './PresetPanel';
import { BandLegend } from './BandLegend';
import { CodePanel } from './CodePanel';
import { MusicianPanel } from './MusicianPanel';
import { Stage, VRButton } from '../stage';

export type ComposerStatus = 'idle' | 'composing' | 'ready' | 'error';

const ALL_INSTRUMENTS = BAND.map((p) => p.instrument);

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
  const [devOverride, setDevOverride] = useState<DevOverride | null>(() => loadDevOverride());
  const [status, setStatus] = useState<ComposerStatus>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeInstruments, setActiveInstruments] = useState<Set<PersonaInstrument>>(
    () => new Set(ALL_INSTRUMENTS),
  );

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

  const toggleInstrument = useCallback((instrument: PersonaInstrument) => {
    setActiveInstruments((prev) => {
      const next = new Set(prev);
      if (next.has(instrument)) {
        // Keep at least one performer live, otherwise there's nothing to play.
        if (next.size > 1) next.delete(instrument);
      } else {
        next.add(instrument);
      }
      return next;
    });
  }, []);

  const handleCompose = useCallback(
    async (prompt: string) => {
      if (status === 'composing') return;
      setStatus('composing');
      setError(null);

      try {
        const result = await compose({
          prompt,
          roles: [...activeInstruments],
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
    [activeInstruments, devOverride, status],
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
        <Stage activeInstruments={activeInstruments} onToggle={toggleInstrument} />
        <p className="stage-hint">Drag to orbit · click a performer to mute / un-mute</p>
      </section>

      <div className="grid" style={{ marginTop: '1.3rem' }}>
        <div>
          <PresetPanel composing={status === 'composing'} onCompose={handleCompose} />
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
          <BandLegend activeInstruments={activeInstruments} onToggle={toggleInstrument} />
          <MusicianPanel code={code} />
        </div>
      </div>
    </div>
  );
}
