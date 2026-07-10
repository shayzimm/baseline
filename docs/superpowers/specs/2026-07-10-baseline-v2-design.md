# Baseline v2 — Withings sync, supplements, meadow gamification

**Date:** 2026-07-10
**Status:** Approved direction, spec pending user review
**Scope:** Four phases: backup/schema refactor → supplement tracking → meadow gamification → Withings auto-sync. Notifications explicitly deferred.

---

## 1. Context and goals

Baseline is a single-user, local-first PWA (React + Vite + TypeScript, Dexie/IndexedDB, Tailwind, vite-plugin-pwa) deployed to GitHub Pages under a subpath. v1 shipped April 2026 with manual weight logging, progress pics, measurements, goals, and JSON export. The core v2 problem: the app works but doesn't get opened.

v2 goals, in order of behavioral importance:

1. Give the app daily *pull* — supplement tracking anchored to existing rituals (morning coffee, evening tea), wrapped in a cozy, forgiving gamification layer.
2. Remove the manual-weight-entry chore via Withings scale auto-sync.
3. Preserve the local-first property: health data at rest only on the device.

Non-goals (unchanged from v1): auth, cloud sync, food tracking, workout logging, social, AI insights. Push notifications are deferred (§7).

**Design constraint carried throughout:** mechanics must be cumulative and forgiving. No streaks, no loss states, no guilt. Reward return as much as consistency.

---

## 2. Approved decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Withings architecture | Stateless Cloudflare Worker as OAuth broker + API relay; tokens stored on-device in Dexie |
| 2 | Supplement data model | `supplements` definitions (archive, never delete) + `supplementLogs` event rows |
| 3 | Gamification mechanic | Monthly meadow: cumulative painterly scene derived purely from log data |
| 4 | Synced-data reward rule | Hybrid: Withings-synced weight creates a *bud*; it opens fully when the user opens the app and tends (logs supplements) that day |
| 5 | Build order | Phase 0 refactor → supplements → meadow → Withings |

Rationale for each is recorded in the session transcript; key points are inlined below where they shape implementation.

---

## 3. Phase 0 — backup & schema groundwork (refactor)

### Why first

For a local-only app the backup file is the only safety net. The current `exportAllData` / `importData` in `src/db/schema.ts` are hand-rolled per table and hard-locked to backup `version: 1`. Every new table would need manual re-plumbing, and a backup that silently omits new tables is worse than none.

### Changes

**Dexie schema v2** (additive migration, no data rewrite):

- New tables: `supplements`, `supplementLogs`, `withingsAuth` (§6).
- `DailyEntry` gains `source: 'manual' | 'withings'` (default `'manual'` for all existing rows — applied lazily via type default, no upgrade function needed since Dexie is schemaless per-row; reads treat `undefined` as `'manual'`).

**Backup format v2:**

- Export/import become table-driven: a single manifest lists exportable tables and their merge strategy, so adding a table is a one-line change.
- `withingsAuth` is **excluded from export**. A backup JSON containing a live refresh token would let anyone holding the file read the user's Withings data. Consequence: restoring a backup on a new device requires re-linking Withings — acceptable, and the re-link flow (§6) is built to be one tap.
- Photo Blobs remain excluded (unchanged from v1); binary export is parked in `FUTURE.md`.
- Import accepts both v1 and v2 files. v1 files import exactly as today; v2 adds the new tables.
- Merge strategy per table: `dailyEntries` upserts by unique `date` (v1 behavior, kept); `supplements` upserts by `id`; `supplementLogs` and `monthlyMeasurements` append with duplicate skip on `[supplementId+date]` / naive append respectively.

### Acceptance

- Existing v1 backup file imports cleanly on a fresh install.
- Round-trip: export v2 → wipe DB → import → all tables (minus exclusions) match.
- Existing UI is unaffected (schema change is additive).

---

## 4. Phase 1 — supplement tracking

### Data model

```ts
interface Supplement {
  id?: number
  name: string                 // "Magnesium glycinate"
  doseLabel: string            // "400mg", free text — display only, no unit math
  anchor: 'morning' | 'evening' | 'as-needed'
  sortOrder: number
  createdAt: number
  archivedAt: number | null    // soft delete; archived items keep history readable
}

interface SupplementLog {
  id?: number
  date: string                 // "YYYY-MM-DD"
  supplementId: number
  takenAt: number              // Date.now() at check-off
}
```

Indexes: `supplements: '++id, anchor'`; `supplementLogs: '++id, date, [supplementId+date]'` with a uniqueness guard on `[supplementId+date]` (one log per supplement per day).

Why event rows over a per-day boolean map: the stack will change over time; log rows keep per-supplement adherence queries indexed, stay append-only, and are exactly the shape the meadow derivation reads. Why archive-not-delete: deleting a definition would orphan historical logs into mystery IDs.

### Behavior

