/**
 * persona-docs.ts — per-persona Strudel reference injected into the composer's
 * system prompt at request time.
 *
 * Why this exists: weaker / smaller models (e.g. deepseek-v4-flash) know little
 * about Strudel and hallucinate sample names, chord syntax, and chain methods.
 * The static system prompt (`prompts/composer-system-prompt.md`) keeps the
 * general contract small; this module supplies *focused, idiomatic* Strudel
 * docs for only the personas that will actually play — so the model sees worked
 * examples for its drums part when VOLT is on stage, its bass part when ABYSS
 * is, and so on, without paying tokens for instruments nobody is playing.
 *
 * The data is keyed by the four `NoteEvent` instrument categories (the stable
 * contract from `band.ts`). Keep the sample ids here in sync with
 * `prompts/strudel-cheatsheet.md` and `musician/instrument-map.ts` — if the
 * model writes a sound that isn't in the instrument map, the matching persona
 * never animates.
 */
import type { PersonaInstrument } from '../band';

interface PersonaDoc {
  /** One-line reminder of this category's musical job. */
  role: string;
  /** Markdown body: the Strudel idioms + worked snippets for this part. */
  body: string;
}

/**
 * Stable persona ordering for the four categories. Matches `band.ts` so the
 * injected docs read left→right across the stage.
 */
const PERSONA_ORDER: readonly PersonaInstrument[] = ['drums', 'bass', 'keys', 'horns'];

