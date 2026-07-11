import type { AppState } from './types'

export const LEGACY_KEY = 'prayer-app-state-v1'
export const CACHE_PREFIX = 'prayer-app-cache-v2:'
export const cacheKey = (userId: string) => `${CACHE_PREFIX}${userId}`

/** Legacy (pre-account) localStorage shape — read once for the first-sign-in import. */
export interface LegacyState {
  prayers: { id: string; text: string; category: string; streak: number; prayedToday: boolean }[]
  answered: { id: string; text: string; category: string; answeredAt: number; streak?: number }[]
  appStreak?: { count: number; lastPrayedDate: string }
}

export function emptyState(): AppState {
  return {
    screen: 'home',
    activeGroupId: null,
    activePrayerId: null,
    profile: { name: '', initials: '' },
    categories: [],
    prayers: [],
    logs: [],
    syncError: false,
    groups: [
      { id: 'g1', name: 'Morning Grace', emoji: '🌅', members: 6, requests: 3, prayingNow: 4, avatars: ['JM', 'SK', 'DL', 'RP'] },
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

export function loadCache(userId: string): AppState | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const s = JSON.parse(raw) as AppState
    if (!Array.isArray(s.prayers) || !Array.isArray(s.logs) || !Array.isArray(s.categories)) return null
    if (typeof s.profile !== 'object' || s.profile === null || typeof s.profile.name !== 'string') return null
    if (!Array.isArray(s.groups)) return null
    if (typeof s.feeds !== 'object' || s.feeds === null) return null
    return { ...s, syncError: false }
  } catch {
    return null
  }
}

export function saveCache(userId: string, state: AppState): void {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(state))
  } catch {
    // storage full or unavailable — cache is best-effort
  }
}

export function readLegacyState(): LegacyState | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as LegacyState
    if (!Array.isArray(s.prayers) || !Array.isArray(s.answered)) return null
    return s
  } catch {
    return null
  }
}

export function clearLegacyState(): void {
  localStorage.removeItem(LEGACY_KEY)
}
