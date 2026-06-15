/**
 * AgentPalette — the "add agents to the stage" picker on the Stage tab.
 *
 * Every agent on the roster shows as a chip; clicking toggles whether it is on
 * stage (rendered in 3D and sent to the composer). At least one agent must stay
 * on stage, so the last remaining chip can't be removed.
 */
import type { BandAgent } from '../band';

interface AgentPaletteProps {
  agents: readonly BandAgent[];
  stageAgentIds: ReadonlySet<string>;
  onToggleStage: (agentId: string) => void;
}

export function AgentPalette({ agents, stageAgentIds, onToggleStage }: AgentPaletteProps) {
  const onStageCount = agents.filter((a) => stageAgentIds.has(a.id)).length;

  return (
    <section className="panel">
      <h2 className="panel__title">Line-up</h2>
      <p className="muted" style={{ margin: '0 0 0.8rem' }}>
        Tap an agent to add or remove it from the stage.
      </p>
      <div className="palette">
        {agents.map((agent) => {
          const onStage = stageAgentIds.has(agent.id);
          const lockLast = onStage && onStageCount <= 1;
          return (
            <button
              key={agent.id}
              type="button"
              className="palette__chip"
              data-on={onStage}
              disabled={lockLast}
              title={lockLast ? 'At least one agent must stay on stage' : undefined}
              style={{ ['--row-accent' as string]: agent.accent }}
              onClick={() => onToggleStage(agent.id)}
              aria-pressed={onStage}
            >
              <span className="legend__dot" />
              <span className="palette__name">{agent.name}</span>
              <span className="palette__role">{agent.instrument}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
