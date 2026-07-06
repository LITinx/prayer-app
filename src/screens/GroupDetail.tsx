import type { FeedItem } from '../store/types'
import { useStore } from '../store/StoreContext'
import { CategoryTag } from '../components/CategoryTag'
import { Avatar } from '../components/Avatar'

function FeedCard({ item, groupId }: { item: FeedItem; groupId: string }) {
  const { dispatch } = useStore()
  return (
    <div className="bg-white border border-[oklch(0.9_0.015_240)] rounded-lg px-4 py-[15px] mb-[11px] shadow-[0_3px_10px_-6px_oklch(0.5_0.06_250_/_.35)]">
      <div className="flex items-center gap-[9px] mb-[9px]">
        <Avatar initials={item.initials} colorIndex={item.author.charCodeAt(0) % 5} />
        <div className="text-[13px] font-bold text-[oklch(0.32_0.03_255)]">{item.author}</div>
        <span className="text-[11.5px] text-[oklch(0.62_0.02_250)]">{item.agoLabel}</span>
      </div>
      <div className="text-[14.5px] text-[oklch(0.28_0.03_255)] leading-[1.4] mb-3">{item.text}</div>
      <div className="flex items-center justify-between">
        <CategoryTag category={item.category} />
        <button
          onClick={() => dispatch({ type: 'TOGGLE_FEED_PRAY', groupId, feedId: item.id })}
          className={`text-[12.5px] font-bold px-[13px] py-[7px] rounded-[5px] ${
            item.prayed
              ? 'bg-[oklch(0.62_0.13_250)] text-white'
              : 'bg-[oklch(0.95_0.035_248)] text-[oklch(0.5_0.12_250)]'
          }`}
        >
          {item.prayed ? '🙏 Praying' : 'Pray'} · {item.praying}
        </button>
      </div>
    </div>
  )
}

export function GroupDetail() {
  const { state, dispatch } = useStore()
  const group = state.groups.find(g => g.id === state.activeGroupId)
  if (!group) return null
  const feed = state.feeds[group.id] ?? []
  return (
    <div className="px-5 pt-1.5 pb-[130px]">
      <button
        onClick={() => dispatch({ type: 'NAVIGATE', screen: 'groups' })}
        className="text-[13px] font-semibold text-[oklch(0.55_0.1_245)] mb-3.5"
      >
        ‹ Groups
      </button>
      <div className="flex items-center gap-3.5 mb-1.5">
        <div className="w-[54px] h-[54px] rounded-[9px] bg-[oklch(0.95_0.04_248)] flex items-center justify-center text-[26px] flex-none">
          {group.emoji}
        </div>
        <div>
          <div className="text-2xl font-medium text-[oklch(0.28_0.04_255)] leading-[1.1]">{group.name}</div>
          <div className="text-[12.5px] text-[oklch(0.55_0.03_250)] mt-0.5">
            {group.members} members · {group.prayingNow} praying now
          </div>
        </div>
      </div>

      <div className="flex gap-[9px] mt-[18px] mb-5">
        <button className="flex-1 bg-[oklch(0.62_0.13_250)] text-white text-center py-[11px] rounded-md font-bold text-[13.5px]">
          ＋ Share a request
        </button>
        <button className="flex-none bg-white border border-[oklch(0.88_0.02_245)] text-[oklch(0.5_0.1_245)] py-[11px] px-[15px] rounded-md font-bold text-[13.5px]">
          Invite
        </button>
      </div>

      <div className="text-sm font-bold text-[oklch(0.3_0.03_255)] mb-3">Shared requests</div>
      {feed.map(f => (
        <FeedCard key={f.id} item={f} groupId={group.id} />
      ))}
    </div>
  )
}
