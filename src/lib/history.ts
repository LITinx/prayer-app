export interface LogEntry {
  id: string
  prayerId: string
  prayedOn: string // YYYY-MM-DD
}

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

export function daysPrayed(logs: LogEntry[], prayerId: string): number {
  return logs.filter(l => l.prayerId === prayerId).length
}

export function appStreak(logs: LogEntry[], today: string): number {
  return runLength(new Set(logs.map(l => l.prayedOn)), today)
}

export function monthMarks(logs: LogEntry[], prayerId: string, year: number, month: number): Set<number> {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  return new Set(
    logs
      .filter(l => l.prayerId === prayerId && l.prayedOn.startsWith(prefix))
      .map(l => Number(l.prayedOn.slice(8)))
  )
}
