import type { AppState, Category } from '../store/types'
import { DEFAULT_CATEGORIES } from '../store/categories'
import { prevDay } from '../lib/history'

const DAY = 86_400_000

export const demoCategories: Category[] = DEFAULT_CATEGORIES.map((c, i) => ({
  id: `c${i + 1}`,
  ...c,
}))

export const catId = (name: string) => demoCategories.find(c => c.name === name)!.id

/** N consecutive log days for a prayer, ending on `end`. */
export function logDays(prayerId: string, end: string, n: number) {
  const out = []
  let d = end
  for (let i = 0; i < n; i++) {
    out.push({ id: `${prayerId}-${d}`, prayerId, prayedOn: d })
    d = prevDay(d)
  }
  return out
}

/** Populated app state for tests — mirrors the old demo seed, log-based. */
export function demoState(now: number, today: string): AppState {
  return {
    screen: 'home',
    activeGroupId: null,
    activePrayerId: null,
    profile: { name: 'Anna', initials: 'AR' },
    categories: demoCategories,
    syncError: false,
    prayers: [
      { id: 'p1', text: "Grandma Ruth's recovery after her surgery", categoryId: catId('Health'), answeredAt: null, createdAt: now - 10 * DAY },
      { id: 'p2', text: 'Wisdom for the job decision this month', categoryId: catId('Guidance'), answeredAt: null, createdAt: now - 9 * DAY },
      { id: 'p3', text: "Thankful for Maya's safe arrival 💙", categoryId: catId('Gratitude'), answeredAt: null, createdAt: now - 8 * DAY },
      { id: 'p4', text: "Tom & Elise's marriage — patience and grace", categoryId: catId('Family'), answeredAt: null, createdAt: now - 7 * DAY },
      { id: 'p5', text: "Sarah's visa application to come through", categoryId: catId('Provision'), answeredAt: null, createdAt: now - 6 * DAY },
      { id: 'a1', text: "Dad's test results came back clear", categoryId: catId('Health'), answeredAt: now - 3 * DAY, createdAt: now - 30 * DAY },
      { id: 'a2', text: 'The new apartment finally came through', categoryId: catId('Provision'), answeredAt: now - 8 * DAY, createdAt: now - 40 * DAY },
      { id: 'a3', text: 'Reconciled with my brother after years', categoryId: catId('Family'), answeredAt: now - 15 * DAY, createdAt: now - 50 * DAY },
    ],
    logs: [
      // p1: 6-day streak ending yesterday (not prayed today)
      ...logDays('p1', prevDay(today), 6),
      // p2: 3-day streak ending yesterday
      ...logDays('p2', prevDay(today), 3),
      // p3: 12-day streak ending today (prayed today)
      ...logDays('p3', today, 12),
      // p4: never prayed; p5: 2-day streak ending yesterday
      ...logDays('p5', prevDay(today), 2),
    ],
    groups: [
      { id: 'g1', name: 'Morning Grace', emoji: '🌅', members: 6, requests: 8, prayingNow: 4, avatars: ['JM', 'SK', 'DL', 'RP'] },
      { id: 'g2', name: 'College Friends', emoji: '🎓', members: 9, requests: 5, prayingNow: 2, avatars: ['AR', 'TK', 'LM'] },
      { id: 'g3', name: 'Riverside Small Group', emoji: '🌊', members: 12, requests: 11, prayingNow: 6, avatars: ['NB', 'CV', 'EM', 'FG'] },
    ],
    feeds: {
      g1: [
        { id: 'f1', author: 'Julia M.', initials: 'JM', agoLabel: '2h', text: 'Traveling mercies for our team flying out to the retreat this weekend.', category: 'Guidance', praying: 12, prayed: false },
        { id: 'f2', author: 'David L.', initials: 'DL', agoLabel: '5h', text: "My mom's biopsy results come in Thursday. Peace for the whole family.", category: 'Health', praying: 18, prayed: true },
        { id: 'f3', author: 'Rachel P.', initials: 'RP', agoLabel: 'yesterday', text: 'Grateful — my sister said yes to being baptized! 🙏', category: 'Gratitude', praying: 9, prayed: false },
      ],
    },
  }
}
