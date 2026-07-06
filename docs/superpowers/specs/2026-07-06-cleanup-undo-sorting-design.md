# Cleanup, Undo & Category Sorting — Design

**Date:** 2026-07-06
**Status:** Approved

## Goal

Three refinements to the Prayer App PWA:

1. Remove mock seed data, keeping a single demo group.
2. Add an Undo button to the Answered screen that returns a prayer to the active list.
3. Add a Recent/Category sort toggle to the Prayer List (Home), Answered, and Group Detail feed.

## 1. Mock data removal

`seedState()` in `src/store/persistence.ts` changes to:

- `prayers: []`
- `answered: []`
- `appStreak: { count: 0, lastPrayedDate: today }`
- `groups`: only **Morning Grace** (`g1`, 🌅, 6 members, 4 praying now, avatars JM/SK/DL/RP) — the other two groups are deleted. `requests` count stays consistent with its feed (3).
- `feeds`: only `g1` with its existing 3 posts.
- `profile` stays `{ name: 'Anna', initials: 'AR' }` — removing it would require an onboarding flow (out of scope).

### Enabled cleanup

- `GroupDetail.tsx` currently falls back to `g1`'s feed for groups without their own seeded feed. With a single group this is dead code; remove the fallback and dispatch against the group's own id.
- Home renders an empty-state line when `prayers` is empty ("No prayers yet — tap the mic to add one") instead of a bare bordered box.

Existing localStorage state is untouched — `loadState` only falls back to `seedState` for new/invalid state. No migration needed.

## 2. Undo on Answered

**Data model** (`src/store/types.ts`): `AnsweredPrayer` gains optional `streak?: number`.

**Reducer** (`src/store/reducer.ts`):

- `MARK_ANSWERED` stores the prayer's current `streak` on the answered entry.
- New action `UNDO_ANSWERED { id: string }`: removes the entry from `answered` and prepends `{ id, text, category, streak: entry.streak ?? 0, prayedToday: false }` to `prayers`. Unknown id → state unchanged.

Entries persisted before this change have no `streak`; they restore at 0 via the `?? 0` fallback.

**UI** (`src/screens/Answered.tsx`): each answered card gets an "Undo" button at the card's top-right that dispatches `UNDO_ANSWERED`.

## 3. Category sorting

**Shared component** `src/components/SortToggle.tsx`: a two-option segmented control, **Recent | Category**, props `{ value: 'recent' | 'category', onChange }`. Styled to match the existing oklch design language.

**Behavior:**

- Sort mode is per-screen local `useState`, default `'recent'` (the current order). Not persisted — it is view preference, not app state.
- Category sort orders items alphabetically by category name; ties keep their original relative order (stable sort over a copy — never mutate store arrays).

**Placement:**

- **Home:** below the "Prayer List" heading row, sorts `state.prayers`.
- **Answered:** below the gratitude banner, sorts `state.answered`.
- **Group Detail:** next to the "Shared requests" heading, sorts the feed. (Groups themselves have no category — sorting applies to the categorized feed items.)

## Testing

Vitest + Testing Library, following existing patterns:

- Reducer: `MARK_ANSWERED` stores streak; `UNDO_ANSWERED` restores prayer with streak, handles missing `streak` (→ 0) and unknown id (no-op).
- Persistence: seed-state tests updated for empty lists / single group.
- Screens: Answered shows Undo and dispatches correctly; sort toggle reorders items by category on Home, Answered, and GroupDetail; Home empty state renders.

## Out of scope

- Onboarding / profile editing.
- Persisting sort preference.
- Sorting the Groups list itself (no category on groups; only one group remains).
