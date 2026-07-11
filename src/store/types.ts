export interface Category {
  id: string
  name: string
  hue: number
}

export type Screen = 'home' | 'groups' | 'groupDetail' | 'answered' | 'reminders' | 'prayerDetail'

export interface Prayer {
  id: string
  text: string
  categoryId: string
  answeredAt: number | null // epoch ms; null = active
  createdAt: number
}

export interface PrayerLog {
  id: string
  prayerId: string
  prayedOn: string // YYYY-MM-DD
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
  category: string // display name snapshot — demo data / stage-2 sharing
  praying: number
  prayed: boolean
}

export interface Profile {
  name: string
  initials: string
}

export interface AppState {
  screen: Screen
  activeGroupId: string | null
  activePrayerId: string | null
  prayers: Prayer[]
  logs: PrayerLog[]
  categories: Category[]
  groups: Group[]
  feeds: Record<string, FeedItem[]>
  profile: Profile
  syncError: boolean
}
