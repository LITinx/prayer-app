import { avColor } from '../store/categories'

export function Avatar({ initials, colorIndex, overlap = false }: { initials: string; colorIndex: number; overlap?: boolean }) {
  return (
    <div
      className="w-[26px] h-[26px] rounded-full text-white text-[10.5px] font-bold flex items-center justify-center border-2 border-white flex-none"
      style={{ background: avColor(colorIndex), marginLeft: overlap ? -8 : 0 }}
    >
      {initials}
    </div>
  )
}
