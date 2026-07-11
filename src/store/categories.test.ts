import { catColor, avColor, DEFAULT_CATEGORIES, nextHue } from './categories'

describe('catColor (hue-based)', () => {
  it('builds the oklch trio from a hue number', () => {
    expect(catColor(12)).toEqual({
      fg: 'oklch(0.5 0.13 12)',
      bg: 'oklch(0.95 0.045 12)',
      dot: 'oklch(0.62 0.15 12)',
    })
  })
})

describe('avColor', () => {
  it('cycles through the five avatar colors', () => {
    expect(avColor(0)).toBe('oklch(0.68 0.12 250)')
    expect(avColor(5)).toBe('oklch(0.68 0.12 250)')
    expect(avColor(2)).toBe('oklch(0.7 0.11 150)')
  })
})

describe('DEFAULT_CATEGORIES', () => {
  it('lists the 8 defaults with their hues', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(8)
    expect(DEFAULT_CATEGORIES).toContainEqual({ name: 'Health', hue: 12 })
    expect(DEFAULT_CATEGORIES).toContainEqual({ name: 'Church', hue: 285 })
  })
})

describe('nextHue', () => {
  it('picks the candidate hue farthest from all existing hues', () => {
    // candidates are every 15°; with only hue 0 taken, 180 is farthest
    expect(nextHue([0])).toBe(180)
  })
  it('works on the full default set (returns a number 0-359 not in use)', () => {
    const used = DEFAULT_CATEGORIES.map(c => c.hue)
    const h = nextHue(used)
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThan(360)
    expect(used).not.toContain(h)
  })
  it('handles empty input', () => {
    expect(nextHue([])).toBe(0)
  })
})
