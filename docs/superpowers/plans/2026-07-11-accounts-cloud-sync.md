# Accounts & Cloud Sync with Prayer History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google sign-in, per-user data in Supabase (prayers, per-day prayer logs, custom categories), derived streaks/history, and a prayer-detail page with a month calendar.

**Architecture:** The reducer stays the pure, optimistic source of UI truth. A `src/sync/` layer maps data-changing actions to Supabase writes (fire-and-forget, one retry). Streaks/prayed-today/day-counts are all derived from an append-only `prayer_logs` event table by pure helpers. Categories are per-user rows (`{id, name, hue}`), seeded with 8 defaults at signup. Groups/feeds remain local demo data (stage 2).

**Tech Stack:** React 19, Vite, vitest + Testing Library, Supabase (`@supabase/supabase-js`), Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-07-09-accounts-cloud-sync-design.md`

**Ground rules for the executor:**
- TDD every code task: write the failing test, run it (expect FAIL), implement, run again (expect PASS), commit. Test commands are `npx vitest run <file>`.
- `npx vitest run` (whole suite) must be green at the end of every task. `npm run build` (includes `tsc --noEmit`) is only expected green from Task 4 onward — Tasks 3–4 change the type model and are one atomic type migration; do not stop at a `tsc` error between them.
- Commit messages: conventional commits, no Claude attribution.

## File structure

```
supabase/schema.sql                 create  — tables, RLS, signup trigger
.env.example                        create  — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
src/lib/history.ts(.test.ts)        create  — pure derived-value helpers over logs
src/lib/supabase.ts                 create  — supabase client singleton
src/auth/useSession.ts(.test.tsx)   create  — auth session hook
src/auth/SignIn.tsx(.test.tsx)      create  — sign-in screen
src/sync/mapper.ts(.test.ts)        create  — action → Supabase writes; row↔state mapping
src/sync/hydrate.ts(.test.ts)       create  — fetchAll + one-time local import
src/screens/PrayerDetail.tsx(.test.tsx) create — history page with calendar
src/store/types.ts                  modify — Category entity, Prayer.categoryId/answeredAt, PrayerLog, new AppState
src/store/categories.ts             modify — catColor(hue), nextHue, DEFAULT_CATEGORIES
src/store/reducer.ts                modify — new actions, log-based TOGGLE_PRAYED, HYDRATE
src/store/persistence.ts            modify — per-user cache, no daily reset, demo groups only
src/store/StoreContext.tsx          modify — userId-scoped, hydration, write-through dispatch
src/App.tsx                         modify — auth gate, prayerDetail route
src/components/{CategoryTag,CategoryFilter,PrayerRow,StreakCard}.tsx  modify — entity categories, derived values
src/screens/{Home,Answered}.tsx     modify — derived values, tap-to-open detail
src/voice/{categorize.ts,VoiceOverlay.tsx} modify — name-based suggestion, dynamic chips, "+ New"
src/test/fixtures.ts                modify — new state shape
```

---

### Task 1: Supabase schema, env example, dependency

**Files:**
- Create: `supabase/schema.sql`
- Create: `.env.example`
- Modify: `package.json` (dependency), `.gitignore` (ensure `.env.local`)

No unit tests (SQL/config). The SQL is executed by the user in the Supabase dashboard (Task 12 checklist).

- [ ] **Step 1: Install the client library**

Run: `npm i @supabase/supabase-js`

- [ ] **Step 2: Write `supabase/schema.sql`**

```sql
-- Run this in the Supabase SQL editor (or `supabase db push`).

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  initials   text not null,
  created_at timestamptz not null default now()
);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  hue        smallint not null check (hue between 0 and 360),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.prayers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  text        text not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  answered_at timestamptz,
  created_at  timestamptz not null default now()
);

create table public.prayer_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  prayer_id  uuid not null references public.prayers(id) on delete cascade,
  prayed_on  date not null,
  created_at timestamptz not null default now(),
  unique (prayer_id, prayed_on)
);

create index prayers_user_idx on public.prayers(user_id);
create index prayer_logs_user_idx on public.prayer_logs(user_id);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.prayers enable row level security;
alter table public.prayer_logs enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own categories" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own prayers" on public.prayers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own logs" on public.prayer_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Signup: create profile from Google metadata and seed the 8 default categories.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  full_name text := coalesce(new.raw_user_meta_data ->> 'full_name', 'Friend');
begin
  insert into public.profiles (id, name, initials)
  values (
    new.id,
    split_part(full_name, ' ', 1),
    upper(left(split_part(full_name, ' ', 1), 1) ||
          coalesce(left(split_part(full_name, ' ', 2), 1), ''))
  );
  insert into public.categories (user_id, name, hue) values
    (new.id, 'Health', 12), (new.id, 'Family', 300), (new.id, 'Gratitude', 150),
    (new.id, 'Guidance', 258), (new.id, 'Provision', 55), (new.id, 'Friends', 210),
    (new.id, 'Work', 30), (new.id, 'Church', 285);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 3: Write `.env.example`**

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

- [ ] **Step 4: Ensure `.gitignore` covers env files**

Check `.gitignore` contains `.env.local` (Vite scaffold usually has `*.local`). Add `.env.local` if missing.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql .env.example package.json package-lock.json .gitignore
git commit -m "feat: supabase schema, env template, supabase-js dependency"
```

---

### Task 2: Pure history helpers (`src/lib/history.ts`)

Everything the UI derives from the log lives here. Self-contained — defines its own minimal input type so it doesn't depend on the (not yet migrated) store types.

**Files:**
- Create: `src/lib/history.ts`
- Test: `src/lib/history.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/history.test.ts
import { prayedToday, streak, daysPrayed, appStreak, monthMarks, prevDay } from './history'

const L = (prayerId: string, prayedOn: string) => ({ id: `${prayerId}-${prayedOn}`, prayerId, prayedOn })
const today = '2026-07-11'

describe('prevDay', () => {
  it('steps back one day across month boundaries', () => {
    expect(prevDay('2026-07-11')).toBe('2026-07-10')
    expect(prevDay('2026-07-01')).toBe('2026-06-30')
    expect(prevDay('2026-01-01')).toBe('2025-12-31')
  })
})

describe('prayedToday', () => {
  it('true only when a log row exists for today', () => {
    const logs = [L('p1', today), L('p2', '2026-07-10')]
    expect(prayedToday(logs, 'p1', today)).toBe(true)
    expect(prayedToday(logs, 'p2', today)).toBe(false)
  })
})

describe('streak', () => {
  it('counts consecutive days ending today', () => {
    const logs = [L('p1', today), L('p1', '2026-07-10'), L('p1', '2026-07-09')]
    expect(streak(logs, 'p1', today)).toBe(3)
  })
  it('still alive when the run ends yesterday', () => {
    const logs = [L('p1', '2026-07-10'), L('p1', '2026-07-09')]
    expect(streak(logs, 'p1', today)).toBe(2)
  })
  it('zero when the run ends before yesterday or log is empty', () => {
    expect(streak([L('p1', '2026-07-08')], 'p1', today)).toBe(0)
    expect(streak([], 'p1', today)).toBe(0)
  })
  it('breaks at a gap', () => {
    const logs = [L('p1', today), L('p1', '2026-07-09')]
    expect(streak(logs, 'p1', today)).toBe(1)
  })
})

describe('daysPrayed', () => {
  it('counts all rows for the prayer', () => {
    const logs = [L('p1', today), L('p1', '2026-07-01'), L('p2', today)]
    expect(daysPrayed(logs, 'p1')).toBe(2)
  })
})

describe('appStreak', () => {
  it('walks distinct dates across all prayers', () => {
    const logs = [L('p1', today), L('p2', today), L('p2', '2026-07-10')]
    expect(appStreak(logs, today)).toBe(2)
  })
  it('zero when nothing today or yesterday', () => {
    expect(appStreak([L('p1', '2026-07-08')], today)).toBe(0)
  })
})

