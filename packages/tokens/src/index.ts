/**
 * @alternatefutures/tokens — JS-accessible brand values (framework-agnostic).
 *
 * The CSS custom properties live in `tokens.css` / `theme.css`; these exports are
 * for contexts that can't read CSS variables (canvas, charts, inline styles,
 * server-computed colors). Keep these in sync with the CSS token values.
 */

/** Brand accent palette — the terminal "term" tokens (also exposed as CSS `--term*`). */
export const BRAND = {
  /** #A5B2FF — primary brand accent. */
  term: '#a5b2ff',
  /** #828DD6 — dimmed accent (secondary text on dark). */
  termDim: '#828dd6',
  /** #39406B — faint accent (hairlines, idle borders). */
  termFaint: '#39406b',
} as const;

/**
 * Deterministic per-identity colors: 16 muted oklch hues, evenly spread for max
 * separation. Light enough to carry dark initials AND legible as username text on
 * the dark background. Pick with {@link seedColor}.
 */
export const AVATAR_COLORS = [
  'oklch(0.78 0.12 18)', // red
  'oklch(0.78 0.12 40)', // orange
  'oklch(0.78 0.12 63)', // amber
  'oklch(0.78 0.12 85)', // gold
  'oklch(0.78 0.12 108)', // chartreuse
  'oklch(0.78 0.12 130)', // green
  'oklch(0.78 0.12 153)', // emerald
  'oklch(0.78 0.12 175)', // teal
  'oklch(0.78 0.12 198)', // cyan
  'oklch(0.78 0.12 220)', // sky
  'oklch(0.78 0.12 243)', // blue
  'oklch(0.78 0.12 265)', // indigo
  'oklch(0.78 0.12 288)', // violet
  'oklch(0.78 0.12 310)', // purple
  'oklch(0.78 0.12 333)', // magenta
  'oklch(0.78 0.12 355)', // pink
] as const;

/**
 * Stable color for a seed (e.g. a pubkey fingerprint or display name). The same
 * seed always maps to the same {@link AVATAR_COLORS} entry.
 */
export function seedColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
