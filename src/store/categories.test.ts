import { catColor, avColor, CATEGORIES } from './categories'

describe('catColor', () => {
  it('derives fg/bg/dot from the category hue', () => {
    expect(catColor('Health')).toEqual({
      fg: 'oklch(0.5 0.13 12)',
      bg: 'oklch(0.95 0.045 12)',
      dot: 'oklch(0.62 0.15 12)',
    })
  })
})

describe('CATEGORIES', () => {
  it('lists all eight categories in design order', () => {
    expect(CATEGORIES).toEqual([
      'Health', 'Family', 'Gratitude', 'Guidance',
      'Provision', 'Friends', 'Work', 'Church',
    ])
  })
})

describe('avColor', () => {
  it('cycles through the five avatar colors', () => {
    expect(avColor(0)).toBe('oklch(0.68 0.12 250)')
    expect(avColor(5)).toBe('oklch(0.68 0.12 250)')
    expect(avColor(2)).toBe('oklch(0.7 0.11 150)')
  })
})
