import { useStore } from '../store/StoreContext'
import { Avatar } from '../components/Avatar'

export function Groups() {
  const { state, dispatch } = useStore()
  return (
    <div className="px-5 pt-1.5 pb-[130px]">
      <h1 className="text-[28px] font-medium text-[oklch(0.28_0.04_255)] mb-1">Groups</h1>
      <p className="text-[13px] text-[oklch(0.55_0.03_250)] mb-5">Pray together, in one place</p>

      {state.groups.map(g => (
        <button
          key={g.id}
          onClick={() => dispatch({ type: 'OPEN_GROUP', groupId: g.id })}
          className="block w-full text-left bg-white border border-[oklch(0.9_0.015_240)] rounded-lg p-[17px] mb-[13px] shadow-[0_3px_10px_-6px_oklch(0.5_0.06_250_/_.35)]"
        >
          <div className="flex items-center gap-[13px]">
            <div className="w-12 h-12 rounded-lg bg-[oklch(0.95_0.04_248)] flex items-center justify-center text-[23px] flex-none">
              {g.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-[oklch(0.28_0.03_255)]">{g.name}</div>
              <div className="text-[12.5px] text-[oklch(0.55_0.03_250)] mt-0.5">
                {g.members} members · {g.requests} requests
              </div>
            </div>
            <span className="text-[oklch(0.7_0.03_250)] text-lg">›</span>
          </div>
          <div className="flex items-center gap-2 mt-[13px] pt-[13px] border-t border-[oklch(0.94_0.01_240)]">
            <div className="flex">
              {g.avatars.map((a, i) => (
                <Avatar key={a} initials={a} colorIndex={i} overlap={i > 0} />
              ))}
            </div>
            <span className="text-xs font-semibold text-[oklch(0.56_0.11_150)]">{g.prayingNow} praying now</span>
          </div>
        </button>
      ))}

      <div className="border-[1.5px] border-dashed border-[oklch(0.78_0.05_245)] rounded-lg p-[18px] flex items-center justify-center gap-[9px] text-[oklch(0.55_0.11_245)] font-bold text-sm mt-1">
        <span className="text-lg">＋</span> Invite people to a group
      </div>
    </div>
  )
}
