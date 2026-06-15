/**
 * VibeForm — create or edit one vibe in a pop-up modal.
 *
 * A vibe is a natural-language brief plus the set of agents it puts on stage.
 * Leaving every agent unchecked means "the whole roster" (so default vibes
 * keep working when new agents are added later).
 */
import { useState, type FormEvent } from 'react';
import type { BandAgent, Vibe } from '../band';
import { Modal } from './Modal';

interface VibeFormProps {
  /** Vibe being edited, or `null` to create a new one. */
  vibe: Vibe | null;
  /** Current roster, for the agent picker. */
  agents: readonly BandAgent[];
  onSave: (draft: Omit<Vibe, 'id'>, id: string | null) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function VibeForm({ vibe, agents, onSave, onDelete, onClose }: VibeFormProps) {
  const [name, setName] = useState(vibe?.name ?? '');
  const [description, setDescription] = useState(vibe?.description ?? '');
  const [accent, setAccent] = useState(vibe?.accent ?? '#9b6bff');
  const [prompt, setPrompt] = useState(vibe?.prompt ?? '');
  const [agentIds, setAgentIds] = useState<Set<string>>(() => new Set(vibe?.agentIds ?? []));

  const toggleAgent = (id: string) => {
    setAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !prompt.trim()) return;
    onSave(
      {
        name: name.trim(),
        description: description.trim(),
        accent,
        prompt: prompt.trim(),
        agentIds: [...agentIds],
      },
      vibe?.id ?? null,
    );
  };

  return (
    <Modal title={vibe ? `Edit vibe — ${vibe.name}` : 'New vibe'} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form__row">
          <label className="field-label" style={{ flex: 1 }}>
            Name
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acid Sunrise"
              required
              autoFocus
            />
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
          Short description (shown on the card)
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Squelchy 303 lines, dawn pads"
          />
        </label>

        <label className="field-label">
          Prompt (the musical brief sent to the composer)
          <textarea
            className="input"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Acid house at 124 bpm: squelchy resonant bass line, four-on-the-floor drums…"
            required
          />
        </label>

        <fieldset className="field-label form__agents">
          <legend>Agents on stage (none checked = whole roster)</legend>
          {agents.map((agent) => (
            <label
              key={agent.id}
              className="form__agent"
              style={{ ['--row-accent' as string]: agent.accent }}
            >
              <input
                type="checkbox"
                checked={agentIds.has(agent.id)}
                onChange={() => toggleAgent(agent.id)}
              />
              <span className="legend__dot" />
              <span>
                {agent.name} <span className="legend__role">({agent.instrument})</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="controls form__actions">
          <button type="submit" className="btn btn--primary">
            {vibe ? 'Save vibe' : 'Create vibe'}
          </button>
          {vibe && (
            <button type="button" className="btn btn--ghost" onClick={() => onDelete(vibe.id)}>
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
