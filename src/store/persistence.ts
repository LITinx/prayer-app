import type { AppState } from './types'

export const STORAGE_KEY = 'prayer-app-state-v1'

export function seedState(_now: number, _today: string): AppState {
  return {
    screen: 'home',
    activeGroupId: null,
    activePrayerId: null,
    profile: { name: 'Anna', initials: 'AR' },
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

export function loadState(now: number, today: string): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedState(now, today)
    const s = JSON.parse(raw) as AppState
    if (!Array.isArray(s.prayers) || !Array.isArray(s.logs) || !Array.isArray(s.categories)) {
      return seedState(now, today)
    }
    return s
  } catch {
    return seedState(now, today)
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage full or unavailable — silently ignore per spec
  }
}
