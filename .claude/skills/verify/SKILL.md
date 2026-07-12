---
name: verify
description: Build/launch/drive recipe for verifying prayer-app changes in a real browser
---

# Verifying prayer-app

React 19 + Vite PWA, mobile-viewport (430px). Data lives in Supabase, per-user;
localStorage only holds a per-user cache (`prayer-app-cache-v2:<userId>`) plus,
transiently, the pre-account legacy snapshot (`prayer-app-state-v1`).

## Launch

```bash
npx vite --port 5199 --strictPort   # run in background from repo root
```

## Drive

No Playwright in the repo. Install `playwright-core` in the scratchpad (no browser download) and drive system Chrome:

```js
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 430, height: 900 } })
```

## Gotchas

- **Requires Supabase credentials**: the app reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env.local` (see `.env.example`) and needs a signed-in Google session to reach the app shell. Before completing OAuth, the sign-in screen is the expected — and correct — first render; don't treat it as a failure. WITHOUT `.env.local`, however, the app throws `supabaseUrl is required.` at module load and renders a blank page — that's a config error to fix (set up `.env.local`), not something to verify around.
- **Sign-in is not automatable headlessly**: Google OAuth requires a real, headed browser and manual click-through. Headless verification is limited to the sign-in screen itself unless a session already exists (e.g. an already-authenticated persistent browser profile).
- **Forged-session harness (no real backend needed)**: to drive signed-in UI headlessly, use dummy env vars (`https://fake-project.supabase.co`), then `page.addInitScript` seeding BOTH `sb-fake-project-auth-token` (a session object: unexpired `expires_at`, JWT-shaped `access_token` with future `exp`, `user.id`) and `prayer-app-cache-v2:<that user.id>` (a full AppState fixture). supabase-js emits INITIAL_SESSION from storage without network; `fetchAll` fails → sync dot + cached state renders, and all local flows are drivable. Guard the init script with a marker key so reloads don't re-seed over app-written state (re-seeding fakes "state didn't persist" bugs).
- **Cache key is per-user**: the local cache lives at `prayer-app-cache-v2:<userId>`, not a single fixed key. The pre-account key `prayer-app-state-v1` is legacy — it's only read once (to import into Supabase on first sign-in of a fresh account) and is not the source of truth otherwise.
- **Seeding a legacy-import test state**: write an old-shape snapshot to `prayer-app-state-v1` via `page.evaluate` BEFORE signing in (shape: `{prayers: [{id, text, category, streak, prayedToday}], answered: [{id, text, category, answeredAt, streak?}]}` with uuid ids) — the next sign-in hydration imports it into Supabase and clears the key.
- **Mic FAB never settles**: `animate-mic-float` runs forever, so `page.click('button[aria-label="Add prayer by voice"]')` times out on the stability check. Use `{ force: true }`.
- **Ambiguous "Answered" text**: every PrayerRow has an "Answered" button (uppercase-styled, accessible name "Mark … as answered"), and the bottom-nav buttons are named `Prayers`, `Groups`, `Answered`, `Reminders` (SVG icons, label text only). Scope nav clicks to the nav container or use exact accessible names.
- **Screen persists across reload**: the app restores the last screen from the per-user cache, so after `page.reload()` you land where you were — don't wait for the Home heading.
- **No speech API in headless Chrome**: the voice overlay opens straight in typed-fallback review mode; fill the "What would you like to pray for?" textarea and click "Add to prayer list".

## Flows worth driving

Sign in with Google → add prayer (typed fallback) → mark prayed → mark answered → Undo on Answered (streak chip `· ND` should survive) → category filter chips on Home/Answered/group feed → open a prayer to view its history/calendar → reload for persistence → sign out clears the per-user cache.
