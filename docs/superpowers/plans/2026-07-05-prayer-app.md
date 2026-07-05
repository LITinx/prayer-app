# Prayer App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Prayer App PWA from the spec at `docs/superpowers/specs/2026-07-04-prayer-app-design.md` — personal prayer list with streaks, answered prayers, demo groups, and voice capture with auto-categorization.

**Architecture:** Vite + React + TypeScript SPA, no backend. Single `useReducer` store in React context, persisted to localStorage on every change, seeded with demo data on first launch. Screen switching via store state (no router). Tailwind v4 for styling; runtime-computed oklch colors (category hues, avatar colors) as inline styles.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind v4 (`@tailwindcss/vite`), `vite-plugin-pwa`, `@fontsource/hanken-grotesk`, Vitest + Testing Library + jsdom, `sharp` (icon generation only).

**Working directory for all commands:** `/Users/daniel/Projects/prayer-app`

---

### Task 1: Scaffold project and toolchain

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/index.css`, `src/App.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "prayer-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "icons": "node scripts/icons.mjs"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm i react react-dom @fontsource/hanken-grotesk
npm i -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vite-plugin-pwa vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom sharp
```
Expected: both commands exit 0, `node_modules/` created.

- [ ] **Step 3: Create .gitignore**

```
node_modules
dist
dev-dist
*.local
.DS_Store
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create vite.config.ts**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Prayer',
        short_name: 'Prayer',
        description: 'A quiet place to keep and lift your prayers',
        theme_color: '#eef4fa',
        background_color: '#eef4fa',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true
  }
})
```

- [ ] **Step 6: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#eef4fa" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <title>Prayer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create src/vite-env.d.ts**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 8: Create src/index.css** (Tailwind v4 theme + all keyframes ported verbatim from the mockup)

```css
@import "tailwindcss";