const PERSONA_DOCS: Record<PersonaInstrument, PersonaDoc> = {
  drums: {
    role: 'percussion — the only part that uses bare `s(...)`, never `note(...)`',
    body: `
**Sounds (drum samples, use inside \`s("...")\`):** \`bd\` kick, \`sd\` snare, \`hh\` closed hat, \`oh\` open hat, \`cp\` clap, \`cb\` cowbell, \`rim\` rimshot.

**Pick a kit** with \`.bank(...)\`: \`"RolandTR909"\` (house/techno), \`"RolandTR808"\` (hip-hop/trap), \`"RolandTR707"\` (clean pop). One \`.bank(...)\` applies to the whole pattern.

**Idioms (mini-notation):**
- Four-on-the-floor + hats: \`s("bd*4, hh*8").bank("RolandTR909")\`
- Backbeat: \`s("bd ~ sd ~").bank("RolandTR909")\`
- Comma layers parts inside one pattern: \`s("bd ~ sd ~, hh*8, ~ ~ ~ oh")\`
- Ghost-note funk: \`s("bd ~ [~ sd] ~, hh*8").bank("RolandTR808")\`
- Add human feel with \`.sometimes(x => x.gain(0.5))\` or \`.swingBy(0.15, 4)\`.

**Rules for this part:** drums are triggered with \`s(...)\`, NOT \`note(...)\`. \`~\` is a rest. Keep gain around \`0.7\`. Do not put pitch names (\`c3\`, \`e4\`) in the drum pattern.`,
  },
  bass: {
    role: 'low end — one note at a time, deep octaves',
    body: `
**Sound:** \`note("...").s("sawtooth")\` is the only bass timbre the stage recognises. Tame the buzz with \`.lpf(400)\`–\`.lpf(900)\`.

**Octaves:** stay LOW — C1–C2 for the root, occasionally up to C3. Example pitches: \`c1 e1 g1 c2 g2 a2 f2\`.

**Idioms:**
- Root-driven cycle (one root per bar): \`note("<c2 g2 a2 f2>").s("sawtooth").lpf(600).gain(0.7)\`
- Octave bounce: \`note("c2 c3 c2 c3").s("sawtooth").gain(0.7)\`
- Walking line (jazz): \`note("c2 e2 g2 a2 g2 e2 d2 b1").s("sawtooth").lpf(800).gain(0.6)\`
- Deep sub for electronic: \`note("<c1 c1 eb1 g1>").s("sawtooth").lpf(300).gain(0.8)\`

**Rules for this part:** monophonic — one pitch per step, no chords (no commas inside the brackets). Always wrap pitches in \`note(...)\`; \`s(...)\` alone gives a drum sound. Use ONLY \`s("sawtooth")\` — other synths (\`sine\`, \`triangle\`, \`square\`) make the wrong character move on stage. Keep it low and out of the keys' register.`,
  },
  keys: {
    role: 'harmony — chords and comping',
    body: `
**Sounds:** \`s("piano")\` (acoustic) or \`s("fmpiano")\` (electric-piano tone). Pattern is always \`note("...").s("piano")\`.

**Chords = commas inside square brackets:** \`note("[c3,e3,g3]")\` plays C-E-G together. A 7th chord: \`note("[c3,e3,g3,b3]")\`. Use mid octaves (C3–C5) so you sit above the bass and below the horns.

**Idioms:**
- Chord progression (one chord per bar): \`note("<[c3,e3,g3] [a2,c3,e3] [f2,a2,c3] [g2,b2,d3]>").s("piano").gain(0.5)\`
- Rhodes comping with rests: \`note("[c3,e3,g3] ~ [c3,e3,g3] ~").s("fmpiano").gain(0.5)\`
- Jazzy 7ths: \`note("<[c3,e3,g3,b3] [d3,f3,a3,c4]>").s("fmpiano").gain(0.45)\`
- Add space/air with \`.room(0.3)\`.

**Rules for this part:** chords use COMMAS inside \`[...]\` (\`[c3,e3,g3]\`); a space (\`[c3 e3 g3]\`) is an arpeggio, not a chord. Use ONLY \`s("piano")\` or \`s("fmpiano")\`. Always \`note(...)\`, gain ~\`0.5\` so chords don't mask the melody.`,
  },
  horns: {
    role: 'lead / melody — single-line, leaves space',
    body: `
**Sound:** ALWAYS \`s("sax")\` — a sampled saxophone, and the name that tells the stage this is the brass performer. Shape it with \`.attack(0.02).release(0.2)\` for a softer or punchier tone. Do NOT write \`s("sawtooth")\`/\`s("triangle")\` here: those make the bass or no character move instead of the horn.

**Register:** sing ABOVE the keys — C4–C6.

**Idioms:**
- Singable motif with rests: \`note("c5 ~ e5 g5 ~ e5").s("sax").gain(0.6)\`
- Call-and-response cycle: \`note("<[c5 e5 g5] [g5 e5 c5]>").s("sax").gain(0.6)\`
- Softer lead: \`note("c5 e5 g5 e5").s("sax").attack(0.02).release(0.2).gain(0.5)\`
- Add motion with \`.sometimes(x => x.add(note(12)))\` (octave jumps) sparingly.

**Rules for this part:** monophonic lead — one note at a time, no chords. Use ONLY \`s("sax")\`. Leave rests (\`~\`); a horn that never breathes sounds robotic. Stay in a high register so it cuts through.`,
  },
};

/**
 * Build the per-persona Strudel reference block to append to the system prompt.
 *
 * @param roles  Active persona categories. When omitted or empty, docs for all
 *               four personas are returned (the composer may use any of them).
 * @returns A markdown section, or an empty string if `roles` is empty after
 *          filtering (should not happen — kept defensive).
 */
export function buildPersonaDocs(roles?: readonly PersonaInstrument[]): string {
  const active =
    roles && roles.length > 0
      ? PERSONA_ORDER.filter((cat) => roles.includes(cat))
      : PERSONA_ORDER;

  if (active.length === 0) return '';

  const sections = active.map((cat) => {
    const doc = PERSONA_DOCS[cat];
    return `### ${cat} — ${doc.role}\n${doc.body.trim()}`;
  });

  return [
    '## Strudel reference for the performers on stage',
    '',
    'Focused, copy-adaptable Strudel for *exactly* the parts you must write. ' +
      'Follow the per-part rules — they encode the mistakes models make most ' +
      'often on each instrument.',
    '',
    sections.join('\n\n'),
  ].join('\n');
}
