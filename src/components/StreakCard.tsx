import { useStore } from '../store/StoreContext'
import { appStreak, prayedToday } from '../lib/history'
import { todayStr } from '../lib/time'

export function StreakCard() {
  const { state } = useStore()
  const today = todayStr()
  const count = appStreak(state.logs, today)
  const active = state.prayers.filter(p => p.answeredAt === null)
  const prayed = active.filter(p => prayedToday(state.logs, p.id, today)).length
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(135deg,oklch(0.64_0.13_250)_0%,oklch(0.58_0.14_262)_100%)] rounded-lg px-5 py-[18px] text-white flex items-center gap-4 shadow-[0_16px_34px_-14px_oklch(0.55_0.13_255_/_.7)] mb-[22px]">
      <div className="absolute -right-[30px] -top-[30px] w-[130px] h-[130px] rounded-full bg-white/8" />
      <div className="w-[52px] h-[52px] rounded-lg bg-white/16 flex items-center justify-center text-2xl flex-none">🕊️</div>
      <div className="flex-1">
        <div className="text-[22px] font-bold leading-none">{count}-day streak</div>
        <div className="text-[12.5px] opacity-80 mt-[3px]">
          {prayed} of {active.length} prayers lifted today
        </div>
      </div>
      <div className="text-[11px] font-semibold bg-white/18 px-[11px] py-1.5 rounded-lg">Keep it up</div>
    </div>
  )
}
