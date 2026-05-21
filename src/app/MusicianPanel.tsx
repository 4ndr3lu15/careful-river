/**
 * MusicianPanel — Sprint 2 dev harness for the `musician/` module.
 *
 * Initialises `@strudel/web` at mount, then exposes Play / Stop plus an
 * editable code field (pre-filled with a test pattern) and the dev EventLog.
 * Together they satisfy Sprint 2's "Done when": Play produces audio and the
 * EventLog fills with coherent timestamps.
 *
 * INTEGRATION NOTE (parallel branches): this panel owns its own `code` so
 * Sprint 2 is verifiable without the composer. When Sprint 1 (composer)
 * merges, `App.tsx` should own `code` and pass it down as a prop — at which
 * point the textarea here becomes read-only or is dropped.
 */
import { useEffect, useState } from 'react';
import { init, play, stop } from '../musician';
import { EventLog } from './EventLog';

/** Uses only samples the cheatsheet lists as always present. */
const DEFAULT_CODE = 's("bd ~ sd ~, hh*8")';

type Status = 'loading' | 'ready' | 'playing' | 'error';

export function MusicianPanel() {
  const [status, setStatus] = useState<Status>('loading');
  const [code, setCode] = useState(DEFAULT_CODE);

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

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        rows={3}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '40rem',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.85rem',
          padding: '0.5rem',
        }}
      />

      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={handlePlay} disabled={busy}>
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
