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

export function catColor(cat: Category) {
  const h = CATEGORY_HUES[cat]
  return {
    fg: `oklch(0.5 0.13 ${h})`,
    bg: `oklch(0.95 0.045 ${h})`,
    dot: `oklch(0.62 0.15 ${h})`,
  }
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
