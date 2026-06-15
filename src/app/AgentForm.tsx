/**
 * AgentForm — create or edit one band agent in a pop-up modal.
 *
 * The instrument category is the only constrained field: it must be one of the
 * four `NoteEvent` categories so the 3D character knows which notes make it
 * pulse (see band.ts). Everything else — name, role, accent, style — is
 * free-form and feeds the composer prompt.
 */
import { useState, type FormEvent } from 'react';
import { PERSONA_INSTRUMENTS, type BandAgent, type PersonaInstrument } from '../band';
import { Modal } from './Modal';

interface AgentFormProps {
  /** Agent being edited, or `null` to create a new one. */
  agent: BandAgent | null;
  /** True when this is the last agent — deleting it would empty the stage. */
  lastAgent: boolean;
  onSave: (draft: Omit<BandAgent, 'id'>, id: string | null) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const INSTRUMENT_LABELS: Record<PersonaInstrument, string> = {
  drums: 'Drums — percussion, s("bd sd hh …")',
  bass: 'Bass — low monophonic lines',
  keys: 'Keys — chords and comping',
  horns: 'Horns — lead melody',
};

export function AgentForm({ agent, lastAgent, onSave, onDelete, onClose }: AgentFormProps) {
  const [name, setName] = useState(agent?.name ?? '');
  const [role, setRole] = useState(agent?.role ?? '');
  const [instrument, setInstrument] = useState<PersonaInstrument>(agent?.instrument ?? 'drums');
  const [accent, setAccent] = useState(agent?.accent ?? '#2dd4ff');
  const [style, setStyle] = useState(agent?.style ?? '');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave(
      {
        name: name.trim(),
        role: role.trim() || 'Session Player',
        instrument,
        accent,
        style: style.trim(),
      },
      agent?.id ?? null,
    );
  };

  return (
    <Modal title={agent ? `Edit agent — ${agent.name}` : 'New agent'} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field-label">
          Stage name
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. PRISM"
            required
            autoFocus
          />
        </label>

        <label className="field-label">
          Role / job title
          <input
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Glitch Percussionist"
          />
        </label>

        <div className="form__row">
          <label className="field-label" style={{ flex: 1 }}>
            Instrument (drives the stage animation)
            <select
              className="input"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value as PersonaInstrument)}
            >
              {PERSONA_INSTRUMENTS.map((cat) => (
                <option key={cat} value={cat}>
                  {INSTRUMENT_LABELS[cat]}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Accent
            <input
              className="input input--color"
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
            />
          </label>
        </div>

        <label className="field-label">
          Musical style (added to the prompt when this agent plays)
          <textarea
            className="input"
            rows={3}
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="e.g. Aggressive half-time grooves with rattling hi-hats."
          />
        </label>

        <div className="controls form__actions">
          <button type="submit" className="btn btn--primary">
            {agent ? 'Save agent' : 'Create agent'}
          </button>
          {agent && (
            <button
              type="button"
              className="btn btn--ghost"
              disabled={lastAgent}
              title={lastAgent ? 'The band needs at least one agent' : undefined}
              onClick={() => onDelete(agent.id)}
            >
              Delete
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
