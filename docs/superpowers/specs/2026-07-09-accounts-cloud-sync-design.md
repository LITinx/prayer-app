# Accounts & Cloud Sync with Prayer History (Stage 1) — Design

**Date:** 2026-07-09 (revised 2026-07-11: per-user custom categories)
**Status:** Approved

## Goal

Turn the single-device PWA into a multi-user app: Google sign-in, personal data stored in Supabase, and per-prayer history ("which days did I pray for this") recorded as an event log and shown in a detail view.

This is stage 1 of 3. Stage 2 (real groups) and stage 3 (reminders/push) are out of scope; the Groups tab keeps its local demo data untouched.

## Decisions made

- **Backend:** Supabase (Postgres + auth + RLS). Frontend hosting: Vercel free tier, deployed from the GitHub repo.
- **Data location:** everything syncs to the cloud; localStorage remains only as a per-user warm-start cache.
- **Auth:** Google sign-in only (magic links can be added later in Supabase config). Signed-out users see a sign-in screen; there is no guest mode.
- **Sync architecture:** the existing reducer stays the optimistic source of UI truth; every data-changing action also fires the matching Supabase write in the background (approach A). Full offline-first queueing (approach B) is a later evolution; per-screen fetching (approach C) was rejected — biggest rewrite, loses offline feel.
- **History:** an append-only `prayer_logs` table, one row per prayer per day. Streaks, prayed-today, and day counts are all derived from it — no stored counters to drift.
- **History UI:** a prayer detail **page** (not modal), following the existing groupDetail navigation pattern, opened by tapping the prayer text on Home or Answered. Shows "prayed N days" and a month calendar with prayed days marked.
- **Categories are per-user data, not a hardcoded list.** Every user gets the 8 defaults seeded at signup and can add their own. Creation happens inline in the category picker (a "+ New" chip); rename/delete UI is deferred.

## Database schema

```sql
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  initials   text not null,
  created_at timestamptz not null default now()
);
-- trigger on auth.users insert: create profile, name/initials from Google metadata

create table categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  name       text not null,
  hue        smallint not null check (hue between 0 and 359),  -- drives the oklch color
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
-- the profile-creation trigger also seeds the 8 default categories with their
-- current hues: Health 12, Family 300, Gratitude 150, Guidance 258,
-- Provision 55, Friends 210, Work 30, Church 285

create table prayers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  text        text not null,
  category_id uuid not null references categories(id) on delete restrict,
  answered_at timestamptz,               -- null = active
  created_at  timestamptz not null default now()
);

create table prayer_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  prayer_id  uuid not null references prayers(id) on delete cascade,
  prayed_on  date not null,
  created_at timestamptz not null default now(),
  unique (prayer_id, prayed_on)          -- daily check is idempotent
);
```

RLS on all four tables: `user_id = auth.uid()` (profiles: `id = auth.uid()`) for select/insert/update/delete.

`on delete restrict` on `prayers.category_id`: a category with prayers can't be deleted (no delete UI in stage 1 anyway; a future manage UI must reassign first). `unique (user_id, name)` keeps the picker unambiguous.

**Derived values** (pure client helpers in `src/lib/history.ts`, unit-tested):

- `prayedToday(logs, prayerId, today)` — log row exists for today
- `streak(logs, prayerId, today)` — consecutive days walking back from today/yesterday
- `daysPrayed(logs, prayerId)` — total row count
- `appStreak(logs, today)` — same walk over distinct dates across all logs
- `monthMarks(logs, prayerId, yearMonth)` — dates for the calendar

Active vs answered is one table (`answered_at` null or set); Mark Answered and Undo are single-column updates and never touch history. Scale check: 20 prayers/day for 5 years ≈ 36k rows — fetch all of a user's logs at load, compute client-side.

## Client architecture

New modules; existing ones adapt:

