import { emptyState, loadCache, saveCache, readLegacyState, clearLegacyState, LEGACY_KEY, cacheKey } from './persistence'
import { demoState } from '../test/fixtures'

const now = 1_780_000_000_000
const today = '2026-07-05'

beforeEach(() => localStorage.clear())

describe('emptyState', () => {
  it('starts empty with the demo group and no sync error', () => {
    const s = emptyState()
    expect(s.prayers).toHaveLength(0)
    expect(s.logs).toHaveLength(0)
    expect(s.categories).toHaveLength(0)
    expect(s.groups).toHaveLength(1)
    expect(s.feeds.g1).toHaveLength(3)
    expect(s.syncError).toBe(false)
    expect(s.screen).toBe('home')
  })
})

describe('cache', () => {
  it('round-trips per user', () => {
    saveCache('user-1', demoState(now, today))
    expect(loadCache('user-1')!.prayers).toHaveLength(8)
    expect(loadCache('user-2')).toBeNull()
  })
  it('returns null on corrupt or wrong-shape data', () => {
    localStorage.setItem(cacheKey('user-1'), '{not json')
    expect(loadCache('user-1')).toBeNull()
    localStorage.setItem(cacheKey('user-1'), JSON.stringify({ hello: 1 }))
    expect(loadCache('user-1')).toBeNull()
  })
  it('returns null when required non-array fields are missing', () => {
    localStorage.setItem(cacheKey('user-1'), JSON.stringify({ prayers: [], logs: [], categories: [] }))
    expect(loadCache('user-1')).toBeNull()
  })
  it('saveCache swallows storage failures', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveCache('user-1', demoState(now, today))).not.toThrow()
    spy.mockRestore()
  })
})

describe('legacy pre-account state', () => {
  it('reads a v1 snapshot if present', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({
      prayers: [{ id: 'p1', text: 'old', category: 'Health', streak: 4, prayedToday: true }],
      answered: [{ id: 'a1', text: 'done', category: 'Family', answeredAt: 123, streak: 2 }],
      appStreak: { count: 3, lastPrayedDate: today },
    }))
    const legacy = readLegacyState()!
    expect(legacy.prayers[0]).toEqual({ id: 'p1', text: 'old', category: 'Health', streak: 4, prayedToday: true })
    expect(legacy.answered[0].category).toBe('Family')
  })
  it('returns null when absent or malformed', () => {
    expect(readLegacyState()).toBeNull()
    localStorage.setItem(LEGACY_KEY, '{oops')
    expect(readLegacyState()).toBeNull()
  })
  it('clearLegacyState removes the key', () => {
    localStorage.setItem(LEGACY_KEY, '{}')
    clearLegacyState()
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
  })
})