- Check off = insert log row; un-check = delete that row. No "missed" records are ever written — absence of a row *is* the miss, which keeps the data honest and the mechanic forgiving.
- Seed the user's current stack on first run of the feature (omega-3 morning, D3+MK-7 morning, magnesium glycinate evening, glycine evening, L-theanine as-needed, creatine — user picks anchor at seed time, default morning).
- Managing the stack (add/edit/archive/reorder) lives in Settings, not Today — Today stays a low-friction surface.

### UI (Today view)

Grouped by anchor with ritual labels: **"Morning · with coffee"**, **"Evening · with sleepy tea"**, and an **"As needed"** section. As-needed items have no unchecked/missed visual state — they are neutral until tapped. Tap = one-tap toggle with a soft bloom micro-animation (shared visual language with the meadow). Cool summer palette, no reds, no warning colors anywhere in this feature.

### Acceptance

- Two taps or fewer from app open to logging a morning dose.
- Archiving a supplement removes it from Today but leaves all history queryable and exported.
- Works offline (trivially true — pure Dexie).

---

## 5. Phase 2 — monthly meadow (gamification)

### Core principle

The meadow is a **pure function of log data** — no points table, no streak counter, no separate gamification state. Any month's scene can be re-derived at any time from `dailyEntries` + `supplementLogs`, which means it works retroactively on imported backups and Withings-synced history, and there is no state to corrupt or lose.

### Derivation rules

For each day of the current month:

- **Any log activity that day** (weight entry, ≥1 supplement log, mood, measurement) → a plant blooms at that day's position in the scene.
- **Fullness tiers**, derived, not stored: bare activity = a modest bloom; a "tended" day (opened the app and logged supplements at ≥1 anchor) = full bloom.
- **Synced-only days** (Withings weight arrived but the app was never opened / nothing tended): a *bud* — visible growth, clearly not yet open. If the user later opens the app that same day and tends, the bud opens. Past synced-only days remain buds permanently: honest, but never ugly — buds are part of the meadow's beauty, not a debt.
- **Missed days are empty ground.** Not dead flowers, not gaps with outlines — just soil/grass. A 60%-density meadow must still look intentional and beautiful; sparse is a look, not a failure state. This is an explicit art-direction requirement, not just a mechanic.
- **Return moment:** if the previous log activity was ≥3 days ago, the day's bloom is accompanied by a one-time gentle delight (firefly, butterfly, a rare flower variant) that *only* occurs on return days. Absence becomes the precondition for a small reward. Detection is derived (gap in log dates), not stored.

"Opened the app" is never tracked directly — no app-open telemetry table. Tending (a supplement log) is the proxy, which keeps derivation pure.

### Monthly arc and gallery

- Month end → the scene is archived to a gallery view (rendered on demand from historical data; nothing is snapshotted). Twelve collectible paintings a year.
- Each month gets a palette variation within the cool summer family (seasonal drift: mistier blues in winter, soft greens in spring). Every month starts as a clean slate without wiping the gallery — structural fresh starts without loss.

### Rendering approach

SVG scene composed from a hand-designed set of plant/element variants (deterministic per day — seeded by date string so the meadow is stable across renders and devices). Soft painterly styling via SVG filters/gradients within the existing token palette. No canvas, no game engine, no animation library — CSS transitions for bloom moments. This keeps it small, testable (pure derivation function → snapshot-testable), and consistent with the existing stack.

### Placement

The meadow lives on the Today view as the hero backdrop/header — it is the thing you see when you open the app, not a separate tab to remember to visit. Gallery of past months lives under Progress.

### Acceptance

- Derivation function is pure and unit-tested: given a set of log rows for a month, produces a deterministic scene description.
- Importing a v1 backup retroactively grows past meadows.
- A month with 40% logged days still renders as an aesthetically complete scene (art review, subjective but explicit).

---

## 6. Phase 3 — Withings auto-sync

### Architecture

Verified constraints that force the shape: Withings does not permit browser-JS API calls (no CORS), and token exchange requires the client secret. Therefore:

```
Phone (PWA)                    Cloudflare Worker (stateless)         Withings
───────────                    ─────────────────────────────         ────────
authorize redirect ──────────────────────────────────────────────▶ user consents
  ◀─────────────────────── callback with code (to PWA route) ◀──────┘
POST /token {code} ──────────▶ exchange w/ client_secret ──────────▶
  ◀── tokens ────────────────┘
store tokens in Dexie
POST /measures {token, since} ─▶ proxy getmeas ────────────────────▶
  ◀── weight data ───────────┘
POST /refresh {refreshToken} ─▶ refresh w/ client_secret ──────────▶
  ◀── new tokens ────────────┘
```

The worker holds **only the client secret** (env binding). No KV, no storage, no logs of payloads. Health data transits the worker over TLS but never rests there — the accurate description of the system becomes "local-first with a stateless accessory," and that framing goes in the README.

