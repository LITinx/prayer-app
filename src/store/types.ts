export type Category =
  | 'Health' | 'Family' | 'Gratitude' | 'Guidance'
  | 'Provision' | 'Friends' | 'Work' | 'Church'

export type Screen = 'home' | 'groups' | 'groupDetail' | 'answered' | 'reminders'

export interface Prayer {
  id: string
  text: string
  category: Category
  streak: number
  prayedToday: boolean
}

export interface AnsweredPrayer {
  id: string
  text: string
  category: Category
  answeredAt: number // epoch ms
  streak?: number // streak at the time it was answered; absent on entries stored before undo existed
}

export interface Group {
  id: string
  name: string
  emoji: string
  members: number
  requests: number
  prayingNow: number
  avatars: string[]
}

export interface FeedItem {
  id: string
  author: string
  initials: string
  agoLabel: string
  text: string
  category: Category
  praying: number
  prayed: boolean
}

export interface AppStreak {
  count: number
  lastPrayedDate: string // YYYY-MM-DD
}

export interface Profile {
  name: string
  initials: string
}

export interface AppState {
  screen: Screen
  activeGroupId: string | null
  lastVisitDate: string // YYYY-MM-DD
  prayers: Prayer[]
  answered: AnsweredPrayer[]
  groups: Group[]
  feeds: Record<string, FeedItem[]>
  appStreak: AppStreak
  profile: Profile
}
