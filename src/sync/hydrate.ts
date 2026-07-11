import { supabase } from '../lib/supabase'
import type { HydrateData } from '../store/reducer'
import type { Category } from '../store/types'
import { rowsToState } from './mapper'
import type { CategoryRow, LogRow, PrayerRow, ProfileRow, Write } from './mapper'
import { readLegacyState, clearLegacyState } from '../store/persistence'
import { prevDay } from '../lib/history'
import { todayStr } from '../lib/time'

export async function fetchAll(userId: string): Promise<HydrateData> {
  const [profile, categories, prayers, logs] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('prayers').select('*').eq('user_id', userId),
    supabase.from('prayer_logs').select('*').eq('user_id', userId),
  ])
  const err = profile.error ?? categories.error ?? prayers.error ?? logs.error
  if (err) throw err
  return rowsToState({
    profile: profile.data as ProfileRow,
    categories: (categories.data ?? []) as CategoryRow[],
    prayers: (prayers.data ?? []) as PrayerRow[],
    logs: (logs.data ?? []) as LogRow[],
  })
}

export async function executeWrite(write: Write): Promise<void> {
  const table = supabase.from(write.table)
  const res =
    write.op === 'insert' ? await table.insert(write.values)
    : write.op === 'update' ? await table.update(write.values).match(write.match)
    : await table.delete().match(write.match)
  if (res.error) throw res.error
}

/**
 * Import of the pre-account localStorage snapshot. Re-runnable: the caller
 * invokes it whenever a legacy snapshot exists. Both writes are idempotent
 * upserts (prayers on id, logs on prayer_id+prayed_on), so a partial failure
 * keeps the snapshot and the next run fills in only what's missing. The
 * legacy key is cleared only after both statements succeed.
 */
export async function importLegacy(userId: string, categories: Category[], today: string): Promise<void> {
  const legacy = readLegacyState()
  if (!legacy) return
  const byName = new Map(categories.map(c => [c.name.toLowerCase(), c.id]))
  const fallback = categories[0]?.id
  const resolve = (name: string) => byName.get(name.toLowerCase()) ?? fallback
  if (!fallback) return // no categories seeded yet — bail rather than lose data

  const prayerRows = [
    ...legacy.prayers.map(p => ({
      id: p.id, user_id: userId, text: p.text, category_id: resolve(p.category),
      answered_at: null as string | null, created_at: new Date().toISOString(),
    })),
    ...legacy.answered.map(a => ({
      id: a.id, user_id: userId, text: a.text, category_id: resolve(a.category),
      answered_at: new Date(a.answeredAt).toISOString(), created_at: new Date(a.answeredAt).toISOString(),
    })),
  ]

  const logRows: { id: string; user_id: string; prayer_id: string; prayed_on: string }[] = []
  for (const p of legacy.prayers) {
    let d = p.prayedToday ? today : prevDay(today)
    for (let i = 0; i < p.streak; i++) {
      logRows.push({ id: crypto.randomUUID(), user_id: userId, prayer_id: p.id, prayed_on: d })
      d = prevDay(d)
    }
  }
  for (const a of legacy.answered) {
    // backfill answered streaks ending the (local) day they were answered
    let d = todayStr(new Date(a.answeredAt))
    for (let i = 0; i < (a.streak ?? 0); i++) {
      logRows.push({ id: crypto.randomUUID(), user_id: userId, prayer_id: a.id, prayed_on: d })
      d = prevDay(d)
    }
  }

  if (prayerRows.length) {
    const r1 = await supabase.from('prayers').upsert(prayerRows, { onConflict: 'id', ignoreDuplicates: true })
    if (r1.error) throw r1.error
  }
  if (logRows.length) {
    const r2 = await supabase.from('prayer_logs').upsert(logRows, { onConflict: 'prayer_id,prayed_on', ignoreDuplicates: true })
    if (r2.error) throw r2.error
  }
  clearLegacyState()
}
