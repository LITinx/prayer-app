import type { AppState, AppStreak, Category, Screen } from './types'
import { isYesterday } from '../lib/time'

export type Action =
  | { type: 'NAVIGATE'; screen: Screen }
  | { type: 'OPEN_GROUP'; groupId: string }
  | { type: 'TOGGLE_PRAYED'; id: string; today: string }
  | { type: 'MARK_ANSWERED'; id: string; now: number }
  | { type: 'UNDO_ANSWERED'; id: string }
  | { type: 'ADD_PRAYER'; id: string; text: string; category: Category }
  | { type: 'TOGGLE_FEED_PRAY'; groupId: string; feedId: string }

export function displayStreak(s: AppStreak, today: string): number {
  return s.lastPrayedDate === today || isYesterday(s.lastPrayedDate, today) ? s.count : 0
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, screen: action.screen }

    case 'OPEN_GROUP':
      return { ...state, screen: 'groupDetail', activeGroupId: action.groupId }

    case 'TOGGLE_PRAYED': {
      const target = state.prayers.find(p => p.id === action.id)
      if (!target) return state
      const checking = !target.prayedToday
      const prayers = state.prayers.map(p =>
        p.id === action.id
          ? { ...p, prayedToday: checking, streak: checking ? p.streak + 1 : Math.max(0, p.streak - 1) }
          : p
      )
      let appStreak = state.appStreak
      if (checking && appStreak.lastPrayedDate !== action.today) {
        appStreak = {
          count: isYesterday(appStreak.lastPrayedDate, action.today) ? appStreak.count + 1 : 1,
          lastPrayedDate: action.today,
        }
      }
      return { ...state, prayers, appStreak }
    }

    case 'MARK_ANSWERED': {
      const p = state.prayers.find(x => x.id === action.id)
      if (!p) return state
      return {
        ...state,
        prayers: state.prayers.filter(x => x.id !== action.id),
        answered: [
          { id: p.id, text: p.text, category: p.category, answeredAt: action.now, streak: p.streak },
          ...state.answered,
        ],
      }
    }

    case 'UNDO_ANSWERED': {
      const a = state.answered.find(x => x.id === action.id)
      if (!a) return state
      return {
        ...state,
        answered: state.answered.filter(x => x.id !== action.id),
        prayers: [
          { id: a.id, text: a.text, category: a.category, streak: a.streak ?? 0, prayedToday: false },
          ...state.prayers,
        ],
      }
    }

    case 'ADD_PRAYER':
      return {
        ...state,
        screen: 'home',
        prayers: [
          { id: action.id, text: action.text, category: action.category, streak: 0, prayedToday: false },
          ...state.prayers,
        ],
      }

    case 'TOGGLE_FEED_PRAY': {
      const feed = (state.feeds[action.groupId] ?? []).map(f =>
        f.id === action.feedId
          ? { ...f, prayed: !f.prayed, praying: f.prayed ? f.praying - 1 : f.praying + 1 }
          : f
      )
      return { ...state, feeds: { ...state.feeds, [action.groupId]: feed } }
    }
  }
}