describe('monthMarks', () => {
  it('returns day-of-month numbers for the given prayer and month', () => {
    const logs = [L('p1', '2026-07-11'), L('p1', '2026-07-01'), L('p1', '2026-06-30'), L('p2', '2026-07-05')]
    expect([...monthMarks(logs, 'p1', 2026, 7)].sort((a, b) => a - b)).toEqual([1, 11])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/history.test.ts`
Expected: FAIL — `Cannot find module './history'`

- [ ] **Step 3: Implement `src/lib/history.ts`**

```ts
export interface LogEntry {
  id: string
  prayerId: string
  prayedOn: string // YYYY-MM-DD
}

export function prevDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() - 1)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function runLength(dates: Set<string>, today: string): number {
  let cursor = dates.has(today) ? today : prevDay(today)
  if (!dates.has(cursor)) return 0
  let count = 0
  while (dates.has(cursor)) {
    count++
    cursor = prevDay(cursor)
  }
  return count
}

export function prayedToday(logs: LogEntry[], prayerId: string, today: string): boolean {
  return logs.some(l => l.prayerId === prayerId && l.prayedOn === today)
}

export function streak(logs: LogEntry[], prayerId: string, today: string): number {
  return runLength(new Set(logs.filter(l => l.prayerId === prayerId).map(l => l.prayedOn)), today)
}

export function daysPrayed(logs: LogEntry[], prayerId: string): number {
  return logs.filter(l => l.prayerId === prayerId).length
}

export function appStreak(logs: LogEntry[], today: string): number {
  return runLength(new Set(logs.map(l => l.prayedOn)), today)
}

export function monthMarks(logs: LogEntry[], prayerId: string, year: number, month: number): Set<number> {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  return new Set(
    logs
      .filter(l => l.prayerId === prayerId && l.prayedOn.startsWith(prefix))
      .map(l => Number(l.prayedOn.slice(8)))
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/history.test.ts`
Expected: PASS (all)

- [ ] **Step 5: Commit**

```bash
git add src/lib/history.ts src/lib/history.test.ts
git commit -m "feat: pure history helpers deriving streaks and calendar marks from logs"
```

---

### Task 3: Category color/hue helpers (`src/store/categories.ts`)

`catColor` switches from name-keyed to hue-based; add `nextHue` (auto-color for new categories) and `DEFAULT_CATEGORIES`. Keep `CATEGORY_HUES`/`CATEGORIES` exports temporarily — Task 4 deletes them with their last consumers.

**Files:**
- Modify: `src/store/categories.ts`
- Test: `src/store/categories.test.ts` (extend; keep existing avColor tests)

- [ ] **Step 1: Add failing tests** (append to `src/store/categories.test.ts`; keep existing tests, but replace any `catColor('Health')`-style call with `catColor(12)`)

```ts
import { catColor, nextHue, DEFAULT_CATEGORIES } from './categories'

describe('catColor (hue-based)', () => {
  it('builds the oklch trio from a hue number', () => {
    expect(catColor(12)).toEqual({
      fg: 'oklch(0.5 0.13 12)',
      bg: 'oklch(0.95 0.045 12)',
      dot: 'oklch(0.62 0.15 12)',
    })
  })
})

describe('DEFAULT_CATEGORIES', () => {
  it('lists the 8 defaults with their hues', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(8)
    expect(DEFAULT_CATEGORIES).toContainEqual({ name: 'Health', hue: 12 })
    expect(DEFAULT_CATEGORIES).toContainEqual({ name: 'Church', hue: 285 })
  })
})

describe('nextHue', () => {
  it('picks the candidate hue farthest from all existing hues', () => {
    // candidates are every 15°; with only hue 0 taken, 180 is farthest
    expect(nextHue([0])).toBe(180)
  })
  it('works on the full default set (returns a number 0-359 not in use)', () => {
    const used = DEFAULT_CATEGORIES.map(c => c.hue)
    const h = nextHue(used)
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThan(360)
    expect(used).not.toContain(h)
  })
  it('handles empty input', () => {
    expect(nextHue([])).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/store/categories.test.ts`
Expected: FAIL — `catColor` gets a number (produces NaN-based strings), `nextHue`/`DEFAULT_CATEGORIES` not exported

- [ ] **Step 3: Implement in `src/store/categories.ts`** (replace `catColor`; keep `CATEGORY_HUES`, `CATEGORIES`, `AVATAR_COLORS`, `avColor` as-is for now)

```ts
export const DEFAULT_CATEGORIES: { name: string; hue: number }[] = [
  { name: 'Health', hue: 12 },
  { name: 'Family', hue: 300 },
  { name: 'Gratitude', hue: 150 },
  { name: 'Guidance', hue: 258 },
  { name: 'Provision', hue: 55 },
  { name: 'Friends', hue: 210 },
  { name: 'Work', hue: 30 },
  { name: 'Church', hue: 285 },
]

export function catColor(hue: number) {
  return {
    fg: `oklch(0.5 0.13 ${hue})`,
    bg: `oklch(0.95 0.045 ${hue})`,
    dot: `oklch(0.62 0.15 ${hue})`,
  }
}

/** Hue (multiple of 15°) with the greatest circular distance to every hue in use. */
export function nextHue(used: number[]): number {
  if (used.length === 0) return 0
  let best = 0
  let bestDist = -1
  for (let h = 0; h < 360; h += 15) {
    const dist = Math.min(...used.map(u => {
      const d = Math.abs(h - u) % 360
      return Math.min(d, 360 - d)
    }))
    if (dist > bestDist) {
      bestDist = dist
      best = h
    }
  }
  return best
}
```

While here, update `catColor`'s existing callers minimally so the suite stays green: `CategoryTag` and `CategoryFilter` currently call `catColor(category)` with a name. Interim shim inside each callsite: `catColor(CATEGORY_HUES[category])`. (Task 4 replaces these properly.) Same for `VoiceOverlay`: `catColor(CATEGORY_HUES[name])`.

- [ ] **Step 4: Run the whole suite**

Run: `npx vitest run`
Expected: PASS (all files)

- [ ] **Step 5: Commit**

```bash
git add src/store/categories.ts src/store/categories.test.ts src/components/CategoryTag.tsx src/components/CategoryFilter.tsx src/voice/VoiceOverlay.tsx
git commit -m "feat: hue-based category colors, nextHue picker, DEFAULT_CATEGORIES"
```

---

### Task 4: Data-model switchover (types, reducer, fixtures, components, screens)

The atomic migration. `Category` becomes an entity; prayers hold `categoryId` and `answeredAt`; logs replace `prayedToday`/`streak`/`appStreak`; answered merges into `prayers`. Every consumer updates in this task. `npm run build` must pass at the end.

**Files:**
- Modify: `src/store/types.ts`, `src/store/reducer.ts`, `src/test/fixtures.ts`, `src/store/reducer.test.ts`
- Modify: `src/components/{CategoryTag,CategoryFilter,PrayerRow,StreakCard}.tsx`, `src/screens/{Home,Answered}.tsx`, `src/voice/{categorize.ts,categorize.test.ts,VoiceOverlay.tsx}`
- Modify (minimal compile fixes only): `src/store/persistence.ts`, screen tests — fully reworked in Tasks 5–6

- [ ] **Step 1: Write the new `src/store/types.ts`**

```ts
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
```

Deleted: `AnsweredPrayer`, `AppStreak`, `lastVisitDate`, `prayedToday`, `streak`.

- [ ] **Step 2: Rewrite `src/test/fixtures.ts` in the new shape**

```ts
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
```

- [ ] **Step 3: Rewrite `src/store/reducer.test.ts` (failing against the old reducer)**

```ts
import { reducer } from './reducer'
import { demoState, demoCategories, catId } from '../test/fixtures'
import { prayedToday, streak } from '../lib/history'

const now = 1_780_000_000_000
const today = '2026-07-05'
const base = () => demoState(now, today)

describe('NAVIGATE / OPEN_GROUP / OPEN_PRAYER', () => {
  it('navigates between screens', () => {
    const s = reducer(base(), { type: 'NAVIGATE', screen: 'answered' })
    expect(s.screen).toBe('answered')
  })
  it('opens a group detail', () => {
    const s = reducer(base(), { type: 'OPEN_GROUP', groupId: 'g2' })
    expect(s.screen).toBe('groupDetail')
    expect(s.activeGroupId).toBe('g2')
  })
  it('opens a prayer detail', () => {
    const s = reducer(base(), { type: 'OPEN_PRAYER', id: 'p1' })
    expect(s.screen).toBe('prayerDetail')
    expect(s.activePrayerId).toBe('p1')
  })
})

describe('TOGGLE_PRAYED (log-based)', () => {
  it('checking inserts a log row for today with the given id', () => {
    const s = reducer(base(), { type: 'TOGGLE_PRAYED', id: 'p1', today, logId: 'log-x' })
    expect(s.logs).toContainEqual({ id: 'log-x', prayerId: 'p1', prayedOn: today })
    expect(prayedToday(s.logs, 'p1', today)).toBe(true)
    expect(streak(s.logs, 'p1', today)).toBe(7) // 6 ending yesterday + today
  })
  it('unchecking removes today’s log row', () => {
    let s = reducer(base(), { type: 'TOGGLE_PRAYED', id: 'p1', today, logId: 'log-x' })
    s = reducer(s, { type: 'TOGGLE_PRAYED', id: 'p1', today, logId: 'log-y' })
    expect(prayedToday(s.logs, 'p1', today)).toBe(false)
    expect(streak(s.logs, 'p1', today)).toBe(6)
  })
  it('is a no-op for unknown prayer ids', () => {
    const s = reducer(base(), { type: 'TOGGLE_PRAYED', id: 'nope', today, logId: 'log-x' })
    expect(s).toEqual(base())
  })
})

describe('MARK_ANSWERED / UNDO_ANSWERED', () => {
  it('sets answeredAt, keeping the prayer and its logs', () => {
    const s = reducer(base(), { type: 'MARK_ANSWERED', id: 'p2', now })
    const p = s.prayers.find(x => x.id === 'p2')!
    expect(p.answeredAt).toBe(now)
    expect(s.logs.filter(l => l.prayerId === 'p2')).toHaveLength(3) // history untouched
  })
  it('undo clears answeredAt', () => {
    let s = reducer(base(), { type: 'MARK_ANSWERED', id: 'p2', now })
    s = reducer(s, { type: 'UNDO_ANSWERED', id: 'p2' })
    expect(s.prayers.find(x => x.id === 'p2')!.answeredAt).toBeNull()
  })
  it('ignores unknown ids', () => {
    expect(reducer(base(), { type: 'MARK_ANSWERED', id: 'nope', now })).toEqual(base())
    expect(reducer(base(), { type: 'UNDO_ANSWERED', id: 'nope' })).toEqual(base())
  })
})

describe('ADD_PRAYER', () => {
  it('prepends a new prayer and returns home', () => {
    const s0 = reducer(base(), { type: 'NAVIGATE', screen: 'groups' })
    const s = reducer(s0, { type: 'ADD_PRAYER', id: 'x1', text: 'New request', categoryId: catId('Friends'), now })
    expect(s.prayers[0]).toEqual({ id: 'x1', text: 'New request', categoryId: catId('Friends'), answeredAt: null, createdAt: now })
    expect(s.screen).toBe('home')
  })
})

describe('ADD_CATEGORY', () => {
  it('appends a category', () => {
    const s = reducer(base(), { type: 'ADD_CATEGORY', id: 'c9', name: 'Missions', hue: 180 })
    expect(s.categories).toContainEqual({ id: 'c9', name: 'Missions', hue: 180 })
  })
})

describe('HYDRATE / SYNC_ERROR', () => {
  it('replaces synced slices, leaves local-only slices alone', () => {
    const s0 = base()
    const s = reducer(s0, {
      type: 'HYDRATE',
      data: { prayers: [], logs: [], categories: demoCategories, profile: { name: 'B', initials: 'B' } },
    })
    expect(s.prayers).toEqual([])
    expect(s.profile.name).toBe('B')
    expect(s.groups).toEqual(s0.groups) // demo groups untouched
    expect(s.screen).toBe(s0.screen)
  })
  it('sets and clears the sync error flag', () => {
    let s = reducer(base(), { type: 'SYNC_ERROR', failed: true })
    expect(s.syncError).toBe(true)
    s = reducer(s, { type: 'SYNC_ERROR', failed: false })
    expect(s.syncError).toBe(false)
  })
})

describe('TOGGLE_FEED_PRAY', () => {
  it('toggles on: increments count', () => {
    const s = reducer(base(), { type: 'TOGGLE_FEED_PRAY', groupId: 'g1', feedId: 'f1' })
    const f = s.feeds.g1.find(f => f.id === 'f1')!
    expect(f.prayed).toBe(true)
    expect(f.praying).toBe(13)
  })
})
```

- [ ] **Step 4: Run to verify failure**

Run: `npx vitest run src/store/reducer.test.ts`
Expected: FAIL — type/shape mismatches and unknown action types

- [ ] **Step 5: Rewrite `src/store/reducer.ts`**

```ts
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
```

`displayStreak` is deleted — `appStreak` from `src/lib/history.ts` replaces it.

- [ ] **Step 6: Run reducer tests**

Run: `npx vitest run src/store/reducer.test.ts`
Expected: PASS

- [ ] **Step 7: Update components and screens to the new model**

`src/components/CategoryTag.tsx` — takes the entity:

```tsx
import type { Category } from '../store/types'
import { catColor } from '../store/categories'

export function CategoryTag({ category }: { category: Category | undefined }) {
  if (!category) return null
  const c = catColor(category.hue)
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-[.09em] uppercase"
      style={{ color: c.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {category.name}
    </span>
  )
}
```

`src/components/CategoryFilter.tsx` — items carry `categoryId`; helpers resolve entities:

```tsx
import type { Category } from '../store/types'
import { catColor } from '../store/categories'

/** Distinct categories present in a list, alphabetically by name. */
export function presentCategories<T extends { categoryId: string }>(items: T[], categories: Category[]): Category[] {
  const ids = new Set(items.map(i => i.categoryId))
  return categories.filter(c => ids.has(c.id)).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Empty selection = no filter. Never reorders. Selected ids no longer present
 * in the list are ignored, so a filter can't strand the user on an
 * unexplained empty list when its last item moves away.
 */
export function filterByCategories<T extends { categoryId: string }>(items: T[], selectedIds: string[]): T[] {
  const active = selectedIds.filter(id => items.some(i => i.categoryId === id))
  return active.length ? items.filter(i => active.includes(i.categoryId)) : items
}

export function CategoryFilter({
  categories,
  selected,
  onToggle,
}: {
  categories: Category[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  if (categories.length === 0) return null
  return (
    <div
      className="flex gap-1.5 overflow-x-auto -mx-5 px-5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Filter by category"
    >
      {categories.map(c => {
        const col = catColor(c.hue)
        const active = selected.includes(c.id)
        return (
          <button
            key={c.id}
            onClick={() => onToggle(c.id)}
            aria-pressed={active}
            className="flex-none inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-[.09em] uppercase px-[11px] py-[7px] rounded-full"
            style={active ? { color: 'white', background: col.dot } : { color: col.fg, background: col.bg }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? 'white' : col.dot }} />
            {c.name}
          </button>
        )
      })}
    </div>
  )
}
```

`src/components/PrayerRow.tsx` — derives from logs; prayer text opens detail:

```tsx
import type { Prayer } from '../store/types'
import { useStore } from '../store/StoreContext'
import { CategoryTag } from './CategoryTag'
import { prayedToday, streak } from '../lib/history'
import { todayStr } from '../lib/time'

export function PrayerRow({ prayer, first }: { prayer: Prayer; first: boolean }) {
  const { state, dispatch } = useStore()
  const today = todayStr()
  const prayed = prayedToday(state.logs, prayer.id, today)
  const days = streak(state.logs, prayer.id, today)
  const category = state.categories.find(c => c.id === prayer.categoryId)
  return (
    <div className={`flex gap-[13px] items-start py-[15px] ${first ? '' : 'border-t border-[oklch(0.88_0.018_245)]'}`}>
      <button
        aria-label={`Mark "${prayer.text}" as prayed`}
        aria-pressed={prayed}
        onClick={() => dispatch({ type: 'TOGGLE_PRAYED', id: prayer.id, today, logId: crypto.randomUUID() })}
        className={`w-6 h-6 flex-none mt-0.5 rounded-[5px] flex items-center justify-center transition-all ${
          prayed
            ? 'bg-[oklch(0.62_0.13_250)] border border-[oklch(0.62_0.13_250)]'
            : 'bg-white border-2 border-[oklch(0.85_0.03_245)]'
        }`}
      >
        {prayed && <span className="text-white text-xs font-extrabold animate-check-pop">✓</span>}
      </button>
      <button
        onClick={() => dispatch({ type: 'OPEN_PRAYER', id: prayer.id })}
        className="flex-1 min-w-0 text-left"
        aria-label={`View history for "${prayer.text}"`}
      >
        <div className="text-[17px] font-medium leading-[1.28] text-[oklch(0.23_0.03_258)]">{prayer.text}</div>
        <div className="flex items-center gap-[9px] mt-2">
          <CategoryTag category={category} />
          {days > 0 && (
            <span className="text-[10px] font-bold tracking-[.06em] text-[oklch(0.6_0.06_250)] whitespace-nowrap">
              · {days}D
            </span>
          )}
        </div>
      </button>
      <button
        aria-label={`Mark "${prayer.text}" as answered`}
        onClick={() => dispatch({ type: 'MARK_ANSWERED', id: prayer.id, now: Date.now() })}
        className="flex-none text-[9.5px] font-bold tracking-[.07em] uppercase text-[oklch(0.5_0.1_155)] border border-[oklch(0.82_0.06_155)] px-[9px] py-1.5 rounded whitespace-nowrap"
      >
        Answered
      </button>
    </div>
  )
}
```

`src/components/StreakCard.tsx`:

```tsx
import { useStore } from '../store/StoreContext'
import { appStreak, prayedToday } from '../lib/history'
import { todayStr } from '../lib/time'

export function StreakCard() {
  const { state } = useStore()
  const today = todayStr()
  const count = appStreak(state.logs, today)
  const active = state.prayers.filter(p => p.answeredAt === null)
  const prayed = active.filter(p => prayedToday(state.logs, p.id, today)).length
  return (
    /* keep the exact existing JSX, replacing:
       {count}-day streak            → unchanged variable name
       {prayed} of {state.prayers.length} → {prayed} of {active.length} */
  )
}
```

(Keep the existing JSX markup byte-for-byte; only the two computed variables and the denominator change.)

`src/screens/Home.tsx` — active prayers only, id-based filter:

```tsx
import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { StreakCard } from '../components/StreakCard'
import { PrayerRow } from '../components/PrayerRow'
import { CategoryFilter, presentCategories, filterByCategories } from '../components/CategoryFilter'
import { greeting, dateLine } from '../lib/time'

export function Home() {
  const { state } = useStore()
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const toggleCat = (id: string) =>
    setSelectedCats(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  const active = state.prayers.filter(p => p.answeredAt === null)
  const prayers = filterByCategories(active, selectedCats)
  /* JSX unchanged except:
     - "{state.prayers.length} Active" → "{active.length} Active"
     - empty check: state.prayers.length === 0 → active.length === 0
     - <CategoryFilter categories={presentCategories(active, state.categories)} selected={selectedCats} onToggle={toggleCat} /> */
}
```

`src/screens/Answered.tsx` — answered = `answeredAt !== null`; text opens detail:

```tsx
import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { CategoryTag } from '../components/CategoryTag'
import { CategoryFilter, presentCategories, filterByCategories } from '../components/CategoryFilter'
import { relTime } from '../lib/time'

export function Answered() {
  const { state, dispatch } = useStore()
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const toggleCat = (id: string) =>
    setSelectedCats(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  const allAnswered = state.prayers
    .filter(p => p.answeredAt !== null)
    .sort((a, b) => b.answeredAt! - a.answeredAt!)
  const answered = filterByCategories(allAnswered, selectedCats)
  const now = Date.now()
  /* JSX as today, with these changes:
     - banner count: {allAnswered.length} prayers answered
     - CategoryFilter categories={presentCategories(allAnswered, state.categories)}
     - card text wrapped in a button:
         <button onClick={() => dispatch({ type: 'OPEN_PRAYER', id: a.id })}
                 className="flex-1 text-left" aria-label={`View history for "${a.text}"`}>
           ...text + tag row...
         </button>
     - <CategoryTag category={state.categories.find(c => c.id === a.categoryId)} />
     - answered time: {relTime(a.answeredAt!, now)}
     - Undo button unchanged (dispatches UNDO_ANSWERED) */
}
```

`src/voice/categorize.ts` — returns a suggested *name* (plain string):

```ts
export function categorize(text: string): string {
  const t = text.toLowerCase()
  if (/chemo|surgery|health|sick|hospital|test|recover|anx|heal/.test(t)) return 'Health'
  if (/thank|grateful|praise|answered|joy/.test(t)) return 'Gratitude'
  if (/job|money|visa|provi|financ|bill|home|apart/.test(t)) return 'Provision'
  if (/mom|dad|family|marriage|brother|sister|kids|son|daughter/.test(t)) return 'Family'
  if (/friend/.test(t)) return 'Friends'
  return 'Guidance'
}
```

(`categorize.test.ts`: only the import of `Category` goes away, if present; assertions stay string-based.)

`src/voice/VoiceOverlay.tsx` — chips from `state.categories`, `categoryId` state, name-match suggestion (the "+ New" chip is Task 6):

```tsx
// replace the CATEGORIES/catColor(name) usage:
const { state, dispatch } = useStore()
const [categoryId, setCategoryId] = useState<string | null>(null)
const [picked, setPicked] = useState(false)

// auto-categorize until the user picks a chip manually
useEffect(() => {
  if (picked) return
  const suggested = categorize(text).toLowerCase()
  const match = state.categories.find(c => c.name.toLowerCase() === suggested)
  setCategoryId(match ? match.id : null)
}, [text, picked, state.categories])

function add() {
  const t = text.trim()
  if (!t || !categoryId) return
  dispatch({ type: 'ADD_PRAYER', id: crypto.randomUUID(), text: t, categoryId, now: Date.now() })
  onClose()
}

// chip list:
{state.categories.map(c => {
  const active = c.id === categoryId
  const col = catColor(c.hue)
  return (
    <button key={c.id} aria-pressed={active}
      onClick={() => { setCategoryId(c.id); setPicked(true) }}
      className="inline-flex items-center text-[13px] font-bold px-[13px] py-2 rounded-md transition-all"
      style={active ? { background: col.fg, color: '#fff' } : { background: col.bg, color: col.fg }}>
      <span className="w-[7px] h-[7px] rounded-full mr-[7px] inline-block"
        style={{ background: active ? '#fff' : col.dot }} />
      {c.name}
    </button>
  )
})}
// "Add to prayer list" button: disabled={!text.trim() || !categoryId}
```

Delete `CATEGORY_HUES` and `CATEGORIES` from `src/store/categories.ts` (last consumers gone) and their test assertions.

- [ ] **Step 8: Interim compile fix for `src/store/persistence.ts`** (full rework is Task 5)

Replace the file body so `tsc` passes; screens no longer call it after StoreContext changes in Task 8, but StoreContext still imports it today:

```ts
import type { AppState } from './types'
import { demoGroups, demoFeeds } from './demo'
export const STORAGE_KEY = 'prayer-app-state-v1' // legacy key, read once by the importer
```

…actually, to keep this task compiling without inventing Task 5 content early, do the minimal edit instead: update `seedState` to return the new `AppState` shape:

```ts
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
```

- [ ] **Step 9: Update screen tests to the fixture-seeding pattern**

`Home.test.tsx`, `Answered.test.tsx`, `Groups.test.tsx`, `StoreContext.test.tsx` already `saveState(demoState(Date.now(), todayStr()))` in `beforeEach` — that still works (new shape passes the new `loadState` guard). Update assertions:
- Streak numbers derive from the fixture logs: p1 shows `· 6D` (ends yesterday), p3 `· 12D`, "1 of 5 prayers lifted today" (only p3 prayed today), streak card `7-day streak` becomes what `appStreak` yields from fixture logs — p3's run is 12 days ending today, so **`12-day streak`**.
- `Home.test.tsx` "toggling a prayer updates the lifted-today count" — unchanged behavior.
- Category filter tests: chips render category *names* — assertions unchanged (`{ name: 'Health' }`).
- `Answered.test.tsx`: answered entries a1–a3 come from `prayers` with `answeredAt`; texts/times unchanged. The undo test asserts the card disappears and banner count drops — unchanged.
- `App.test.tsx`, `VoiceOverlay.test.tsx`: `localStorage.clear()` + empty seed → VoiceOverlay tests need categories to exist to add a prayer. In `VoiceOverlay.test.tsx` `beforeEach`, seed the fixture: `saveState(demoState(Date.now(), todayStr()))` (adds import). "1 Active"/"0 Active" assertions become "6 Active"/"5 Active" (5 fixture actives +1 / unchanged).

- [ ] **Step 10: Run the whole suite and the build**

Run: `npx vitest run` → Expected: PASS (all files)
Run: `npm run build` → Expected: PASS (tsc + vite)

- [ ] **Step 11: Commit**

```bash
git add -A src
git commit -m "feat: log-based data model — entity categories, merged answered, derived streaks"
```

---

### Task 5: Persistence rework — per-user cache + legacy snapshot reader

**Files:**
- Modify: `src/store/persistence.ts`
- Test: `src/store/persistence.test.ts` (rewrite)

- [ ] **Step 1: Write the failing tests (rewrite `src/store/persistence.test.ts`)**

```ts
import { emptyState, loadCache, saveCache, readLegacyState, clearLegacyState, LEGACY_KEY, cacheKey } from './persistence'
import { demoState } from '../test/fixtures'

const now = 1_780_000_000_000
const today = '2026-07-05'

beforeEach(() => localStorage.clear())

describe('emptyState', () => {
  it('starts empty with the demo group and no sync error', () => {
    const s = emptyState()
    expect(s.prayers).toHaveLength(0)
    expect(s.logs).toHaveLength(0)
    expect(s.categories).toHaveLength(0)
    expect(s.groups).toHaveLength(1)
    expect(s.feeds.g1).toHaveLength(3)
    expect(s.syncError).toBe(false)
    expect(s.screen).toBe('home')
  })
})

describe('cache', () => {
  it('round-trips per user', () => {
    saveCache('user-1', demoState(now, today))
    expect(loadCache('user-1')!.prayers).toHaveLength(8)
    expect(loadCache('user-2')).toBeNull()
  })
  it('returns null on corrupt or wrong-shape data', () => {
    localStorage.setItem(cacheKey('user-1'), '{not json')
    expect(loadCache('user-1')).toBeNull()
    localStorage.setItem(cacheKey('user-1'), JSON.stringify({ hello: 1 }))
    expect(loadCache('user-1')).toBeNull()
  })
  it('saveCache swallows storage failures', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveCache('user-1', demoState(now, today))).not.toThrow()
    spy.mockRestore()
  })
})

describe('legacy pre-account state', () => {
  it('reads a v1 snapshot if present', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({
      prayers: [{ id: 'p1', text: 'old', category: 'Health', streak: 4, prayedToday: true }],
      answered: [{ id: 'a1', text: 'done', category: 'Family', answeredAt: 123, streak: 2 }],
      appStreak: { count: 3, lastPrayedDate: today },
    }))
    const legacy = readLegacyState()!
    expect(legacy.prayers[0]).toEqual({ id: 'p1', text: 'old', category: 'Health', streak: 4, prayedToday: true })
    expect(legacy.answered[0].category).toBe('Family')
  })
  it('returns null when absent or malformed', () => {
    expect(readLegacyState()).toBeNull()
    localStorage.setItem(LEGACY_KEY, '{oops')
    expect(readLegacyState()).toBeNull()
  })
  it('clearLegacyState removes the key', () => {
    localStorage.setItem(LEGACY_KEY, '{}')
    clearLegacyState()
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/store/persistence.test.ts`
Expected: FAIL — new exports missing

- [ ] **Step 3: Rewrite `src/store/persistence.ts`**

```ts
import type { AppState } from './types'

export const LEGACY_KEY = 'prayer-app-state-v1'
export const cacheKey = (userId: string) => `prayer-app-cache-v2:${userId}`

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
```

- [ ] **Step 4: Fix the temporary consumers**

`StoreContext.tsx` still imports `loadState`/`saveState` (replaced properly in Task 8). Interim bridge so the suite runs: in `StoreContext.tsx`, change the initializer to `loadCache('local') ?? emptyState()` and the effect to `saveCache('local', state)`. Screen tests that call `saveState(demoState(...))` change to `saveCache('local', demoState(...))` (imports update accordingly: `import { saveCache } from '../store/persistence'`).

`VoiceOverlay.test.tsx`, `Home.test.tsx`, `Answered.test.tsx`, `Groups.test.tsx`, `StoreContext.test.tsx`: same one-line change in `beforeEach`.

- [ ] **Step 5: Run the whole suite + build**

Run: `npx vitest run` → Expected: PASS
Run: `npm run build` → Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: per-user state cache and legacy snapshot reader"
```

---

### Task 6: Prayer detail page with month calendar

**Files:**
- Create: `src/screens/PrayerDetail.tsx`
- Test: `src/screens/PrayerDetail.test.tsx`
- Modify: `src/App.tsx` (route), `src/voice/VoiceOverlay.tsx` ("+ New" chip)

- [ ] **Step 1: Write the failing tests**

```tsx
// src/screens/PrayerDetail.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoreProvider } from '../store/StoreContext'
import { saveCache } from '../store/persistence'
import { demoState } from '../test/fixtures'
import { todayStr } from '../lib/time'
import { PrayerDetail } from './PrayerDetail'

function seeded(activePrayerId: string) {
  const s = demoState(Date.now(), todayStr())
  saveCache('local', { ...s, screen: 'prayerDetail', activePrayerId })
  return render(<StoreProvider><PrayerDetail /></StoreProvider>)
}

beforeEach(() => localStorage.clear())

describe('PrayerDetail', () => {
  it('shows the prayer, its category, and total days prayed', () => {
    seeded('p1') // fixture: 6 log days
    expect(screen.getByText(/Grandma Ruth's recovery/)).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText(/prayed 6 days/i)).toBeInTheDocument()
  })

  it('renders the current month calendar with prayed days marked', () => {
    seeded('p3') // 12-day run ending today
    const today = new Date()
    const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    expect(screen.getByText(monthName)).toBeInTheDocument()
    // today is always marked for p3
    const cell = screen.getByLabelText(new RegExp(`^${today.getDate()}, prayed`))
    expect(cell).toBeInTheDocument()
  })

  it('pages to the previous month', async () => {
    seeded('p3')
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    const prev = new Date()
    prev.setDate(1)
    prev.setMonth(prev.getMonth() - 1)
    expect(screen.getByText(prev.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))).toBeInTheDocument()
  })

  it('shows the answered badge for answered prayers', () => {
    seeded('a1')
    expect(screen.getByText(/answered/i)).toBeInTheDocument()
  })

  it('back returns home', async () => {
    seeded('p1')
    await userEvent.click(screen.getByText('‹ Back'))
    // PrayerDetail renders nothing once screen changes; assert via store side effect:
    expect(screen.queryByText(/prayed 6 days/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/screens/PrayerDetail.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/screens/PrayerDetail.tsx`**

```tsx
import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { CategoryTag } from '../components/CategoryTag'
import { daysPrayed, monthMarks } from '../lib/history'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/** Cells for a Monday-first month grid: nulls pad the first week. */
export function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const lead = (first.getDay() + 6) % 7 // Mon=0
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
}

export function PrayerDetail() {
  const { state, dispatch } = useStore()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const prayer = state.prayers.find(p => p.id === state.activePrayerId)
  if (!prayer) return null
  const category = state.categories.find(c => c.id === prayer.categoryId)
  const total = daysPrayed(state.logs, prayer.id)
  const marks = monthMarks(state.logs, prayer.id, cursor.year, cursor.month)
  const monthLabel = new Date(cursor.year, cursor.month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  const page = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month - 1 + delta)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })

  return (
    <div className="px-5 pt-1.5 pb-[130px]">
      <button
        onClick={() => dispatch({ type: 'NAVIGATE', screen: prayer.answeredAt === null ? 'home' : 'answered' })}
        className="text-[13px] font-semibold text-[oklch(0.55_0.1_245)] mb-3.5"
      >
        ‹ Back
      </button>

      <h1 className="text-[22px] font-medium text-[oklch(0.28_0.04_255)] leading-[1.25] mb-2.5">{prayer.text}</h1>
      <div className="flex items-center gap-2.5 mb-6">
        <CategoryTag category={category} />
        {prayer.answeredAt !== null && (
          <span className="text-[10.5px] font-bold tracking-[.07em] uppercase text-[oklch(0.5_0.1_155)] bg-[oklch(0.95_0.04_155)] px-2 py-1 rounded">
            ✓ Answered
          </span>
        )}
      </div>

      <div className="bg-white border border-[oklch(0.9_0.015_240)] rounded-lg p-[18px] shadow-[0_3px_10px_-6px_oklch(0.5_0.06_250_/_.35)]">
        <div className="text-[15px] font-bold text-[oklch(0.3_0.03_255)] mb-4">
          🙏 Prayed {total} {total === 1 ? 'day' : 'days'}
        </div>

        <div className="flex items-center justify-between mb-3">
          <button onClick={() => page(-1)} aria-label="Previous month" className="text-[oklch(0.55_0.1_245)] font-bold px-2 py-1">‹</button>
          <div className="text-[13px] font-bold text-[oklch(0.35_0.03_255)]">{monthLabel}</div>
          <button onClick={() => page(1)} aria-label="Next month" className="text-[oklch(0.55_0.1_245)] font-bold px-2 py-1">›</button>
        </div>

        <div className="grid grid-cols-7 gap-y-1.5 text-center">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-[10px] font-bold text-[oklch(0.6_0.02_250)] uppercase">{d}</div>
          ))}
          {monthGrid(cursor.year, cursor.month).map((day, i) =>
            day === null ? (
              <div key={`pad-${i}`} />
            ) : (
              <div
                key={day}
                aria-label={`${day}${marks.has(day) ? ', prayed' : ''}`}
                className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-[12.5px] ${
                  marks.has(day)
                    ? 'bg-[oklch(0.62_0.13_250)] text-white font-bold'
                    : 'text-[oklch(0.45_0.02_250)]'
                }`}
              >
                {day}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
```

Add the route in `src/App.tsx`:

```tsx
import { PrayerDetail } from './screens/PrayerDetail'
// in CurrentScreen's switch:
case 'prayerDetail': return <PrayerDetail />
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/screens/PrayerDetail.test.tsx`
Expected: PASS

- [ ] **Step 5: "+ New" category chip in VoiceOverlay — failing test first** (append to `src/voice/VoiceOverlay.test.tsx`)

```tsx
it('creates a custom category inline and selects it', async () => {
  render(<App />)
  await userEvent.click(screen.getByRole('button', { name: 'Add prayer by voice' }))
  await userEvent.type(screen.getByPlaceholderText('What would you like to pray for?'), 'For the missionaries')
  await userEvent.click(screen.getByRole('button', { name: '+ New' }))
  await userEvent.type(screen.getByPlaceholderText('Category name'), 'Missions')
  await userEvent.click(screen.getByRole('button', { name: 'Create' }))
  expect(screen.getByRole('button', { name: /Missions/, pressed: true })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Add to prayer list' }))
  expect(screen.getByText('For the missionaries')).toBeInTheDocument()
  expect(screen.getByText('Missions')).toBeInTheDocument() // tag on the new row
})
```

Run: `npx vitest run src/voice/VoiceOverlay.test.tsx` → Expected: the new test FAILs ("+ New" not found)

- [ ] **Step 6: Implement the "+ New" chip**

In `VoiceOverlay.tsx`, after the category chip list:

```tsx
const [creating, setCreating] = useState(false)
const [newName, setNewName] = useState('')

function createCategory() {
  const name = newName.trim()
  if (!name) return
  const existing = state.categories.find(c => c.name.toLowerCase() === name.toLowerCase())
  if (existing) {
    setCategoryId(existing.id); setPicked(true); setCreating(false); setNewName(''); return
  }
  const id = crypto.randomUUID()
  dispatch({ type: 'ADD_CATEGORY', id, name, hue: nextHue(state.categories.map(c => c.hue)) })
  setCategoryId(id)
  setPicked(true)
  setCreating(false)
  setNewName('')
}

// inside the chip flex-wrap div, after the mapped chips:
{creating ? (
  <span className="inline-flex items-center gap-1.5">
    <input
      value={newName}
      onChange={e => setNewName(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') createCategory() }}
      placeholder="Category name"
      autoFocus
      className="text-[13px] font-bold px-3 py-2 rounded-md border border-[oklch(0.85_0.03_245)] outline-none w-[140px]"
    />
    <button onClick={createCategory} disabled={!newName.trim()}
      className="text-[13px] font-bold px-3 py-2 rounded-md bg-[oklch(0.62_0.13_250)] text-white disabled:opacity-50">
      Create
    </button>
  </span>
) : (
  <button onClick={() => setCreating(true)}
    className="inline-flex items-center text-[13px] font-bold px-[13px] py-2 rounded-md border-[1.5px] border-dashed border-[oklch(0.78_0.05_245)] text-[oklch(0.55_0.1_245)]">
    + New
  </button>
)}
```

Imports: `nextHue` from `../store/categories`.

- [ ] **Step 7: Run the whole suite + build**

Run: `npx vitest run` → Expected: PASS
Run: `npm run build` → Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A src
git commit -m "feat: prayer history detail page with calendar; inline custom category creation"
```

---

### Task 7: Supabase client, sync mapper, hydration/import

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/sync/mapper.ts`, Test: `src/sync/mapper.test.ts`
- Create: `src/sync/hydrate.ts`, Test: `src/sync/hydrate.test.ts`

- [ ] **Step 1: Create `src/lib/supabase.ts`** (no test — a configured singleton)

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)
```

Add to `src/vite-env.d.ts`:

```ts
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}
```

For vitest, tests mock the module — never construct a real client: every sync test starts with `vi.mock('../lib/supabase', () => ({ supabase: mockClient }))`.

- [ ] **Step 2: Failing tests for the mapper**

```ts
// src/sync/mapper.test.ts
import { rowsToState, writeForAction } from './mapper'

describe('rowsToState', () => {
  it('maps snake_case rows to app state slices', () => {
    const data = rowsToState({
      profile: { id: 'u1', name: 'Anna', initials: 'AR' },
      categories: [{ id: 'c1', name: 'Health', hue: 12 }],
      prayers: [{ id: 'p1', text: 'hi', category_id: 'c1', answered_at: null, created_at: '2026-07-01T00:00:00Z' }],
      logs: [{ id: 'l1', prayer_id: 'p1', prayed_on: '2026-07-01' }],
    })
    expect(data.profile).toEqual({ name: 'Anna', initials: 'AR' })
    expect(data.categories).toEqual([{ id: 'c1', name: 'Health', hue: 12 }])
    expect(data.prayers).toEqual([
      { id: 'p1', text: 'hi', categoryId: 'c1', answeredAt: null, createdAt: Date.parse('2026-07-01T00:00:00Z') },
    ])
    expect(data.logs).toEqual([{ id: 'l1', prayerId: 'p1', prayedOn: '2026-07-01' }])
  })
  it('maps answered_at timestamps to epoch ms', () => {
    const data = rowsToState({
      profile: { id: 'u1', name: 'A', initials: 'A' },
      categories: [],
      prayers: [{ id: 'p1', text: 'x', category_id: 'c1', answered_at: '2026-07-02T10:00:00Z', created_at: '2026-07-01T00:00:00Z' }],
      logs: [],
    })
    expect(data.prayers[0].answeredAt).toBe(Date.parse('2026-07-02T10:00:00Z'))
  })
})

describe('writeForAction', () => {
  const uid = 'u1'
  it('ADD_PRAYER → prayers insert', () => {
    expect(writeForAction({ type: 'ADD_PRAYER', id: 'p1', text: 'hi', categoryId: 'c1', now: 1000 }, uid, { hadLogToday: false }))
      .toEqual({ table: 'prayers', op: 'insert', values: { id: 'p1', user_id: 'u1', text: 'hi', category_id: 'c1', created_at: new Date(1000).toISOString() } })
  })
  it('ADD_CATEGORY → categories insert', () => {
    expect(writeForAction({ type: 'ADD_CATEGORY', id: 'c9', name: 'Missions', hue: 180 }, uid, { hadLogToday: false }))
      .toEqual({ table: 'categories', op: 'insert', values: { id: 'c9', user_id: 'u1', name: 'Missions', hue: 180 } })
  })
  it('TOGGLE_PRAYED (was unchecked) → log insert', () => {
    expect(writeForAction({ type: 'TOGGLE_PRAYED', id: 'p1', today: '2026-07-11', logId: 'l1' }, uid, { hadLogToday: false }))
      .toEqual({ table: 'prayer_logs', op: 'insert', values: { id: 'l1', user_id: 'u1', prayer_id: 'p1', prayed_on: '2026-07-11' } })
  })
  it('TOGGLE_PRAYED (was checked) → log delete by prayer+date', () => {
    expect(writeForAction({ type: 'TOGGLE_PRAYED', id: 'p1', today: '2026-07-11', logId: 'l2' }, uid, { hadLogToday: true }))
      .toEqual({ table: 'prayer_logs', op: 'delete', match: { prayer_id: 'p1', prayed_on: '2026-07-11' } })
  })
  it('MARK_ANSWERED / UNDO_ANSWERED → prayers update', () => {
    expect(writeForAction({ type: 'MARK_ANSWERED', id: 'p1', now: 1000 }, uid, { hadLogToday: false }))
      .toEqual({ table: 'prayers', op: 'update', match: { id: 'p1' }, values: { answered_at: new Date(1000).toISOString() } })
    expect(writeForAction({ type: 'UNDO_ANSWERED', id: 'p1' }, uid, { hadLogToday: false }))
      .toEqual({ table: 'prayers', op: 'update', match: { id: 'p1' }, values: { answered_at: null } })
  })
  it('local-only actions → null', () => {
    expect(writeForAction({ type: 'NAVIGATE', screen: 'home' }, uid, { hadLogToday: false })).toBeNull()
    expect(writeForAction({ type: 'TOGGLE_FEED_PRAY', groupId: 'g1', feedId: 'f1' }, uid, { hadLogToday: false })).toBeNull()
    expect(writeForAction({ type: 'SYNC_ERROR', failed: true }, uid, { hadLogToday: false })).toBeNull()
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/sync/mapper.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement `src/sync/mapper.ts`**

```ts
import type { Action, HydrateData } from '../store/reducer'

export interface ProfileRow { id: string; name: string; initials: string }
export interface CategoryRow { id: string; name: string; hue: number }
export interface PrayerRow { id: string; text: string; category_id: string; answered_at: string | null; created_at: string }
export interface LogRow { id: string; prayer_id: string; prayed_on: string }

export function rowsToState(rows: {
  profile: ProfileRow
  categories: CategoryRow[]
  prayers: PrayerRow[]
  logs: LogRow[]
}): HydrateData {
  return {
    profile: { name: rows.profile.name, initials: rows.profile.initials },
    categories: rows.categories.map(c => ({ id: c.id, name: c.name, hue: c.hue })),
    prayers: rows.prayers.map(p => ({
      id: p.id,
      text: p.text,
      categoryId: p.category_id,
      answeredAt: p.answered_at === null ? null : Date.parse(p.answered_at),
      createdAt: Date.parse(p.created_at),
    })),
    logs: rows.logs.map(l => ({ id: l.id, prayerId: l.prayer_id, prayedOn: l.prayed_on })),
  }
}

export type Write =
  | { table: string; op: 'insert'; values: Record<string, unknown> }
  | { table: string; op: 'update'; match: Record<string, unknown>; values: Record<string, unknown> }
  | { table: string; op: 'delete'; match: Record<string, unknown> }

/**
 * Maps a data-changing action to its Supabase write. `hadLogToday` is the
 * pre-dispatch state for TOGGLE_PRAYED (checked → delete, unchecked → insert).
 * Local-only actions return null.
 */
export function writeForAction(action: Action, userId: string, ctx: { hadLogToday: boolean }): Write | null {
  switch (action.type) {
    case 'ADD_PRAYER':
      return {
        table: 'prayers', op: 'insert',
        values: { id: action.id, user_id: userId, text: action.text, category_id: action.categoryId, created_at: new Date(action.now).toISOString() },
      }
    case 'ADD_CATEGORY':
      return { table: 'categories', op: 'insert', values: { id: action.id, user_id: userId, name: action.name, hue: action.hue } }
    case 'TOGGLE_PRAYED':
      return ctx.hadLogToday
        ? { table: 'prayer_logs', op: 'delete', match: { prayer_id: action.id, prayed_on: action.today } }
        : { table: 'prayer_logs', op: 'insert', values: { id: action.logId, user_id: userId, prayer_id: action.id, prayed_on: action.today } }
    case 'MARK_ANSWERED':
      return { table: 'prayers', op: 'update', match: { id: action.id }, values: { answered_at: new Date(action.now).toISOString() } }
    case 'UNDO_ANSWERED':
      return { table: 'prayers', op: 'update', match: { id: action.id }, values: { answered_at: null } }
    default:
      return null
  }
}
```

- [ ] **Step 5: Run mapper tests** → `npx vitest run src/sync/mapper.test.ts` → PASS

- [ ] **Step 6: Failing tests for hydrate/import/execute**

```ts
// src/sync/hydrate.test.ts
import { fetchAll, importLegacy, executeWrite } from './hydrate'
import { supabase } from '../lib/supabase'

vi.mock('../lib/supabase', () => {
  const result = { data: [], error: null }
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'match', 'single']) {
    builder[m] = vi.fn(() => builder)
  }
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return { supabase: { from: vi.fn(() => builder), __builder: builder, __result: result } }
})

// helper to reach the mock internals
const sb = supabase as unknown as {
  from: ReturnType<typeof vi.fn>
  __builder: Record<string, ReturnType<typeof vi.fn>>
  __result: { data: unknown; error: unknown }
}

beforeEach(() => {
  vi.clearAllMocks()
  sb.__result.data = []
  sb.__result.error = null
  localStorage.clear()
})

describe('fetchAll', () => {
  it('queries all four tables', async () => {
    sb.__result.data = []
    // profile query returns single object
    await fetchAll('u1').catch(() => {}) // shape of data varies per table; assert calls only
    const tables = sb.from.mock.calls.map(c => c[0])
    expect(tables).toEqual(expect.arrayContaining(['profiles', 'categories', 'prayers', 'prayer_logs']))
  })
})

describe('executeWrite', () => {
  it('performs an insert', async () => {
    await executeWrite({ table: 'prayers', op: 'insert', values: { id: 'p1' } })
    expect(sb.from).toHaveBeenCalledWith('prayers')
    expect(sb.__builder.insert).toHaveBeenCalledWith({ id: 'p1' })
  })
  it('performs an update with match', async () => {
    await executeWrite({ table: 'prayers', op: 'update', match: { id: 'p1' }, values: { answered_at: null } })
    expect(sb.__builder.update).toHaveBeenCalledWith({ answered_at: null })
    expect(sb.__builder.match).toHaveBeenCalledWith({ id: 'p1' })
  })
  it('performs a delete with match', async () => {
    await executeWrite({ table: 'prayer_logs', op: 'delete', match: { prayer_id: 'p1', prayed_on: '2026-07-11' } })
    expect(sb.__builder.delete).toHaveBeenCalled()
    expect(sb.__builder.match).toHaveBeenCalledWith({ prayer_id: 'p1', prayed_on: '2026-07-11' })
  })
  it('rejects when supabase returns an error', async () => {
    sb.__result.error = { message: 'boom' }
    await expect(executeWrite({ table: 'prayers', op: 'insert', values: {} })).rejects.toBeTruthy()
  })
})

describe('importLegacy', () => {
  it('does nothing without a legacy snapshot', async () => {
    await importLegacy('u1', [{ id: 'c1', name: 'Health', hue: 12 }], '2026-07-11')
    expect(sb.__builder.insert).not.toHaveBeenCalled()
  })
  it('builds prayers and backfilled logs from a legacy snapshot, then clears it', async () => {
    localStorage.setItem('prayer-app-state-v1', JSON.stringify({
      prayers: [{ id: 'p1', text: 'old', category: 'Health', streak: 2, prayedToday: true }],
      answered: [{ id: 'a1', text: 'done', category: 'Health', answeredAt: 1000, streak: 1 }],
    }))
    await importLegacy('u1', [{ id: 'c1', name: 'Health', hue: 12 }], '2026-07-11')
    // prayers insert: both entries, categoryId resolved by name
    const prayerInsert = sb.__builder.insert.mock.calls.find(c => Array.isArray(c[0]) && c[0][0]?.text)
    expect(prayerInsert![0]).toHaveLength(2)
    expect(prayerInsert![0][0]).toMatchObject({ id: 'p1', category_id: 'c1', user_id: 'u1' })
    // logs insert: streak 2 ending today (prayedToday) → 2026-07-11 & 2026-07-10; answered streak 1 → one row
    const logInsert = sb.__builder.insert.mock.calls.find(c => Array.isArray(c[0]) && c[0][0]?.prayed_on)
    const dates = logInsert![0].filter((r: { prayer_id: string }) => r.prayer_id === 'p1').map((r: { prayed_on: string }) => r.prayed_on)
    expect(dates.sort()).toEqual(['2026-07-10', '2026-07-11'])
    expect(localStorage.getItem('prayer-app-state-v1')).toBeNull()
  })
})
```

- [ ] **Step 7: Run to verify failure** → `npx vitest run src/sync/hydrate.test.ts` → FAIL (module not found)

- [ ] **Step 8: Implement `src/sync/hydrate.ts`**

```ts
import { supabase } from '../lib/supabase'
import type { HydrateData } from '../store/reducer'
import type { Category } from '../store/types'
import { rowsToState } from './mapper'
import type { CategoryRow, LogRow, PrayerRow, ProfileRow, Write } from './mapper'
import { readLegacyState, clearLegacyState } from '../store/persistence'
import { prevDay } from '../lib/history'

export async function fetchAll(userId: string): Promise<HydrateData> {
  const [profile, categories, prayers, logs] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('prayers').select('*').eq('user_id', userId),
    supabase.from('prayer_logs').select('*').eq('user_id', userId),
  ])
  const err = profile.error ?? categories.error ?? prayers.error ?? logs.error
  if (err) throw err
  return rowsToState({
    profile: profile.data as ProfileRow,
    categories: (categories.data ?? []) as CategoryRow[],
    prayers: (prayers.data ?? []) as PrayerRow[],
    logs: (logs.data ?? []) as LogRow[],
  })
}

export async function executeWrite(write: Write): Promise<void> {
  const table = supabase.from(write.table)
  const res =
    write.op === 'insert' ? await table.insert(write.values)
    : write.op === 'update' ? await table.update(write.values).match(write.match)
    : await table.delete().match(write.match)
  if (res.error) throw res.error
}

/**
 * One-time import of the pre-account localStorage snapshot. Runs before the
 * caller decides to fetch; only inserts when a legacy snapshot exists. The
 * caller only invokes this when the server has no prayers yet.
 */
export async function importLegacy(userId: string, categories: Category[], today: string): Promise<void> {
  const legacy = readLegacyState()
  if (!legacy) return
  const byName = new Map(categories.map(c => [c.name.toLowerCase(), c.id]))
  const fallback = categories[0]?.id
  const resolve = (name: string) => byName.get(name.toLowerCase()) ?? fallback
  if (!fallback) return // no categories seeded yet — bail rather than lose data

  const prayerRows = [
    ...legacy.prayers.map(p => ({
      id: p.id, user_id: userId, text: p.text, category_id: resolve(p.category),
      answered_at: null as string | null, created_at: new Date().toISOString(),
    })),
    ...legacy.answered.map(a => ({
      id: a.id, user_id: userId, text: a.text, category_id: resolve(a.category),
      answered_at: new Date(a.answeredAt).toISOString(), created_at: new Date(a.answeredAt).toISOString(),
    })),
  ]

  const logRows: { id: string; user_id: string; prayer_id: string; prayed_on: string }[] = []
  for (const p of legacy.prayers) {
    let d = p.prayedToday ? today : prevDay(today)
    for (let i = 0; i < p.streak; i++) {
      logRows.push({ id: crypto.randomUUID(), user_id: userId, prayer_id: p.id, prayed_on: d })
      d = prevDay(d)
    }
  }
  for (const a of legacy.answered) {
    // backfill answered streaks ending the day they were answered
    let d = new Date(a.answeredAt).toISOString().slice(0, 10)
    for (let i = 0; i < (a.streak ?? 0); i++) {
      logRows.push({ id: crypto.randomUUID(), user_id: userId, prayer_id: a.id, prayed_on: d })
      d = prevDay(d)
    }
  }

  if (prayerRows.length) {
    const r1 = await supabase.from('prayers').insert(prayerRows)
    if (r1.error) throw r1.error
  }
  if (logRows.length) {
    const r2 = await supabase.from('prayer_logs').insert(logRows)
    if (r2.error) throw r2.error
  }
  clearLegacyState()
}
```

- [ ] **Step 9: Run** → `npx vitest run src/sync` → PASS. Then `npx vitest run` (whole suite) → PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/supabase.ts src/vite-env.d.ts src/sync
git commit -m "feat: supabase client, action-to-write mapper, hydration and legacy import"
```

---

### Task 8: Auth (session hook + SignIn screen)

**Files:**
- Create: `src/auth/useSession.ts`, `src/auth/SignIn.tsx`
- Test: `src/auth/auth.test.tsx`

- [ ] **Step 1: Failing tests**

```tsx
// src/auth/auth.test.tsx
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const listeners: ((event: string, session: unknown) => void)[] = []
const mockAuth = {
  getSession: vi.fn(async () => ({ data: { session: null } })),
  onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
    listeners.push(cb)
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  }),
  signInWithOAuth: vi.fn(async () => ({ error: null })),
}
vi.mock('../lib/supabase', () => ({ supabase: { auth: mockAuth } }))

import { useSession } from './useSession'
import { SignIn } from './SignIn'

function Probe() {
  const session = useSession()
  return <div data-testid="s">{session === undefined ? 'loading' : session ? 'in' : 'out'}</div>
}

beforeEach(() => {
  listeners.length = 0
  vi.clearAllMocks()
})

describe('useSession', () => {
  it('loading → signed out → signed in on auth event', async () => {
    render(<Probe />)
    expect(screen.getByTestId('s')).toHaveTextContent('loading')
    await act(async () => {}) // getSession resolves
    expect(screen.getByTestId('s')).toHaveTextContent('out')
    await act(async () => {
      listeners.forEach(l => l('SIGNED_IN', { user: { id: 'u1' } }))
    })
    expect(screen.getByTestId('s')).toHaveTextContent('in')
  })
})

describe('SignIn', () => {
  it('starts the Google OAuth flow', async () => {
    render(<SignIn />)
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' })
    )
  })
})
```

- [ ] **Step 2: Run to verify failure** → `npx vitest run src/auth/auth.test.tsx` → FAIL (modules not found)

- [ ] **Step 3: Implement**

```ts
// src/auth/useSession.ts
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/** undefined = still resolving, null = signed out. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}
```

```tsx
// src/auth/SignIn.tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function SignIn() {
  const [error, setError] = useState(false)
  async function signIn() {
    setError(false)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(true)
  }
  return (
    <div className="mx-auto max-w-[430px] min-h-dvh bg-[linear-gradient(180deg,oklch(0.985_0.008_235)_0%,oklch(0.975_0.012_235)_100%)] flex flex-col items-center justify-center px-8 text-center">
      <div className="text-5xl mb-5">🕊️</div>
      <h1 className="text-[26px] font-medium text-[oklch(0.28_0.04_255)] mb-2">Prayer</h1>
      <p className="text-[14px] text-[oklch(0.55_0.03_250)] mb-9">
        Keep your prayers, streaks, and answered moments — on every device.
      </p>
      <button
        onClick={signIn}
        className="w-full py-3.5 rounded-2xl bg-[linear-gradient(140deg,oklch(0.64_0.13_250),oklch(0.58_0.15_264))] text-white font-bold text-[15px] shadow-[0_10px_22px_-8px_oklch(0.55_0.15_255_/_.7)]"
      >
        Continue with Google
      </button>
      {error && (
        <p className="text-[13px] text-[oklch(0.55_0.18_25)] mt-4">
          Sign-in didn’t complete — please try again.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run** → `npx vitest run src/auth/auth.test.tsx` → PASS

- [ ] **Step 5: Commit**

```bash
git add src/auth
git commit -m "feat: session hook and Google sign-in screen"
```

---

### Task 9: StoreContext wiring — hydration + write-through dispatch

**Files:**
- Modify: `src/store/StoreContext.tsx`
- Test: `src/store/StoreContext.test.tsx` (rewrite)

- [ ] **Step 1: Failing tests (rewrite `src/store/StoreContext.test.tsx`)**

```tsx
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const executeWrite = vi.fn(async () => {})
const fetchAll = vi.fn(async () => ({
  profile: { name: 'Anna', initials: 'AR' },
  categories: [{ id: 'c1', name: 'Health', hue: 12 }],
  prayers: [{ id: 'p1', text: 'from server', categoryId: 'c1', answeredAt: null, createdAt: 1 }],
  logs: [],
}))
const importLegacy = vi.fn(async () => {})
vi.mock('../sync/hydrate', () => ({
  executeWrite: (...a: unknown[]) => executeWrite(...a),
  fetchAll: (...a: unknown[]) => fetchAll(...a),
  importLegacy: (...a: unknown[]) => importLegacy(...a),
}))

import { StoreProvider, useStore } from './StoreContext'
import { cacheKey } from './persistence'

function Probe() {
  const { state, dispatch } = useStore()
  return (
    <div>
      <span data-testid="count">{state.prayers.length}</span>
      <span data-testid="err">{String(state.syncError)}</span>
      <button onClick={() => dispatch({ type: 'ADD_PRAYER', id: 'x1', text: 'new', categoryId: 'c1', now: 5 })}>add</button>
      <button onClick={() => dispatch({ type: 'NAVIGATE', screen: 'answered' })}>nav</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

const ui = () => render(<StoreProvider userId="u1"><Probe /></StoreProvider>)

describe('StoreProvider', () => {
  it('hydrates from the server (import first) and caches per user', async () => {
    ui()
    await act(async () => {})
    expect(importLegacy).toHaveBeenCalled()
    expect(fetchAll).toHaveBeenCalledWith('u1')
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(JSON.parse(localStorage.getItem(cacheKey('u1'))!).prayers).toHaveLength(1)
  })

  it('write-through: data actions call executeWrite, local actions do not', async () => {
    ui()
    await act(async () => {})
    await userEvent.click(screen.getByText('add'))
    expect(executeWrite).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByText('nav'))
    expect(executeWrite).toHaveBeenCalledTimes(1) // unchanged
  })

  it('sets syncError after a write fails twice, clears on next success', async () => {
    executeWrite.mockRejectedValueOnce(new Error('x')).mockRejectedValueOnce(new Error('x'))
    ui()
    await act(async () => {})
    await userEvent.click(screen.getByText('add'))
    await act(async () => {}) // retry settles
    expect(screen.getByTestId('err')).toHaveTextContent('true')
    executeWrite.mockResolvedValue(undefined)
    await userEvent.click(screen.getByText('add'))
    await act(async () => {})
    expect(screen.getByTestId('err')).toHaveTextContent('false')
  })
})
```

- [ ] **Step 2: Run to verify failure** → `npx vitest run src/store/StoreContext.test.tsx` → FAIL (`userId` prop unknown / mocks unused)

- [ ] **Step 3: Rewrite `src/store/StoreContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { AppState } from './types'
import { reducer } from './reducer'
import type { Action } from './reducer'
import { emptyState, loadCache, saveCache } from './persistence'
import { writeForAction } from '../sync/mapper'
import { executeWrite, fetchAll, importLegacy } from '../sync/hydrate'
import { todayStr } from '../lib/time'

const StoreCtx = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null)

export function StoreProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadCache(userId) ?? emptyState())
  const stateRef = useRef(state)
  stateRef.current = state

  // hydrate: legacy import (only when server empty) → fetch → HYDRATE
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let data = await fetchAll(userId)
        if (data.prayers.length === 0) {
          await importLegacy(userId, data.categories, todayStr())
          data = await fetchAll(userId)
        }
        if (!cancelled) dispatch({ type: 'HYDRATE', data })
      } catch {
        if (!cancelled) dispatch({ type: 'SYNC_ERROR', failed: true })
      }
    })()
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    saveCache(userId, state)
  }, [userId, state])

  // write-through dispatch: local state updates synchronously, the matching
  // Supabase write fires in the background with one retry
  const syncDispatch: Dispatch<Action> = action => {
    const hadLogToday =
      action.type === 'TOGGLE_PRAYED' &&
      stateRef.current.logs.some(l => l.prayerId === action.id && l.prayedOn === action.today)
    dispatch(action)
    const write = writeForAction(action, userId, { hadLogToday })
    if (!write) return
    executeWrite(write)
      .catch(() => executeWrite(write))
      .then(() => dispatch({ type: 'SYNC_ERROR', failed: false }))
      .catch(() => dispatch({ type: 'SYNC_ERROR', failed: true }))
  }

  return <StoreCtx.Provider value={{ state, dispatch: syncDispatch }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
```

Note: the `.then(() => dispatch({type:'SYNC_ERROR', failed:false}))` after a success would clear errors on every write — including no-op clears; that's fine (idempotent). But avoid dispatching when nothing changed if it causes render noise: acceptable as-is.

- [ ] **Step 4: Fix screen tests' provider usage**

All screen tests render `<StoreProvider>` without `userId`. Update every test render to `<StoreProvider userId="local">` and their `beforeEach` seeding continues via `saveCache('local', ...)`. **Add the hydrate mock to each screen test file** so no real fetch happens (vitest `vi.mock` at top):

```ts
vi.mock('../sync/hydrate', () => ({
  executeWrite: vi.fn(async () => {}),
  fetchAll: vi.fn(async () => { throw new Error('offline test') }), // keeps cached fixture state
  importLegacy: vi.fn(async () => {}),
}))
```

Files: `Home.test.tsx`, `Answered.test.tsx`, `Groups.test.tsx`, `PrayerDetail.test.tsx`, `App.test.tsx`, `VoiceOverlay.test.tsx` (the last two mock it the same way; `App` renders `StoreProvider` internally after Task 10 — adjust there if the suite is ordered differently).

Note: with `fetchAll` throwing, `syncError` becomes true — tests asserting UI content are unaffected (the indicator is a small dot added in Task 10).

- [ ] **Step 5: Run the whole suite + build** → `npx vitest run` → PASS; `npm run build` → PASS

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: store hydration from supabase and write-through dispatch with retry"
```

---

### Task 10: App shell — auth gate, sync indicator, account menu

**Files:**
- Modify: `src/App.tsx`, `src/screens/Home.tsx` (avatar → sign-out menu), `src/App.test.tsx`

- [ ] **Step 1: Failing tests (extend `src/App.test.tsx`)**

Top of file gains the auth/hydrate mocks:

```tsx
const mockSession: { current: unknown } = { current: null }
vi.mock('./auth/useSession', () => ({ useSession: () => mockSession.current }))
vi.mock('./sync/hydrate', () => ({
  executeWrite: vi.fn(async () => {}),
  fetchAll: vi.fn(async () => { throw new Error('offline test') }),
  importLegacy: vi.fn(async () => {}),
}))
```

New/changed tests:

```tsx
it('shows the sign-in screen when signed out', () => {
  mockSession.current = null
  render(<App />)
  expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
})

it('shows the app when signed in', () => {
  mockSession.current = { user: { id: 'u-test' } }
  saveCache('u-test', demoState(Date.now(), todayStr()))
  render(<App />)
  expect(screen.getByText('Prayer List')).toBeInTheDocument()
})
```

Existing navigation tests set `mockSession.current = { user: { id: 'u-test' } }` and seed `saveCache('u-test', demoState(...))` in `beforeEach` (imports: `saveCache` from `./store/persistence`, `demoState` from `./test/fixtures`, `todayStr` from `./lib/time`).

- [ ] **Step 2: Run to verify failure** → `npx vitest run src/App.test.tsx` → FAIL

- [ ] **Step 3: Implement in `src/App.tsx`**

```tsx
import { useState } from 'react'
import { StoreProvider, useStore } from './store/StoreContext'
import { useSession } from './auth/useSession'
import { SignIn } from './auth/SignIn'
import { Home } from './screens/Home'
import { Groups } from './screens/Groups'
import { GroupDetail } from './screens/GroupDetail'
import { Answered } from './screens/Answered'
import { Reminders } from './screens/Reminders'
import { PrayerDetail } from './screens/PrayerDetail'
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
    case 'prayerDetail': return <PrayerDetail />
  }
}

function SyncIndicator() {
  const { state } = useStore()
  if (!state.syncError) return null
  return (
    <div
      role="status"
      title="Changes not synced yet"
      className="fixed top-[max(14px,env(safe-area-inset-top))] right-4 z-30 w-2.5 h-2.5 rounded-full bg-[oklch(0.7_0.18_60)]"
    />
  )
}

function Shell() {
  const [voiceOpen, setVoiceOpen] = useState(false)
  return (
    <div className="mx-auto max-w-[430px] min-h-dvh bg-[linear-gradient(180deg,oklch(0.985_0.008_235)_0%,oklch(0.975_0.012_235)_100%)] shadow-[0_0_60px_oklch(0.6_0.08_245_/_.25)] pt-[max(12px,env(safe-area-inset-top))]">
      <SyncIndicator />
      <CurrentScreen />
      <BottomNav onVoice={() => setVoiceOpen(true)} />
      {voiceOpen && <VoiceOverlay onClose={() => setVoiceOpen(false)} />}
    </div>
  )
}

export default function App() {
  const session = useSession()
  if (session === undefined) return null // resolving stored session
  if (!session) return <SignIn />
  return (
    <StoreProvider userId={session.user.id}>
      <Shell />
    </StoreProvider>
  )
}
```

- [ ] **Step 4: Sign-out on the Home avatar**

In `src/screens/Home.tsx`, the avatar becomes a button that toggles a one-item menu:

```tsx
import { supabase } from '../lib/supabase'
// inside Home():
const [menuOpen, setMenuOpen] = useState(false)
// replace the avatar div with:
<div className="relative">
  <button
    onClick={() => setMenuOpen(o => !o)}
    aria-label="Account menu"
    className="w-[42px] h-[42px] rounded-full bg-[linear-gradient(140deg,oklch(0.72_0.11_235),oklch(0.6_0.13_258))] flex items-center justify-center text-white font-bold text-[15px] shadow-[0_6px_16px_oklch(0.6_0.12_245_/_.4)]"
  >
    {state.profile.initials}
  </button>
  {menuOpen && (
    <button
      onClick={() => supabase.auth.signOut()}
      className="absolute right-0 top-[48px] z-10 whitespace-nowrap bg-white border border-[oklch(0.9_0.015_240)] rounded-lg px-4 py-2.5 text-[13px] font-bold text-[oklch(0.45_0.03_255)] shadow-[0_8px_20px_-8px_oklch(0.5_0.06_250_/_.5)]"
    >
      Sign out
    </button>
  )}
</div>
```

Home tests need the supabase mock too: `vi.mock('../lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }))`. Add a test:

```tsx
it('account menu offers sign out', async () => {
  ui()
  await userEvent.click(screen.getByRole('button', { name: 'Account menu' }))
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
})
```

- [ ] **Step 5: Run the whole suite + build** → `npx vitest run` → PASS; `npm run build` → PASS

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: auth gate, sync indicator, and sign-out menu"
```

---

### Task 11: Full-suite sweep, README, verify-skill update

**Files:**
- Modify: `README.md` (setup section), `.claude/skills/verify/SKILL.md`

- [ ] **Step 1: Whole suite + build**

Run: `npx vitest run` → PASS. Run: `npm run build` → PASS.
Fix any stragglers (test files still importing removed exports: `seedState`, `loadState`, `saveState`, `displayStreak`, `CATEGORIES`, `CATEGORY_HUES` must have no remaining references — `grep -rn "seedState\|displayStreak\|CATEGORY_HUES" src` returns nothing).

- [ ] **Step 2: README setup section** (append)

```markdown
## Backend setup (Supabase)

1. Create a project at supabase.com → SQL editor → run `supabase/schema.sql`.
2. Google Cloud Console → OAuth client (Web application):
   - Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → Google: paste client ID + secret.
4. Supabase → Authentication → URL Configuration: add `http://localhost:5173`,
   `http://localhost:5199`, and your production URL to Redirect URLs.
5. Copy `.env.example` to `.env.local` and fill in the project URL and anon key
   (Settings → API). Set the same two vars in your host (e.g. Vercel).
```

- [ ] **Step 3: Update `.claude/skills/verify/SKILL.md`**

Add gotchas: app requires `VITE_SUPABASE_*` env vars and a signed-in session; for browser verification without credentials, note that the sign-in screen is the expected first render. Cache key is now `prayer-app-cache-v2:<userId>`; legacy key `prayer-app-state-v1` is read once for import.

- [ ] **Step 4: Commit**

```bash
git add README.md .claude/skills/verify/SKILL.md
git commit -m "docs: supabase setup instructions and verify-skill notes"
```

---

### Task 12: End-to-end verification (needs user credentials)

**Blocked on user setup** (README steps from Task 11). Once `.env.local` exists:

- [ ] **Step 1:** `npx vite --port 5199 --strictPort` (background), drive with playwright-core per `.claude/skills/verify/SKILL.md`.
- [ ] **Step 2:** Verify: sign-in screen renders → complete Google OAuth manually (user does this once; session persists in localStorage for subsequent headless runs is NOT possible — verify signed-in flows in a headed browser or ask the user to click through) → prayers CRUD round-trips to Supabase (check table editor) → prayer detail calendar marks today after checking a prayer → custom category creation appears in Supabase `categories` → legacy import: seed `prayer-app-state-v1` in localStorage before first sign-in of a fresh account, confirm rows.
- [ ] **Step 3:** Report the verification with screenshots; fix what surfaces.

---

## Self-review notes (already applied)

- Spec coverage: schema+trigger (T1), history helpers (T2), hue system (T3), entity categories + merged answered + derived values + voice fallback (T4), per-user cache + legacy reader (T5), detail page + calendar + "+ New" chip (T6), client+mapper+hydrate+import (T7), auth (T8), write-through+hydration (T9), gate+indicator+sign-out (T10), docs (T11), e2e (T12). Filtering, undo, empty-state behaviors carry over via updated components in T4.
- Type consistency: `Action` union defined once in T4 Step 5 and consumed by T7 mapper; `HydrateData` shared; `Write` type defined in mapper and used by hydrate/StoreContext; `LegacyState` in persistence used by hydrate import.
- Known judgment call: interim `seedState` bridge in T4 Step 8 is deleted in T5 — kept because T4 must end green without pulling T5's content forward.
```

## Amendments during execution

- Task 1 schema hardened post-review (commit a0a9426): `full_name` trimmed with empty-string fallback to 'Friend'; profiles RLS split into select/update-only policies (no user insert/delete); hue check tightened to 0–359; comment documenting reliance on Supabase default grants.
