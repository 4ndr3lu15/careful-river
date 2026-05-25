import type { ChangeEvent } from 'react';

export type ComposerStatus = 'idle' | 'composing' | 'ready' | 'error';

interface ComposerPanelProps {
  prompt: string;
  modelOverride: string;
  status: ComposerStatus;
  code: string | null;
  model: string | null;
  error: string | null;
  onPromptChange: (value: string) => void;
  onModelOverrideChange: (value: string) => void;
  onCompose: () => void;
}

export function ComposerPanel({
  prompt,
  modelOverride,
  status,
  code,
  model,
  error,
  onPromptChange,
  onModelOverrideChange,
  onCompose,
}: ComposerPanelProps) {
  const canCompose = prompt.trim().length > 0 && status !== 'composing';

  return (
    <section style={{ marginTop: '2rem', maxWidth: '760px' }}>
      <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
        Prompt
        <textarea
          value={prompt}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            onPromptChange(event.target.value)
          }
          rows={4}
          placeholder='e.g. "slow melancholic jazz at 90bpm with piano and bass"'
          style={{
            display: 'block',
            width: '100%',
            marginTop: '0.5rem',
            padding: '0.75rem',
            fontSize: '1rem',
            borderRadius: '8px',
            border: '1px solid #d0d7de',
          }}
        />
      </label>

      <label
        style={{
          display: 'block',
          marginBottom: '0.75rem',
          fontWeight: 600,
          fontSize: '0.9rem',
        }}
      >
        Model override{' '}
        <span style={{ fontWeight: 'normal', opacity: 0.6 }}>
          · optional, e.g. <code>openai/gpt-4o</code>
        </span>
        <input
          type="text"
          value={modelOverride}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onModelOverrideChange(event.target.value)
          }
          placeholder="leave blank to use OPENROUTER_MODEL from .env.local"
          spellCheck={false}
          style={{
            display: 'block',
            width: '100%',
            marginTop: '0.4rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.95rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            borderRadius: '8px',
            border: '1px solid #d0d7de',
          }}
        />
      </label>

      <button
        type="button"
        onClick={onCompose}
        disabled={!canCompose}
        aria-busy={status === 'composing'}
        style={{
          padding: '0.6rem 1.4rem',
          fontSize: '1rem',
          borderRadius: '999px',
          border: '1px solid #1f6feb',
          background: canCompose ? '#1f6feb' : '#8c959f',
          color: '#ffffff',
          cursor: canCompose ? 'pointer' : 'not-allowed',
        }}
      >
        {status === 'composing' ? 'Composing...' : 'Compose'}
      </button>

      {error ? (
        <p style={{ marginTop: '1rem', color: '#d1242f' }}>{error}</p>
      ) : null}

      {code ? (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ marginBottom: '0.5rem', color: '#57606a' }}>
            Model: {model ?? 'unknown'}
          </div>
          <pre
            style={{
              background: '#0d1117',
              color: '#c9d1d9',
              padding: '1rem',
              borderRadius: '12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {code}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
