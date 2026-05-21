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

export function App() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<ComposerStatus>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompose = useCallback(async () => {
    if (!prompt.trim() || status === 'composing') return;

    setStatus('composing');
    setError(null);

    try {
      const result = await compose({ prompt });
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
  }, [prompt, status]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Banda Virtual</h1>
      <p>WebXR + LLM virtual band — proof of concept.</p>
      <ComposerPanel
        prompt={prompt}
        status={status}
        code={code}
        model={model}
        error={error}
        onPromptChange={setPrompt}
        onCompose={handleCompose}
      />
      <MusicianPanel code={code} />
    </main>
  );
}