- `src/lib/supabase.ts` — client from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- `src/auth/` — session hook (`useSession`), `SignIn` screen ("Continue with Google" → `signInWithOAuth`), sign-out in a small account menu on the Home avatar.
- `src/sync/` — the only module that talks to Supabase for data. `fetchAll(userId)` hydrates state; `writeThrough(action, state)` maps reducer actions to Supabase writes (insert prayer, insert/delete log row, set/clear `answered_at`). Failed writes retry once, then set a `syncError` flag shown as a small indicator; next successful write clears it.
- **State model change:** `AppState.prayers` entries lose `streak`/`prayedToday` (derived instead); a new `logs: PrayerLog[]` slice holds the event log; `answered` merges into `prayers` with `answeredAt`. A new `categories: Category[]` slice holds the user's categories. The reducer stays pure and synchronous — components derive display values via the history helpers.
- **Categories become entities.** `Category` changes from a string union to `{ id, name, hue }`; prayers reference `categoryId`. `catColor` computes the oklch trio from the stored `hue` instead of the hardcoded `CATEGORY_HUES` map, so custom categories get the same visual treatment for free. `CategoryTag` / `CategoryFilter` take the category object. The group feed's demo data keeps plain string names untouched (its own local types) until stage 2 — where a shared request will carry a category *name snapshot*, since the author's categories are private to them.
- **Creating a category:** the voice-overlay category picker gains a "+ New" chip → inline name input; hue auto-assigned (the hue on the default palette wheel furthest from the user's existing hues). New action `ADD_CATEGORY`, written through like any other action.
- **Voice auto-categorization:** `categorize()` returns a category *name* from its keyword rules; the overlay matches it case-insensitively against the user's categories and falls back to no pre-selection if the user renamed/removed that default. Custom categories are never auto-suggested (no keywords for them).
- **App shell:** signed out → `SignIn`; signed in → hydrate from Supabase (localStorage cache shown instantly while fetching), then the app as today.

### Screens

- **PrayerDetail** (new): `screen: 'prayerDetail'` + `activePrayerId` in state, `‹ Back` link like groupDetail. Content: prayer text, category tag, answered badge if answered, "prayed N days", month calendar (current month, ‹ › to page) with prayed days dotted. Opened by tapping prayer text on Home rows and Answered cards.
- **Home / Answered:** unchanged visually; values now derived from logs.

### Daily reset

Gone as a mechanism. `prayedToday` is a date comparison, so a new day changes it with no writes; the `lastVisitDate` reset logic in `loadState` is removed.

### Migration of existing local data

On first sign-in, if the account has no prayers and local state does: import prayers and answered entries, mapping each one's category name to the user's freshly seeded default categories by name (all local data uses the 8 defaults, so this always resolves); for each prayer with `streak = N > 0`, backfill N consecutive `prayer_logs` rows ending at today (prayedToday true) or yesterday. This preserves streaks; dates before that are honestly unknowable and not fabricated further. After import, clear the pre-account localStorage key.

## Setup checklist (user)

1. Create a Supabase project; run the schema SQL (provided as `supabase/schema.sql` in the repo).
2. Google Cloud Console: OAuth client (web), authorized redirect = Supabase callback URL.
3. Supabase Auth: enable Google provider with that client ID/secret; add `http://localhost:5199` and the Vercel URL to allowed redirect URLs.
4. `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (also set in Vercel).
5. Vercel: import the GitHub repo, framework Vite.

## Error handling

- OAuth failure/cancel → stay on SignIn with a retry message.
- Hydration failure with a warm cache → show cached data + sync indicator; without cache → error state with retry.
- Write failure → retry once, then `syncError` indicator; the optimistic local state is kept (approach A accepts rare divergence; stage 1 does not queue offline writes).

## Testing

- History helpers: pure unit tests (streak edges: today/yesterday/gap, month boundaries, empty log).
- Reducer: updated for the new state shape; same TDD style as now.
- Sync mapping: unit tests with the Supabase client mocked at the `src/sync/` boundary (action → expected table writes).
- Categories: hue auto-assignment, name-match fallback in voice categorization, `ADD_CATEGORY` reducer/write-through, "+ New" chip flow.
- Screens: auth gate, PrayerDetail rendering/calendar, tap-to-open navigation, first-sign-in import flow.
- End-to-end: real Supabase project required — blocked on the user's credentials; verified manually per the project verify skill once available.

## Out of scope

- Groups backend, feed sync, invites (stage 2); reminders/push (stage 3).
- Offline write queue / conflict resolution; multi-tab live sync (Supabase realtime) — later.
- Magic-link auth, account deletion UI, profile editing beyond Google-provided name/initials.
- Category management UI (rename, delete, recolor, reorder) — the schema supports it; stage 1 ships create-only.
- Stats extras (longest streak, weekly patterns) — the log supports them later.
