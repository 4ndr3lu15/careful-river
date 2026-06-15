/**
 * AgentForm — create or edit one band agent in a pop-up modal.
 *
 * The instrument category is the only constrained field: it must be one of the
 * four `NoteEvent` categories so the 3D character knows which notes make it
 * pulse (see band.ts). Everything else — name, role, accent, style — is
 * free-form and feeds the composer prompt.
 *
 * The "Sound palette" section captures soft music-theory rules (allowed octave
 * register, allowed Strudel sounds, drum kit, density). These are sent to the
 * composer as guidance (see `describeAgentRules`), giving the user basic control
 * over the kind of sound each agent is allowed to produce.
 */
import { useState, type FormEvent } from 'react';
import {
  PERSONA_INSTRUMENTS,
  SOUND_CATALOG,
  makeDefaultSound,
  type AgentDensity,
  type AgentSound,
  type BandAgent,
  type PersonaInstrument,
} from '../band';
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

const DENSITIES: readonly AgentDensity[] = ['sparse', 'medium', 'busy'];

export function AgentForm({ agent, lastAgent, onSave, onDelete, onClose }: AgentFormProps) {
  const [name, setName] = useState(agent?.name ?? '');
  const [role, setRole] = useState(agent?.role ?? '');
  const [instrument, setInstrument] = useState<PersonaInstrument>(agent?.instrument ?? 'drums');
  const [accent, setAccent] = useState(agent?.accent ?? '#2dd4ff');
  const [style, setStyle] = useState(agent?.style ?? '');
  const [sound, setSound] = useState<AgentSound>(
    () => agent?.sound ?? makeDefaultSound(agent?.instrument ?? 'drums'),
  );

  const catalog = SOUND_CATALOG[instrument];

  // Switching instrument resets the palette to that category's defaults — a
  // drum kit's sounds make no sense for a horn, and octaves don't apply to drums.
  const handleInstrument = (next: PersonaInstrument) => {
    setInstrument(next);
    setSound(makeDefaultSound(next));
  };

  const toggleSoundName = (value: string) => {
    setSound((prev) => {
      const has = prev.sounds.includes(value);
      return {
        ...prev,
        sounds: has ? prev.sounds.filter((s) => s !== value) : [...prev.sounds, value],
      };
    });
  };

  const clampOctaves = (low: number, high: number): Pick<AgentSound, 'octaveLow' | 'octaveHigh'> => {
    const [min, max] = catalog.octaveRange;
    const lo = Math.max(min, Math.min(max, low));
    const hi = Math.max(min, Math.min(max, high));
    return { octaveLow: Math.min(lo, hi), octaveHigh: Math.max(lo, hi) };
  };

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
        sound,
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
              onChange={(e) => handleInstrument(e.target.value as PersonaInstrument)}
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

        <fieldset className="field-label form__sound">
          <legend>Sound palette — what this agent is allowed to emit</legend>

          <div className="sound__group">
            <span className="sound__label">
              Allowed sounds <span className="muted">(none = composer's choice)</span>
            </span>
            <div className="sound__chips">
              {catalog.sounds.map((value) => (
                <label key={value} className="sound__chip" data-on={sound.sounds.includes(value)}>
                  <input
                    type="checkbox"
                    checked={sound.sounds.includes(value)}
                    onChange={() => toggleSoundName(value)}
                  />
                  {value}
                </label>
              ))}
            </div>
          </div>

          {catalog.hasOctaves ? (
            <div className="sound__group">
              <span className="sound__label">Octave register</span>
              <div className="sound__octaves">
                <label>
                  low
                  <input
                    className="input input--num"
                    type="number"
                    min={catalog.octaveRange[0]}
                    max={catalog.octaveRange[1]}
                    value={sound.octaveLow}
                    onChange={(e) =>
                      setSound((prev) => ({
                        ...prev,
                        ...clampOctaves(Number(e.target.value), prev.octaveHigh),
                      }))
                    }
                  />
                </label>
                <span className="sound__dash">–</span>
                <label>
                  high
                  <input
                    className="input input--num"
                    type="number"
                    min={catalog.octaveRange[0]}
                    max={catalog.octaveRange[1]}
                    value={sound.octaveHigh}
                    onChange={(e) =>
                      setSound((prev) => ({
                        ...prev,
                        ...clampOctaves(prev.octaveLow, Number(e.target.value)),
                      }))
                    }
                  />
                </label>
              </div>
            </div>
          ) : null}

          <div className="form__row">
            {catalog.banks ? (
              <label className="field-label" style={{ flex: 1 }}>
                Drum kit
                <select
                  className="input"
                  value={sound.bank ?? ''}
                  onChange={(e) =>
                    setSound((prev) => {
                      const { bank: _drop, ...rest } = prev;
                      return e.target.value ? { ...rest, bank: e.target.value } : rest;
                    })
                  }
                >
                  <option value="">composer's choice</option>
                  {catalog.banks.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="field-label" style={{ flex: 1 }}>
              Density / feel
              <select
                className="input"
                value={sound.density ?? 'medium'}
                onChange={(e) =>
                  setSound((prev) => ({ ...prev, density: e.target.value as AgentDensity }))
                }
              >
                {DENSITIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

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