@theme {
  --font-sans: 'Hanken Grotesk', system-ui, sans-serif;

  --animate-mic-float: micFloat 3.4s ease-in-out infinite;
  --animate-pulse-ring: pulseRing 1.6s ease-out infinite;
  --animate-eq: eq 0.8s ease-in-out infinite;
  --animate-fade-up: fadeUp 0.3s ease;
  --animate-caret: caret 1s step-end infinite;
  --animate-check-pop: checkPop 0.35s ease;

  @keyframes micFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  @keyframes pulseRing {
    0% { transform: scale(1); opacity: 0.55; }
    70% { transform: scale(2.1); opacity: 0; }
    100% { opacity: 0; }
  }
  @keyframes eq {
    0%, 100% { transform: scaleY(0.35); }
    50% { transform: scaleY(1); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes caret {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
  @keyframes checkPop {
    0% { transform: scale(0.4); opacity: 0; }
    60% { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }
}

@layer base {
  body {
    margin: 0;
    font-family: var(--font-sans);
    letter-spacing: -0.01em;
    min-height: 100dvh;
    background: radial-gradient(120% 90% at 50% 0%,
      oklch(0.97 0.02 240) 0%,
      oklch(0.95 0.03 232) 45%,
      oklch(0.93 0.035 225) 100%);
  }
}
```

- [ ] **Step 9: Create src/main.tsx**

```tsx
import '@fontsource/hanken-grotesk/400.css'
import '@fontsource/hanken-grotesk/500.css'
import '@fontsource/hanken-grotesk/600.css'
import '@fontsource/hanken-grotesk/700.css'
import '@fontsource/hanken-grotesk/800.css'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 10: Create placeholder src/App.tsx** (replaced in Task 11)

```tsx
export default function App() {
  return <div className="p-6 text-lg font-bold">Prayer App</div>
}
```

- [ ] **Step 11: Create src/test/setup.ts**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 12: Verify toolchain**

Run: `npm run build`
Expected: exits 0, `dist/` produced (PWA plugin may warn about missing icon files — fine until Task 14).

Run: `npm test`
Expected: exits 0 with "no test files found" (vitest `passWithNoTests` is off by default — if it exits 1 solely because no tests exist, that's acceptable; tests arrive next task).

Run: `npm run dev` briefly (`curl -s http://localhost:5173 | head -5` from another shell, then stop it)
Expected: HTML with `<div id="root">`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind v4 + PWA toolchain"
```

---

### Task 2: Store types and category colors

**Files:**
- Create: `src/store/types.ts`
- Create: `src/store/categories.ts`
- Test: `src/store/categories.test.ts`

- [ ] **Step 1: Create src/store/types.ts**

```ts
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
```

- [ ] **Step 2: Write failing test src/store/categories.test.ts**

```ts
import { catColor, avColor, CATEGORIES } from './categories'

describe('catColor', () => {
  it('derives fg/bg/dot from the category hue', () => {
    expect(catColor('Health')).toEqual({
      fg: 'oklch(0.5 0.13 12)',
      bg: 'oklch(0.95 0.045 12)',
      dot: 'oklch(0.62 0.15 12)',
    })
  })
})

describe('CATEGORIES', () => {
  it('lists all eight categories in design order', () => {
    expect(CATEGORIES).toEqual([
      'Health', 'Family', 'Gratitude', 'Guidance',
      'Provision', 'Friends', 'Work', 'Church',
    ])
  })
})

describe('avColor', () => {
  it('cycles through the five avatar colors', () => {
    expect(avColor(0)).toBe('oklch(0.68 0.12 250)')
    expect(avColor(5)).toBe('oklch(0.68 0.12 250)')
    expect(avColor(2)).toBe('oklch(0.7 0.11 150)')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/store/categories.test.ts`
Expected: FAIL — cannot resolve `./categories`.

- [ ] **Step 4: Create src/store/categories.ts**

```ts
import type { Category } from './types'

export const CATEGORY_HUES: Record<Category, number> = {
  Health: 12,
  Family: 300,
  Gratitude: 150,
  Guidance: 258,
  Provision: 55,
  Friends: 210,
  Work: 30,
  Church: 285,
}

export const CATEGORIES = Object.keys(CATEGORY_HUES) as Category[]

export function catColor(cat: Category) {
  const h = CATEGORY_HUES[cat]
  return {
    fg: `oklch(0.5 0.13 ${h})`,
    bg: `oklch(0.95 0.045 ${h})`,
    dot: `oklch(0.62 0.15 ${h})`,
  }
}

export const AVATAR_COLORS = [
  'oklch(0.68 0.12 250)',
  'oklch(0.66 0.12 300)',
  'oklch(0.7 0.11 150)',
  'oklch(0.68 0.12 30)',
  'oklch(0.66 0.13 210)',
]

export function avColor(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length]
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/store/categories.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/store
git commit -m "feat: store types and category color system"
```

---

### Task 3: Time utilities

**Files:**
- Create: `src/lib/time.ts`
- Test: `src/lib/time.test.ts`

- [ ] **Step 1: Write failing test src/lib/time.test.ts**

```ts
import { todayStr, isYesterday, greeting, dateLine, relTime } from './time'

const DAY = 86_400_000

describe('todayStr', () => {
  it('formats local date as YYYY-MM-DD', () => {
    expect(todayStr(new Date(2026, 6, 4, 23, 30))).toBe('2026-07-04')
  })
})

describe('isYesterday', () => {
  it('true for the day before', () => {
    expect(isYesterday('2026-07-03', '2026-07-04')).toBe(true)
  })
  it('false for two days before and for same day', () => {
    expect(isYesterday('2026-07-02', '2026-07-04')).toBe(false)
    expect(isYesterday('2026-07-04', '2026-07-04')).toBe(false)
  })
  it('handles month boundaries', () => {
    expect(isYesterday('2026-06-30', '2026-07-01')).toBe(true)
  })
})

describe('greeting', () => {
  it('morning before 12, afternoon before 18, evening after', () => {
    expect(greeting(new Date(2026, 6, 4, 9))).toBe('Good morning')
    expect(greeting(new Date(2026, 6, 4, 14))).toBe('Good afternoon')
    expect(greeting(new Date(2026, 6, 4, 20))).toBe('Good evening')
  })
})

describe('dateLine', () => {
  it('formats like the mockup: "Friday, July 3"', () => {
    expect(dateLine(new Date(2026, 6, 3))).toBe('Friday, July 3')
  })
})

describe('relTime', () => {
  const now = 1_780_000_000_000
  it.each([
    [now - 30_000, 'just now'],
    [now - 5 * 60_000, '5m ago'],
    [now - 3 * 3_600_000, '3h ago'],
    [now - 1 * DAY, 'yesterday'],
    [now - 3 * DAY, '3 days ago'],
    [now - 8 * DAY, 'last week'],
    [now - 15 * DAY, '2 weeks ago'],
  ])('formats %i as %s', (ts, label) => {
    expect(relTime(ts, now)).toBe(label)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/time.test.ts`
Expected: FAIL — cannot resolve `./time`.

- [ ] **Step 3: Create src/lib/time.ts**

```ts
export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isYesterday(dateStr: string, today: string): boolean {
  const t = new Date(`${today}T00:00:00`)
  t.setDate(t.getDate() - 1)
  return todayStr(t) === dateStr
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function dateLine(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function relTime(ts: number, now: number): string {
  const s = Math.floor((now - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  const w = Math.floor(d / 7)
  if (w === 1) return 'last week'
  return `${w} weeks ago`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/time.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: date/greeting/relative-time utilities"
```

---

### Task 4: Auto-categorization

**Files:**
- Create: `src/voice/categorize.ts`
- Test: `src/voice/categorize.test.ts`

- [ ] **Step 1: Write failing test src/voice/categorize.test.ts**

```ts
import { categorize } from './categorize'

describe('categorize', () => {
  it.each([
    ['He starts chemotherapy on Monday', 'Health'],
    ['So thankful for the safe arrival', 'Gratitude'],
    ['The visa application to come through', 'Provision'],
    ['Patience for Tom and Elise in their marriage', 'Family'],
    ['My friend needs encouragement', 'Friends'],
    ['Clarity about what to do next', 'Guidance'],
  ])('categorizes %j as %s', (text, expected) => {
    expect(categorize(text)).toBe(expected)
  })

  it('health wins over family when both match', () => {
    expect(categorize('Healing for my mom')).toBe('Health')
  })

  it('is case-insensitive', () => {
    expect(categorize('THANKFUL!')).toBe('Gratitude')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/voice/categorize.test.ts`
Expected: FAIL — cannot resolve `./categorize`.

- [ ] **Step 3: Create src/voice/categorize.ts** (rules ported from the mockup, first match wins)

```ts
import type { Category } from '../store/types'

export function categorize(text: string): Category {
  const t = text.toLowerCase()
  if (/chemo|surgery|health|sick|hospital|test|recover|anx|heal/.test(t)) return 'Health'
  if (/thank|grateful|praise|answered|joy/.test(t)) return 'Gratitude'
  if (/job|money|visa|provi|financ|bill|home|apart/.test(t)) return 'Provision'
  if (/mom|dad|family|marriage|brother|sister|kids|son|daughter/.test(t)) return 'Family'
  if (/friend/.test(t)) return 'Friends'
  return 'Guidance'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/voice/categorize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/voice
git commit -m "feat: keyword auto-categorization for new prayers"
```

---

### Task 5: Seed data and persistence

**Files:**
- Create: `src/store/persistence.ts`
- Test: `src/store/persistence.test.ts`

- [ ] **Step 1: Write failing test src/store/persistence.test.ts**

```ts
import { loadState, saveState, seedState, STORAGE_KEY } from './persistence'

const now = 1_780_000_000_000
const today = '2026-07-05'

beforeEach(() => localStorage.clear())

describe('seedState', () => {
  it('seeds the mockup demo data', () => {
    const s = seedState(now, today)
    expect(s.prayers).toHaveLength(5)
    expect(s.prayers[0].text).toMatch(/Grandma Ruth/)
    expect(s.answered).toHaveLength(3)
    expect(s.groups).toHaveLength(3)
    expect(s.feeds.g1).toHaveLength(3)
    expect(s.screen).toBe('home')
    expect(s.lastVisitDate).toBe(today)
    expect(s.profile).toEqual({ name: 'Anna', initials: 'AR' })
  })
})

describe('loadState', () => {
  it('seeds when storage is empty', () => {
    expect(loadState(now, today).prayers).toHaveLength(5)
  })

  it('round-trips through saveState', () => {
    const s = seedState(now, today)
    const modified = { ...s, prayers: s.prayers.slice(1) }
    saveState(modified)
    expect(loadState(now, today).prayers).toHaveLength(4)
  })

  it('reseeds on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadState(now, today).prayers).toHaveLength(5)
  })

  it('reseeds on wrong shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: 1 }))
    expect(loadState(now, today).prayers).toHaveLength(5)
  })

  it('resets prayedToday flags and returns home on a new day', () => {
    const s = seedState(now, '2026-07-04')
    saveState({ ...s, screen: 'answered' })
    const loaded = loadState(now, today)
    expect(loaded.lastVisitDate).toBe(today)
    expect(loaded.screen).toBe('home')
    expect(loaded.prayers.every(p => !p.prayedToday)).toBe(true)
  })

  it('keeps prayedToday flags on the same day', () => {
    const s = seedState(now, today)
    saveState(s)
    expect(loadState(now, today).prayers.some(p => p.prayedToday)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/store/persistence.test.ts`
Expected: FAIL — cannot resolve `./persistence`.

- [ ] **Step 3: Create src/store/persistence.ts**

```ts
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
    if (!Array.isArray(s.prayers) || !s.appStreak || typeof s.lastVisitDate !== 'string') {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/store/persistence.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store
git commit -m "feat: seed data and localStorage persistence with daily rollover"
```

---

### Task 6: Reducer

**Files:**
- Create: `src/store/reducer.ts`
- Test: `src/store/reducer.test.ts`

- [ ] **Step 1: Write failing test src/store/reducer.test.ts**

```ts
import { reducer, displayStreak } from './reducer'
import { seedState } from './persistence'

const now = 1_780_000_000_000
const today = '2026-07-05'
const yesterday = '2026-07-04'
const base = () => seedState(now, today)

describe('NAVIGATE / OPEN_GROUP', () => {
  it('navigates between screens', () => {
    const s = reducer(base(), { type: 'NAVIGATE', screen: 'answered' })
    expect(s.screen).toBe('answered')
  })
  it('opens a group detail', () => {
    const s = reducer(base(), { type: 'OPEN_GROUP', groupId: 'g2' })
    expect(s.screen).toBe('groupDetail')
    expect(s.activeGroupId).toBe('g2')
  })
})

describe('TOGGLE_PRAYED', () => {
  it('checks a prayer and increments its streak', () => {
    const s = reducer(base(), { type: 'TOGGLE_PRAYED', id: 'p1', today })
    const p = s.prayers.find(p => p.id === 'p1')!
    expect(p.prayedToday).toBe(true)
    expect(p.streak).toBe(7)
  })
  it('unchecks and decrements with floor 0', () => {
    let s = reducer(base(), { type: 'TOGGLE_PRAYED', id: 'p4', today })
    s = reducer(s, { type: 'TOGGLE_PRAYED', id: 'p4', today })
    const p = s.prayers.find(p => p.id === 'p4')!
    expect(p.prayedToday).toBe(false)
    expect(p.streak).toBe(0)
  })
  it('extends app streak when last prayed yesterday', () => {
    const s0 = { ...base(), appStreak: { count: 3, lastPrayedDate: yesterday } }
    const s = reducer(s0, { type: 'TOGGLE_PRAYED', id: 'p1', today })
    expect(s.appStreak).toEqual({ count: 4, lastPrayedDate: today })
  })
  it('resets app streak to 1 after a missed day', () => {
    const s0 = { ...base(), appStreak: { count: 9, lastPrayedDate: '2026-07-01' } }
    const s = reducer(s0, { type: 'TOGGLE_PRAYED', id: 'p1', today })
    expect(s.appStreak).toEqual({ count: 1, lastPrayedDate: today })
  })
  it('leaves app streak alone when already prayed today', () => {
    const s0 = { ...base(), appStreak: { count: 7, lastPrayedDate: today } }
    const s = reducer(s0, { type: 'TOGGLE_PRAYED', id: 'p1', today })
    expect(s.appStreak).toEqual({ count: 7, lastPrayedDate: today })
  })
  it('unchecking does not touch app streak', () => {
    const s0 = { ...base(), appStreak: { count: 7, lastPrayedDate: today } }
    const s = reducer(s0, { type: 'TOGGLE_PRAYED', id: 'p3', today }) // p3 seeded prayedToday: true
    expect(s.appStreak).toEqual({ count: 7, lastPrayedDate: today })
  })
})

describe('MARK_ANSWERED', () => {
  it('moves the prayer to the top of answered with timestamp', () => {
    const s = reducer(base(), { type: 'MARK_ANSWERED', id: 'p2', now })
    expect(s.prayers.find(p => p.id === 'p2')).toBeUndefined()
    expect(s.prayers).toHaveLength(4)
    expect(s.answered[0]).toEqual({
      id: 'p2',
      text: 'Wisdom for the job decision this month',
      category: 'Guidance',
      answeredAt: now,
    })
  })
  it('ignores unknown ids', () => {
    const s = reducer(base(), { type: 'MARK_ANSWERED', id: 'nope', now })
    expect(s.prayers).toHaveLength(5)
    expect(s.answered).toHaveLength(3)
  })
})

describe('ADD_PRAYER', () => {
  it('prepends a new prayer and returns home', () => {
    const s0 = reducer(base(), { type: 'NAVIGATE', screen: 'groups' })
    const s = reducer(s0, { type: 'ADD_PRAYER', id: 'x1', text: 'New request', category: 'Friends' })
    expect(s.prayers[0]).toEqual({ id: 'x1', text: 'New request', category: 'Friends', streak: 0, prayedToday: false })
    expect(s.screen).toBe('home')
  })
})

describe('TOGGLE_FEED_PRAY', () => {
  it('toggles on: increments count', () => {
    const s = reducer(base(), { type: 'TOGGLE_FEED_PRAY', groupId: 'g1', feedId: 'f1' })
    const f = s.feeds.g1.find(f => f.id === 'f1')!
    expect(f.prayed).toBe(true)
    expect(f.praying).toBe(13)
  })
  it('toggles off: decrements count', () => {
    const s = reducer(base(), { type: 'TOGGLE_FEED_PRAY', groupId: 'g1', feedId: 'f2' })
    const f = s.feeds.g1.find(f => f.id === 'f2')!
    expect(f.prayed).toBe(false)
    expect(f.praying).toBe(17)
  })
})

describe('displayStreak', () => {
  it('shows count when last prayed today or yesterday', () => {
    expect(displayStreak({ count: 7, lastPrayedDate: today }, today)).toBe(7)
    expect(displayStreak({ count: 7, lastPrayedDate: yesterday }, today)).toBe(7)
  })
  it('shows 0 when the streak is broken', () => {
    expect(displayStreak({ count: 7, lastPrayedDate: '2026-07-01' }, today)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/store/reducer.test.ts`
Expected: FAIL — cannot resolve `./reducer`.

- [ ] **Step 3: Create src/store/reducer.ts**

```ts
import type { AppState, AppStreak, Category, Screen } from './types'
import { isYesterday } from '../lib/time'

export type Action =
  | { type: 'NAVIGATE'; screen: Screen }
  | { type: 'OPEN_GROUP'; groupId: string }
  | { type: 'TOGGLE_PRAYED'; id: string; today: string }
  | { type: 'MARK_ANSWERED'; id: string; now: number }
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
        answered: [{ id: p.id, text: p.text, category: p.category, answeredAt: action.now }, ...state.answered],
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/store/reducer.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store
git commit -m "feat: app reducer with prayer/streak/answered/feed actions"
```

---

### Task 7: Store context provider

**Files:**
- Create: `src/store/StoreContext.tsx`
- Test: `src/store/StoreContext.test.tsx`

- [ ] **Step 1: Write failing test src/store/StoreContext.test.tsx**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoreProvider, useStore } from './StoreContext'
import { STORAGE_KEY } from './persistence'

function Probe() {
  const { state, dispatch } = useStore()
  return (
    <div>
      <span data-testid="count">{state.prayers.length}</span>
      <button onClick={() => dispatch({ type: 'MARK_ANSWERED', id: 'p1', now: 1 })}>answer</button>
    </div>
  )
}

beforeEach(() => localStorage.clear())

describe('StoreProvider', () => {
  it('hydrates seeded state and persists after dispatch', async () => {
    render(<StoreProvider><Probe /></StoreProvider>)
    expect(screen.getByTestId('count')).toHaveTextContent('5')
    await userEvent.click(screen.getByText('answer'))
    expect(screen.getByTestId('count')).toHaveTextContent('4')
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.prayers).toHaveLength(4)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/store/StoreContext.test.tsx`
Expected: FAIL — cannot resolve `./StoreContext`.

- [ ] **Step 3: Create src/store/StoreContext.tsx**

```tsx
import { createContext, useContext, useEffect, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { AppState } from './types'
import { reducer } from './reducer'
import type { Action } from './reducer'
import { loadState, saveState } from './persistence'
import { todayStr } from '../lib/time'

const StoreCtx = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState(Date.now(), todayStr()))

  useEffect(() => {
    saveState(state)
  }, [state])

  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/store/StoreContext.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store
git commit -m "feat: store context provider with persistence effect"
```

---

### Task 8: Home screen (CategoryTag, StreakCard, PrayerRow)

**Files:**
- Create: `src/components/CategoryTag.tsx`, `src/components/StreakCard.tsx`, `src/components/PrayerRow.tsx`
- Create: `src/screens/Home.tsx`
- Test: `src/screens/Home.test.tsx`

- [ ] **Step 1: Write failing test src/screens/Home.test.tsx**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoreProvider } from '../store/StoreContext'
import { Home } from './Home'

const ui = () => render(<StoreProvider><Home /></StoreProvider>)

beforeEach(() => localStorage.clear())

describe('Home', () => {
  it('renders greeting, streak card, and seeded prayer list', () => {
    ui()
    expect(screen.getByText(/Good (morning|afternoon|evening), Anna/)).toBeInTheDocument()
    expect(screen.getByText('7-day streak')).toBeInTheDocument()
    expect(screen.getByText('1 of 5 prayers lifted today')).toBeInTheDocument()
    expect(screen.getByText(/Grandma Ruth's recovery/)).toBeInTheDocument()
    expect(screen.getByText('5 Active')).toBeInTheDocument()
  })

  it('toggling a prayer updates the lifted-today count', async () => {
    ui()
    await userEvent.click(screen.getByLabelText(/Mark .*Grandma Ruth.* as prayed/))
    expect(screen.getByText('2 of 5 prayers lifted today')).toBeInTheDocument()
  })

  it('marking answered removes the row and updates the count', async () => {
    ui()
    await userEvent.click(screen.getAllByRole('button', { name: 'Answered' })[0])
    expect(screen.queryByText(/Grandma Ruth's recovery/)).not.toBeInTheDocument()
    expect(screen.getByText('4 Active')).toBeInTheDocument()
  })

  it('shows streak chip only for prayers with streak > 0', () => {
    ui()
    expect(screen.getByText('· 12D')).toBeInTheDocument()
    expect(screen.queryByText('· 0D')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/Home.test.tsx`
Expected: FAIL — cannot resolve `./Home`.

- [ ] **Step 3: Create src/components/CategoryTag.tsx**

```tsx
import type { Category } from '../store/types'
import { catColor } from '../store/categories'

export function CategoryTag({ category }: { category: Category }) {
  const c = catColor(category)
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-[.09em] uppercase"
      style={{ color: c.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {category}
    </span>
  )
}
```

- [ ] **Step 4: Create src/components/StreakCard.tsx**

```tsx
import { useStore } from '../store/StoreContext'
import { displayStreak } from '../store/reducer'
import { todayStr } from '../lib/time'

export function StreakCard() {
  const { state } = useStore()
  const count = displayStreak(state.appStreak, todayStr())
  const prayed = state.prayers.filter(p => p.prayedToday).length
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(135deg,oklch(0.64_0.13_250)_0%,oklch(0.58_0.14_262)_100%)] rounded-lg px-5 py-[18px] text-white flex items-center gap-4 shadow-[0_16px_34px_-14px_oklch(0.55_0.13_255_/_.7)] mb-[22px]">
      <div className="absolute -right-[30px] -top-[30px] w-[130px] h-[130px] rounded-full bg-white/8" />
      <div className="w-[52px] h-[52px] rounded-lg bg-white/16 flex items-center justify-center text-2xl flex-none">🕊️</div>
      <div className="flex-1">
        <div className="text-[22px] font-bold leading-none">{count}-day streak</div>
        <div className="text-[12.5px] opacity-80 mt-[3px]">
          {prayed} of {state.prayers.length} prayers lifted today
        </div>
      </div>
      <div className="text-[11px] font-semibold bg-white/18 px-[11px] py-1.5 rounded-lg">Keep it up</div>
    </div>
  )
}
```

- [ ] **Step 5: Create src/components/PrayerRow.tsx**

```tsx
import type { Prayer } from '../store/types'
import { useStore } from '../store/StoreContext'
import { CategoryTag } from './CategoryTag'
import { todayStr } from '../lib/time'

export function PrayerRow({ prayer, first }: { prayer: Prayer; first: boolean }) {
  const { dispatch } = useStore()
  return (
    <div className={`flex gap-[13px] items-start py-[15px] ${first ? '' : 'border-t border-[oklch(0.88_0.018_245)]'}`}>
      <button
        aria-label={`Mark "${prayer.text}" as prayed`}
        aria-pressed={prayer.prayedToday}
        onClick={() => dispatch({ type: 'TOGGLE_PRAYED', id: prayer.id, today: todayStr() })}
        className={`w-6 h-6 flex-none mt-0.5 rounded-[5px] flex items-center justify-center transition-all ${
          prayer.prayedToday
            ? 'bg-[oklch(0.62_0.13_250)] border border-[oklch(0.62_0.13_250)]'
            : 'bg-white border-2 border-[oklch(0.85_0.03_245)]'
        }`}
      >
        {prayer.prayedToday && <span className="text-white text-xs font-extrabold animate-check-pop">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-[17px] font-medium leading-[1.28] text-[oklch(0.23_0.03_258)]">{prayer.text}</div>
        <div className="flex items-center gap-[9px] mt-2">
          <CategoryTag category={prayer.category} />
          {prayer.streak > 0 && (
            <span className="text-[10px] font-bold tracking-[.06em] text-[oklch(0.6_0.06_250)] whitespace-nowrap">
              · {prayer.streak}D
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => dispatch({ type: 'MARK_ANSWERED', id: prayer.id, now: Date.now() })}
        className="flex-none text-[9.5px] font-bold tracking-[.07em] uppercase text-[oklch(0.5_0.1_155)] border border-[oklch(0.82_0.06_155)] px-[9px] py-1.5 rounded whitespace-nowrap"
      >
        Answered
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Create src/screens/Home.tsx**

```tsx
import { useStore } from '../store/StoreContext'
import { StreakCard } from '../components/StreakCard'
import { PrayerRow } from '../components/PrayerRow'
import { greeting, dateLine } from '../lib/time'

export function Home() {
  const { state } = useStore()
  return (
    <div className="px-5 pt-1.5 pb-[130px]">
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="text-[13px] font-semibold text-[oklch(0.58_0.08_240)] tracking-[.02em]">
            {greeting()}, {state.profile.name}
          </div>
          <div className="text-[29px] font-medium text-[oklch(0.28_0.04_255)] leading-[1.05] mt-[3px]">{dateLine()}</div>
        </div>
        <div className="w-[42px] h-[42px] rounded-full bg-[linear-gradient(140deg,oklch(0.72_0.11_235),oklch(0.6_0.13_258))] flex items-center justify-center text-white font-bold text-[15px] shadow-[0_6px_16px_oklch(0.6_0.12_245_/_.4)]">
          {state.profile.initials}
        </div>
      </div>
      <StreakCard />
      <div className="flex items-baseline justify-between pb-[9px] mb-0.5 border-b-2 border-[oklch(0.24_0.03_258)]">
        <div className="text-[19px] font-semibold text-[oklch(0.22_0.03_258)]">Prayer List</div>
        <div className="text-[9.5px] font-bold tracking-[.1em] uppercase text-[oklch(0.55_0.06_250)] whitespace-nowrap">
          {state.prayers.length} Active
        </div>
      </div>
      <div className="h-3.5" />
      <div className="border-y border-[oklch(0.84_0.025_245)]">
        {state.prayers.map((p, i) => (
          <PrayerRow key={p.id} prayer={p} first={i === 0} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- src/screens/Home.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add src/components src/screens
git commit -m "feat: home screen with streak card and prayer list"
```

---

### Task 9: Answered screen

**Files:**
- Create: `src/screens/Answered.tsx`
- Test: `src/screens/Answered.test.tsx`

- [ ] **Step 1: Write failing test src/screens/Answered.test.tsx**

```tsx
import { render, screen } from '@testing-library/react'
import { StoreProvider } from '../store/StoreContext'
import { Answered } from './Answered'

beforeEach(() => localStorage.clear())

describe('Answered', () => {
  it('renders banner count and seeded answered prayers with relative times', () => {
    render(<StoreProvider><Answered /></StoreProvider>)
    expect(screen.getByText('3 prayers answered')).toBeInTheDocument()
    expect(screen.getByText(/Dad's test results came back clear/)).toBeInTheDocument()
    expect(screen.getByText('· answered 3 days ago')).toBeInTheDocument()
    expect(screen.getByText('· answered last week')).toBeInTheDocument()
    expect(screen.getByText('· answered 2 weeks ago')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/Answered.test.tsx`
Expected: FAIL — cannot resolve `./Answered`.

- [ ] **Step 3: Create src/screens/Answered.tsx**

```tsx
import { useStore } from '../store/StoreContext'
import { CategoryTag } from '../components/CategoryTag'
import { relTime } from '../lib/time'

export function Answered() {
  const { state } = useStore()
  const now = Date.now()
  return (
    <div className="px-5 pt-1.5 pb-[130px]">
      <h1 className="text-[28px] font-medium text-[oklch(0.28_0.04_255)] mb-1">Answered</h1>
      <p className="text-[13px] text-[oklch(0.55_0.03_250)] mb-5">Looking back with gratitude</p>

      <div className="bg-[linear-gradient(135deg,oklch(0.72_0.1_150),oklch(0.66_0.12_172))] rounded-lg px-[19px] py-[17px] text-white flex items-center gap-3.5 mb-[22px] shadow-[0_14px_30px_-14px_oklch(0.6_0.12_160_/_.7)]">
        <div className="text-3xl">🌿</div>
        <div>
          <div className="text-[21px] font-bold leading-none">{state.answered.length} prayers answered</div>
          <div className="text-[12.5px] opacity-85 mt-0.5">Every one remembered</div>
        </div>
      </div>

      {state.answered.map(a => (
        <div
          key={a.id}
          className="bg-white border border-[oklch(0.9_0.015_240)] rounded-lg px-4 py-[15px] mb-[11px] shadow-[0_3px_10px_-6px_oklch(0.5_0.06_250_/_.35)] flex gap-[13px] items-start"
        >
          <div className="w-[26px] h-[26px] rounded-full bg-[oklch(0.66_0.12_158)] flex items-center justify-center text-white text-[13px] font-extrabold flex-none mt-px">
            ✓
          </div>
          <div className="flex-1">
            <div className="text-[14.5px] font-semibold text-[oklch(0.28_0.03_255)] leading-[1.34]">{a.text}</div>
            <div className="flex items-center gap-2 mt-[9px]">
              <CategoryTag category={a.category} />
              <span className="text-[11.5px] text-[oklch(0.6_0.02_250)]">· answered {relTime(a.answeredAt, now)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/Answered.test.tsx`
Expected: PASS.

Note: the seed puts answered items at 3, 8, and 15 days ago, which `relTime` renders as "3 days ago", "last week", "2 weeks ago" — matching the mockup copy.

- [ ] **Step 5: Commit**

```bash
git add src/screens
git commit -m "feat: answered prayers screen"
```

---

### Task 10: Groups and GroupDetail screens

**Files:**
- Create: `src/components/Avatar.tsx`
- Create: `src/screens/Groups.tsx`, `src/screens/GroupDetail.tsx`
- Test: `src/screens/Groups.test.tsx`

- [ ] **Step 1: Write failing test src/screens/Groups.test.tsx**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoreProvider, useStore } from '../store/StoreContext'
import { Groups } from './Groups'
import { GroupDetail } from './GroupDetail'

function GroupsFlow() {
  const { state } = useStore()
  return state.screen === 'groupDetail' ? <GroupDetail /> : <Groups />
}

const ui = () => render(<StoreProvider><GroupsFlow /></StoreProvider>)

beforeEach(() => localStorage.clear())

describe('Groups', () => {
  it('lists seeded groups', () => {
    ui()
    expect(screen.getByText('Morning Grace')).toBeInTheDocument()
    expect(screen.getByText('6 members · 8 requests')).toBeInTheDocument()
    expect(screen.getByText('4 praying now')).toBeInTheDocument()
    expect(screen.getByText('Riverside Small Group')).toBeInTheDocument()
  })

  it('opens group detail with its feed', async () => {
    ui()
    await userEvent.click(screen.getByText('Morning Grace'))
    expect(screen.getByText('Shared requests')).toBeInTheDocument()
    expect(screen.getByText(/Traveling mercies/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pray · 12/ })).toBeInTheDocument()
  })

  it('toggles praying on a feed item and persists count', async () => {
    ui()
    await userEvent.click(screen.getByText('Morning Grace'))
    await userEvent.click(screen.getByRole('button', { name: /Pray · 12/ }))
    expect(screen.getByRole('button', { name: /🙏 Praying · 13/ })).toBeInTheDocument()
  })

  it('back link returns to groups list', async () => {
    ui()
    await userEvent.click(screen.getByText('Morning Grace'))
    await userEvent.click(screen.getByText('‹ Groups'))
    expect(screen.getByText('Pray together, in one place')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/Groups.test.tsx`
Expected: FAIL — cannot resolve `./Groups`.

- [ ] **Step 3: Create src/components/Avatar.tsx**

```tsx
import { avColor } from '../store/categories'

export function Avatar({ initials, colorIndex, overlap = false }: { initials: string; colorIndex: number; overlap?: boolean }) {
  return (
    <div
      className="w-[26px] h-[26px] rounded-full text-white text-[10.5px] font-bold flex items-center justify-center border-2 border-white flex-none"
      style={{ background: avColor(colorIndex), marginLeft: overlap ? -8 : 0 }}
    >
      {initials}
    </div>
  )
}
```

- [ ] **Step 4: Create src/screens/Groups.tsx**

```tsx
import { useStore } from '../store/StoreContext'
import { Avatar } from '../components/Avatar'

export function Groups() {
  const { state, dispatch } = useStore()
  return (
    <div className="px-5 pt-1.5 pb-[130px]">
      <h1 className="text-[28px] font-medium text-[oklch(0.28_0.04_255)] mb-1">Groups</h1>
      <p className="text-[13px] text-[oklch(0.55_0.03_250)] mb-5">Pray together, in one place</p>

      {state.groups.map(g => (
        <button
          key={g.id}
          onClick={() => dispatch({ type: 'OPEN_GROUP', groupId: g.id })}
          className="block w-full text-left bg-white border border-[oklch(0.9_0.015_240)] rounded-lg p-[17px] mb-[13px] shadow-[0_3px_10px_-6px_oklch(0.5_0.06_250_/_.35)]"
        >
          <div className="flex items-center gap-[13px]">
            <div className="w-12 h-12 rounded-lg bg-[oklch(0.95_0.04_248)] flex items-center justify-center text-[23px] flex-none">
              {g.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-[oklch(0.28_0.03_255)]">{g.name}</div>
              <div className="text-[12.5px] text-[oklch(0.55_0.03_250)] mt-0.5">
                {g.members} members · {g.requests} requests
              </div>
            </div>
            <span className="text-[oklch(0.7_0.03_250)] text-lg">›</span>
          </div>
          <div className="flex items-center gap-2 mt-[13px] pt-[13px] border-t border-[oklch(0.94_0.01_240)]">
            <div className="flex">
              {g.avatars.map((a, i) => (
                <Avatar key={a} initials={a} colorIndex={i} overlap={i > 0} />
              ))}
            </div>
            <span className="text-xs font-semibold text-[oklch(0.56_0.11_150)]">{g.prayingNow} praying now</span>
          </div>
        </button>
      ))}

      <div className="border-[1.5px] border-dashed border-[oklch(0.78_0.05_245)] rounded-lg p-[18px] flex items-center justify-center gap-[9px] text-[oklch(0.55_0.11_245)] font-bold text-sm mt-1">
        <span className="text-lg">＋</span> Invite people to a group
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create src/screens/GroupDetail.tsx**

```tsx
import type { FeedItem } from '../store/types'
import { useStore } from '../store/StoreContext'
import { CategoryTag } from '../components/CategoryTag'
import { Avatar } from '../components/Avatar'

function FeedCard({ item, groupId }: { item: FeedItem; groupId: string }) {
  const { dispatch } = useStore()
  return (
    <div className="bg-white border border-[oklch(0.9_0.015_240)] rounded-lg px-4 py-[15px] mb-[11px] shadow-[0_3px_10px_-6px_oklch(0.5_0.06_250_/_.35)]">
      <div className="flex items-center gap-[9px] mb-[9px]">
        <Avatar initials={item.initials} colorIndex={item.author.charCodeAt(0) % 5} />
        <div className="text-[13px] font-bold text-[oklch(0.32_0.03_255)]">{item.author}</div>
        <span className="text-[11.5px] text-[oklch(0.62_0.02_250)]">{item.agoLabel}</span>
      </div>
      <div className="text-[14.5px] text-[oklch(0.28_0.03_255)] leading-[1.4] mb-3">{item.text}</div>
      <div className="flex items-center justify-between">
        <CategoryTag category={item.category} />
        <button
          onClick={() => dispatch({ type: 'TOGGLE_FEED_PRAY', groupId, feedId: item.id })}
          className={`text-[12.5px] font-bold px-[13px] py-[7px] rounded-[5px] ${
            item.prayed
              ? 'bg-[oklch(0.62_0.13_250)] text-white'
              : 'bg-[oklch(0.95_0.035_248)] text-[oklch(0.5_0.12_250)]'
          }`}
        >
          {item.prayed ? '🙏 Praying' : 'Pray'} · {item.praying}
        </button>
      </div>
    </div>
  )
}

export function GroupDetail() {
  const { state, dispatch } = useStore()
  const group = state.groups.find(g => g.id === state.activeGroupId)
  if (!group) return null
  const feed = state.feeds[group.id] ?? state.feeds.g1 ?? []
  return (
    <div className="px-5 pt-1.5 pb-[130px]">
      <button
        onClick={() => dispatch({ type: 'NAVIGATE', screen: 'groups' })}
        className="text-[13px] font-semibold text-[oklch(0.55_0.1_245)] mb-3.5"
      >
        ‹ Groups
      </button>
      <div className="flex items-center gap-3.5 mb-1.5">
        <div className="w-[54px] h-[54px] rounded-[9px] bg-[oklch(0.95_0.04_248)] flex items-center justify-center text-[26px] flex-none">
          {group.emoji}
        </div>
        <div>
          <div className="text-2xl font-medium text-[oklch(0.28_0.04_255)] leading-[1.1]">{group.name}</div>
          <div className="text-[12.5px] text-[oklch(0.55_0.03_250)] mt-0.5">
            {group.members} members · {group.prayingNow} praying now
          </div>
        </div>
      </div>

      <div className="flex gap-[9px] mt-[18px] mb-5">
        <button className="flex-1 bg-[oklch(0.62_0.13_250)] text-white text-center py-[11px] rounded-md font-bold text-[13.5px]">
          ＋ Share a request
        </button>
        <button className="flex-none bg-white border border-[oklch(0.88_0.02_245)] text-[oklch(0.5_0.1_245)] py-[11px] px-[15px] rounded-md font-bold text-[13.5px]">
          Invite
        </button>
      </div>

      <div className="text-sm font-bold text-[oklch(0.3_0.03_255)] mb-3">Shared requests</div>
      {feed.map(f => (
        <FeedCard key={f.id} item={f} groupId={group.id} />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/screens/Groups.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components src/screens
git commit -m "feat: groups list and group detail with pray toggles"
```

---

### Task 11: Reminders placeholder, BottomNav, App shell

**Files:**
- Create: `src/screens/Reminders.tsx`
- Create: `src/components/BottomNav.tsx`, `src/components/MicIcon.tsx`
- Modify: `src/App.tsx` (replace placeholder entirely)
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write failing test src/App.test.tsx**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

beforeEach(() => localStorage.clear())

describe('App navigation', () => {
  it('starts on home', () => {
    render(<App />)
    expect(screen.getByText('Prayer List')).toBeInTheDocument()
  })

  it('navigates to groups, answered, reminders, and back home', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '◎ Groups' }))
    expect(screen.getByText('Pray together, in one place')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '✓ Answered' }))
    expect(screen.getByText('Looking back with gratitude')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '☾ Reminders' }))
    expect(screen.getByText('Coming soon')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '☰ Prayers' }))
    expect(screen.getByText('Prayer List')).toBeInTheDocument()
  })

  it('shows the voice FAB', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Add prayer by voice' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL — nav buttons not found (placeholder App).

- [ ] **Step 3: Create src/screens/Reminders.tsx**

```tsx
export function Reminders() {
  return (
    <div className="px-5 pt-1.5 pb-[130px]">
      <h1 className="text-[28px] font-medium text-[oklch(0.28_0.04_255)] mb-1">Reminders</h1>
      <p className="text-[13px] text-[oklch(0.55_0.03_250)] mb-5">Gentle nudges to pray</p>
      <div className="flex flex-col items-center text-center mt-14">
        <div className="w-[72px] h-[72px] rounded-3xl bg-[oklch(0.95_0.04_248)] flex items-center justify-center text-4xl">☾</div>
        <div className="mt-5 text-[17px] font-bold text-[oklch(0.28_0.04_255)]">Coming soon</div>
        <p className="mt-2 text-[13px] text-[oklch(0.55_0.03_250)] max-w-[240px] leading-relaxed">
          Daily reminders to return to your prayer list are on the way.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create src/components/MicIcon.tsx** (SVG ported from the mockup FAB)

```tsx
export function MicIcon() {
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" fill="#fff" stroke="none" />
      <path d="M5 10.5a7 7 0 0 0 14 0" />
      <line x1="12" y1="17.5" x2="12" y2="21.5" />
      <line x1="8.5" y1="21.5" x2="15.5" y2="21.5" />
    </svg>
  )
}
```

- [ ] **Step 5: Create src/components/BottomNav.tsx**

```tsx
import type { Screen } from '../store/types'
import { useStore } from '../store/StoreContext'
import { MicIcon } from './MicIcon'

function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-[3px] transition-colors ${
        active ? 'text-[oklch(0.55_0.13_252)]' : 'text-[oklch(0.68_0.02_250)]'
      }`}
    >
      <span className="text-[19px] leading-none">{icon}</span>
      <span className="text-[9.5px] font-bold">{label}</span>
    </button>
  )
}

export function BottomNav({ onVoice }: { onVoice: () => void }) {
  const { state, dispatch } = useStore()
  const go = (screen: Screen) => () => dispatch({ type: 'NAVIGATE', screen })
  const groupsActive = state.screen === 'groups' || state.screen === 'groupDetail'
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none">
      <div className="mx-auto max-w-[430px] relative h-[110px] bg-[linear-gradient(180deg,transparent,oklch(0.985_0.008_235)_38%)]">
        <div className="pointer-events-auto absolute left-[18px] right-[18px] bottom-[max(26px,env(safe-area-inset-bottom))] h-[60px] bg-white/80 backdrop-blur-[18px] border border-[oklch(0.9_0.015_240)] rounded-3xl shadow-[0_12px_30px_-12px_oklch(0.5_0.07_250_/_.5)] flex items-center justify-around px-2.5">
          <NavItem icon="☰" label="Prayers" active={state.screen === 'home'} onClick={go('home')} />
          <NavItem icon="◎" label="Groups" active={groupsActive} onClick={go('groups')} />
          <div className="w-[58px] flex-none" />
          <NavItem icon="✓" label="Answered" active={state.screen === 'answered'} onClick={go('answered')} />
          <NavItem icon="☾" label="Reminders" active={state.screen === 'reminders'} onClick={go('reminders')} />
        </div>
        <button
          onClick={onVoice}
          aria-label="Add prayer by voice"
          className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-[max(52px,calc(env(safe-area-inset-bottom)+26px))] w-16 h-16 rounded-full bg-[linear-gradient(140deg,oklch(0.66_0.13_248),oklch(0.58_0.15_264))] flex items-center justify-center shadow-[0_12px_28px_-6px_oklch(0.55_0.15_255_/_.7)] animate-mic-float"
        >
          <MicIcon />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Replace src/App.tsx**

```tsx
import { useState } from 'react'
import { StoreProvider, useStore } from './store/StoreContext'
import { Home } from './screens/Home'
import { Groups } from './screens/Groups'
import { GroupDetail } from './screens/GroupDetail'
import { Answered } from './screens/Answered'
import { Reminders } from './screens/Reminders'
import { BottomNav } from './components/BottomNav'
import { VoiceOverlay } from './voice/VoiceOverlay'

function CurrentScreen() {
  const { state } = useStore()
  switch (state.screen) {
    case 'home': return <Home />
    case 'groups': return <Groups />
    case 'groupDetail': return <GroupDetail />
    case 'answered': return <Answered />
    case 'reminders': return <Reminders />
  }
}

function Shell() {
  const [voiceOpen, setVoiceOpen] = useState(false)
  return (
    <div className="mx-auto max-w-[430px] min-h-dvh bg-[linear-gradient(180deg,oklch(0.985_0.008_235)_0%,oklch(0.975_0.012_235)_100%)] shadow-[0_0_60px_oklch(0.6_0.08_245_/_.25)] pt-[max(12px,env(safe-area-inset-top))]">
      <CurrentScreen />
      <BottomNav onVoice={() => setVoiceOpen(true)} />
      {voiceOpen && <VoiceOverlay onClose={() => setVoiceOpen(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
```

Note: `VoiceOverlay` doesn't exist yet. For this task, create a **stub** `src/voice/VoiceOverlay.tsx` so the app compiles; Task 13 replaces it entirely:

```tsx
export function VoiceOverlay({ onClose }: { onClose: () => void }) {
  return <button aria-label="Close" onClick={onClose} className="hidden" />
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: app shell, bottom nav with mic FAB, reminders placeholder"
```

---

### Task 12: useSpeech hook

**Files:**
- Create: `src/voice/useSpeech.ts`
- Test: `src/voice/useSpeech.test.ts`

- [ ] **Step 1: Write failing test src/voice/useSpeech.test.ts**

```ts
import { renderHook, act } from '@testing-library/react'
import { useSpeech } from './useSpeech'

class FakeRec {
  static instance: FakeRec | null = null
  continuous = false
  interimResults = false
  lang = ''
  onresult: ((e: unknown) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onend: (() => void) | null = null
  start() { FakeRec.instance = this }
  stop() { this.onend?.() }
}

afterEach(() => {
  delete (window as Record<string, unknown>).SpeechRecognition
  FakeRec.instance = null
})

describe('useSpeech', () => {
  it('reports unsupported when no SpeechRecognition exists', () => {
    const { result } = renderHook(() => useSpeech())
    expect(result.current.supported).toBe(false)
  })

  it('accumulates transcript from results and stops cleanly', () => {
    ;(window as Record<string, unknown>).SpeechRecognition = FakeRec
    const { result } = renderHook(() => useSpeech())
    expect(result.current.supported).toBe(true)

    act(() => result.current.start())
    expect(result.current.listening).toBe(true)

    act(() => {
      FakeRec.instance!.onresult!({ results: [[{ transcript: 'heal my ' }], [{ transcript: 'friend' }]] })
    })
    expect(result.current.transcript).toBe('heal my friend')

    act(() => result.current.stop())
    expect(result.current.listening).toBe(false)
  })

  it('surfaces errors and stops listening', () => {
    ;(window as Record<string, unknown>).SpeechRecognition = FakeRec
    const { result } = renderHook(() => useSpeech())
    act(() => result.current.start())
    act(() => { FakeRec.instance!.onerror!({ error: 'not-allowed' }) })
    expect(result.current.error).toBe('not-allowed')
    expect(result.current.listening).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/voice/useSpeech.test.ts`
Expected: FAIL — cannot resolve `./useSpeech`.

- [ ] **Step 3: Create src/voice/useSpeech.ts**

```ts
import { useCallback, useRef, useState } from 'react'

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | undefined {
  const w = window as unknown as Record<string, SpeechRecognitionCtor | undefined>
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function useSpeech() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  const supported = typeof window !== 'undefined' && !!getCtor()

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) {
      setError('unsupported')
      return
    }
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = navigator.language || 'en-US'
    rec.onresult = e => {
      let t = ''
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
      setTranscript(t)
    }
    rec.onerror = e => {
      setError(e.error ?? 'error')
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    setTranscript('')
    setError(null)
    setListening(true)
    rec.start()
  }, [])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  return { supported, listening, transcript, error, start, stop }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/voice/useSpeech.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/voice
git commit -m "feat: useSpeech hook with capability detection"
```

---

### Task 13: VoiceOverlay

**Files:**
- Modify: `src/voice/VoiceOverlay.tsx` (replace the Task 11 stub entirely)
- Test: `src/voice/VoiceOverlay.test.tsx`

- [ ] **Step 1: Write failing test src/voice/VoiceOverlay.test.tsx**

```tsx
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

class FakeRec {
  static instance: FakeRec | null = null
  continuous = false
  interimResults = false
  lang = ''
  onresult: ((e: unknown) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onend: (() => void) | null = null
  start() { FakeRec.instance = this }
  stop() { this.onend?.() }
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  delete (window as Record<string, unknown>).SpeechRecognition
  FakeRec.instance = null
})

describe('VoiceOverlay — typed fallback (no speech support)', () => {
  it('opens straight into review mode and adds a typed prayer', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    expect(screen.getByText('NEW PRAYER REQUEST')).toBeInTheDocument()

    const box = screen.getByPlaceholderText('What would you like to pray for?')
    await userEvent.type(box, 'Strength for my friend Daniel')

    // 'friend' keyword → Friends chip auto-selected
    expect(screen.getByRole('button', { name: /Friends/, pressed: true })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add to prayer list' }))
    expect(screen.getByText('Strength for my friend Daniel')).toBeInTheDocument()
    expect(screen.getByText('6 Active')).toBeInTheDocument()
  })

  it('discard closes without adding', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.queryByText('NEW PRAYER REQUEST')).not.toBeInTheDocument()
    expect(screen.getByText('5 Active')).toBeInTheDocument()
  })

  it('manually picking a chip overrides auto-categorization', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    await userEvent.type(screen.getByPlaceholderText('What would you like to pray for?'), 'hello')
    await userEvent.click(screen.getByRole('button', { name: /Church/ }))
    await userEvent.type(screen.getByPlaceholderText('What would you like to pray for?'), ' my friend')
    expect(screen.getByRole('button', { name: /Church/, pressed: true })).toBeInTheDocument()
  })
})

describe('VoiceOverlay — listening flow', () => {
  it('transcribes, reviews, and adds the prayer', async () => {
    ;(window as Record<string, unknown>).SpeechRecognition = FakeRec
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    expect(screen.getByText('LISTENING…')).toBeInTheDocument()

    act(() => {
      FakeRec.instance!.onresult!({ results: [[{ transcript: 'Please heal my mom' }]] })
    })
    expect(screen.getByText(/Please heal my mom/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Stop listening' }))
    expect(screen.getByText('NEW PRAYER REQUEST')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('What would you like to pray for?')).toHaveValue('Please heal my mom')
    // 'heal' → Health
    expect(screen.getByRole('button', { name: /Health/, pressed: true })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add to prayer list' }))
    expect(screen.getByText('Please heal my mom')).toBeInTheDocument()
  })

  it('falls back to review when the mic errors', async () => {
    ;(window as Record<string, unknown>).SpeechRecognition = FakeRec
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
    act(() => { FakeRec.instance!.onerror!({ error: 'not-allowed' }) })
    expect(screen.getByText('NEW PRAYER REQUEST')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/voice/VoiceOverlay.test.tsx`
Expected: FAIL — stub overlay renders nothing.

- [ ] **Step 3: Replace src/voice/VoiceOverlay.tsx**

```tsx
import { useEffect, useRef, useState } from 'react'
import type { Category } from '../store/types'
import { useStore } from '../store/StoreContext'
import { CATEGORIES, catColor } from '../store/categories'
import { useSpeech } from './useSpeech'
import { categorize } from './categorize'

const EQ_BARS = [
  { delay: 0, color: 'oklch(0.65 0.12 248)' },
  { delay: 0.12, color: 'oklch(0.62 0.13 254)' },
  { delay: 0.24, color: 'oklch(0.6 0.14 260)' },
  { delay: 0.36, color: 'oklch(0.62 0.13 254)' },
  { delay: 0.48, color: 'oklch(0.65 0.12 248)' },
]

export function VoiceOverlay({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore()
  const speech = useSpeech()
  const [stage, setStage] = useState<'listening' | 'review'>(speech.supported ? 'listening' : 'review')
  const [text, setText] = useState('')
  const [category, setCategory] = useState<Category>('Guidance')
  const [picked, setPicked] = useState(false)
  const startedRef = useRef(false)

  // start listening once on mount (guarded for StrictMode double-invoke)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (speech.supported) speech.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // mic error while listening → drop to review with whatever transcript we have
  useEffect(() => {
    if (stage === 'listening' && speech.error) {
      setText(speech.transcript.trim())
      setStage('review')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.error])

  // auto-categorize until the user picks a chip manually
  useEffect(() => {
    if (!picked) setCategory(categorize(text))
  }, [text, picked])

  function finishListening() {
    speech.stop()
    setText(speech.transcript.trim())
    setStage('review')
  }

  function add() {
    const t = text.trim()
    if (!t) return
    dispatch({ type: 'ADD_PRAYER', id: crypto.randomUUID(), text: t, category })
    onClose()
  }

  function close() {
    speech.stop()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-[430px] bg-[oklch(0.22_0.05_258_/_.55)] backdrop-blur-[6px] flex items-end animate-fade-up">
      <button aria-label="Close" onClick={close} className="absolute inset-0 cursor-default" />
      <div className="relative w-full bg-[oklch(0.99_0.006_235)] rounded-t-[32px] px-[22px] pt-[22px] pb-[max(30px,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_oklch(0.3_0.08_258_/_.4)] animate-fade-up">
        <div className="w-10 h-1 rounded bg-[oklch(0.86_0.02_245)] mx-auto mb-5" />

        {stage === 'listening' ? (
          <>
            <div className="text-center text-[13px] font-bold text-[oklch(0.58_0.1_248)] tracking-[.03em] mb-1.5">
              LISTENING…
            </div>
            <div className="text-center text-base text-[oklch(0.35_0.03_255)] min-h-12 leading-[1.4] px-1.5">
              {speech.transcript}
              <span className="animate-caret text-[oklch(0.6_0.12_248)] font-bold">|</span>
            </div>
            <div className="flex items-center justify-center gap-[5px] h-14 mt-3.5 mb-5">
              {EQ_BARS.map((b, i) => (
                <span
                  key={i}
                  className="w-1.5 h-full rounded-md animate-eq"
                  style={{ background: b.color, animationDelay: `${b.delay}s` }}
                />
              ))}
            </div>
            <div className="flex justify-center">
              <button
                onClick={finishListening}
                aria-label="Stop listening"
                className="relative w-[74px] h-[74px] rounded-full bg-[oklch(0.62_0.14_255)] flex items-center justify-center shadow-[0_10px_26px_-6px_oklch(0.55_0.15_255_/_.7)]"
              >
                <span className="absolute inset-0 rounded-full bg-[oklch(0.62_0.14_255)] animate-pulse-ring" />
                <span className="relative w-[22px] h-[22px] bg-white rounded-md" />
              </button>
            </div>
            <div className="text-center text-[12.5px] text-[oklch(0.58_0.03_250)] mt-3.5">Tap to stop</div>
          </>
        ) : (
          <>
            <div className="text-xs font-bold text-[oklch(0.58_0.1_248)] tracking-[.04em] mb-2.5">
              NEW PRAYER REQUEST
            </div>
            <div className="bg-white border border-[oklch(0.9_0.015_240)] rounded-lg p-4 mb-4">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="What would you like to pray for?"
                rows={3}
                autoFocus
                className="w-full resize-none outline-none text-[19px] leading-[1.35] text-[oklch(0.28_0.04_255)] placeholder:text-[oklch(0.7_0.02_250)] bg-transparent"
              />
            </div>
            <div className="text-[12.5px] font-bold text-[oklch(0.5_0.03_255)] mb-2.5">Suggested category</div>
            <div className="flex flex-wrap gap-2 mb-[22px]">
              {CATEGORIES.map(name => {
                const active = name === category
                const c = catColor(name)
                return (
                  <button
                    key={name}
                    aria-pressed={active}
                    onClick={() => { setCategory(name); setPicked(true) }}
                    className="inline-flex items-center text-[13px] font-bold px-[13px] py-2 rounded-md transition-all"
                    style={active ? { background: c.fg, color: '#fff' } : { background: c.bg, color: c.fg }}
                  >
                    <span
                      className="w-[7px] h-[7px] rounded-full mr-[7px] inline-block"
                      style={{ background: active ? '#fff' : c.dot }}
                    />
                    {name}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={close}
                className="flex-none px-5 py-3.5 rounded-2xl bg-[oklch(0.95_0.01_245)] text-[oklch(0.5_0.03_255)] font-bold text-sm"
              >
                Discard
              </button>
              <button
                onClick={add}
                disabled={!text.trim()}
                className="flex-1 text-center py-3.5 rounded-2xl bg-[linear-gradient(140deg,oklch(0.64_0.13_250),oklch(0.58_0.15_264))] text-white font-bold text-sm shadow-[0_10px_22px_-8px_oklch(0.55_0.15_255_/_.7)] disabled:opacity-50"
              >
                Add to prayer list
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/voice/VoiceOverlay.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: ALL tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/voice
git commit -m "feat: voice overlay with listening/review stages and typed fallback"
```

---

### Task 14: PWA icons, build, final verification

**Files:**
- Create: `scripts/icons.mjs`
- Create (generated): `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/apple-touch-icon.png`

- [ ] **Step 1: Create scripts/icons.mjs**

```js
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

// Mic glyph on the app's blue gradient (hex approximations of the oklch FAB gradient)
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5f8fd9"/>
      <stop offset="1" stop-color="#4a68c9"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <g transform="translate(256,244) scale(11)" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none">
    <rect x="-3" y="-14" width="6" height="11" rx="3" fill="#fff" stroke="none"/>
    <path d="M-7 -5.5a7 7 0 0 0 14 0"/>
    <line x1="0" y1="1.5" x2="0" y2="5.5"/>
    <line x1="-3.5" y1="5.5" x2="3.5" y2="5.5"/>
  </g>
</svg>`)

await mkdir('public', { recursive: true })
for (const [size, name] of [
  [192, 'pwa-192x192.png'],
  [512, 'pwa-512x512.png'],
  [180, 'apple-touch-icon.png'],
]) {
  await sharp(svg).resize(size, size).png().toFile(`public/${name}`)
  console.log(`wrote public/${name}`)
}
```

- [ ] **Step 2: Generate icons**

Run: `npm run icons`
Expected: three "wrote public/..." lines; PNG files exist in `public/`.

- [ ] **Step 3: Full test suite + production build**

Run: `npm test`
Expected: ALL tests pass.

Run: `npm run build`
Expected: exits 0; `dist/` contains `manifest.webmanifest`, `sw.js`, and the icon PNGs.

- [ ] **Step 4: Manual smoke test**

Run: `npm run preview` and open http://localhost:4173 in a browser.
Verify:
- Home shows greeting, streak card, 5 prayers; checking a box animates the ✓ and bumps "N of 5 lifted today"
- "Answered" button moves a prayer to the Answered screen ("answered just now")
- Groups → Morning Grace → Pray toggle works
- Mic FAB opens the voice sheet (listening in Chrome; typed fallback elsewhere); adding lands the prayer at the top of Home
- Reload the page — state persists

- [ ] **Step 5: Commit**

```bash
git add scripts public
git commit -m "feat: PWA icons and final build verification"
```

---

## Verification checklist (spec → task)

| Spec requirement | Task |
|---|---|
| Vite + React + TS + Tailwind v4 + PWA toolchain | 1 |
| Types, category hues, avatar colors | 2 |
| Greeting/date/relative time | 3 |
| Keyword auto-categorization | 4 |
| Seed data, localStorage, corrupt reseed, daily rollover | 5 |
| togglePrayed streak math, app streak, markAnswered, addPrayer, feed pray | 6 |
| Store provider + persistence effect | 7 |
| Home screen (streak card, prayer rows, check animation) | 8 |
| Answered screen | 9 |
| Groups + GroupDetail with pray toggles | 10 |
| Reminders placeholder, bottom nav, FAB, app shell, full-viewport layout | 11 |
| Web Speech API hook with capability detection | 12 |
| Voice overlay: listening/review, typed fallback, chips, discard/add | 13 |
| PWA manifest/icons, production build, manual smoke test | 14 |
