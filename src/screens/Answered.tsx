import { useStore } from '../store/StoreContext'
import { CategoryTag } from '../components/CategoryTag'
import { relTime } from '../lib/time'

export function Answered() {
  const { state } = useStore()
  const now = Date.now()
  return (
    <div className="px-5 pt-1.5 pb-[130px]">
      <h1 className="text-[28px] font-medium text-[oklch(0.28_0.04_255)] mb-1">Answered</h1>
      <p className="text-[13px] text-[oklch(0.55_0.03_250)] mb-5">Looking back with gratitude</p>

      <div className="bg-[linear-gradient(135deg,oklch(0.72_0.1_150),oklch(0.66_0.12_172))] rounded-lg px-[19px] py-[17px] text-white flex items-center gap-3.5 mb-[22px] shadow-[0_14px_30px_-14px_oklch(0.6_0.12_160_/_.7)]">
        <div className="text-3xl">🌿</div>
        <div>
          <div className="text-[21px] font-bold leading-none">{state.answered.length} prayers answered</div>
          <div className="text-[12.5px] opacity-85 mt-0.5">Every one remembered</div>
        </div>
      </div>

      {state.answered.map(a => (
        <div
          key={a.id}
          className="bg-white border border-[oklch(0.9_0.015_240)] rounded-lg px-4 py-[15px] mb-[11px] shadow-[0_3px_10px_-6px_oklch(0.5_0.06_250_/_.35)] flex gap-[13px] items-start"
        >
          <div className="w-[26px] h-[26px] rounded-full bg-[oklch(0.66_0.12_158)] flex items-center justify-center text-white text-[13px] font-extrabold flex-none mt-px">
            ✓
          </div>
          <div className="flex-1">
            <div className="text-[14.5px] font-semibold text-[oklch(0.28_0.03_255)] leading-[1.34]">{a.text}</div>
            <div className="flex items-center gap-2 mt-[9px]">
              <CategoryTag category={a.category} />
              <span className="text-[11.5px] text-[oklch(0.6_0.02_250)]">· answered {relTime(a.answeredAt, now)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
