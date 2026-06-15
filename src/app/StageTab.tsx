/**
 * StageTab — the performance half of the app.
 *
 * The user picks which agents are on stage (AgentPalette), picks the vibe the
 * band will play (vibe selector), and drives playback with a global Play/Stop.
 * Left-clicking a character mutes/un-mutes its part live; right-clicking opens
 * its info card. The 3D scene renders ONLY the selected agents.
 */
import type { ComposerStatus } from './App';
import type { BandAgent, Vibe } from '../band';
import type { DevOverride } from '../composer';
import { Stage } from '../stage';
import { AgentPalette } from './AgentPalette';
import { CodePanel } from './CodePanel';
import { EventLog } from './EventLog';

interface StageTabProps {
  agents: readonly BandAgent[];
  stageAgents: readonly BandAgent[];
  stageAgentIds: ReadonlySet<string>;
  mutedAgentIds: ReadonlySet<string>;
  vibes: readonly Vibe[];
  selectedVibeId: string | null;
  onSelectVibe: (id: string) => void;
  onToggleStage: (agentId: string) => void;
  onMute: (agentId: string) => void;
  onInfo: (agent: BandAgent) => void;
  // transport
  composerStatus: ComposerStatus;
  isPlaying: boolean;
  playbackError: string | null;
  onPlay: () => void;
  onStop: () => void;
  // composer output
  code: string | null;
  model: string | null;
  error: string | null;
  devOverride: DevOverride | null;
  onDevOverrideChange: (value: DevOverride | null) => void;
}

export function StageTab(props: StageTabProps) {
  const {
    agents,
    stageAgents,
    stageAgentIds,
    mutedAgentIds,
    vibes,
    selectedVibeId,
    onSelectVibe,
    onToggleStage,
    onMute,
    onInfo,
    composerStatus,
    isPlaying,
    playbackError,
    onPlay,
    onStop,
    code,
    model,
    error,
    devOverride,
    onDevOverrideChange,
  } = props;

  const composing = composerStatus === 'composing';
  const canPlay = selectedVibeId !== null && stageAgents.length > 0 && !composing;

  return (
    <>
      <section className="stage-frame">
        <Stage
          agents={stageAgents}
          mutedAgentIds={mutedAgentIds}
          onMute={onMute}
          onInfo={onInfo}
        />
        <p className="stage-hint">
          Drag to orbit · left-click a performer to mute · right-click for info
        </p>
      </section>

      <section className="panel transport" style={{ marginTop: '1.3rem' }}>
        <h2 className="panel__title">
          Transport
          <span className="status-pill">
            {composing ? 'composing…' : isPlaying ? 'playing' : 'stopped'}
          </span>
        </h2>
        <div className="controls">
          <button
            type="button"
            className="btn btn--primary"
            onClick={onPlay}
            disabled={!canPlay}
            aria-busy={composing}
            title={selectedVibeId === null ? 'Pick a vibe first' : undefined}
          >
            {composing ? 'Composing…' : isPlaying ? '↻ Restart' : '▶ Play'}
          </button>
          <button type="button" className="btn" onClick={onStop} disabled={!isPlaying}>
            ■ Stop
          </button>
          {selectedVibeId === null ? (
            <span className="muted">Pick a vibe to play.</span>
          ) : null}
        </div>
        {playbackError ? (
          <p role="alert" className="error-text">
            {playbackError}
          </p>
        ) : null}
      </section>

      <div className="grid" style={{ marginTop: '1.3rem' }}>
        <div>
          <section className="panel">
            <h2 className="panel__title">Vibe</h2>
            <div className="vibe-select">
              {vibes.map((vibe) => (
                <button
                  key={vibe.id}
                  type="button"
                  className="vibe-select__chip"
                  data-on={vibe.id === selectedVibeId}
                  style={{ ['--preset-accent' as string]: vibe.accent }}
                  onClick={() => onSelectVibe(vibe.id)}
                >
                  <span className="vibe-select__name">{vibe.name}</span>
                  <span className="vibe-select__desc">{vibe.description}</span>
                </button>
              ))}
            </div>
          </section>
          <AgentPalette
            agents={agents}
            stageAgentIds={stageAgentIds}
            onToggleStage={onToggleStage}
          />
        </div>
        <div>
          <CodePanel
            status={composerStatus}
            code={code}
            model={model}
            error={error}
            devOverride={devOverride}
            onDevOverrideChange={onDevOverrideChange}
          />
          <EventLog />
        </div>
      </div>
    </>
  );
}
