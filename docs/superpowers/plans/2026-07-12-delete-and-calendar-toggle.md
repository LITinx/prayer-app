# Delete Prayers & Calendar Date Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanently delete a prayer (with inline confirm) from its detail page, and toggle prayed marks by tapping past/today dates on the detail calendar.

**Architecture:** `DELETE_PRAYER` is a new reducer action + a `prayers` delete write (DB cascades the logs; the reducer mirrors that locally). The calendar toggle needs NO new action — `TOGGLE_PRAYED` already toggles the log row for (prayer, date) end-to-end; its `today` field is renamed `date` to reflect the general meaning, and past/today calendar cells become buttons dispatching it.

**Tech Stack:** React 19, Vite, vitest + Testing Library. Suite currently 141 passing.

**Spec:** `docs/superpowers/specs/2026-07-12-delete-and-calendar-toggle-design.md`

**Ground rules:** strict TDD (failing test → watch it fail → implement → pass), whole suite + `npm run build` green at each task's end, conventional commits with NO Claude attribution.

## File structure

```
src/store/reducer.ts            modify — rename today→date; add DELETE_PRAYER
src/store/reducer.test.ts       modify — rename; DELETE_PRAYER tests
src/sync/mapper.ts              modify — rename; DELETE_PRAYER → delete write
src/sync/mapper.test.ts         modify — rename; delete-write test
src/store/StoreContext.tsx      modify — rename (hadLogToday reads action.date)
src/components/PrayerRow.tsx    modify — rename in dispatch
src/screens/PrayerDetail.tsx    modify — tappable cells; delete button + confirm
src/screens/PrayerDetail.test.tsx modify — toggle + delete tests; one label fix
```

---

### Task 1: Rename `TOGGLE_PRAYED.today` → `date` (mechanical, stays green)

**Files:**
- Modify: `src/store/reducer.ts`, `src/store/reducer.test.ts`, `src/sync/mapper.ts`, `src/sync/mapper.test.ts`, `src/store/StoreContext.tsx`, `src/components/PrayerRow.tsx`

- [ ] **Step 1: Rename in the Action type and reducer** (`src/store/reducer.ts`)

The union member becomes:

```ts
  | { type: 'TOGGLE_PRAYED'; id: string; date: string; logId: string }
```

and the case body's two `action.today` references become `action.date`:

```ts
    case 'TOGGLE_PRAYED': {
      if (!state.prayers.some(p => p.id === action.id)) return state
      const existing = state.logs.find(l => l.prayerId === action.id && l.prayedOn === action.date)
      const logs = existing
        ? state.logs.filter(l => l !== existing)
        : [...state.logs, { id: action.logId, prayerId: action.id, prayedOn: action.date }]
      return { ...state, logs }
    }
```

- [ ] **Step 2: Rename in the mapper** (`src/sync/mapper.ts`, TOGGLE_PRAYED case — two `action.today` → `action.date`):

```ts
    case 'TOGGLE_PRAYED':
      return ctx.hadLogToday
        ? { table: 'prayer_logs', op: 'delete', match: { prayer_id: action.id, prayed_on: action.date } }
        : { table: 'prayer_logs', op: 'insert', conflictKey: 'prayer_id,prayed_on', values: { id: action.logId, user_id: userId, prayer_id: action.id, prayed_on: action.date } }
```

