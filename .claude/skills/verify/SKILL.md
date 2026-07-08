---
name: verify
description: Build/launch/drive recipe for verifying prayer-app changes in a real browser
---

# Verifying prayer-app

React 19 + Vite PWA, mobile-viewport (430px), state in localStorage (`prayer-app-state-v1`).

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

- **Mic FAB never settles**: `animate-mic-float` runs forever, so `page.click('button[aria-label="Add prayer by voice"]')` times out on the stability check. Use `{ force: true }`.
- **Ambiguous "Answered" text**: every PrayerRow has an "Answered" button (uppercase-styled, accessible name "Mark … as answered"), and the bottom-nav buttons are named `Prayers`, `Groups`, `Answered`, `Reminders` (SVG icons, label text only). Scope nav clicks to the nav container or use exact accessible names.
- **Screen persists across reload**: the app restores the last screen from localStorage (same day), so after `page.reload()` you land where you were — don't wait for the Home heading.
- **No speech API in headless Chrome**: the voice overlay opens straight in typed-fallback review mode; fill the "What would you like to pray for?" textarea and click "Add to prayer list".
- Fresh seed = empty prayers/answered, one group (Morning Grace). Seed legacy/odd states by writing `prayer-app-state-v1` via `page.evaluate` then reloading.

## Flows worth driving

Add prayer (typed fallback) → mark prayed → mark answered → Undo on Answered (streak chip `· ND` should survive) → category filter chips on Home/Answered/group feed → reload for persistence.
