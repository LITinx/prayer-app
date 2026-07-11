import { prayedToday, streak, daysPrayed, appStreak, monthMarks, prevDay } from './history'

const L = (prayerId: string, prayedOn: string) => ({ id: `${prayerId}-${prayedOn}`, prayerId, prayedOn })
const today = '2026-07-11'

describe('prevDay', () => {
  it('steps back one day across month boundaries', () => {
    expect(prevDay('2026-07-11')).toBe('2026-07-10')
    expect(prevDay('2026-07-01')).toBe('2026-06-30')
    expect(prevDay('2026-01-01')).toBe('2025-12-31')
  })
  it('handles the leap-day boundary', () => {
    expect(prevDay('2024-03-01')).toBe('2024-02-29')
  })
})

describe('prayedToday', () => {
  it('true only when a log row exists for today', () => {
    const logs = [L('p1', today), L('p2', '2026-07-10')]
    expect(prayedToday(logs, 'p1', today)).toBe(true)
    expect(prayedToday(logs, 'p2', today)).toBe(false)
  })
})

describe('streak', () => {
  it('counts consecutive days ending today', () => {
    const logs = [L('p1', today), L('p1', '2026-07-10'), L('p1', '2026-07-09')]
    expect(streak(logs, 'p1', today)).toBe(3)
  })
  it('still alive when the run ends yesterday', () => {
    const logs = [L('p1', '2026-07-10'), L('p1', '2026-07-09')]
    expect(streak(logs, 'p1', today)).toBe(2)
  })
  it('zero when the run ends before yesterday or log is empty', () => {
    expect(streak([L('p1', '2026-07-08')], 'p1', today)).toBe(0)
    expect(streak([], 'p1', today)).toBe(0)
  })
  it('breaks at a gap', () => {
    const logs = [L('p1', today), L('p1', '2026-07-09')]
    expect(streak(logs, 'p1', today)).toBe(1)
  })
  it('ignores future-dated entries', () => {
    const logs = [L('p1', '2026-07-20'), L('p1', today), L('p1', '2026-07-10')]
    expect(streak(logs, 'p1', today)).toBe(2)
  })
  it('is order-independent: unsorted log gives the same result as sorted', () => {
    const sorted = [L('p1', today), L('p1', '2026-07-10'), L('p1', '2026-07-09')]
    const unsorted = [L('p1', '2026-07-10'), L('p1', '2026-07-09'), L('p1', today)]
    expect(streak(unsorted, 'p1', today)).toBe(streak(sorted, 'p1', today))
    expect(streak(unsorted, 'p1', today)).toBe(3)
  })
})

describe('daysPrayed', () => {
  it('counts all rows for the prayer', () => {
    const logs = [L('p1', today), L('p1', '2026-07-01'), L('p2', today)]
    expect(daysPrayed(logs, 'p1')).toBe(2)
  })
})

describe('duplicate rows for the same prayer and date', () => {
  it('streak counts the date once, daysPrayed counts each row', () => {
    const logs = [L('p1', today), L('p1', today)]
    expect(streak(logs, 'p1', today)).toBe(1)
    expect(daysPrayed(logs, 'p1')).toBe(2)
  })
})

describe('appStreak', () => {
  it('walks distinct dates across all prayers', () => {
    const logs = [L('p1', today), L('p2', today), L('p2', '2026-07-10')]
    expect(appStreak(logs, today)).toBe(2)
  })
  it('zero when nothing today or yesterday', () => {
    expect(appStreak([L('p1', '2026-07-08')], today)).toBe(0)
  })
})

describe('monthMarks', () => {
  it('returns day-of-month numbers for the given prayer and month', () => {
    const logs = [L('p1', '2026-07-11'), L('p1', '2026-07-01'), L('p1', '2026-06-30'), L('p2', '2026-07-05')]
    expect([...monthMarks(logs, 'p1', 2026, 7)].sort((a, b) => a - b)).toEqual([1, 11])
  })
})
