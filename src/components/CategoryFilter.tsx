import type { Category } from '../store/types'
import { catColor } from '../store/categories'

/** Distinct categories present in a list, alphabetically. */
export function presentCategories<T extends { category: Category }>(items: T[]): Category[] {
  return [...new Set(items.map(i => i.category))].sort((a, b) => a.localeCompare(b))
}

/**
 * Empty selection = no filter. Never reorders. Selected categories no longer
 * present in the list are ignored, so a filter can't strand the user on an
 * unexplained empty list when its last item moves away.
 */
export function filterByCategories<T extends { category: Category }>(items: T[], selected: Category[]): T[] {
  const active = selected.filter(c => items.some(i => i.category === c))
  return active.length ? items.filter(i => active.includes(i.category)) : items
}

export function CategoryFilter({
  categories,
  selected,
  onToggle,
}: {
  categories: Category[]
  selected: Category[]
  onToggle: (category: Category) => void
}) {
  if (categories.length === 0) return null
  return (
    <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 py-1" role="group" aria-label="Filter by category">
      {categories.map(c => {
        const col = catColor(c)
        const active = selected.includes(c)
        return (
          <button
            key={c}
            onClick={() => onToggle(c)}
            aria-pressed={active}
            className="flex-none inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-[.09em] uppercase px-[11px] py-[7px] rounded-full"
            style={
              active
                ? { color: 'white', background: col.dot }
                : { color: col.fg, background: col.bg }
            }
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? 'white' : col.dot }} />
            {c}
          </button>
        )
      })}
    </div>
  )
}
