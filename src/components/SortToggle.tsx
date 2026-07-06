import type { Category } from '../store/types'

export type SortMode = 'recent' | 'category'

/** Returns a copy sorted alphabetically by category (stable), or the list as-is for 'recent'. */
export function sortItems<T extends { category: Category }>(items: T[], mode: SortMode): T[] {
  if (mode === 'recent') return items
  return [...items].sort((a, b) => a.category.localeCompare(b.category))
}

export function SortToggle({ value, onChange }: { value: SortMode; onChange: (mode: SortMode) => void }) {
  return (
    <div role="group" aria-label="Sort by" className="inline-flex bg-[oklch(0.93_0.02_245)] rounded-[7px] p-[3px]">
      {([['recent', 'Recent'], ['category', 'Category']] as const).map(([mode, label]) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          aria-pressed={value === mode}
          className={`text-[11px] font-bold px-[11px] py-[5px] rounded-[5px] ${
            value === mode
              ? 'bg-white text-[oklch(0.35_0.05_250)] shadow-[0_1px_3px_oklch(0.5_0.06_250_/_.3)]'
              : 'text-[oklch(0.55_0.03_250)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
