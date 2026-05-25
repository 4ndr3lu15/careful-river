/**
 * App — root UI glue.
 *
 * Sprint 0 proved the React + Vite + HTTPS pipeline boots. Sprint 1 adds the
 * composer panel; Sprint 2 adds the musician panel (Play/Stop + dev EventLog).
 * Later sprints add the 3D stage and the Enter VR button (see docs/workflow.md
 * and docs/architecture.md → "src/app/").
 */
import { useCallback, useState } from 'react';
import { compose, ComposeError } from '../composer';
import { ComposerPanel, type ComposerStatus } from './ComposerPanel';
import { MusicianPanel } from './MusicianPanel';
import { Stage, VRButton } from '../stage';

export function App() {
  const [prompt, setPrompt] = useState('');
  const [modelOverride, setModelOverride] = useState('');
  const [status, setStatus] = useState<ComposerStatus>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompose = useCallback(async () => {
    if (!prompt.trim() || status === 'composing') return;

    setStatus('composing');
    setError(null);

    const trimmedOverride = modelOverride.trim();
    try {
      const result = await compose({
        prompt,
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
  }, [prompt, modelOverride, status]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Banda Virtual</h1>
      <p>WebXR + LLM virtual band — proof of concept.</p>
      <ComposerPanel
        prompt={prompt}
        modelOverride={modelOverride}
        status={status}
        code={code}
        model={model}
        error={error}
        onPromptChange={setPrompt}
        onModelOverrideChange={setModelOverride}
        onCompose={handleCompose}
      />
      <MusicianPanel code={code} />
      <section
        style={{
          marginTop: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Stage</h2>
        <VRButton />
      </section>
      <section
        style={{
          marginTop: '0.75rem',
          height: '420px',
          border: '1px solid #d0d7de',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <Stage />
      </section>
    </main>
  );
}