- [ ] **Step 3: Rename in StoreContext** (`src/store/StoreContext.tsx`, the `hadLogToday` computation — also rename the local to `hadLog` since it's no longer today-specific):

```ts
    const hadLog =
      action.type === 'TOGGLE_PRAYED' &&
      stateRef.current.logs.some(l => l.prayerId === action.id && l.prayedOn === action.date)
    dispatch(action)
    const write = writeForAction(action, userId, { hadLogToday: hadLog })
```

(Leave the mapper's ctx field name `hadLogToday` alone — renaming the public ctx shape would ripple through mapper tests for zero benefit. Only the call-site local is renamed.)

- [ ] **Step 4: Rename in PrayerRow** (`src/components/PrayerRow.tsx:18`):

```tsx
        onClick={() => dispatch({ type: 'TOGGLE_PRAYED', id: prayer.id, date: today, logId: crypto.randomUUID() })}
```

- [ ] **Step 5: Rename in tests** — `src/store/reducer.test.ts` (every `today,` shorthand in TOGGLE_PRAYED action literals becomes `date: today,`; the frozen idempotency action too) and `src/sync/mapper.test.ts` (the two TOGGLE_PRAYED expectations: `today: '2026-07-11'` → `date: '2026-07-11'`).

- [ ] **Step 6: Whole suite + build**

Run: `npx vitest run` → 141 passed. Run: `npm run build` → green (tsc catches any missed rename).

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "refactor: TOGGLE_PRAYED takes a general date instead of today"
```

---

### Task 2: DELETE_PRAYER (reducer + sync write)

**Files:**
- Modify: `src/store/reducer.ts`, `src/sync/mapper.ts`
- Test: `src/store/reducer.test.ts`, `src/sync/mapper.test.ts`

- [ ] **Step 1: Failing reducer tests** (append to `src/store/reducer.test.ts`):

```ts
describe('DELETE_PRAYER', () => {
  it('removes an active prayer and its logs, returning home', () => {
    const s = reducer(base(), { type: 'DELETE_PRAYER', id: 'p1' })
    expect(s.prayers.find(p => p.id === 'p1')).toBeUndefined()
    expect(s.logs.filter(l => l.prayerId === 'p1')).toHaveLength(0)
    expect(s.logs.filter(l => l.prayerId === 'p2')).toHaveLength(3) // others untouched
    expect(s.screen).toBe('home')
    expect(s.activePrayerId).toBeNull()
  })
  it('removes an answered prayer, returning to answered', () => {
    const s = reducer(base(), { type: 'DELETE_PRAYER', id: 'a1' })
    expect(s.prayers.find(p => p.id === 'a1')).toBeUndefined()
    expect(s.screen).toBe('answered')
  })
  it('ignores unknown ids', () => {
    expect(reducer(base(), { type: 'DELETE_PRAYER', id: 'nope' })).toEqual(base())
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/store/reducer.test.ts`
Expected: FAIL — TS/type error or unknown action (3 new tests fail)

- [ ] **Step 3: Implement** — in `src/store/reducer.ts`, add to the Action union:

```ts
  | { type: 'DELETE_PRAYER'; id: string }
```

and the case (after UNDO_ANSWERED):

```ts
    case 'DELETE_PRAYER': {
      const p = state.prayers.find(x => x.id === action.id)
      if (!p) return state
      return {
        ...state,
        screen: p.answeredAt === null ? 'home' : 'answered',
        activePrayerId: null,
        prayers: state.prayers.filter(x => x.id !== action.id),
        logs: state.logs.filter(l => l.prayerId !== action.id),
      }
    }
```

- [ ] **Step 4: Run reducer tests** → PASS.

- [ ] **Step 5: Failing mapper test** (append inside the `writeForAction` describe in `src/sync/mapper.test.ts`):

```ts
  it('DELETE_PRAYER → prayers delete (logs cascade server-side)', () => {
    expect(writeForAction({ type: 'DELETE_PRAYER', id: 'p1' }, uid, { hadLogToday: false }))
      .toEqual({ table: 'prayers', op: 'delete', match: { id: 'p1' } })
  })
```

Run: `npx vitest run src/sync/mapper.test.ts` → the new test FAILs (returns null).

- [ ] **Step 6: Implement** — in `src/sync/mapper.ts` `writeForAction`, before `default`:

```ts
    case 'DELETE_PRAYER':
      // prayer_logs cascade via the FK; one delete removes prayer + history
      return { table: 'prayers', op: 'delete', match: { id: action.id } }
```

- [ ] **Step 7: Whole suite + build** → `npx vitest run` all green (145), `npm run build` green.

- [ ] **Step 8: Commit**

```bash
git add -A src
git commit -m "feat: DELETE_PRAYER action removes prayer and history, synced as cascade delete"
```

---

### Task 3: PrayerDetail UI — delete button with confirm + tappable calendar

**Files:**
- Modify: `src/screens/PrayerDetail.tsx`
- Test: `src/screens/PrayerDetail.test.tsx`

- [ ] **Step 1: Failing tests** (append to `src/screens/PrayerDetail.test.tsx`; the file already has `seeded()`, `demoState`, `saveCache`, `todayStr`, `userEvent` imports, plus the hydrate/supabase mocks):

```tsx
describe('calendar date toggle', () => {
  it('taps an unmarked past date to mark it, and again to unmark', async () => {
    seeded('p4') // p4 has no logs
    const today = new Date()
    // guaranteed-past cell: use day 1 unless today IS the 1st, then page back a month
    let day = 1
    if (today.getDate() === 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    }
    const before = screen.getByText(/Prayed 0 days/i)
    expect(before).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: `${day} — tap to mark prayed` }))
    expect(screen.getByText(/Prayed 1 day$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `${day}, prayed — tap to unmark` })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: `${day}, prayed — tap to unmark` }))
    expect(screen.getByText(/Prayed 0 days/i)).toBeInTheDocument()
  })

  it('future dates are not tappable', async () => {
    seeded('p4')
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    // every cell next month is future: no toggle buttons exist
    expect(screen.queryByRole('button', { name: /tap to mark prayed/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tap to unmark/ })).not.toBeInTheDocument()
  })

  it('toggling today on the calendar syncs with prayed state', async () => {
    seeded('p4')
    const dayNum = new Date().getDate()
    await userEvent.click(screen.getByRole('button', { name: `${dayNum} — tap to mark prayed` }))
    expect(screen.getByRole('button', { name: `${dayNum}, prayed — tap to unmark` })).toBeInTheDocument()
  })
})

