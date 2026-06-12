/**
 * PresetPanel — one-tap "scene" presets.
 *
 * Replaces the old free-text prompt: in the demo the user does not write
 * prompts, they pick a vibe. Each card carries a natural-language brief that is
 * sent to the composer for whichever personas are currently active.
 */

export interface Preset {
  name: string;
  description: string;
  accent: string;
  prompt: string;
}

export const PRESETS: readonly Preset[] = [
  {
    name: 'Neon Electro-Jazz',
    description: 'Swung hats, warm Rhodes, smoky horns',
    accent: '#2dd4ff',
    prompt:
      'Neon cyberpunk electro-jazz at 110 bpm: swung hi-hats, warm Rhodes chords, a walking sub bass, and smoky muted horn lines.',
  },
  {
    name: 'Intergalactic Bossa',
    description: 'Dreamy lounge, brushed & mellow',
    accent: '#39ff8b',
    prompt:
      'Intergalactic lounge bossa nova at 82 bpm: soft brushed drums, dreamy lydian keys, a gentle upright bass, and a mellow horn melody.',
  },
  {
    name: 'Deep Space Funk',
    description: 'Heavy sub bass, punchy & syncopated',
    accent: '#ff2d6f',
    prompt:
      'Deep space funk at 118 bpm: heavy syncopated sub bass, tight punchy drums, stabby clavinet-style keys, and bright horn hits.',
  },
  {
    name: 'Nebula Drift',
    description: 'Ambient, no pulse, lots of space',
    accent: '#9b6bff',
    prompt:
      'Nebula ambient drift with no clear pulse: shimmering pads, sparse sine keys, a slow drone bass, and distant horn swells with lots of space.',
  },
  {
    name: 'Noir Swing',
    description: 'Moody minor-7, lonely trumpet',
    accent: '#ffb454',
    prompt:
      'Noir detective swing at 96 bpm: brushed swing drums, a walking bass, moody minor-7 piano comping, and a lonely muted trumpet.',
  },
  {
    name: 'Quantum DnB',
    description: 'Rolling breaks, deep reese bass',
    accent: '#2dd4ff',
    prompt:
      'Fast quantum drum and bass at 168 bpm: rolling breakbeat drums, a deep reese sub bass, glassy key stabs, and occasional horn stabs.',
  },
];

interface PresetPanelProps {
  composing: boolean;
  onCompose: (prompt: string) => void;
}

export function PresetPanel({ composing, onCompose }: PresetPanelProps) {
  return (
    <section className="panel">
      <h2 className="panel__title">Scene Presets</h2>
      <div className="preset-grid">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className="preset"
            style={{ ['--preset-accent' as string]: preset.accent }}
            disabled={composing}
            onClick={() => onCompose(preset.prompt)}
          >
            <div className="preset__name">{preset.name}</div>
            <div className="preset__desc">{preset.description}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
