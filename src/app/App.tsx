/**
 * App — root UI glue for the neon-stage demo.
 *
 * State lives here (no state library, per AGENTS.md):
 *  - `activeInstruments`: which personas are live. Toggled from the 3D stage or
 *    the BandLegend, and sent to the composer so only active roles get a part.
 *  - composer result (code/model/status/error), driven by tapping a PresetPanel
 *    card — there is no free-text prompt anymore.
 */
import { useCallback, useState } from 'react';
import { compose, ComposeError } from '../composer';
import { BAND, type PersonaInstrument } from '../band';
import { PresetPanel } from './PresetPanel';
import { BandLegend } from './BandLegend';
import { CodePanel } from './CodePanel';
import { MusicianPanel } from './MusicianPanel';
import { Stage, VRButton } from '../stage';

export type ComposerStatus = 'idle' | 'composing' | 'ready' | 'error';

const ALL_INSTRUMENTS = BAND.map((p) => p.instrument);

export function App() {
  const [modelOverride, setModelOverride] = useState('');
  const [status, setStatus] = useState<ComposerStatus>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeInstruments, setActiveInstruments] = useState<Set<PersonaInstrument>>(
    () => new Set(ALL_INSTRUMENTS),
  );

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

      const trimmedOverride = modelOverride.trim();
      try {
        const result = await compose({
          prompt,
          roles: [...activeInstruments],
          ...(trimmedOverride ? { modelOverride: trimmedOverride } : {}),
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
    [activeInstruments, modelOverride, status],
  );

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="title">BANDA VIRTUAL</h1>
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
            modelOverride={modelOverride}
            onModelOverrideChange={setModelOverride}
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
