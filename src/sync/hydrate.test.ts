import { fetchAll, importLegacy, executeWrite } from './hydrate'
import { supabase } from '../lib/supabase'
import { todayStr } from '../lib/time'

vi.mock('../lib/supabase', () => {
  const result = { data: [], error: null }
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'upsert', 'update', 'delete', 'eq', 'match', 'single']) {
    builder[m] = vi.fn(() => builder)
  }
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return { supabase: { from: vi.fn(() => builder), __builder: builder, __result: result } }
})

// helper to reach the mock internals
const sb = supabase as unknown as {
  from: ReturnType<typeof vi.fn>
  __builder: Record<string, ReturnType<typeof vi.fn>>
  __result: { data: unknown; error: unknown }
}

beforeEach(() => {
  vi.clearAllMocks()
  sb.__result.data = []
  sb.__result.error = null
  localStorage.clear()
})

describe('fetchAll', () => {
  it('queries all four tables', async () => {
    sb.__result.data = []
    // shape of data varies per table; assert calls only
    await fetchAll('u1').catch(() => {})
    const tables = sb.from.mock.calls.map(c => c[0])
    expect(tables).toEqual(expect.arrayContaining(['profiles', 'categories', 'prayers', 'prayer_logs']))
  })
})

describe('executeWrite', () => {
  it('performs an insert as an idempotent upsert (retry after a lost response must not error)', async () => {
    await executeWrite({ table: 'prayers', op: 'insert', conflictKey: 'id', values: { id: 'p1' } })
    expect(sb.from).toHaveBeenCalledWith('prayers')
    expect(sb.__builder.upsert).toHaveBeenCalledWith({ id: 'p1' }, { onConflict: 'id', ignoreDuplicates: true })
    expect(sb.__builder.insert).not.toHaveBeenCalled()
  })
  it('performs an update with match', async () => {
    await executeWrite({ table: 'prayers', op: 'update', match: { id: 'p1' }, values: { answered_at: null } })
    expect(sb.__builder.update).toHaveBeenCalledWith({ answered_at: null })
    expect(sb.__builder.match).toHaveBeenCalledWith({ id: 'p1' })
  })
  it('performs a delete with match', async () => {
    await executeWrite({ table: 'prayer_logs', op: 'delete', match: { prayer_id: 'p1', prayed_on: '2026-07-11' } })
    expect(sb.__builder.delete).toHaveBeenCalled()
    expect(sb.__builder.match).toHaveBeenCalledWith({ prayer_id: 'p1', prayed_on: '2026-07-11' })
  })
  it('rejects when supabase returns an error', async () => {
    sb.__result.error = { message: 'boom' }
    await expect(executeWrite({ table: 'prayers', op: 'insert', conflictKey: 'id', values: {} })).rejects.toBeTruthy()
  })
})

describe('importLegacy', () => {
  it('does nothing without a legacy snapshot', async () => {
    await importLegacy('u1', [{ id: 'c1', name: 'Health', hue: 12 }], '2026-07-11')
    expect(sb.__builder.insert).not.toHaveBeenCalled()
    expect(sb.__builder.upsert).not.toHaveBeenCalled()
  })
  it('builds prayers and backfilled logs from a legacy snapshot, then clears it', async () => {
    localStorage.setItem('prayer-app-state-v1', JSON.stringify({
      prayers: [{ id: 'p1', text: 'old', category: 'Health', streak: 2, prayedToday: true }],
      answered: [{ id: 'a1', text: 'done', category: 'Health', answeredAt: 1000, streak: 1 }],
    }))
    await importLegacy('u1', [{ id: 'c1', name: 'Health', hue: 12 }], '2026-07-11')
    // prayers upsert: both entries, categoryId resolved by name; idempotent on id
    const prayerUpsert = sb.__builder.upsert.mock.calls.find(c => Array.isArray(c[0]) && c[0][0]?.text)
    expect(prayerUpsert![0]).toHaveLength(2)
    expect(prayerUpsert![0][0]).toMatchObject({ id: 'p1', category_id: 'c1', user_id: 'u1' })
    expect(prayerUpsert![1]).toEqual({ onConflict: 'id', ignoreDuplicates: true })
    // logs upsert: streak 2 ending today (prayedToday) → 2026-07-11 & 2026-07-10; answered streak 1 → one row
    const logUpsert = sb.__builder.upsert.mock.calls.find(c => Array.isArray(c[0]) && c[0][0]?.prayed_on)
    const dates = logUpsert![0].filter((r: { prayer_id: string }) => r.prayer_id === 'p1').map((r: { prayed_on: string }) => r.prayed_on)
    expect(dates.sort()).toEqual(['2026-07-10', '2026-07-11'])
    expect(logUpsert![1]).toEqual({ onConflict: 'prayer_id,prayed_on', ignoreDuplicates: true })
    // FK integrity: prayers are upserted before their logs
    const calls = sb.__builder.upsert.mock.calls
    expect(calls.indexOf(prayerUpsert!)).toBeLessThan(calls.indexOf(logUpsert!))
    expect(localStorage.getItem('prayer-app-state-v1')).toBeNull()
  })
  it('backfills answered logs ending on the LOCAL answered date', async () => {
    const answeredAt = Date.parse('2026-03-05T10:00:00Z')
    localStorage.setItem('prayer-app-state-v1', JSON.stringify({
      prayers: [],
      answered: [{ id: 'a1', text: 'done', category: 'Health', answeredAt, streak: 1 }],
    }))
    await importLegacy('u1', [{ id: 'c1', name: 'Health', hue: 12 }], '2026-07-11')
    const logUpsert = sb.__builder.upsert.mock.calls.find(c => Array.isArray(c[0]) && c[0][0]?.prayed_on)
    const dates = logUpsert![0].filter((r: { prayer_id: string }) => r.prayer_id === 'a1').map((r: { prayed_on: string }) => r.prayed_on)
    expect(dates).toEqual([todayStr(new Date(answeredAt))])
  })
})
