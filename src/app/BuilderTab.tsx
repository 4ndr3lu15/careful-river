/**
 * BuilderTab — manage the band: create/edit/delete the agents and vibes.
 *
 * This is the "workshop" half of the app. Agents are listed as editable rows
 * (click to open the AgentForm with its music-theory sound rules); vibes reuse
 * the VibePanel in edit mode (clicking a card opens the VibeForm rather than
 * composing — composing happens on the Stage tab).
 */
import { SOUND_CATALOG, type BandAgent, type Vibe } from '../band';
import { VibePanel } from './VibePanel';

interface BuilderTabProps {
  agents: readonly BandAgent[];
  vibes: readonly Vibe[];
  onEditAgent: (agent: BandAgent | null) => void;
  onEditVibe: (vibe: Vibe | null) => void;
  onReset: () => void;
}

/** A short, human summary of an agent's sound rules for the management row. */
function ruleSummary(agent: BandAgent): string {
  const cat = SOUND_CATALOG[agent.instrument];
  const s = agent.sound;
  if (!s) return '';
  const bits: string[] = [];
  if (s.sounds.length > 0) bits.push(s.sounds.join('/'));
  if (s.bank) bits.push(s.bank);
  if (cat.hasOctaves) bits.push(`oct ${s.octaveLow}–${s.octaveHigh}`);
  if (s.density && s.density !== 'medium') bits.push(s.density);
  return bits.join(' · ');
}

export function BuilderTab({ agents, vibes, onEditAgent, onEditVibe, onReset }: BuilderTabProps) {
  return (
    <div className="grid">
      <section className="panel">
        <h2 className="panel__title">Agents</h2>
        <div className="legend">
          {agents.map((agent) => {
            const summary = ruleSummary(agent);
            return (
              <button
                key={agent.id}
                type="button"
                className="legend__row legend__row--manage"
                style={{ ['--row-accent' as string]: agent.accent }}
                onClick={() => onEditAgent(agent)}
              >
                <span className="legend__dot" />
                <span style={{ minWidth: 0 }}>
                  <span className="legend__name">{agent.name}</span>
                  <br />
                  <span className="legend__role">
                    {agent.role} · {agent.instrument}
                    {summary ? ` · ${summary}` : ''}
                  </span>
                </span>
                <span className="legend__state">edit ✎</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="btn btn--ghost legend__add" onClick={() => onEditAgent(null)}>
          + New agent
        </button>
      </section>

      <div>
        <VibePanel
          vibes={vibes}
          agents={agents}
          composing={false}
          onCompose={(vibe) => onEditVibe(vibe)}
          onEdit={onEditVibe}
        />
        <button type="button" className="btn btn--ghost roster-reset" onClick={onReset}>
          Reset agents & vibes to defaults
        </button>
      </div>
    </div>
  );
}
