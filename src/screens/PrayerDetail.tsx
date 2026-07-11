import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { CategoryTag } from '../components/CategoryTag'
import { daysPrayed, monthMarks } from '../lib/history'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/** Cells for a Monday-first month grid: nulls pad the first week. */
export function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const lead = (first.getDay() + 6) % 7 // Mon=0
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
}

export function PrayerDetail() {
  const { state, dispatch } = useStore()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const prayer = state.prayers.find(p => p.id === state.activePrayerId)
  if (!prayer || state.screen !== 'prayerDetail') return null
  const category = state.categories.find(c => c.id === prayer.categoryId)
  const total = daysPrayed(state.logs, prayer.id)
  const marks = monthMarks(state.logs, prayer.id, cursor.year, cursor.month)
  const monthLabel = new Date(cursor.year, cursor.month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  const page = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month - 1 + delta)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })

  return (
    <div className="px-5 pt-1.5 pb-[130px]">
      <button
        onClick={() => dispatch({ type: 'NAVIGATE', screen: prayer.answeredAt === null ? 'home' : 'answered' })}
        className="text-[13px] font-semibold text-[oklch(0.55_0.1_245)] mb-3.5"
      >
        ‹ Back
      </button>

      <h1 className="text-[22px] font-medium text-[oklch(0.28_0.04_255)] leading-[1.25] mb-2.5">{prayer.text}</h1>
      <div className="flex items-center gap-2.5 mb-6">
        <CategoryTag category={category} />
        {prayer.answeredAt !== null && (
          <span className="text-[10.5px] font-bold tracking-[.07em] uppercase text-[oklch(0.5_0.1_155)] bg-[oklch(0.95_0.04_155)] px-2 py-1 rounded">
            ✓ Answered
          </span>
        )}
      </div>

      <div className="bg-white border border-[oklch(0.9_0.015_240)] rounded-lg p-[18px] shadow-[0_3px_10px_-6px_oklch(0.5_0.06_250_/_.35)]">
        <div className="text-[15px] font-bold text-[oklch(0.3_0.03_255)] mb-4">
          🙏 Prayed {total} {total === 1 ? 'day' : 'days'}
        </div>

        <div className="flex items-center justify-between mb-3">
          <button onClick={() => page(-1)} aria-label="Previous month" className="text-[oklch(0.55_0.1_245)] font-bold px-2 py-1">‹</button>
          <div className="text-[13px] font-bold text-[oklch(0.35_0.03_255)]">{monthLabel}</div>
          <button onClick={() => page(1)} aria-label="Next month" className="text-[oklch(0.55_0.1_245)] font-bold px-2 py-1">›</button>
        </div>

        <div className="grid grid-cols-7 gap-y-1.5 text-center">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-[10px] font-bold text-[oklch(0.6_0.02_250)] uppercase">{d}</div>
          ))}
          {monthGrid(cursor.year, cursor.month).map((day, i) =>
            day === null ? (
              <div key={`pad-${i}`} />
            ) : (
              <div
                key={day}
                aria-label={`${day}${marks.has(day) ? ', prayed' : ''}`}
                className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-[12.5px] ${
                  marks.has(day)
                    ? 'bg-[oklch(0.62_0.13_250)] text-white font-bold'
                    : 'text-[oklch(0.45_0.02_250)]'
                }`}
              >
                {day}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
