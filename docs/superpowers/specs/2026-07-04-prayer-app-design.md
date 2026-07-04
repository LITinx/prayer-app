# Prayer App — Design Spec

**Date:** 2026-07-04
**Source design:** claude.ai/design project `7dc83549-55df-410c-8b55-969b2d840bb2`, file `Prayer App.dc.html`
**Target:** `/Users/daniel/Projects/prayer-app`

## Summary

A mobile-first prayer companion PWA. Users keep a personal prayer list, check off prayers as prayed each day, track streaks, mark prayers answered, browse prayer groups (demo data in v1), and add new prayers by voice with automatic categorization. No backend: all state persists to localStorage.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| App type | React PWA (Vite), installable, offline-capable |
| Styling | Tailwind v4; inline styles for runtime-computed values (category hues, avatar colors) |
| Voice input | Web Speech API with typed fallback; auto-categorize either way |
| Groups | Interactive demo data persisted locally; screens match design exactly; backend-ready later |
| Reminders tab | "Coming soon" placeholder screen in app style |
| Layout | Full-viewport mobile app; ≥480px viewports center a 430px column on the design's blue gradient. No phone bezel/status bar |

## Architecture

- **Stack:** Vite + React 18 + TypeScript + Tailwind v4 + `vite-plugin-pwa` + Vitest.
- **State:** single store via `useReducer` + React context. Persisted to localStorage on every change; hydrated on load; first launch seeds the mockup's sample data (5 active prayers, 3 answered, 3 groups, feed for group g1).
- **Navigation:** screen switching via store state (`home | groups | groupDetail | answered | reminders`). No router.

## File layout

```
src/
  App.tsx                — shell: screen switcher, bottom nav, voice overlay mount
  store/
    types.ts             — Prayer, AnsweredPrayer, Group, FeedItem, Screen, Profile
    reducer.ts           — actions: togglePrayed, markAnswered, addPrayer,
                           toggleFeedPray, navigate, voice lifecycle
    persistence.ts       — load/save localStorage, seed data
  screens/
    Home.tsx             — greeting, streak card, prayer list
    Groups.tsx           — group cards + invite CTA
    GroupDetail.tsx      — header, share/invite buttons, request feed
    Answered.tsx         — gratitude banner + answered list
    Reminders.tsx        — "coming soon" placeholder
  components/
    BottomNav.tsx        — 4 tabs + center mic FAB
    PrayerRow.tsx        — checkbox, text, category tag, streak, Answered button
    CategoryTag.tsx      — dot + label, hue-driven colors
    StreakCard.tsx       — blue gradient banner
  voice/
    VoiceOverlay.tsx     — bottom sheet: listening state / review state
    useSpeech.ts         — Web Speech API hook w/ capability detection
    categorize.ts        — keyword → category rules (ported from mockup)
```

## Data model

```ts
type Category = 'Health' | 'Family' | 'Gratitude' | 'Guidance'
              | 'Provision' | 'Friends' | 'Work' | 'Church';

interface Prayer       { id: string; text: string; category: Category;
                         streak: number; prayedToday: boolean }
interface AnsweredPrayer { id: string; text: string; category: Category;
                         answeredAt: number /* epoch ms */ }
interface Group        { id: string; name: string; emoji: string; members: number;
                         requests: number; prayingNow: number; avatars: string[] }
interface FeedItem     { id: string; author: string; initials: string; agoLabel: string;
                         text: string; category: Category; praying: number; prayed: boolean }
interface AppStreak    { count: number; lastPrayedDate: string /* YYYY-MM-DD */ }
interface Profile      { name: string; initials: string }  // seeded: Anna / AR
```

Category hues (JS map, runtime-computed oklch colors): Health 12, Family 300, Gratitude 150, Guidance 258, Provision 55, Friends 210, Work 30, Church 285. Tag fg `oklch(0.5 0.13 h)`, bg `oklch(0.95 0.045 h)`, dot `oklch(0.62 0.15 h)`.

## Behaviors

- **Prayed-today toggle:** checking increments that prayer's streak; unchecking decrements (floor 0). Streak card shows "N of M prayers lifted today."
- **Daily rollover:** `prayedToday` flags reset when the stored date ≠ today (checked on hydrate).
- **App streak:** praying at least one prayer on consecutive days increments `AppStreak.count`; a missed day resets to 1. Displayed on the streak card.
- **Mark answered:** removes from active list, prepends to answered with `answeredAt = now`; displayed as relative time ("just now", "3 days ago", "last week").
- **Voice flow:** FAB → bottom sheet in *listening* state (live interim transcript, EQ bars, pulsing stop button) → stop → *review* state (editable text, suggested category via keyword rules, category chips, Discard / Add to prayer list). Add prepends prayer with streak 0 and navigates home.
- **Speech fallback:** if SpeechRecognition is unsupported or mic permission denied, the sheet opens directly in review mode with an empty editable text field.
- **Auto-categorization** (first match wins, ported from mockup): health terms → Health; gratitude terms → Gratitude; provision/finance terms → Provision; family terms → Family; "friend" → Friends; default → Guidance.
- **Groups:** cards list demo groups; detail shows feed for the group (g1 has seeded feed; others reuse it, as in the mockup). "Pray · N" toggles increment/decrement and persist.
- **Greeting/date:** real time-of-day greeting + real formatted date. Profile name/initials from seeded data.
- **Reminders:** placeholder screen, "coming soon" styled like the app.

## Visual fidelity

- Font: Hanken Grotesk (weights 400–800), self-hosted or Google Fonts.
- All oklch colors, gradients, radii, shadows ported verbatim from the mockup.
- Keyframes ported: `pulseRing`, `micFloat`, `eq`, `fadeUp`, `caret`, `checkPop`.
- Shared tokens in Tailwind `@theme`; one-off values as arbitrary values; runtime-computed colors as inline styles.
- Bottom nav: frosted glass bar (blur, translucent white), center mic FAB floating above; safe-area insets respected.
- Phone bezel, notch, and fake status bar from the mockup are **not** implemented.

## Error handling

- localStorage read: try/catch; corrupt JSON → reseed. Write failures ignored.
- Speech: capability detection before use; permission-denied and `onerror` → typed fallback path. No dead-end states.

## Testing (Vitest)

- Reducer: togglePrayed streak math, markAnswered move, addPrayer prepend, toggleFeedPray, daily rollover, app-streak consecutive/missed-day logic.
- `categorize.ts`: one case per category rule + default.
- Persistence: save/load round-trip, corrupt-data reseed.
- Component smoke tests: Home renders seeded list; VoiceOverlay renders listening and review states.

## Out of scope (v1)

- Real accounts, sync, or shared groups (backend later; store shapes are backend-ready).
- Reminders functionality (placeholder only).
- Editing/deleting existing prayers, undo for mark-answered.
- Streak-card `showStreaks` prop from the mockup (always shown).
