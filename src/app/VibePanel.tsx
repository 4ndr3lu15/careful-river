/**
 * VibePanel — one-tap vibe cards (formerly PresetPanel).
 *
 * The user does not write prompts: they pick a vibe. Tapping a card puts the
 * vibe's agents on stage and sends its brief (plus each agent's style) to the
 * composer. Each card has an edit affordance, and the last card creates a new
 * vibe — both open the VibeForm modal owned by `App`.
 */
import { agentsForVibe, type BandAgent, type Vibe } from '../band';

interface VibePanelProps {
  vibes: readonly Vibe[];
  agents: readonly BandAgent[];
  composing: boolean;
  onCompose: (vibe: Vibe) => void;
  /** Open the form for an existing vibe (`vibe`) or a new one (`null`). */
  onEdit: (vibe: Vibe | null) => void;
}

export function VibePanel({ vibes, agents, composing, onCompose, onEdit }: VibePanelProps) {
  return (
    <section className="panel">
      <h2 className="panel__title">Vibes</h2>
      <div className="preset-grid">
        {vibes.map((vibe) => {
          const lineup = agentsForVibe(vibe, agents);
          return (
            <div
              key={vibe.id}
              className="preset"
              style={{ ['--preset-accent' as string]: vibe.accent }}
            >
              <button
                type="button"
                className="preset__hit"
                disabled={composing}
                onClick={() => onCompose(vibe)}
              >
                <div className="preset__name">{vibe.name}</div>
                <div className="preset__desc">{vibe.description}</div>
                <div className="preset__lineup">
                  {lineup.map((agent) => agent.name).join(' · ')}
                </div>
              </button>
              <button
                type="button"
                className="icon-btn preset__edit"
                aria-label={`Edit vibe ${vibe.name}`}
                title="Edit vibe"
                onClick={() => onEdit(vibe)}
              >
                ✎
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="preset preset--add"
          onClick={() => onEdit(null)}
        >
          <div className="preset__name">+ New vibe</div>
          <div className="preset__desc">Define a brief & pick the lineup</div>
        </button>
      </div>
    </section>
  );
}
