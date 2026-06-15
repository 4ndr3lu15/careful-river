/**
 * BandLegend — the agent roster as a toggle list, mirroring the click-to-toggle
 * on the 3D characters, plus edit/create affordances that open the AgentForm
 * modal owned by `App`.
 */
import type { BandAgent } from '../band';

interface BandLegendProps {
  agents: readonly BandAgent[];
  activeAgentIds: ReadonlySet<string>;
  onToggle: (agentId: string) => void;
  /** Open the form for an existing agent (`agent`) or a new one (`null`). */
  onEdit: (agent: BandAgent | null) => void;
}

export function BandLegend({ agents, activeAgentIds, onToggle, onEdit }: BandLegendProps) {
  return (
    <section className="panel">
      <h2 className="panel__title">The Band</h2>
      <div className="legend">
        {agents.map((agent) => {
          const active = activeAgentIds.has(agent.id);
          return (
            <div
              key={agent.id}
              className="legend__row"
              data-active={active}
              style={{ ['--row-accent' as string]: agent.accent }}
            >
              <button
                type="button"
                className="legend__hit"
                onClick={() => onToggle(agent.id)}
                aria-pressed={active}
              >
                <span className="legend__dot" />
                <span>
                  <span className="legend__name">{agent.name}</span>
                  <br />
                  <span className="legend__role">
                    {agent.role} · {agent.instrument}
                  </span>
                </span>
                <span className="legend__state">{active ? 'live' : 'muted'}</span>
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Edit agent ${agent.name}`}
                title="Edit agent"
                onClick={() => onEdit(agent)}
              >
                ✎
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" className="btn btn--ghost legend__add" onClick={() => onEdit(null)}>
        + New agent
      </button>
    </section>
  );
}
