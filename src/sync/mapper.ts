import type { Action, HydrateData } from '../store/reducer'

export interface ProfileRow { id: string; name: string; initials: string }
export interface CategoryRow { id: string; name: string; hue: number }
export interface PrayerRow { id: string; text: string; category_id: string; answered_at: string | null; created_at: string }
export interface LogRow { id: string; prayer_id: string; prayed_on: string }

export function rowsToState(rows: {
  profile: ProfileRow
  categories: CategoryRow[]
  prayers: PrayerRow[]
  logs: LogRow[]
}): HydrateData {
  return {
    profile: { name: rows.profile.name, initials: rows.profile.initials },
    categories: rows.categories.map(c => ({ id: c.id, name: c.name, hue: c.hue })),
    prayers: rows.prayers.map(p => ({
      id: p.id,
      text: p.text,
      categoryId: p.category_id,
      answeredAt: p.answered_at === null ? null : Date.parse(p.answered_at),
      createdAt: Date.parse(p.created_at),
    })),
    logs: rows.logs.map(l => ({ id: l.id, prayerId: l.prayer_id, prayedOn: l.prayed_on })),
  }
}

export type Write =
  // inserts carry the unique key they may conflict on, so executeWrite can run
  // them as idempotent upserts — a retry after a lost response must not error
  | { table: string; op: 'insert'; values: Record<string, unknown>; conflictKey: string }
  | { table: string; op: 'update'; match: Record<string, unknown>; values: Record<string, unknown> }
  | { table: string; op: 'delete'; match: Record<string, unknown> }

/**
 * Maps a data-changing action to its Supabase write. `hadLogToday` is the
 * pre-dispatch state for TOGGLE_PRAYED (checked → delete, unchecked → insert).
 * Local-only actions return null.
 */
export function writeForAction(action: Action, userId: string, ctx: { hadLogToday: boolean }): Write | null {
  switch (action.type) {
    case 'ADD_PRAYER':
      return {
        table: 'prayers', op: 'insert', conflictKey: 'id',
        values: { id: action.id, user_id: userId, text: action.text, category_id: action.categoryId, created_at: new Date(action.now).toISOString() },
      }
    case 'ADD_CATEGORY':
      return { table: 'categories', op: 'insert', conflictKey: 'id', values: { id: action.id, user_id: userId, name: action.name, hue: action.hue } }
    case 'TOGGLE_PRAYED':
      return ctx.hadLogToday
        ? { table: 'prayer_logs', op: 'delete', match: { prayer_id: action.id, prayed_on: action.today } }
        : { table: 'prayer_logs', op: 'insert', conflictKey: 'prayer_id,prayed_on', values: { id: action.logId, user_id: userId, prayer_id: action.id, prayed_on: action.today } }
    case 'MARK_ANSWERED':
      return { table: 'prayers', op: 'update', match: { id: action.id }, values: { answered_at: new Date(action.now).toISOString() } }
    case 'UNDO_ANSWERED':
      return { table: 'prayers', op: 'update', match: { id: action.id }, values: { answered_at: null } }
    default:
      return null
  }
}
