import { useStore } from '../store/StoreContext'
import { StreakCard } from '../components/StreakCard'
import { PrayerRow } from '../components/PrayerRow'
import { greeting, dateLine } from '../lib/time'

export function Home() {
  const { state } = useStore()
  return (
    <div className="px-5 pt-1.5 pb-[130px]">
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="text-[13px] font-semibold text-[oklch(0.58_0.08_240)] tracking-[.02em]">
            {greeting()}, {state.profile.name}
          </div>
          <div className="text-[29px] font-medium text-[oklch(0.28_0.04_255)] leading-[1.05] mt-[3px]">{dateLine()}</div>
        </div>
        <div className="w-[42px] h-[42px] rounded-full bg-[linear-gradient(140deg,oklch(0.72_0.11_235),oklch(0.6_0.13_258))] flex items-center justify-center text-white font-bold text-[15px] shadow-[0_6px_16px_oklch(0.6_0.12_245_/_.4)]">
          {state.profile.initials}
        </div>
      </div>
      <StreakCard />
      <div className="flex items-baseline justify-between pb-[9px] mb-0.5 border-b-2 border-[oklch(0.24_0.03_258)]">
        <div className="text-[19px] font-semibold text-[oklch(0.22_0.03_258)]">Prayer List</div>
        <div className="text-[9.5px] font-bold tracking-[.1em] uppercase text-[oklch(0.55_0.06_250)] whitespace-nowrap">
          {state.prayers.length} Active
        </div>
      </div>
      <div className="h-3.5" />
      <div className="border-y border-[oklch(0.84_0.025_245)]">
        {state.prayers.map((p, i) => (
          <PrayerRow key={p.id} prayer={p} first={i === 0} />
        ))}
      </div>
    </div>
  )
}
