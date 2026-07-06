import { loadState, saveState, seedState, STORAGE_KEY } from './persistence'
import { demoState } from '../test/fixtures'

const now = 1_780_000_000_000
const today = '2026-07-05'

beforeEach(() => localStorage.clear())

describe('seedState', () => {
  it('starts with empty prayers and answered lists', () => {
    const s = seedState(now, today)
    expect(s.prayers).toHaveLength(0)
    expect(s.answered).toHaveLength(0)
    expect(s.appStreak).toEqual({ count: 0, lastPrayedDate: today })
    expect(s.screen).toBe('home')
    expect(s.lastVisitDate).toBe(today)
    expect(s.profile).toEqual({ name: 'Anna', initials: 'AR' })
  })

  it('keeps a single demo group with its feed', () => {
    const s = seedState(now, today)
    expect(s.groups).toHaveLength(1)
    expect(s.groups[0].name).toBe('Morning Grace')
    expect(s.groups[0].requests).toBe(3)
    expect(s.feeds.g1).toHaveLength(3)
  })
})

describe('loadState', () => {
  it('seeds when storage is empty', () => {
    const s = loadState(now, today)
    expect(s.prayers).toHaveLength(0)
    expect(s.groups).toHaveLength(1)
  })

  it('round-trips through saveState', () => {
    saveState(demoState(now, today))
    expect(loadState(now, today).prayers).toHaveLength(5)
  })

  it('reseeds on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadState(now, today).groups).toHaveLength(1)
  })

  it('reseeds on wrong shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: 1 }))
    expect(loadState(now, today).groups).toHaveLength(1)
  })

  it('resets prayedToday flags and returns home on a new day', () => {
    const s = demoState(now, '2026-07-04')
    saveState({ ...s, screen: 'answered' })
    const loaded = loadState(now, today)
    expect(loaded.lastVisitDate).toBe(today)
    expect(loaded.screen).toBe('home')
    expect(loaded.prayers).toHaveLength(5)
    expect(loaded.prayers.every(p => !p.prayedToday)).toBe(true)
  })

  it('keeps prayedToday flags on the same day', () => {
    saveState(demoState(now, today))
    expect(loadState(now, today).prayers.some(p => p.prayedToday)).toBe(true)
  })
})

describe('saveState', () => {
  it('does not throw when storage writes fail', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveState(seedState(now, today))).not.toThrow()
    spy.mockRestore()
  })
})
