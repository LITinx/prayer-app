export const DEFAULT_CATEGORIES: { name: string; hue: number }[] = [
  { name: 'Health', hue: 12 },
  { name: 'Family', hue: 300 },
  { name: 'Gratitude', hue: 150 },
  { name: 'Guidance', hue: 258 },
  { name: 'Provision', hue: 55 },
  { name: 'Friends', hue: 210 },
  { name: 'Work', hue: 30 },
  { name: 'Church', hue: 285 },
]

export function catColor(hue: number) {
  return {
    fg: `oklch(0.5 0.13 ${hue})`,
    bg: `oklch(0.95 0.045 ${hue})`,
    dot: `oklch(0.62 0.15 ${hue})`,
  }
}

/**
 * Hue (multiple of 15°) with the greatest circular distance to every hue in use.
 * If all 24 grid hues are already taken it returns a duplicate (hue 0) — a
 * benign color repeat.
 */
export function nextHue(used: number[]): number {
  if (used.length === 0) return 0
  let best = 0
  let bestDist = -1
  for (let h = 0; h < 360; h += 15) {
    const dist = Math.min(...used.map(u => {
      const d = Math.abs(h - u) % 360
      return Math.min(d, 360 - d)
    }))
    if (dist > bestDist) {
      bestDist = dist
      best = h
    }
  }
  return best
}

export const AVATAR_COLORS = [
  'oklch(0.68 0.12 250)',
  'oklch(0.66 0.12 300)',
  'oklch(0.7 0.11 150)',
  'oklch(0.68 0.12 30)',
  'oklch(0.66 0.13 210)',
]

export function avColor(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length]
}
