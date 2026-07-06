import type { Prayer } from '../store/types'
import { useStore } from '../store/StoreContext'
import { CategoryTag } from './CategoryTag'
import { todayStr } from '../lib/time'

export function PrayerRow({ prayer, first }: { prayer: Prayer; first: boolean }) {
  const { dispatch } = useStore()
  return (
    <div className={`flex gap-[13px] items-start py-[15px] ${first ? '' : 'border-t border-[oklch(0.88_0.018_245)]'}`}>
      <button
        aria-label={`Mark "${prayer.text}" as prayed`}
        aria-pressed={prayer.prayedToday}
        onClick={() => dispatch({ type: 'TOGGLE_PRAYED', id: prayer.id, today: todayStr() })}
        className={`w-6 h-6 flex-none mt-0.5 rounded-[5px] flex items-center justify-center transition-all ${
          prayer.prayedToday
            ? 'bg-[oklch(0.62_0.13_250)] border border-[oklch(0.62_0.13_250)]'
            : 'bg-white border-2 border-[oklch(0.85_0.03_245)]'
        }`}
      >
        {prayer.prayedToday && <span className="text-white text-xs font-extrabold animate-check-pop">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-[17px] font-medium leading-[1.28] text-[oklch(0.23_0.03_258)]">{prayer.text}</div>
        <div className="flex items-center gap-[9px] mt-2">
          <CategoryTag category={prayer.category} />
          {prayer.streak > 0 && (
            <span className="text-[10px] font-bold tracking-[.06em] text-[oklch(0.6_0.06_250)] whitespace-nowrap">
              · {prayer.streak}D
            </span>
          )}
        </div>
      </div>
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
