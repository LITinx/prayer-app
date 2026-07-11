import type { Prayer } from '../store/types'
import { useStore } from '../store/StoreContext'
import { CategoryTag } from './CategoryTag'
import { prayedToday, streak } from '../lib/history'
import { todayStr } from '../lib/time'

export function PrayerRow({ prayer, first }: { prayer: Prayer; first: boolean }) {
  const { state, dispatch } = useStore()
  const today = todayStr()
  const prayed = prayedToday(state.logs, prayer.id, today)
  const days = streak(state.logs, prayer.id, today)
  const category = state.categories.find(c => c.id === prayer.categoryId)
  return (
    <div className={`flex gap-[13px] items-start py-[15px] ${first ? '' : 'border-t border-[oklch(0.88_0.018_245)]'}`}>
      <button
        aria-label={`Mark "${prayer.text}" as prayed`}
        aria-pressed={prayed}
        onClick={() => dispatch({ type: 'TOGGLE_PRAYED', id: prayer.id, today, logId: crypto.randomUUID() })}
        className={`w-6 h-6 flex-none mt-0.5 rounded-[5px] flex items-center justify-center transition-all ${
          prayed
            ? 'bg-[oklch(0.62_0.13_250)] border border-[oklch(0.62_0.13_250)]'
            : 'bg-white border-2 border-[oklch(0.85_0.03_245)]'
        }`}
      >
        {prayed && <span className="text-white text-xs font-extrabold animate-check-pop">✓</span>}
      </button>
      <button
        onClick={() => dispatch({ type: 'OPEN_PRAYER', id: prayer.id })}
        className="flex-1 min-w-0 text-left"
        aria-label={`View history for "${prayer.text}"`}
      >
        <div className="text-[17px] font-medium leading-[1.28] text-[oklch(0.23_0.03_258)]">{prayer.text}</div>
        <div className="flex items-center gap-[9px] mt-2">
          <CategoryTag category={category} />
          {days > 0 && (
            <span className="text-[10px] font-bold tracking-[.06em] text-[oklch(0.6_0.06_250)] whitespace-nowrap">
              · {days}D
            </span>
          )}
        </div>
      </button>
      <button
        aria-label={`Mark "${prayer.text}" as answered`}
        onClick={() => dispatch({ type: 'MARK_ANSWERED', id: prayer.id, now: Date.now() })}
        className="flex-none text-[9.5px] font-bold tracking-[.07em] uppercase text-[oklch(0.5_0.1_155)] border border-[oklch(0.82_0.06_155)] px-[9px] py-1.5 rounded whitespace-nowrap"
      >
        Answered
      </button>
    </div>
  )
}
