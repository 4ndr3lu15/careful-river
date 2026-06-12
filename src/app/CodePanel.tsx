/**
 * CodePanel — read-only display of the composer's output.
 *
 * Replaces the old ComposerPanel's prompt textarea (prompts now come from
 * PresetPanel). Shows status, the resolving model, any error, and the generated
 * Strudel code in a neon terminal block. Also hosts the optional model override
 * behind an "advanced" disclosure.
 */
import type { ChangeEvent } from 'react';
import type { ComposerStatus } from './App';

interface CodePanelProps {
  status: ComposerStatus;
  code: string | null;
  model: string | null;
  error: string | null;
  modelOverride: string;
  onModelOverrideChange: (value: string) => void;
}

const STATUS_LABEL: Record<ComposerStatus, string> = {
  idle: 'awaiting scene',
  composing: 'composing…',
  ready: 'ready',
  error: 'error',
};

export function CodePanel({
  status,
  code,
  model,
  error,
  modelOverride,
  onModelOverrideChange,
}: CodePanelProps) {
  return (
    <section className="panel">
      <h2 className="panel__title">
        Composer
        <span className="status-pill">{STATUS_LABEL[status]}</span>
      </h2>

      {error ? <p className="error-text">{error}</p> : null}

      {code ? (
        <>
          <div className="code-meta">model · {model ?? 'unknown'}</div>
          <pre className="code-block">{code}</pre>
        </>
      ) : status !== 'error' ? (
        <p className="muted">Pick a scene preset above to generate a pattern.</p>
      ) : null}

      <details className="advanced" style={{ marginTop: '1rem' }}>
        <summary>Advanced · model override</summary>
        <input
          className="input"
          type="text"
          value={modelOverride}
          spellCheck={false}
          placeholder="e.g. openai/gpt-4o — blank uses OPENROUTER_MODEL"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onModelOverrideChange(event.target.value)
          }
        />
      </details>
    </section>
  );
}
