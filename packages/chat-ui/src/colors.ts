import { AVATAR_COLORS, seedColor } from '@alternatefutures/tokens'

// Re-export the canonical identity palette + seeding from tokens (the single
// source of truth) so consumers never re-define them.
export { AVATAR_COLORS, seedColor }

/** Two-letter initials for an avatar fallback. */
export function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase()
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

/**
 * Assign each fingerprint a UNIQUE color from the palette (deterministic; greedy-
 * probes to the next free slot on a hash collision, repeating only once all 16 are
 * used). Returns a lookup that falls back to seedColor for unknown fingerprints.
 */
export function makeColorOf(fingerprints: Iterable<string>): (fp: string) => string {
  const used = new Set<string>()
  const map = new Map<string, string>()
  for (const fp of [...new Set(fingerprints)].sort()) {
    let h = 0
    for (let i = 0; i < fp.length; i++) h = (h * 31 + fp.charCodeAt(i)) >>> 0
    const start = h % AVATAR_COLORS.length
    let chosen: string = AVATAR_COLORS[start]
    for (let k = 0; k < AVATAR_COLORS.length; k++) {
      const c = AVATAR_COLORS[(start + k) % AVATAR_COLORS.length]
      if (!used.has(c)) {
        chosen = c
        break
      }
    }
    used.add(chosen)
    map.set(fp, chosen)
  }
  return (fp: string) => map.get(fp) ?? seedColor(fp)
}