Worker endpoints: `POST /token`, `POST /refresh`, `POST /measures`. CORS locked to the GitHub Pages origin + localhost dev origin.

### On-device state

```ts
interface WithingsAuth {
  id: 1                        // singleton
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: number
  withingsUserId: string
  lastSyncedAt: number | null  // measure-group cursor for incremental fetch
}
```

Stored in Dexie, **excluded from backup export** (§3). Disconnecting Withings deletes the row.

### Token lifecycle — the part that will bite

Withings refresh tokens are single-use and rotate on every refresh; access tokens last 3 hours, so effectively every sync begins with a refresh. Rules:

1. Refresh happens in exactly one code path (a single `getValidToken()` used by all sync code), guarded against concurrent execution with the Web Locks API (`navigator.locks`) so two tabs can't race.
2. The new refresh token is written to Dexie **before** the access token is used for anything.
3. If refresh fails with an auth error (token already consumed / revoked), the app degrades gracefully: sync pauses, a calm one-tap "Reconnect your scale" card appears on Today. Re-linking is a first-class flow, not an error page — it *will* happen eventually and must cost one tap plus the Withings consent screen.

### Sync behavior

- Sync runs on app open (and on a manual pull gesture), fetching measure groups since `lastSyncedAt`. There is no background sync — "automatic" means "automatic when opened," which is fine for weight.
- **Daily-entry mapping:** first weigh-in of each calendar day wins (canonical morning weigh-in). Later same-day weigh-ins are ignored. "Calendar day" means the device's local timezone at sync time — Withings returns UTC epoch timestamps, and the conversion happens on-device so the day boundary matches the user's lived day.
- **Manual entries always win:** sync never overwrites an entry with `source: 'manual'`. Synced rows get `source: 'withings'`. A manual edit of a synced value flips it to manual and pins it.
- Weight unit conversion happens at the boundary (Withings returns kg-based values with unit exponents; store normalized `weightKg` like today).

### OAuth flow details

- Redirect URI is a PWA route under the GitHub Pages subpath (e.g. `/baseline/withings/callback`); registered with Withings alongside the localhost dev URI.
- OAuth `state` parameter: random nonce stored in `sessionStorage`, verified on callback (CSRF protection).
- Withings developer app registration (personal use) is a user setup step, documented in the repo.

### Acceptance

- Link flow: Settings → Connect Withings → consent → back in app with tokens stored, historical weights backfilled.
- Weight appears in Today/Progress with a subtle "synced" indicator; meadow shows buds for synced-only days.
- Kill the app mid-refresh (simulated) → next open recovers or shows the reconnect card; never a corrupt state.
- Manual entry made before sync of the same day survives the sync.

---

## 7. Notifications — deferred, with a decision criterion

Real reminders would require Web Push: a server to send pushes and stored subscriptions, i.e. Workers KV + cron — breaking the worker's statelessness for an unproven need. The supplement stack is already anchored to physical rituals (coffee, tea), which behaviorally outperforms notifications, and a native Android alarm costs zero code as a backstop.

**Revisit trigger:** after ~1 month of supplement data, if evening-anchor adherence is materially below morning-anchor adherence, that is the evidence that justifies KV + cron push. Until then, no notification code.

---

## 8. Build order & phase gates

| Phase | Scope | Gate before next |
|-------|-------|------------------|
| 0 | Dexie v2 schema, `source` field, table-driven export/import, backup v2 + v1 import compat | Round-trip export/import test passes; v1 file imports |
| 1 | Supplements: tables, seed, Today checklist UI, Settings management | User logs real doses for a few days — friction check |
| 2 | Meadow: derivation function, SVG scene, Today placement, gallery | User reaction: does it create pull? |
| 3 | Withings: worker, OAuth, sync, reconnect flow | End-to-end with the real scale |

Withings is deliberately last: it carries the highest stall risk (external account, OAuth debugging, new deploy target), and a stall after the app is already fun is a shrug rather than a project-killer.

## 9. Error handling & testing

- **Dexie operations:** existing patterns kept (typed helpers in `src/db/`); new helpers follow the same style. Import validates shape before writing, as today.
- **Worker:** returns Withings' error body verbatim plus a stable error code; the PWA maps codes to calm UI states (offline → "will sync later", auth → reconnect card). No error state uses alarm colors.
- **Testing:** the meadow derivation and backup import/export are pure functions — unit test these thoroughly (this is where regressions would silently hurt). Worker gets a small integration test against Withings' demo mode. UI flows verified manually per phase gate; no E2E harness for a single-user hobby app (deliberate).

## 10. Out of scope → FUTURE.md

Created alongside this spec: binary export including photo Blobs (**important — only safety net for pics**), mood-driven meadow weather/sky, Health Connect via native wrapper (the "true local-first endgame" for scale data), Web Push via KV + cron (with the §7 trigger), AI insights (no compelling case yet).
