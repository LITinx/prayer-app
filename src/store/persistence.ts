import type { AppState } from './types'

export const STORAGE_KEY = 'prayer-app-state-v1'

const DAY = 86_400_000

export function seedState(now: number, today: string): AppState {
  return {
    screen: 'home',
    activeGroupId: null,
    lastVisitDate: today,
    appStreak: { count: 7, lastPrayedDate: today },
    profile: { name: 'Anna', initials: 'AR' },
    prayers: [
      { id: 'p1', text: "Grandma Ruth's recovery after her surgery", category: 'Health', streak: 6, prayedToday: false },
      { id: 'p2', text: 'Wisdom for the job decision this month', category: 'Guidance', streak: 3, prayedToday: false },
      { id: 'p3', text: "Thankful for Maya's safe arrival 💙", category: 'Gratitude', streak: 12, prayedToday: true },
      { id: 'p4', text: "Tom & Elise's marriage — patience and grace", category: 'Family', streak: 0, prayedToday: false },
      { id: 'p5', text: "Sarah's visa application to come through", category: 'Provision', streak: 2, prayedToday: false },
    ],
    answered: [
      { id: 'a1', text: "Dad's test results came back clear", category: 'Health', answeredAt: now - 3 * DAY },
      { id: 'a2', text: 'The new apartment finally came through', category: 'Provision', answeredAt: now - 8 * DAY },
      { id: 'a3', text: 'Reconciled with my brother after years', category: 'Family', answeredAt: now - 15 * DAY },
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

export function loadState(now: number, today: string): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedState(now, today)
    const s = JSON.parse(raw) as AppState
    if (
      !Array.isArray(s.prayers) ||
      !Array.isArray(s.answered) ||
      !Array.isArray(s.groups) ||
      !s.feeds || typeof s.feeds !== 'object' ||
      !s.appStreak || typeof s.appStreak.count !== 'number' || typeof s.appStreak.lastPrayedDate !== 'string' ||
      !s.profile || typeof s.profile.name !== 'string' ||
      typeof s.lastVisitDate !== 'string'
    ) {
      return seedState(now, today)
    }
    if (s.lastVisitDate !== today) {
      return {
        ...s,
        lastVisitDate: today,
        screen: 'home',
        activeGroupId: null,
        prayers: s.prayers.map(p => ({ ...p, prayedToday: false })),
      }
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
