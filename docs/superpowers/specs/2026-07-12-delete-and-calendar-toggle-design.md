# Delete Prayers & Calendar Date Toggle — Design

**Date:** 2026-07-12
**Status:** Approved

## Goal

Two additions to the prayer detail page:

1. Delete a prayer (active or answered) permanently, with an inline confirmation.
2. Tap calendar dates (past or today; future blocked) to toggle the prayed mark retroactively.

## 1. Delete prayer

**Reducer** (`src/store/reducer.ts`): new action `DELETE_PRAYER { id: string }`.
- Removes the prayer from `prayers` AND all its rows from `logs` (mirrors the DB cascade locally).
- Navigates back to the originating screen: `home` if the prayer was active (`answeredAt === null`), `answered` otherwise; clears `activePrayerId`.
- Unknown id → state unchanged.

**Sync** (`src/sync/mapper.ts`): `DELETE_PRAYER` → `{ table: 'prayers', op: 'delete', match: { id } }`. The schema's `prayer_logs.prayer_id … on delete cascade` removes the history server-side; no second write.

**UI** (`src/screens/PrayerDetail.tsx`): below the calendar card, a quiet "🗑 Delete prayer" button. Tapping swaps it inline (same pattern as the voice overlay's "+ New" chip) for:

> Delete forever? This erases its prayer history — **[Cancel] [Delete]**

Cancel restores the quiet button; Delete dispatches `DELETE_PRAYER`. Works for both active and answered prayers.

## 2. Calendar date toggle

**No new action.** `TOGGLE_PRAYED` already implements "toggle the log row for (prayer, date)" end-to-end — reducer insert/delete, `hadLogToday` context in StoreContext, idempotent upsert/delete writes. The action field `today` is renamed to `date` to reflect its general meaning (mechanical rename in reducer, mapper, StoreContext, PrayerRow, and tests).

**UI** (`src/screens/PrayerDetail.tsx`): day cells with date ≤ today (lexical compare of `YYYY-MM-DD` built from the cursor year/month and the cell day vs `todayStr()`) render as buttons dispatching `TOGGLE_PRAYED { id, date, logId: crypto.randomUUID() }`. Future dates keep the current non-interactive rendering. Cell aria-labels gain the action, e.g. `"11, prayed — tap to unmark"` / `"12 — tap to mark prayed"`; future cells keep the plain label.

**Derived-state consequences (intended):**
- Marks, "Prayed N days", streak chips, and the app streak all update instantly (they derive from `logs`).
- Retroactively filling yesterday extends a live streak; unmarking a day can break one.
- Today's calendar cell and the Home checkbox stay in sync automatically.
- Applies to answered prayers too — their history stays editable.

## Testing

- Reducer: `DELETE_PRAYER` removes prayer + its logs and navigates correctly (active → home, answered → answered); unknown id no-op. `TOGGLE_PRAYED` with an arbitrary past date inserts/removes that date's row.
- Mapper: `DELETE_PRAYER` → prayers delete write; toggle write uses the action's `date`.
- PrayerDetail: tapping a past unmarked date marks it (and count increments); tapping again unmarks; tapping a future date does nothing; delete flow — confirm appears, Cancel restores, Delete lands on the right screen and the prayer is gone from its list.

## Out of scope

- Undo/trash for deleted prayers (delete is permanent by design).
- Bulk editing, drag-select on the calendar.
- Editing other users' data (stage 2 groups remain demo-only).
