import { reducer } from './reducer'
import { demoState, demoCategories, catId } from '../test/fixtures'
import { prayedToday, streak } from '../lib/history'

const now = 1_780_000_000_000
const today = '2026-07-05'
const base = () => demoState(now, today)

describe('NAVIGATE / OPEN_GROUP / OPEN_PRAYER', () => {
  it('navigates between screens', () => {
    const s = reducer(base(), { type: 'NAVIGATE', screen: 'answered' })
    expect(s.screen).toBe('answered')
  })
  it('opens a group detail', () => {
    const s = reducer(base(), { type: 'OPEN_GROUP', groupId: 'g2' })
    expect(s.screen).toBe('groupDetail')
    expect(s.activeGroupId).toBe('g2')
  })
  it('opens a prayer detail', () => {
    const s = reducer(base(), { type: 'OPEN_PRAYER', id: 'p1' })
    expect(s.screen).toBe('prayerDetail')
    expect(s.activePrayerId).toBe('p1')
  })
})

describe('TOGGLE_PRAYED (log-based)', () => {
  it('checking inserts a log row for today with the given id', () => {
    const s = reducer(base(), { type: 'TOGGLE_PRAYED', id: 'p1', date: today, logId: 'log-x' })
    expect(s.logs).toContainEqual({ id: 'log-x', prayerId: 'p1', prayedOn: today })
    expect(prayedToday(s.logs, 'p1', today)).toBe(true)
    expect(streak(s.logs, 'p1', today)).toBe(7) // 6 ending yesterday + today
  })
  it('unchecking removes today’s log row', () => {
    let s = reducer(base(), { type: 'TOGGLE_PRAYED', id: 'p1', date: today, logId: 'log-x' })
    s = reducer(s, { type: 'TOGGLE_PRAYED', id: 'p1', date: today, logId: 'log-y' })
    expect(prayedToday(s.logs, 'p1', today)).toBe(false)
    expect(streak(s.logs, 'p1', today)).toBe(6)
  })
  it('is a no-op for unknown prayer ids', () => {
    const s = reducer(base(), { type: 'TOGGLE_PRAYED', id: 'nope', date: today, logId: 'log-x' })
    expect(s).toEqual(base())
  })
  it('is idempotent across StrictMode double runs — same action from same base cannot duplicate logs', () => {
    const a = { type: 'TOGGLE_PRAYED', id: 'p1', date: today, logId: 'log-x' } as const
    const s1 = reducer(base(), a)
    const s2 = reducer(base(), a)
    expect(s1.logs.filter(l => l.prayerId === 'p1' && l.prayedOn === today)).toEqual([
      { id: 'log-x', prayerId: 'p1', prayedOn: today },
    ])
    expect(s2.logs.filter(l => l.prayerId === 'p1' && l.prayedOn === today)).toEqual([
      { id: 'log-x', prayerId: 'p1', prayedOn: today },
    ])
    expect(s1).toEqual(s2)
  })
})

describe('MARK_ANSWERED / UNDO_ANSWERED', () => {
  it('sets answeredAt, keeping the prayer and its logs', () => {
    const s = reducer(base(), { type: 'MARK_ANSWERED', id: 'p2', now })
    const p = s.prayers.find(x => x.id === 'p2')!
    expect(p.answeredAt).toBe(now)
    expect(s.logs.filter(l => l.prayerId === 'p2')).toHaveLength(3) // history untouched
  })
  it('undo clears answeredAt', () => {
    let s = reducer(base(), { type: 'MARK_ANSWERED', id: 'p2', now })
    s = reducer(s, { type: 'UNDO_ANSWERED', id: 'p2' })
    expect(s.prayers.find(x => x.id === 'p2')!.answeredAt).toBeNull()
  })
  it('mark-then-undo preserves the prayer’s log history', () => {
    let s = reducer(base(), { type: 'MARK_ANSWERED', id: 'p2', now })
    s = reducer(s, { type: 'UNDO_ANSWERED', id: 'p2' })
    expect(s.logs.filter(l => l.prayerId === 'p2')).toHaveLength(3)
  })
  it('ignores unknown ids', () => {
    expect(reducer(base(), { type: 'MARK_ANSWERED', id: 'nope', now })).toEqual(base())
    expect(reducer(base(), { type: 'UNDO_ANSWERED', id: 'nope' })).toEqual(base())
  })
})

describe('ADD_PRAYER', () => {
  it('prepends a new prayer and returns home', () => {
    const s0 = reducer(base(), { type: 'NAVIGATE', screen: 'groups' })
    const s = reducer(s0, { type: 'ADD_PRAYER', id: 'x1', text: 'New request', categoryId: catId('Friends'), now })
    expect(s.prayers[0]).toEqual({ id: 'x1', text: 'New request', categoryId: catId('Friends'), answeredAt: null, createdAt: now })
    expect(s.screen).toBe('home')
  })
})

describe('ADD_CATEGORY', () => {
  it('appends a category', () => {
    const s = reducer(base(), { type: 'ADD_CATEGORY', id: 'c9', name: 'Missions', hue: 180 })
    expect(s.categories).toContainEqual({ id: 'c9', name: 'Missions', hue: 180 })
  })
})

describe('HYDRATE / SYNC_ERROR', () => {
  it('replaces synced slices, leaves local-only slices alone', () => {
    const s0 = base()
    const s = reducer(s0, {
      type: 'HYDRATE',
      data: { prayers: [], logs: [], categories: demoCategories, profile: { name: 'B', initials: 'B' } },
    })
    expect(s.prayers).toEqual([])
    expect(s.profile.name).toBe('B')
    expect(s.groups).toEqual(s0.groups) // demo groups untouched
    expect(s.screen).toBe(s0.screen)
  })
  it('sets and clears the sync error flag', () => {
    let s = reducer(base(), { type: 'SYNC_ERROR', failed: true })
    expect(s.syncError).toBe(true)
    s = reducer(s, { type: 'SYNC_ERROR', failed: false })
    expect(s.syncError).toBe(false)
  })
})

describe('TOGGLE_FEED_PRAY', () => {
  it('toggles on: increments count', () => {
    const s = reducer(base(), { type: 'TOGGLE_FEED_PRAY', groupId: 'g1', feedId: 'f1' })
    const f = s.feeds.g1.find(f => f.id === 'f1')!
    expect(f.prayed).toBe(true)
    expect(f.praying).toBe(13)
  })
})
