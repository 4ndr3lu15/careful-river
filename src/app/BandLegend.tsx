/**
 * BandLegend — the four personas as a toggle list, mirroring the click-to-toggle
 * on the 3D characters. Sharing `BAND` keeps names/colours in sync with the stage.
 */
import { BAND, type PersonaInstrument } from '../band';

interface BandLegendProps {
  activeInstruments: ReadonlySet<PersonaInstrument>;
  onToggle: (instrument: PersonaInstrument) => void;
}

export function BandLegend({ activeInstruments, onToggle }: BandLegendProps) {
  return (
    <section className="panel">
      <h2 className="panel__title">The Band</h2>
      <div className="legend">
        {BAND.map((persona) => {
          const active = activeInstruments.has(persona.instrument);
          return (
            <button
              key={persona.instrument}
              type="button"
              className="legend__row"
              data-active={active}
              style={{ ['--row-accent' as string]: persona.accent }}
              onClick={() => onToggle(persona.instrument)}
              aria-pressed={active}
            >
              <span className="legend__dot" />
              <span>
                <span className="legend__name">{persona.name}</span>
                <br />
                <span className="legend__role">{persona.role}</span>
              </span>
              <span className="legend__state">{active ? 'live' : 'muted'}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
