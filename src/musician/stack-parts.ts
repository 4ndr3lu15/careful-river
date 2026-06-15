/**
 * stack-parts.ts — split a composed Strudel program into its per-performer parts
 * so the Stage can mute/unmute individual agents live, without a recompose.
 *
 * The composer is instructed (see `server/compose-handler.ts` → `buildUserPrompt`)
 * to emit EXACTLY one part per performer inside a single `stack(...)`, in stage
 * order. So `buildPlayable` finds that outermost `stack(...)`, splits its
 * top-level arguments, drops the muted indices, and rejoins — keeping anything
 * before/after the stack (e.g. `setcpm(...)`). Part index = on-stage lineup index.
 *
 * It is deliberately tolerant: if the program isn't a single splittable stack
 * (no stack, one part, or a parse that doesn't line up), it returns the code
 * unchanged so playback still works — live per-agent mute is simply unavailable
 * for that pattern.
 */

interface StackSpan {
  /** Index of the `stack(`'s opening paren. */
  open: number;
  /** Index of the matching closing paren. */
  close: number;
}

/** Quote characters that open a string literal in Strudel/JS. */
const QUOTES = new Set(['"', "'", '`']);

/**
 * Rebuild the program with the muted part indices removed from its outermost
 * `stack(...)`. Returns the original code if it can't be split safely.
 */
export function buildPlayable(code: string, mutedIndices: ReadonlySet<number>): string {
  if (mutedIndices.size === 0) return code;
  const span = locateStack(code);
  if (!span) return code;

  const inner = code.slice(span.open + 1, span.close);
  const parts = splitTopLevel(inner);
  if (parts.length <= 1) return code;

  const kept = parts.filter((_, i) => !mutedIndices.has(i)).map((p) => p.trim());
  // Everything muted → a valid silent pattern rather than an empty `stack()`.
  const body = kept.length > 0 ? kept.join(', ') : 'silence';
  return code.slice(0, span.open + 1) + body + code.slice(span.close);
}

/**
 * How many top-level parts the program's outermost `stack(...)` has, or 0 when
 * it isn't a splittable single stack. The Stage uses this to decide whether
 * live per-agent muting is available for the current pattern.
 */
export function countStackParts(code: string): number {
  const span = locateStack(code);
  if (!span) return 0;
  const parts = splitTopLevel(code.slice(span.open + 1, span.close));
  return parts.length;
}

/** Find the first `stack(` and its matching close paren, respecting strings. */
function locateStack(code: string): StackSpan | null {
  const match = /\bstack\s*\(/.exec(code);
  if (!match) return null;
  const open = match.index + match[0].length - 1; // index of '('

  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < code.length; i += 1) {
    const ch = code[i];
    if (quote) {
      if (ch === '\\') {
        i += 1; // skip the escaped char
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (QUOTES.has(ch)) {
      quote = ch;
    } else if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return { open, close: i };
    }
  }
  return null;
}

/** Split `inner` on depth-0 commas, respecting brackets, parens, and strings. */
function splitTopLevel(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (quote) {
      if (ch === '\\') {
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (QUOTES.has(ch)) {
      quote = ch;
    } else if (ch === '(' || ch === '[' || ch === '{') {
      depth += 1;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth -= 1;
    } else if (ch === ',' && depth === 0) {
      parts.push(inner.slice(start, i));
      start = i + 1;
    }
  }
  const tail = inner.slice(start);
  if (tail.trim() !== '') parts.push(tail);
  return parts;
}
