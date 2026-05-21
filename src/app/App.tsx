/**
 * App — root UI glue.
 *
 * Sprint 0: a title-only page that proves the React + Vite + HTTPS pipeline
 * boots. Later sprints add the composer panel, Play/Stop controls, the 3D
 * stage and the Enter VR button (see docs/workflow.md and docs/architecture.md
 * → "src/app/").
 */
import { MusicianPanel } from './MusicianPanel';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Banda Virtual</h1>
      <p>WebXR + LLM virtual band — proof of concept.</p>
      <MusicianPanel />
    </main>
  );
}
