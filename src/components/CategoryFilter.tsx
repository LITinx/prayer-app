import type { Category } from '../store/types'
import { catColor } from '../store/categories'

/** Distinct categories present in a list, alphabetically by name. */
export function presentCategories<T extends { categoryId: string }>(items: T[], categories: Category[]): Category[] {
  const ids = new Set(items.map(i => i.categoryId))
  return categories.filter(c => ids.has(c.id)).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Empty selection = no filter. Never reorders. Selected ids no longer present
 * in the list are ignored, so a filter can't strand the user on an
 * unexplained empty list when its last item moves away.
 */
export function filterByCategories<T extends { categoryId: string }>(items: T[], selectedIds: string[]): T[] {
  const active = selectedIds.filter(id => items.some(i => i.categoryId === id))
  return active.length ? items.filter(i => active.includes(i.categoryId)) : items
}

export function CategoryFilter({
  categories,
  selected,
  onToggle,
}: {
  categories: Category[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  if (categories.length === 0) return null
  return (
    <div
      className="flex gap-1.5 overflow-x-auto -mx-5 px-5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Filter by category"
    >
      {categories.map(c => {
        const col = catColor(c.hue)
        const active = selected.includes(c.id)
        return (
          <button
            key={c.id}
            onClick={() => onToggle(c.id)}
            aria-pressed={active}
            className="flex-none inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-[.09em] uppercase px-[11px] py-[7px] rounded-full"
            style={active ? { color: 'white', background: col.dot } : { color: col.fg, background: col.bg }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? 'white' : col.dot }} />
            {c.name}
          </button>
        )
      })}
    </div>
  )
}
