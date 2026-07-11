export interface LogEntry {
  id: string
  prayerId: string
  prayedOn: string // YYYY-MM-DD
}

/**
 * Returns the calendar day before `dateStr` as YYYY-MM-DD.
 *
 * Uses calendar-field arithmetic (`setDate(getDate() - 1)`) rather than
 * subtracting 24h of wall-clock time, so DST transitions cannot cause a
 * day to be skipped or repeated.
 */
export function prevDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() - 1)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function runLength(dates: Set<string>, today: string): number {
  let cursor = dates.has(today) ? today : prevDay(today)
  if (!dates.has(cursor)) return 0
  let count = 0
  while (dates.has(cursor)) {
    count++
    cursor = prevDay(cursor)
  }
  return count
}

export function prayedToday(logs: LogEntry[], prayerId: string, today: string): boolean {
  return logs.some(l => l.prayerId === prayerId && l.prayedOn === today)
}

export function streak(logs: LogEntry[], prayerId: string, today: string): number {
  return runLength(new Set(logs.filter(l => l.prayerId === prayerId).map(l => l.prayedOn)), today)
}

/**
 * Total days prayed for a prayer.
 *
 * Counts log rows directly, trusting the one-row-per-prayer-per-day
 * invariant enforced upstream (DB unique constraint on (prayerId, prayedOn)
 * plus the reducer's toggle semantics). Duplicate rows would each count.
 */
export function daysPrayed(logs: LogEntry[], prayerId: string): number {
  return logs.filter(l => l.prayerId === prayerId).length
}

export function appStreak(logs: LogEntry[], today: string): number {
  return runLength(new Set(logs.map(l => l.prayedOn)), today)
}

/**
 * Day-of-month numbers on which the prayer was prayed in the given month.
 *
 * Note: `month` is 1-12 (January = 1), unlike JS `Date.getMonth()` which
 * is 0-based — callers using `getMonth()` must add 1.
 */
export function monthMarks(logs: LogEntry[], prayerId: string, year: number, month: number): Set<number> {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  return new Set(
    logs
      .filter(l => l.prayerId === prayerId && l.prayedOn.startsWith(prefix))
      .map(l => Number(l.prayedOn.slice(8)))
  )
}
