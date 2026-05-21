/**
 * MusicianPanel — Play/Stop controls for the `musician/` runtime.
 *
 * Initialises `@strudel/web` at mount, then plays whatever Strudel `code` the
 * composer produced. Together with the dev EventLog this satisfies Sprint 2's
 * "Done when": Play produces audio and the EventLog fills with coherent
 * timestamps.
 *
 * The Strudel pattern is owned by `App` (sourced from the composer) and passed
 * in as a prop — the panel has no editor of its own; `ComposerPanel` already
 * displays the generated code.
 */
import { useEffect, useState } from 'react';
import { init, play, stop } from '../musician';
import { EventLog } from './EventLog';

type Status = 'loading' | 'ready' | 'playing' | 'error';

interface MusicianPanelProps {
  /** Strudel code from the composer; `null` until the first successful compose. */
  code: string | null;
}

export function MusicianPanel({ code }: MusicianPanelProps) {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let cancelled = false;
    init()
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch((error: unknown) => {
        console.error('[musician] init failed:', error);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePlay = async () => {
    if (!code) return;
    try {
      await play(code);
      setStatus('playing');
    } catch (error) {
      console.error('[musician] play failed:', error);
      setStatus('error');
    }
  };

  const handleStop = () => {
    stop();
    setStatus('ready');
  };

  const busy = status === 'loading';

  return (
    <section style={{ marginTop: '1.5rem' }}>
      <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>
        Musician{' '}
        <span style={{ fontWeight: 'normal', opacity: 0.6, fontSize: '0.85rem' }}>
          · {status}
        </span>
      </h2>

      {code ? null : (
        <p style={{ margin: '0 0 0.5rem', opacity: 0.6, fontSize: '0.9rem' }}>
          Compose a pattern above, then press Play.
        </p>
      )}

      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={handlePlay} disabled={busy || !code}>
          {busy ? 'Loading…' : '▶ Play'}
        </button>
        <button type="button" onClick={handleStop} disabled={busy}>
          ■ Stop
        </button>
      </div>

      <EventLog />
    </section>
  );
}
