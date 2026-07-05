import { loadState, saveState, seedState, STORAGE_KEY } from './persistence'

const now = 1_780_000_000_000
const today = '2026-07-05'

beforeEach(() => localStorage.clear())

describe('seedState', () => {
  it('seeds the mockup demo data', () => {
    const s = seedState(now, today)
    expect(s.prayers).toHaveLength(5)
    expect(s.prayers[0].text).toMatch(/Grandma Ruth/)
    expect(s.answered).toHaveLength(3)
    expect(s.groups).toHaveLength(3)
    expect(s.feeds.g1).toHaveLength(3)
    expect(s.screen).toBe('home')
    expect(s.lastVisitDate).toBe(today)
    expect(s.profile).toEqual({ name: 'Anna', initials: 'AR' })
  })
})

describe('loadState', () => {
  it('seeds when storage is empty', () => {
    expect(loadState(now, today).prayers).toHaveLength(5)
  })

  it('round-trips through saveState', () => {
    const s = seedState(now, today)
    const modified = { ...s, prayers: s.prayers.slice(1) }
    saveState(modified)
    expect(loadState(now, today).prayers).toHaveLength(4)
  })

  it('reseeds on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadState(now, today).prayers).toHaveLength(5)
  })

  it('reseeds on wrong shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: 1 }))
    expect(loadState(now, today).prayers).toHaveLength(5)
  })

  it('resets prayedToday flags and returns home on a new day', () => {
    const s = seedState(now, '2026-07-04')
    saveState({ ...s, screen: 'answered' })
    const loaded = loadState(now, today)
    expect(loaded.lastVisitDate).toBe(today)
    expect(loaded.screen).toBe('home')
    expect(loaded.prayers.every(p => !p.prayedToday)).toBe(true)
  })

  it('keeps prayedToday flags on the same day', () => {
    const s = seedState(now, today)
    saveState(s)
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
