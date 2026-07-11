import type { AppState, Category, Prayer, PrayerLog, Profile, Screen } from './types'

export interface HydrateData {
  prayers: Prayer[]
  logs: PrayerLog[]
  categories: Category[]
  profile: Profile
}

export type Action =
  | { type: 'NAVIGATE'; screen: Screen }
  | { type: 'OPEN_GROUP'; groupId: string }
  | { type: 'OPEN_PRAYER'; id: string }
  | { type: 'TOGGLE_PRAYED'; id: string; today: string; logId: string }
  | { type: 'MARK_ANSWERED'; id: string; now: number }
  | { type: 'UNDO_ANSWERED'; id: string }
  | { type: 'ADD_PRAYER'; id: string; text: string; categoryId: string; now: number }
  | { type: 'ADD_CATEGORY'; id: string; name: string; hue: number }
  | { type: 'TOGGLE_FEED_PRAY'; groupId: string; feedId: string }
  | { type: 'HYDRATE'; data: HydrateData }
  | { type: 'SYNC_ERROR'; failed: boolean }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, screen: action.screen }

    case 'OPEN_GROUP':
      return { ...state, screen: 'groupDetail', activeGroupId: action.groupId }

    case 'OPEN_PRAYER':
      return { ...state, screen: 'prayerDetail', activePrayerId: action.id }

    case 'TOGGLE_PRAYED': {
      if (!state.prayers.some(p => p.id === action.id)) return state
      const existing = state.logs.find(l => l.prayerId === action.id && l.prayedOn === action.today)
      const logs = existing
        ? state.logs.filter(l => l !== existing)
        : [...state.logs, { id: action.logId, prayerId: action.id, prayedOn: action.today }]
      return { ...state, logs }
    }

    case 'MARK_ANSWERED': {
      if (!state.prayers.some(p => p.id === action.id)) return state
      return {
        ...state,
        prayers: state.prayers.map(p => (p.id === action.id ? { ...p, answeredAt: action.now } : p)),
      }
    }

    case 'UNDO_ANSWERED': {
      if (!state.prayers.some(p => p.id === action.id)) return state
      return {
        ...state,
        prayers: state.prayers.map(p => (p.id === action.id ? { ...p, answeredAt: null } : p)),
      }
    }

    case 'ADD_PRAYER':
      return {
        ...state,
        screen: 'home',
        prayers: [
          { id: action.id, text: action.text, categoryId: action.categoryId, answeredAt: null, createdAt: action.now },
          ...state.prayers,
        ],
      }

    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, { id: action.id, name: action.name, hue: action.hue }] }

    case 'TOGGLE_FEED_PRAY': {
      const feed = (state.feeds[action.groupId] ?? []).map(f =>
        f.id === action.feedId
          ? { ...f, prayed: !f.prayed, praying: f.prayed ? f.praying - 1 : f.praying + 1 }
          : f
      )
      return { ...state, feeds: { ...state.feeds, [action.groupId]: feed } }
    }

    case 'HYDRATE':
      return { ...state, ...action.data }

    case 'SYNC_ERROR':
      return { ...state, syncError: action.failed }
  }
}
