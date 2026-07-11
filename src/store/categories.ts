import type { Category } from './types'

export const CATEGORY_HUES: Record<Category, number> = {
  Health: 12,
  Family: 300,
  Gratitude: 150,
  Guidance: 258,
  Provision: 55,
  Friends: 210,
  Work: 30,
  Church: 285,
}

export const CATEGORIES = Object.keys(CATEGORY_HUES) as Category[]

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

/** Hue (multiple of 15°) with the greatest circular distance to every hue in use. */
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
