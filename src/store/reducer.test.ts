import { reducer, displayStreak } from './reducer'
import { seedState } from './persistence'

const now = 1_780_000_000_000
const today = '2026-07-05'
const yesterday = '2026-07-04'
const base = () => seedState(now, today)

describe('NAVIGATE / OPEN_GROUP', () => {
  it('navigates between screens', () => {
    const s = reducer(base(), { type: 'NAVIGATE', screen: 'answered' })
    expect(s.screen).toBe('answered')
  })
  it('opens a group detail', () => {
    const s = reducer(base(), { type: 'OPEN_GROUP', groupId: 'g2' })
    expect(s.screen).toBe('groupDetail')
    expect(s.activeGroupId).toBe('g2')
  })
})

describe('TOGGLE_PRAYED', () => {
  it('checks a prayer and increments its streak', () => {
    const s = reducer(base(), { type: 'TOGGLE_PRAYED', id: 'p1', today })
    const p = s.prayers.find(p => p.id === 'p1')!
    expect(p.prayedToday).toBe(true)
    expect(p.streak).toBe(7)
  })
  it('unchecks and decrements with floor 0', () => {
    let s = reducer(base(), { type: 'TOGGLE_PRAYED', id: 'p4', today })
    s = reducer(s, { type: 'TOGGLE_PRAYED', id: 'p4', today })
    const p = s.prayers.find(p => p.id === 'p4')!
    expect(p.prayedToday).toBe(false)
    expect(p.streak).toBe(0)
  })
  it('extends app streak when last prayed yesterday', () => {
    const s0 = { ...base(), appStreak: { count: 3, lastPrayedDate: yesterday } }
    const s = reducer(s0, { type: 'TOGGLE_PRAYED', id: 'p1', today })
    expect(s.appStreak).toEqual({ count: 4, lastPrayedDate: today })
  })
  it('resets app streak to 1 after a missed day', () => {
    const s0 = { ...base(), appStreak: { count: 9, lastPrayedDate: '2026-07-01' } }
    const s = reducer(s0, { type: 'TOGGLE_PRAYED', id: 'p1', today })
    expect(s.appStreak).toEqual({ count: 1, lastPrayedDate: today })
  })
  it('leaves app streak alone when already prayed today', () => {
    const s0 = { ...base(), appStreak: { count: 7, lastPrayedDate: today } }
    const s = reducer(s0, { type: 'TOGGLE_PRAYED', id: 'p1', today })
    expect(s.appStreak).toEqual({ count: 7, lastPrayedDate: today })
  })
  it('unchecking does not touch app streak', () => {
    const s0 = { ...base(), appStreak: { count: 7, lastPrayedDate: today } }
    const s = reducer(s0, { type: 'TOGGLE_PRAYED', id: 'p3', today }) // p3 seeded prayedToday: true
    expect(s.appStreak).toEqual({ count: 7, lastPrayedDate: today })
  })
})

describe('MARK_ANSWERED', () => {
  it('moves the prayer to the top of answered with timestamp', () => {
    const s = reducer(base(), { type: 'MARK_ANSWERED', id: 'p2', now })
    expect(s.prayers.find(p => p.id === 'p2')).toBeUndefined()
    expect(s.prayers).toHaveLength(4)
    expect(s.answered[0]).toEqual({
      id: 'p2',
      text: 'Wisdom for the job decision this month',
      category: 'Guidance',
      answeredAt: now,
    })
  })
  it('ignores unknown ids', () => {
    const s = reducer(base(), { type: 'MARK_ANSWERED', id: 'nope', now })
    expect(s.prayers).toHaveLength(5)
    expect(s.answered).toHaveLength(3)
  })
})

describe('ADD_PRAYER', () => {
  it('prepends a new prayer and returns home', () => {
    const s0 = reducer(base(), { type: 'NAVIGATE', screen: 'groups' })
    const s = reducer(s0, { type: 'ADD_PRAYER', id: 'x1', text: 'New request', category: 'Friends' })
    expect(s.prayers[0]).toEqual({ id: 'x1', text: 'New request', category: 'Friends', streak: 0, prayedToday: false })
    expect(s.screen).toBe('home')
  })
})

describe('TOGGLE_FEED_PRAY', () => {
  it('toggles on: increments count', () => {
    const s = reducer(base(), { type: 'TOGGLE_FEED_PRAY', groupId: 'g1', feedId: 'f1' })
    const f = s.feeds.g1.find(f => f.id === 'f1')!
    expect(f.prayed).toBe(true)
    expect(f.praying).toBe(13)
  })
  it('toggles off: decrements count', () => {
    const s = reducer(base(), { type: 'TOGGLE_FEED_PRAY', groupId: 'g1', feedId: 'f2' })
    const f = s.feeds.g1.find(f => f.id === 'f2')!
    expect(f.prayed).toBe(false)
    expect(f.praying).toBe(17)
  })
})

describe('displayStreak', () => {
  it('shows count when last prayed today or yesterday', () => {
    expect(displayStreak({ count: 7, lastPrayedDate: today }, today)).toBe(7)
    expect(displayStreak({ count: 7, lastPrayedDate: yesterday }, today)).toBe(7)
  })
  it('shows 0 when the streak is broken', () => {
    expect(displayStreak({ count: 7, lastPrayedDate: '2026-07-01' }, today)).toBe(0)
  })
})
