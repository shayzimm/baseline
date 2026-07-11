# FUTURE.md — parked ideas

Things deliberately not in scope for v2. Parked, not rejected.

## Important

- **Binary export including photo Blobs.** Progress pics live only in IndexedDB and are excluded from JSON export — one lost phone loses every photo. The backup file is the only safety net for a local-only app; this is the biggest gap in it.

## Someday / maybe

- **Mood-driven meadow weather.** `moodRating` already exists on daily entries — it could drive the scene's sky/light (misty, clear, golden hour). Natural extension once the meadow ships.
- **Health Connect via native wrapper (Capacitor/TWA).** The scale data is already on the phone via Health Connect; a native bridge would make Withings sync fully local with no worker at all. The "true local-first endgame," but it's a platform migration, not a feature.
- **Web Push supplement reminders.** Requires Workers KV + cron (breaks worker statelessness). Revisit trigger defined in the v2 spec §7: only if evening-anchor adherence lags morning-anchor adherence after ~1 month of real data.
- **AI insights.** No compelling case yet; revisit if a concrete question emerges that the charts can't answer.

## Small debt noticed during v2 Phase 0/1 reviews

- **AppShell renders children twice** (mobile + desktop containers, CSS-toggled). Both React trees are live: doubled live-query subscriptions and DOM. Fix: pick one layout via a `matchMedia` hook instead of dual render.
- **No midnight refresh.** "Today" is computed at render; a view left open across local midnight shows yesterday until something re-renders. Low stakes for short mobile sessions.
- **Checklist a11y:** the row `aria-label` drops the dose label; screen readers don't hear "5g". Use `aria-describedby` on the dose span.
- **`dev-dist/` is tracked in git** (generated dev service worker) — eslint now ignores it, but it should be gitignored too; it produces constant spurious diffs.
- **Local-date regression test is timezone-dependent** — pin `TZ` in vitest config if tests ever run on a UTC machine, or the localDateString test loses its teeth.
- **3 pre-existing v1 lint errors** (WeightChart `any`, QuickStats `Date.now()`-at-render, Today setState-in-effect) — real but v1-behavior-touching; clean up opportunistically.
