/**
 * MusicianPanel — Play/Stop controls for the `musician/` runtime.
 *
 * Initialises `@strudel/web` at mount, then plays whatever Strudel `code` the
 * composer produced. Together with the dev EventLog this satisfies Sprint 2's
 * "Done when": Play produces audio and the EventLog fills with coherent
 * timestamps.
 *
 * The Strudel pattern is owned by `App` (sourced from the composer) and passed
 * in as a prop — the panel has no editor of its own; `CodePanel` already
 * displays the generated code.
 */
import { useEffect, useState } from 'react';
import { errors, init, play, stop } from '../musician';
import { EventLog } from './EventLog';

type Status = 'loading' | 'ready' | 'playing' | 'error';

interface MusicianPanelProps {
  /** Strudel code from the composer; `null` until the first successful compose. */
  code: string | null;
}

export function MusicianPanel({ code }: MusicianPanelProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    init()
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch((err: unknown) => {
        console.error('[musician] init failed:', err);
        if (!cancelled) {
          setStatus('error');
          setError('Audio engine failed to load. Reload the page to retry.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      setError(`Invalid Strudel: ${message}`);
      setStatus((prev) => (prev === 'playing' ? 'playing' : 'error'));
    };
    errors.addEventListener('error', handler);
    return () => errors.removeEventListener('error', handler);
  }, []);

  const handlePlay = async () => {
    if (!code) return;
    setError(null);
    try {
      await play(code);
      setStatus('playing');
    } catch (err) {
      console.error('[musician] play failed:', err);
      setStatus('error');
      setError(
        err instanceof Error ? err.message : 'Failed to start playback.',
      );
    }
  };

  const handleStop = () => {
    stop();
    setError(null);
    setStatus('ready');
  };

  const busy = status === 'loading';
  const playing = status === 'playing';

  return (
    <section className="panel">
      <h2 className="panel__title">
        Transport
        <span className="status-pill">{status}</span>
      </h2>

      {code ? null : (
        <p className="muted" style={{ margin: '0 0 0.75rem' }}>
          Pick a scene, then press Play.
        </p>
      )}

      <div className="controls">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handlePlay}
          disabled={busy || !code}
          aria-busy={busy}
          title={playing ? 'Re-evaluate the current code' : undefined}
        >
          {busy ? 'Loading…' : playing ? '↻ Restart' : '▶ Play'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleStop}
          disabled={busy}
          title="Always available — silences a runaway pattern"
        >
          ■ Stop
        </button>
      </div>

      {error ? (
        <p role="alert" className="error-text">
          {error}
        </p>
      ) : null}

      <EventLog />
    </section>
  );
}
