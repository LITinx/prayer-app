import { rowsToState, writeForAction } from './mapper'

describe('rowsToState', () => {
  it('maps snake_case rows to app state slices', () => {
    const data = rowsToState({
      profile: { id: 'u1', name: 'Anna', initials: 'AR' },
      categories: [{ id: 'c1', name: 'Health', hue: 12 }],
      prayers: [{ id: 'p1', text: 'hi', category_id: 'c1', answered_at: null, created_at: '2026-07-01T00:00:00Z' }],
      logs: [{ id: 'l1', prayer_id: 'p1', prayed_on: '2026-07-01' }],
    })
    expect(data.profile).toEqual({ name: 'Anna', initials: 'AR' })
    expect(data.categories).toEqual([{ id: 'c1', name: 'Health', hue: 12 }])
    expect(data.prayers).toEqual([
      { id: 'p1', text: 'hi', categoryId: 'c1', answeredAt: null, createdAt: Date.parse('2026-07-01T00:00:00Z') },
    ])
    expect(data.logs).toEqual([{ id: 'l1', prayerId: 'p1', prayedOn: '2026-07-01' }])
  })
  it('maps answered_at timestamps to epoch ms', () => {
    const data = rowsToState({
      profile: { id: 'u1', name: 'A', initials: 'A' },
      categories: [],
      prayers: [{ id: 'p1', text: 'x', category_id: 'c1', answered_at: '2026-07-02T10:00:00Z', created_at: '2026-07-01T00:00:00Z' }],
      logs: [],
    })
    expect(data.prayers[0].answeredAt).toBe(Date.parse('2026-07-02T10:00:00Z'))
  })
})

describe('writeForAction', () => {
  const uid = 'u1'
  it('ADD_PRAYER → prayers insert', () => {
    expect(writeForAction({ type: 'ADD_PRAYER', id: 'p1', text: 'hi', categoryId: 'c1', now: 1000 }, uid, { hadLogToday: false }))
      .toEqual({ table: 'prayers', op: 'insert', conflictKey: 'id', values: { id: 'p1', user_id: 'u1', text: 'hi', category_id: 'c1', created_at: new Date(1000).toISOString() } })
  })
  it('ADD_CATEGORY → categories insert', () => {
    expect(writeForAction({ type: 'ADD_CATEGORY', id: 'c9', name: 'Missions', hue: 180 }, uid, { hadLogToday: false }))
      .toEqual({ table: 'categories', op: 'insert', conflictKey: 'id', values: { id: 'c9', user_id: 'u1', name: 'Missions', hue: 180 } })
  })
  it('TOGGLE_PRAYED (was unchecked) → log insert', () => {
    expect(writeForAction({ type: 'TOGGLE_PRAYED', id: 'p1', date: '2026-07-11', logId: 'l1' }, uid, { hadLogToday: false }))
      .toEqual({ table: 'prayer_logs', op: 'insert', conflictKey: 'prayer_id,prayed_on', values: { id: 'l1', user_id: 'u1', prayer_id: 'p1', prayed_on: '2026-07-11' } })
  })
  it('TOGGLE_PRAYED (was checked) → log delete by prayer+date', () => {
    expect(writeForAction({ type: 'TOGGLE_PRAYED', id: 'p1', date: '2026-07-11', logId: 'l2' }, uid, { hadLogToday: true }))
      .toEqual({ table: 'prayer_logs', op: 'delete', match: { prayer_id: 'p1', prayed_on: '2026-07-11' } })
  })
  it('MARK_ANSWERED / UNDO_ANSWERED → prayers update', () => {
    expect(writeForAction({ type: 'MARK_ANSWERED', id: 'p1', now: 1000 }, uid, { hadLogToday: false }))
      .toEqual({ table: 'prayers', op: 'update', match: { id: 'p1' }, values: { answered_at: new Date(1000).toISOString() } })
    expect(writeForAction({ type: 'UNDO_ANSWERED', id: 'p1' }, uid, { hadLogToday: false }))
      .toEqual({ table: 'prayers', op: 'update', match: { id: 'p1' }, values: { answered_at: null } })
  })
  it('DELETE_PRAYER → prayers delete (logs cascade server-side)', () => {
    expect(writeForAction({ type: 'DELETE_PRAYER', id: 'p1' }, uid, { hadLogToday: false }))
      .toEqual({ table: 'prayers', op: 'delete', match: { id: 'p1' } })
  })
  it('local-only actions → null', () => {
    expect(writeForAction({ type: 'NAVIGATE', screen: 'home' }, uid, { hadLogToday: false })).toBeNull()
    expect(writeForAction({ type: 'TOGGLE_FEED_PRAY', groupId: 'g1', feedId: 'f1' }, uid, { hadLogToday: false })).toBeNull()
    expect(writeForAction({ type: 'SYNC_ERROR', failed: true }, uid, { hadLogToday: false })).toBeNull()
  })
})
