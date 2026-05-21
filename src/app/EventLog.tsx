/**
 * EventLog — dev-only panel showing the last 20 `NoteEvent`s in real time
 * (RF-04). Renders nothing outside `import.meta.env.DEV`.
 *
 * Temporary Sprint 2 scaffolding: it exists to verify the musician event bus,
 * not to ship. Remove it once the 3D stage consumes events directly.
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { NoteEvent, NoteCustomEvent } from '../types';
import { events } from '../musician';

const MAX_ROWS = 20;

interface Row {
  id: number;
  event: NoteEvent;
}

export function EventLog() {
  const [rows, setRows] = useState<Row[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handler = (event: Event) => {
      const { detail } = event as NoteCustomEvent;
      setRows((prev) =>
        [{ id: nextId.current++, event: detail }, ...prev].slice(0, MAX_ROWS),
      );
    };
    events.addEventListener('note', handler);
    return () => events.removeEventListener('note', handler);
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <section
      style={{
        marginTop: '1rem',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.8rem',
      }}
    >
      <h2 style={{ fontSize: '0.9rem', margin: '0 0 0.25rem' }}>
        Event log{' '}
        <span style={{ fontWeight: 'normal', opacity: 0.6 }}>
          · dev only · last {MAX_ROWS}
        </span>
      </h2>
      {rows.length === 0 ? (
        <p style={{ opacity: 0.6, margin: 0 }}>No notes yet — press Play.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', minWidth: '32rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: 0.6 }}>
              <th style={cell}>instrument</th>
              <th style={cell}>note</th>
              <th style={cell}>start (s)</th>
              <th style={cell}>dur (ms)</th>
              <th style={cell}>Δ (ms)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, event }, i) => {
              // rows are newest-first, so rows[i + 1] is the previous note.
              const prev = rows[i + 1]?.event;
              const deltaMs =
                prev !== undefined
                  ? (event.startTime - prev.startTime) * 1000
                  : undefined;
              return (
                <tr key={id}>
                  <td style={cell}>{event.instrument}</td>
                  <td style={cell}>{event.note ?? '—'}</td>
                  <td style={cell}>{event.startTime.toFixed(3)}</td>
                  <td style={cell}>{(event.duration * 1000).toFixed(0)}</td>
                  <td style={cell}>
                    {deltaMs === undefined ? '—' : deltaMs.toFixed(0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

const cell: CSSProperties = {
  padding: '0.1rem 0.6rem 0.1rem 0',
};
