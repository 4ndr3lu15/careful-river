/**
 * CodePanel — read-only display of the composer's output.
 *
 * Shows status, the resolving model, any error, and the generated Strudel code
 * in a neon terminal block. In dev builds it also hosts a dev-only provider
 * override form (pick provider, paste key, set model) behind an "advanced"
 * disclosure — see src/composer/providers.ts. The whole form is compiled out of
 * production builds via `import.meta.env.DEV`.
 */
import type { ChangeEvent } from 'react';
import type { ComposerStatus } from './App';
import { PROVIDER_PRESETS, findPreset, type DevOverride } from '../composer';

interface CodePanelProps {
  status: ComposerStatus;
  code: string | null;
  model: string | null;
  error: string | null;
  devOverride: DevOverride | null;
  onDevOverrideChange: (value: DevOverride | null) => void;
}

const STATUS_LABEL: Record<ComposerStatus, string> = {
  idle: 'awaiting scene',
  composing: 'composing…',
  ready: 'ready',
  error: 'error',
};

const EMPTY_OVERRIDE: DevOverride = { provider: 'openrouter', apiKey: '', model: '', baseURL: '' };

export function CodePanel({
  status,
  code,
  model,
  error,
  devOverride,
  onDevOverrideChange,
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

      {import.meta.env.DEV ? (
        <DevProviderForm value={devOverride} onChange={onDevOverrideChange} />
      ) : null}
    </section>
  );
}

interface DevProviderFormProps {
  value: DevOverride | null;
  onChange: (value: DevOverride | null) => void;
}

/**
 * Dev-only provider override. Rendered only in dev builds. The selection is
 * persisted to localStorage by App.tsx and sent per-request to /api/compose,
 * where it is honored only when NODE_ENV !== 'production'.
 */
function DevProviderForm({ value, onChange }: DevProviderFormProps) {
  const current = value ?? EMPTY_OVERRIDE;
  const preset = findPreset(current.provider);
  const isCustom = current.provider === 'custom';
  const active = Boolean(value);

  const update = (patch: Partial<DevOverride>) => {
    onChange({ ...current, ...patch });
  };

  const handleProvider = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = findPreset(event.target.value);
    onChange({
      provider: event.target.value,
      apiKey: current.apiKey,
      // Swap in the new preset's default model unless the user typed one already.
      model: current.model || next?.defaultModel || '',
      baseURL: next?.baseURL ?? '',
    });
  };

  return (
    <details className="advanced" style={{ marginTop: '1rem' }} open={active}>
      <summary>Dev · provider override {active ? '(active)' : ''}</summary>

      <label className="field-label">Provider</label>
      <select className="input" value={current.provider} onChange={handleProvider}>
        {PROVIDER_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      {isCustom ? (
        <>
          <label className="field-label">Base URL</label>
          <input
            className="input"
            type="text"
            spellCheck={false}
            value={current.baseURL ?? ''}
            placeholder="https://api.example.com/v1"
            onChange={(e) => update({ baseURL: e.target.value })}
          />
        </>
      ) : null}

      <label className="field-label">API key</label>
      <input
        className="input"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={current.apiKey}
        placeholder={preset?.keyHint ?? 'provider key'}
        onChange={(e) => update({ apiKey: e.target.value })}
      />

      <label className="field-label">Model</label>
      <input
        className="input"
        type="text"
        spellCheck={false}
        value={current.model}
        placeholder={preset?.defaultModel || 'model id'}
        onChange={(e) => update({ model: e.target.value })}
      />

      <p className="muted" style={{ marginTop: '0.5rem' }}>
        Dev only — the key is stored in this browser (localStorage) and sent to the
        local server per request. Never shipped in the production build.
      </p>
      <button type="button" className="btn btn--ghost" onClick={() => onChange(null)}>
        Clear override
      </button>
    </details>
  );
}
