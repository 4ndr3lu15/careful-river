/**
 * EventLog — dev-only panel showing the last 20 `NoteEvent`s in real time
 * (RF-04). Renders nothing outside `import.meta.env.DEV`.
 *
 * Temporary Sprint 2 scaffolding: it exists to verify the musician event bus,
 * not to ship. Remove it once the 3D stage consumes events directly.
 */
import { useEffect, useRef, useState } from 'react';
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
    <section className="eventlog">
      <h2 className="panel__title" style={{ marginBottom: '0.5rem' }}>
        Event Log
        <span className="status-pill">dev · last {MAX_ROWS}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>No notes yet — press Play.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>instrument</th>
              <th>note</th>
              <th>start (s)</th>
              <th>dur (ms)</th>
              <th>Δ (ms)</th>
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
                  <td>{event.instrument}</td>
                  <td>{event.note ?? '—'}</td>
                  <td>{event.startTime.toFixed(3)}</td>
                  <td>{(event.duration * 1000).toFixed(0)}</td>
                  <td>{deltaMs === undefined ? '—' : deltaMs.toFixed(0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
