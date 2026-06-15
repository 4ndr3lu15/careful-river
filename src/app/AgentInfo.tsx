/**
 * AgentInfo — read-only summary of one agent, opened by right-clicking its
 * character on the Stage. Shows the sound rules so the user can see, at a
 * glance, what each performer is allowed to play (and jump to editing it).
 */
import { SOUND_CATALOG, type BandAgent } from '../band';
import { Modal } from './Modal';

interface AgentInfoProps {
  agent: BandAgent;
  onEdit: (agent: BandAgent) => void;
  onClose: () => void;
}

export function AgentInfo({ agent, onEdit, onClose }: AgentInfoProps) {
  const cat = SOUND_CATALOG[agent.instrument];
  const sound = agent.sound;

  return (
    <Modal title={agent.name} onClose={onClose}>
      <div className="agent-info" style={{ ['--row-accent' as string]: agent.accent }}>
        <p className="agent-info__role">
          <span className="legend__dot" /> {agent.role} · {agent.instrument}
        </p>

        <dl className="agent-info__rules">
          <dt>Allowed sounds</dt>
          <dd>{sound && sound.sounds.length > 0 ? sound.sounds.join(', ') : "composer's choice"}</dd>

          {cat.hasOctaves && sound ? (
            <>
              <dt>Octave register</dt>
              <dd>
                {sound.octaveLow}–{sound.octaveHigh}
              </dd>
            </>
          ) : null}

          {cat.banks ? (
            <>
              <dt>Drum kit</dt>
              <dd>{sound?.bank ?? "composer's choice"}</dd>
            </>
          ) : null}

          <dt>Density</dt>
          <dd>{sound?.density ?? 'medium'}</dd>
        </dl>

        {agent.style ? <p className="agent-info__style">{agent.style}</p> : null}

        <div className="controls form__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              onEdit(agent);
              onClose();
            }}
          >
            Edit agent
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
