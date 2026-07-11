import { todayStr, greeting, dateLine, relTime } from './time'

const DAY = 86_400_000

describe('todayStr', () => {
  it('formats local date as YYYY-MM-DD', () => {
    expect(todayStr(new Date(2026, 6, 4, 23, 30))).toBe('2026-07-04')
  })
})

describe('greeting', () => {
  it('morning before 12, afternoon before 18, evening after', () => {
    expect(greeting(new Date(2026, 6, 4, 9))).toBe('Good morning')
    expect(greeting(new Date(2026, 6, 4, 14))).toBe('Good afternoon')
    expect(greeting(new Date(2026, 6, 4, 20))).toBe('Good evening')
  })
})

describe('dateLine', () => {
  it('formats like the mockup: "Friday, July 3"', () => {
    expect(dateLine(new Date(2026, 6, 3))).toBe('Friday, July 3')
  })
})

describe('relTime', () => {
  const now = 1_780_000_000_000
  it.each([
    [now - 30_000, 'just now'],
    [now - 5 * 60_000, '5m ago'],
    [now - 3 * 3_600_000, '3h ago'],
    [now - 1 * DAY, 'yesterday'],
    [now - 3 * DAY, '3 days ago'],
    [now - 8 * DAY, 'last week'],
    [now - 15 * DAY, '2 weeks ago'],
  ])('formats %i as %s', (ts, label) => {
    expect(relTime(ts, now)).toBe(label)
  })
})
