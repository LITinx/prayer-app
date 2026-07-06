import type { Category } from '../store/types'
import { catColor } from '../store/categories'

export function CategoryTag({ category }: { category: Category }) {
  const c = catColor(category)
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-[.09em] uppercase"
      style={{ color: c.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {category}
    </span>
  )
}
