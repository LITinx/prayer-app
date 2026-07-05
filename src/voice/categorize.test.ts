import { categorize } from './categorize'

describe('categorize', () => {
  it.each([
    ['He starts chemotherapy on Monday', 'Health'],
    ['So thankful for the safe arrival', 'Gratitude'],
    ['The visa application to come through', 'Provision'],
    ['Patience for Tom and Elise in their marriage', 'Family'],
    ['My friend needs encouragement', 'Friends'],
    ['Clarity about what to do next', 'Guidance'],
  ])('categorizes %j as %s', (text, expected) => {
    expect(categorize(text)).toBe(expected)
  })

  it('health wins over family when both match', () => {
    expect(categorize('Healing for my mom')).toBe('Health')
  })

  it('is case-insensitive', () => {
    expect(categorize('THANKFUL!')).toBe('Gratitude')
  })
})