describe('delete prayer', () => {
  it('confirm flow deletes an active prayer', async () => {
    seeded('p1')
    await userEvent.click(screen.getByRole('button', { name: 'Delete prayer' }))
    expect(screen.getByText(/Delete forever\?/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    // PrayerDetail unmounts (screen changed + prayer gone)
    expect(screen.queryByText(/Grandma Ruth's recovery/)).not.toBeInTheDocument()
  })

  it('cancel restores the quiet button', async () => {
    seeded('p1')
    await userEvent.click(screen.getByRole('button', { name: 'Delete prayer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText(/Delete forever\?/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete prayer' })).toBeInTheDocument()
    expect(screen.getByText(/Grandma Ruth's recovery/)).toBeInTheDocument()
  })
})
```

Note on `Prayed 1 day$` regex: asserts the singular branch (existing fixtures never hit it).

- [ ] **Step 2: Fix ONE existing assertion.** The year-boundary paging test asserts `getByLabelText('15, prayed')`; past cells become buttons with the new label. Change that line to:

```ts
    expect(screen.getByRole('button', { name: '15, prayed — tap to unmark' })).toBeInTheDocument()
```

Similarly the current-month test's `getByLabelText(new RegExp(`^${today.getDate()}, prayed`))` keeps matching (prefix regex) — leave it.

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/screens/PrayerDetail.test.tsx`
Expected: FAIL — new toggle/delete tests can't find the buttons.

- [ ] **Step 4: Implement in `src/screens/PrayerDetail.tsx`.**

Imports change to:

```tsx
import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { CategoryTag } from '../components/CategoryTag'
import { daysPrayed, monthMarks } from '../lib/history'
import { todayStr } from '../lib/time'
```

Inside the component add state + helpers (after `cursor`):

```tsx
  const [confirmingDelete, setConfirmingDelete] = useState(false)
```

after `marks`:

```tsx
  const today = todayStr()
  const cellDate = (day: number) =>
    `${cursor.year}-${String(cursor.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
```

Replace the day-cell render (the `monthGrid(...).map(...)` non-null branch) with:

```tsx
            day === null ? (
              <div key={`pad-${i}`} />
            ) : cellDate(day) <= today ? (
              <button
                key={day}
                onClick={() =>
                  dispatch({ type: 'TOGGLE_PRAYED', id: prayer.id, date: cellDate(day), logId: crypto.randomUUID() })
                }
                aria-label={
                  marks.has(day) ? `${day}, prayed — tap to unmark` : `${day} — tap to mark prayed`
                }
                className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-[12.5px] ${
                  marks.has(day)
                    ? 'bg-[oklch(0.62_0.13_250)] text-white font-bold'
                    : 'text-[oklch(0.45_0.02_250)] hover:bg-[oklch(0.93_0.02_245)]'
                }`}
              >
                {day}
              </button>
            ) : (
              <div
                key={day}
                aria-label={`${day}`}
                className="mx-auto w-8 h-8 rounded-full flex items-center justify-center text-[12.5px] text-[oklch(0.78_0.01_250)]"
              >
                {day}
              </div>
            )
```

(Lexical `<=` works because both sides are zero-padded `YYYY-MM-DD`. Future cells get a lighter text color to read as inert.)

After the calendar card's closing `</div>`, add the delete affordance:

```tsx
      <div className="mt-6">
        {confirmingDelete ? (
          <div className="bg-white border border-[oklch(0.88_0.06_25)] rounded-lg p-4">
            <div className="text-[13.5px] font-semibold text-[oklch(0.4_0.1_25)] mb-3">
              Delete forever? This erases its prayer history.
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 py-2.5 rounded-lg bg-[oklch(0.95_0.01_245)] text-[oklch(0.5_0.03_255)] font-bold text-[13px]"
              >
                Cancel
              </button>
              <button
                onClick={() => dispatch({ type: 'DELETE_PRAYER', id: prayer.id })}
                className="flex-1 py-2.5 rounded-lg bg-[oklch(0.55_0.18_25)] text-white font-bold text-[13px]"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="w-full py-2.5 rounded-lg text-[13px] font-bold text-[oklch(0.55_0.14_25)] bg-[oklch(0.96_0.02_25)]"
          >
            🗑 Delete prayer
          </button>
        )}
      </div>
```

Accessible names: the quiet button's name is "🗑 Delete prayer" — Testing Library normalizes the emoji into the name, so the test queries `{ name: 'Delete prayer' }` may not match. To keep names clean, put the emoji in an `aria-hidden` span:

```tsx
            <span aria-hidden="true">🗑 </span>Delete prayer
```

- [ ] **Step 5: Run tests** → `npx vitest run src/screens/PrayerDetail.test.tsx` PASS.

- [ ] **Step 6: Whole suite + build** → `npx vitest run` all green (150), `npm run build` green.

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "feat: delete prayer with confirm and tap-to-toggle calendar dates"
```

---

## Self-review notes (already applied)

- Spec coverage: rename (T1), delete action + write (T2), delete UI + calendar toggle + future block + aria labels (T3). Derived-state consequences need no code (marks/counts/streaks recompute from logs).
- Type consistency: `DELETE_PRAYER { id }` used identically in reducer, mapper, and UI; `date` field name consistent across all TOGGLE_PRAYED sites.
- The mapper's `ctx.hadLogToday` field name intentionally unchanged (public-ish shape, tests reference it); only StoreContext's local is renamed.
