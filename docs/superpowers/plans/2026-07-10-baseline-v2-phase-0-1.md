# Baseline v2 — Phase 0 (backup/schema) + Phase 1 (supplements) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Dexie v2 schema with table-driven v2 backups (v1-compatible import), then supplement tracking with a ritual-grouped checklist on the Today view and stack management in Settings.

**Architecture:** All changes are local-only (Dexie/IndexedDB) — no network, no worker. `src/db/schema.ts` keeps the Dexie class + core helpers; backup logic moves to a new `src/db/backup.ts` (table-driven manifest); supplement helpers live in a new `src/db/supplements.ts`. UI follows the existing inline-style + CSS-variable idiom. Spec: `docs/superpowers/specs/2026-07-10-baseline-v2-design.md`.

**Tech Stack:** React 19 + TypeScript + Dexie 4 (existing). New dev deps: `vitest`, `fake-indexeddb` (Dexie unit tests in Node).

**Conventions for every task:**
- Work on branch `v2-phase-0-1` (created in Task 0).
- Run tests with `npm test` (added in Task 0). Expected output shown per step.
- Commit after each task with the message given in the task.
- UI code uses inline styles with CSS variables (`var(--color-…)`), fonts `'Geist'` (UI), `'JetBrains Mono'` (labels), matching the existing views. No Tailwind classes in these files — the existing views don't use them.

---

## File structure (locked in)

| File | Responsibility |
|------|----------------|
| `src/db/schema.ts` (modify) | Dexie class, table interfaces, version blocks, `upsertTodayEntry`, `getSettings`. Export/import code **moves out**. |
| `src/db/backup.ts` (create) | `BACKUP_VERSION`, `exportAllData`, `importData` (v1 + v2), `ImportResult`. |
| `src/db/supplements.ts` (create) | `DEFAULT_STACK`, `seedDefaultStackOnce`, `toggleSupplementLog`. |
| `src/db/index.ts` (modify) | Re-exports; consumers keep importing from `../../db`. |
| `src/db/__tests__/schema.test.ts` (create) | Schema/migration tests. |
| `src/db/__tests__/backup.test.ts` (create) | Export shape, v1 import, v2 round-trip. |
| `src/db/__tests__/supplements.test.ts` (create) | Seed-once, toggle. |
| `src/test/setup.ts`, `vitest.config.ts` (create) | Test bootstrap (`fake-indexeddb`). |
| `src/views/Today/SupplementChecklist.tsx` (create) | Ritual-grouped daily checklist card. |
| `src/views/Today/index.tsx` (modify) | Mount checklist between hero card and QuickStats. |
| `src/views/Settings/shared.tsx` (create) | `SectionHeading` + `SettingsCard` extracted from Settings index. |
| `src/views/Settings/SupplementsSection.tsx` (create) | Stack management (add/edit/archive/reorder). |
| `src/views/Settings/index.tsx` (modify) | Use shared components, mount SupplementsSection, clear new tables in DangerZone, show new import counts. |
| `src/App.tsx` (modify) | Call `seedDefaultStackOnce()` on mount. |
| `package.json` (modify) | `test` script + dev deps. |

---

## Task 0: Branch + test infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `src/test/setup.ts`, `src/db/__tests__/schema.test.ts`

- [ ] **Step 1: Create the working branch**

```bash
git checkout -b v2-phase-0-1
```

- [ ] **Step 2: Install test dependencies**

```bash
npm install -D vitest fake-indexeddb
```

- [ ] **Step 3: Add the test script to `package.json`**

In the `"scripts"` block, after `"lint"`:

```json
"lint": "eslint .",
"test": "vitest run",
"test:watch": "vitest",
```

- [ ] **Step 4: Create `vitest.config.ts`** (separate file — do not touch `vite.config.ts`; it carries the PWA config)

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 5: Create `src/test/setup.ts`**

```ts
// Provides globalThis.indexedDB in Node so Dexie works in unit tests.
import 'fake-indexeddb/auto'
```

- [ ] **Step 6: Write a sanity test — `src/db/__tests__/schema.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db, getSettings } from '../schema'

// Fresh DB per test: delete + reopen re-runs the populate hook.
beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('BaselineDB', () => {
  it('seeds default settings on first open', async () => {
    const settings = await getSettings()
    expect(settings.units).toBe('metric')
    expect(settings.measurementSites).toContain('waist')
    expect(settings.appLockEnabled).toBe(false)
  })

  it('enforces one daily entry per date', async () => {
    const entry = {
      date: '2026-07-10', weightKg: 80, moodRating: null, notes: null,
      createdAt: Date.now(), updatedAt: Date.now(),
    }
    await db.dailyEntries.add(entry)
    await expect(db.dailyEntries.add({ ...entry })).rejects.toThrow()
  })
})
```

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: 2 tests PASS. (These test *existing* behavior — if they fail, stop and investigate before proceeding.)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test/setup.ts src/db/__tests__/schema.test.ts
git commit -m "test: add vitest + fake-indexeddb infrastructure with schema sanity tests"
```

---

## Task 1: Dexie v2 schema

**Files:**
- Modify: `src/db/schema.ts`
- Test: `src/db/__tests__/schema.test.ts`

- [ ] **Step 1: Write failing tests** — append to the `describe('BaselineDB', …)` block in `src/db/__tests__/schema.test.ts`:

```ts
  it('has v2 tables: supplements, supplementLogs, withingsAuth', async () => {
    const id = await db.supplements.add({
      name: 'Creatine', doseLabel: '5g', anchor: 'morning',
      sortOrder: 0, createdAt: Date.now(), archivedAt: null,
    })
    expect(await db.supplements.get(id)).toMatchObject({ name: 'Creatine' })

    await db.supplementLogs.add({ supplementId: id, date: '2026-07-10', takenAt: Date.now() })
    expect(await db.supplementLogs.where('date').equals('2026-07-10').count()).toBe(1)

    await db.withingsAuth.put({
      id: 1, accessToken: 'a', refreshToken: 'r',
      accessTokenExpiresAt: 0, withingsUserId: 'u', lastSyncedAt: null,
    })
    expect(await db.withingsAuth.get(1)).toBeDefined()
  })

  it('rejects a duplicate supplement log for the same supplement and day', async () => {
    const id = await db.supplements.add({
      name: 'Glycine', doseLabel: '', anchor: 'evening',
      sortOrder: 0, createdAt: Date.now(), archivedAt: null,
    })
    await db.supplementLogs.add({ supplementId: id, date: '2026-07-10', takenAt: Date.now() })
    await expect(
      db.supplementLogs.add({ supplementId: id, date: '2026-07-10', takenAt: Date.now() })
    ).rejects.toThrow()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: the 2 new tests FAIL (`db.supplements is undefined` / type errors); the 2 sanity tests still pass.

- [ ] **Step 3: Add the v2 interfaces and version block to `src/db/schema.ts`**

Add `source` to `DailyEntry` (after `notes`):

```ts
export interface DailyEntry {
  id?: number
  date: string           // ISO date "YYYY-MM-DD", unique index
  weightKg: number | null
  moodRating: 1 | 2 | 3 | 4 | 5 | null
  notes: string | null
  source?: 'manual' | 'withings'   // absent on v1 rows — treat undefined as 'manual'
  createdAt: number      // Date.now()
  updatedAt: number
}
```

Add the new interfaces after `Settings`:

```ts
export interface Supplement {
  id?: number
  name: string
  doseLabel: string                // "400mg" — display only, no unit math
  anchor: 'morning' | 'evening' | 'as-needed'
  sortOrder: number
  createdAt: number
  archivedAt: number | null        // soft delete; archived items keep history readable
}

export interface SupplementLog {
  id?: number
  date: string                     // "YYYY-MM-DD"
  supplementId: number
  takenAt: number                  // Date.now() at check-off
}

export interface WithingsAuth {
  id: 1                            // singleton — always ID 1
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: number
  withingsUserId: string
  lastSyncedAt: number | null      // sync cursor for incremental fetch
}
```

Extend the Dexie class — add the three table properties and the `version(2)` block (keep `version(1)` exactly as is; Dexie merges schemas across versions, so v2 lists only the new tables):

```ts
class BaselineDB extends Dexie {
  dailyEntries!: Table<DailyEntry>
  weeklyPics!: Table<WeeklyPic>
  monthlyMeasurements!: Table<MonthlyMeasurement>
  settings!: Table<Settings>
  supplements!: Table<Supplement>
  supplementLogs!: Table<SupplementLog>
  withingsAuth!: Table<WithingsAuth>

  constructor() {
    super('BaselineDB')
    this.version(1).stores({
      // &date = unique index (enforces one entry per day at the DB level)
      dailyEntries: '++id, &date',
      weeklyPics: '++id, date',
      monthlyMeasurements: '++id, date',
      settings: 'id',
    })
    this.version(2).stores({
      // archivedAt is not indexed: IndexedDB can't index null, and the
      // table is small enough to filter in JS
      supplements: '++id, anchor',
      // &[supplementId+date] = unique compound index (one log per supplement per day)
      supplementLogs: '++id, date, &[supplementId+date]',
      withingsAuth: 'id',
    })
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all 4 tests PASS.

- [ ] **Step 5: Verify the app still builds**

Run: `npm run build`
Expected: clean build (the schema change is additive; no UI touches the new tables yet).

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/__tests__/schema.test.ts
git commit -m "feat: Dexie v2 schema — supplements, supplementLogs, withingsAuth, DailyEntry.source"
```

---

## Task 2: Table-driven v2 export in `src/db/backup.ts`

**Files:**
- Create: `src/db/backup.ts`
- Modify: `src/db/schema.ts` (delete `exportAllData`), `src/db/index.ts`
- Test: `src/db/__tests__/backup.test.ts`

- [ ] **Step 1: Write failing tests — create `src/db/__tests__/backup.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { exportAllData } from '../backup'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('exportAllData (backup v2)', () => {
  it('exports version 2 with all tables keyed by name, excluding withingsAuth', async () => {
    await db.dailyEntries.add({
      date: '2026-07-10', weightKg: 80, moodRating: 4, notes: null,
      source: 'manual', createdAt: 1, updatedAt: 1,
    })
    const suppId = await db.supplements.add({
      name: 'Creatine', doseLabel: '5g', anchor: 'morning',
      sortOrder: 0, createdAt: 1, archivedAt: null,
    })
    await db.supplementLogs.add({ supplementId: suppId, date: '2026-07-10', takenAt: 1 })
    await db.withingsAuth.put({
      id: 1, accessToken: 'SECRET', refreshToken: 'SECRET',
      accessTokenExpiresAt: 0, withingsUserId: 'u', lastSyncedAt: null,
    })

    const data = await exportAllData()

    expect(data.version).toBe(2)
    expect(data.tables.dailyEntries).toHaveLength(1)
    expect(data.tables.supplements).toHaveLength(1)
    expect(data.tables.supplementLogs).toHaveLength(1)
    expect(data.tables.settings).toHaveLength(1)
    // Tokens must never leave the device in a backup file
    expect(JSON.stringify(data)).not.toContain('SECRET')
    expect('withingsAuth' in data.tables).toBe(false)
  })

  it('strips image blobs from weeklyPics', async () => {
    await db.weeklyPics.add({
      date: '2026-07-10', front: new Blob(['x']), side: null, back: null,
      notes: 'week 1', createdAt: 1,
    })
    const data = await exportAllData()
    const pic = data.tables.weeklyPics[0] as Record<string, unknown>
    expect(pic['front']).toBeUndefined()
    expect(pic['notes']).toBe('week 1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: new file FAILS with "Cannot find module '../backup'". Schema tests still pass.

- [ ] **Step 3: Create `src/db/backup.ts`** with the manifest and export:

```ts
import { db, type DailyEntry, type MonthlyMeasurement, type Settings, type Supplement, type SupplementLog, type WeeklyPic } from './schema'

export const BACKUP_VERSION = 2

// Tables included in JSON backups. withingsAuth is deliberately excluded:
// a backup holding a live refresh token would grant Withings access to
// anyone with the file (restoring on a new device re-links the scale
// instead). weeklyPics ships metadata only — Blobs can't JSON.stringify.
const EXPORTED_TABLES = [
  'dailyEntries',
  'weeklyPics',
  'monthlyMeasurements',
  'settings',
  'supplements',
  'supplementLogs',
] as const

export interface BackupFile {
  version: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

export async function exportAllData(): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {}
  for (const name of EXPORTED_TABLES) {
    tables[name] = await db.table(name).toArray()
  }
  tables['weeklyPics'] = (tables['weeklyPics'] as WeeklyPic[]).map(
    ({ front: _f, side: _s, back: _b, ...rest }) => ({
      ...rest,
      _note: 'Image blobs excluded — see FUTURE.md',
    })
  )
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  }
}
```

(The unused type imports `DailyEntry`, `MonthlyMeasurement`, `Settings`, `Supplement`, `SupplementLog` are used by Task 3's import code — if the linter complains at this intermediate step, leave only `WeeklyPic` and add the rest in Task 3.)

- [ ] **Step 4: Delete `exportAllData` from `src/db/schema.ts`** (the whole function including its comment block, lines currently under `// Export all data as a plain JSON-serialisable object.`).

- [ ] **Step 5: Update `src/db/index.ts`**

```ts
export {
  db,
  upsertTodayEntry,
  getSettings,
  importData,
} from './schema'

export { exportAllData, BACKUP_VERSION } from './backup'
export type { BackupFile } from './backup'

export type {
  DailyEntry,
  WeeklyPic,
  MonthlyMeasurement,
  Settings,
  Supplement,
  SupplementLog,
  WithingsAuth,
} from './schema'
```

(`importData` still lives in schema.ts until Task 3 moves it.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: all tests PASS (2 backup + 4 schema).

- [ ] **Step 7: Commit**

```bash
git add src/db/backup.ts src/db/schema.ts src/db/index.ts src/db/__tests__/backup.test.ts
git commit -m "feat: table-driven backup v2 export with withingsAuth exclusion"
```

---

## Task 3: v2 import with v1 compatibility

**Files:**
- Modify: `src/db/backup.ts` (add import), `src/db/schema.ts` (delete `importData`), `src/db/index.ts`
- Test: `src/db/__tests__/backup.test.ts`

- [ ] **Step 1: Write failing tests** — append to `src/db/__tests__/backup.test.ts`. Add `importData` to the existing import from `'../backup'`, then:

```ts
describe('importData', () => {
  it('imports a v1 backup file (current production format)', async () => {
    const v1File = {
      version: 1,
      exportedAt: '2026-04-01T00:00:00.000Z',
      entries: [
        { date: '2026-03-30', weightKg: 82.1, moodRating: 3, notes: 'ok day', createdAt: 1, updatedAt: 1 },
        { date: '2026-03-31', weightKg: 81.9, moodRating: null, notes: null, createdAt: 2, updatedAt: 2 },
      ],
      pics: [],
      measurements: [
        { date: '2026-03-01', measurements: { waist: 82 }, notes: null, createdAt: 1 },
      ],
      settings: [],
    }
    const result = await importData(v1File)
    expect(result).toMatchObject({ entries: 2, measurements: 1, supplements: 0, supplementLogs: 0 })
    const entry = await db.dailyEntries.where('date').equals('2026-03-30').first()
    expect(entry?.weightKg).toBe(82.1)
  })

  it('v1 import merges into an existing entry by date instead of duplicating', async () => {
    await db.dailyEntries.add({
      date: '2026-03-30', weightKg: 99, moodRating: null, notes: null,
      createdAt: 1, updatedAt: 1,
    })
    await importData({
      version: 1,
      entries: [{ date: '2026-03-30', weightKg: 82.1, moodRating: 3, notes: null, createdAt: 1, updatedAt: 1 }],
    })
    expect(await db.dailyEntries.where('date').equals('2026-03-30').count()).toBe(1)
    const entry = await db.dailyEntries.where('date').equals('2026-03-30').first()
    expect(entry?.weightKg).toBe(82.1)
  })

  it('round-trips a v2 export through a wiped database', async () => {
    await db.dailyEntries.add({
      date: '2026-07-10', weightKg: 80, moodRating: 4, notes: 'hi',
      source: 'manual', createdAt: 1, updatedAt: 1,
    })
    const suppId = await db.supplements.add({
      name: 'Creatine', doseLabel: '5g', anchor: 'morning',
      sortOrder: 0, createdAt: 1, archivedAt: null,
    })
    await db.supplementLogs.add({ supplementId: suppId, date: '2026-07-10', takenAt: 1 })
    await db.monthlyMeasurements.add({ date: '2026-07-01', measurements: { waist: 80 }, notes: null, createdAt: 1 })
    await db.settings.update(1, { units: 'imperial' })

    const backup = await exportAllData()
    await db.delete()
    await db.open()

    const result = await importData(backup)
    expect(result).toMatchObject({ entries: 1, measurements: 1, supplements: 1, supplementLogs: 1 })
    expect((await db.dailyEntries.toArray())[0]).toMatchObject({ date: '2026-07-10', weightKg: 80 })
    expect((await db.supplements.toArray())[0]).toMatchObject({ name: 'Creatine' })
    expect(await db.supplementLogs.count()).toBe(1)
    expect((await db.settings.get(1))?.units).toBe('imperial')
  })

  it('importing the same v2 file twice does not duplicate supplement logs', async () => {
    const suppId = await db.supplements.add({
      name: 'Creatine', doseLabel: '5g', anchor: 'morning',
      sortOrder: 0, createdAt: 1, archivedAt: null,
    })
    await db.supplementLogs.add({ supplementId: suppId, date: '2026-07-10', takenAt: 1 })
    const backup = await exportAllData()

    const result = await importData(backup)
    expect(result.supplementLogs).toBe(0)
    expect(await db.supplementLogs.count()).toBe(1)
  })

  it('rejects unknown versions and malformed input', async () => {
    await expect(importData({ version: 99 })).rejects.toThrow('Unsupported backup version')
    await expect(importData(null)).rejects.toThrow('Invalid data format')
    await expect(importData('nope')).rejects.toThrow('Invalid data format')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `importData` is not exported from `'../backup'`.

- [ ] **Step 3: Add import logic to `src/db/backup.ts`** (append after `exportAllData`):

```ts
export interface ImportResult {
  entries: number
  measurements: number
  supplements: number
  supplementLogs: number
}

export async function importData(raw: unknown): Promise<ImportResult> {
  if (typeof raw !== 'object' || raw == null) throw new Error('Invalid data format')
  const data = raw as Record<string, unknown>
  if (data['version'] === 1) return importV1(data)
  if (data['version'] === 2) return importV2(data)
  throw new Error('Unsupported backup version')
}

// v1 files have top-level keys: entries, pics, measurements, settings.
// v1 never imported pics or settings — behavior kept.
async function importV1(data: Record<string, unknown>): Promise<ImportResult> {
  const entries = Array.isArray(data['entries']) ? (data['entries'] as DailyEntry[]) : []
  const measurements = Array.isArray(data['measurements'])
    ? (data['measurements'] as MonthlyMeasurement[])
    : []
  return {
    entries: await upsertEntries(entries),
    measurements: await appendMeasurements(measurements),
    supplements: 0,
    supplementLogs: 0,
  }
}

// v2 files carry a `tables` object keyed by table name. weeklyPics is
// skipped on import: rows without their image blobs would be junk.
async function importV2(data: Record<string, unknown>): Promise<ImportResult> {
  const tables = (data['tables'] ?? {}) as Record<string, unknown[]>
  const result: ImportResult = { entries: 0, measurements: 0, supplements: 0, supplementLogs: 0 }

  result.entries = await upsertEntries(
    Array.isArray(tables['dailyEntries']) ? (tables['dailyEntries'] as DailyEntry[]) : []
  )
  result.measurements = await appendMeasurements(
    Array.isArray(tables['monthlyMeasurements'])
      ? (tables['monthlyMeasurements'] as MonthlyMeasurement[])
      : []
  )

  if (Array.isArray(tables['supplements'])) {
    for (const s of tables['supplements'] as Supplement[]) {
      if (!s.name) continue
      await db.supplements.put(s)   // upsert by id — ids are stable per spec §3
      result.supplements++
    }
  }

  if (Array.isArray(tables['supplementLogs'])) {
    for (const l of tables['supplementLogs'] as SupplementLog[]) {
      if (!l.date || l.supplementId == null) continue
      const exists = await db.supplementLogs
        .where('[supplementId+date]').equals([l.supplementId, l.date]).first()
      if (!exists) {
        await db.supplementLogs.add({
          date: l.date, supplementId: l.supplementId, takenAt: l.takenAt ?? Date.now(),
        })
        result.supplementLogs++
      }
    }
  }

  const settingsRows = Array.isArray(tables['settings']) ? (tables['settings'] as Settings[]) : []
  if (settingsRows[0]) await db.settings.put({ ...settingsRows[0], id: 1 })

  return result
}

// Shared merge helpers (used by both v1 and v2 paths)

async function upsertEntries(entries: DailyEntry[]): Promise<number> {
  let count = 0
  for (const e of entries) {
    if (!e.date) continue
    const existing = await db.dailyEntries.where('date').equals(e.date).first()
    if (existing?.id != null) {
      await db.dailyEntries.update(existing.id, {
        weightKg: e.weightKg ?? null,
        moodRating: e.moodRating ?? null,
        notes: e.notes ?? null,
        source: e.source ?? 'manual',
        updatedAt: Date.now(),
      })
    } else {
      await db.dailyEntries.add({
        date: e.date,
        weightKg: e.weightKg ?? null,
        moodRating: e.moodRating ?? null,
        notes: e.notes ?? null,
        source: e.source ?? 'manual',
        createdAt: e.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      })
    }
    count++
  }
  return count
}

async function appendMeasurements(measurements: MonthlyMeasurement[]): Promise<number> {
  let count = 0
  for (const m of measurements) {
    if (!m.date) continue
    await db.monthlyMeasurements.add({
      date: m.date,
      measurements: m.measurements ?? {},
      notes: m.notes ?? null,
      createdAt: m.createdAt ?? Date.now(),
    })
    count++
  }
  return count
}
```

- [ ] **Step 4: Delete `importData` from `src/db/schema.ts`** (the whole function under `// ─── Import ───` including the comment divider). `schema.ts` should now end after `getSettings`.

- [ ] **Step 5: Update `src/db/index.ts`** — move `importData` to the backup export line and add `ImportResult`:

```ts
export {
  db,
  upsertTodayEntry,
  getSettings,
} from './schema'

export { exportAllData, importData, BACKUP_VERSION } from './backup'
export type { BackupFile, ImportResult } from './backup'

export type {
  DailyEntry,
  WeeklyPic,
  MonthlyMeasurement,
  Settings,
  Supplement,
  SupplementLog,
  WithingsAuth,
} from './schema'
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: all tests PASS (schema 4, backup 7).

- [ ] **Step 7: Commit**

```bash
git add src/db/backup.ts src/db/schema.ts src/db/index.ts src/db/__tests__/backup.test.ts
git commit -m "feat: backup v2 import with v1 compatibility and duplicate-safe merges"
```

---

## Task 4: Settings wiring + Phase 0 verification

**Files:**
- Modify: `src/views/Settings/index.tsx`

- [ ] **Step 1: Update `DataSection`'s import-result state and display** in `src/views/Settings/index.tsx`.

Change the state type (currently `{ entries: number; measurements: number } | null`):

```ts
import type { ImportResult } from '../../db'
// …
const [importResult, setImportResult] = useState<ImportResult | null>(null)
```

Change the result display line inside the `{importResult && (…)}` block:

```tsx
Imported {importResult.entries} entries · {importResult.measurements} measurements · {importResult.supplements} supplements · {importResult.supplementLogs} logs ✓
```

- [ ] **Step 2: Update `DangerZone.clearAll`** — add the three new tables after the existing `clear()` calls:

```ts
await db.dailyEntries.clear()
await db.weeklyPics.clear()
await db.monthlyMeasurements.clear()
await db.supplements.clear()
await db.supplementLogs.clear()
await db.withingsAuth.clear()
```

- [ ] **Step 3: Verify lint, types, build, tests all pass**

Run: `npm run lint && npm test && npm run build`
Expected: all clean.

- [ ] **Step 4: Manual verification in the preview** (dev server via preview tools):

1. App loads; Today/Progress/Goals/Settings all render (migration didn't break v1 data paths).
2. Settings → Export downloads a JSON; open it: `version: 2`, `tables` object present, **no `withingsAuth` key**.
3. Settings → Import that same file: success message shows all four counts, no duplicates created.
4. If a real pre-v2 backup file exists, import it and confirm entries appear (v1 compat with production data).

- [ ] **Step 5: Commit** (Phase 0 complete — gate: round-trip verified)

```bash
git add src/views/Settings/index.tsx
git commit -m "feat: Settings wiring for backup v2 — import counts, clear new tables"
```

---

## Task 5: Supplement helpers + seed

**Files:**
- Create: `src/db/supplements.ts`
- Modify: `src/db/index.ts`, `src/App.tsx`
- Test: `src/db/__tests__/supplements.test.ts`

- [ ] **Step 1: Write failing tests — create `src/db/__tests__/supplements.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { DEFAULT_STACK, seedDefaultStackOnce, toggleSupplementLog } from '../supplements'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('seedDefaultStackOnce', () => {
  it('seeds the default stack into an empty table, once', async () => {
    await seedDefaultStackOnce()
    expect(await db.supplements.count()).toBe(DEFAULT_STACK.length)

    await seedDefaultStackOnce()
    expect(await db.supplements.count()).toBe(DEFAULT_STACK.length)
  })

  it('does not re-seed when all supplements are archived', async () => {
    await seedDefaultStackOnce()
    const all = await db.supplements.toArray()
    for (const s of all) await db.supplements.update(s.id!, { archivedAt: Date.now() })

    await seedDefaultStackOnce()
    expect(await db.supplements.count()).toBe(DEFAULT_STACK.length)
  })
})

describe('toggleSupplementLog', () => {
  it('adds a log row, then removes it on second toggle', async () => {
    const id = await db.supplements.add({
      name: 'Creatine', doseLabel: '5g', anchor: 'morning',
      sortOrder: 0, createdAt: Date.now(), archivedAt: null,
    })

    expect(await toggleSupplementLog(id, '2026-07-10')).toBe(true)
    expect(await db.supplementLogs.count()).toBe(1)

    expect(await toggleSupplementLog(id, '2026-07-10')).toBe(false)
    expect(await db.supplementLogs.count()).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — "Cannot find module '../supplements'".

- [ ] **Step 3: Create `src/db/supplements.ts`**

```ts
import { db, type Supplement } from './schema'

// The user's current evidence-based stack, seeded on first run of the
// feature. Anchors mirror real rituals: morning coffee, evening sleepy tea.
export const DEFAULT_STACK: Array<Pick<Supplement, 'name' | 'doseLabel' | 'anchor'>> = [
  { name: 'Omega-3', doseLabel: 'Nordic Naturals', anchor: 'morning' },
  { name: 'Vitamin D3 + MK-7', doseLabel: '', anchor: 'morning' },
  { name: 'Creatine', doseLabel: '5g', anchor: 'morning' },
  { name: 'Magnesium glycinate', doseLabel: '', anchor: 'evening' },
  { name: 'Glycine', doseLabel: 'powder', anchor: 'evening' },
  { name: 'L-theanine', doseLabel: '', anchor: 'as-needed' },
]

// Seed only when the table has never had rows. Archived rows keep the
// count > 0, so this cannot re-seed over a deliberately emptied stack.
export async function seedDefaultStackOnce(): Promise<void> {
  const count = await db.supplements.count()
  if (count > 0) return
  const now = Date.now()
  await db.supplements.bulkAdd(
    DEFAULT_STACK.map((s, i) => ({ ...s, sortOrder: i, createdAt: now, archivedAt: null }))
  )
}

// Toggle a day's log row for a supplement. Returns true if now taken.
// Absence of a row IS the miss — no "missed" records are ever written.
export async function toggleSupplementLog(supplementId: number, date: string): Promise<boolean> {
  const existing = await db.supplementLogs
    .where('[supplementId+date]').equals([supplementId, date]).first()
  if (existing?.id != null) {
    await db.supplementLogs.delete(existing.id)
    return false
  }
  await db.supplementLogs.add({ supplementId, date, takenAt: Date.now() })
  return true
}
```

- [ ] **Step 4: Add to `src/db/index.ts`** (after the backup exports):

```ts
export { DEFAULT_STACK, seedDefaultStackOnce, toggleSupplementLog } from './supplements'
```

- [ ] **Step 5: Call the seed from `src/App.tsx`** — add `useEffect` to the react import, `seedDefaultStackOnce` to the db import, and the effect at the top of `App()`:

```ts
import { useState, useEffect, lazy, Suspense } from 'react'
// …
import { db, seedDefaultStackOnce } from './db'

export function App() {
  // … existing state …

  useEffect(() => {
    seedDefaultStackOnce()
  }, [])
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS (schema 4, backup 7, supplements 3).

- [ ] **Step 7: Commit**

```bash
git add src/db/supplements.ts src/db/index.ts src/App.tsx src/db/__tests__/supplements.test.ts
git commit -m "feat: supplement helpers — default stack seed and daily log toggle"
```

---

## Task 6: SupplementChecklist on the Today view

**Files:**
- Create: `src/views/Today/SupplementChecklist.tsx`
- Modify: `src/views/Today/index.tsx`

- [ ] **Step 1: Create `src/views/Today/SupplementChecklist.tsx`**

Design requirements from the spec: grouped by anchor with ritual labels; as-needed items have no missed/unchecked-warning state; one-tap toggle with a soft bloom micro-animation; cool palette, no warning colors; counter excludes as-needed items.

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { Check } from 'lucide-react'
import { db, toggleSupplementLog, type Supplement } from '../../db'

const ANCHOR_LABELS: Record<Supplement['anchor'], string> = {
  morning: 'Morning · with coffee',
  evening: 'Evening · with sleepy tea',
  'as-needed': 'As needed',
}

export function SupplementChecklist() {
  const today = new Date().toISOString().slice(0, 10)

  const supplements = useLiveQuery(
    async () =>
      (await db.supplements.toArray())
        .filter(s => s.archivedAt == null)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    []
  )
  const logs = useLiveQuery(
    () => db.supplementLogs.where('date').equals(today).toArray(),
    [today]
  )

  if (!supplements || supplements.length === 0) return null

  const takenIds = new Set((logs ?? []).map(l => l.supplementId))
  const daily = supplements.filter(s => s.anchor !== 'as-needed')
  const takenCount = daily.filter(s => takenIds.has(s.id!)).length

  const groups = (['morning', 'evening', 'as-needed'] as const)
    .map(anchor => ({ anchor, items: supplements.filter(s => s.anchor === anchor) }))
    .filter(g => g.items.length > 0)

  return (
    <div
      style={{
        background: 'var(--color-surface-alt)',
        borderRadius: 24,
        padding: '18px 20px',
        marginBottom: 12,
        border: '1px solid var(--color-line)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '1.3px',
            textTransform: 'uppercase',
            color: 'var(--color-ink-mute)',
          }}
        >
          Supplements
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: takenCount === daily.length && daily.length > 0
              ? 'var(--color-good)'
              : 'var(--color-ink-faint)',
          }}
        >
          {takenCount}/{daily.length}
        </span>
      </div>

      {groups.map(({ anchor, items }) => (
        <div key={anchor} style={{ marginBottom: 10 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '1px',
              color: 'var(--color-ink-faint)',
              margin: '0 0 6px 2px',
            }}
          >
            {ANCHOR_LABELS[anchor]}
          </div>
          {items.map(s => (
            <SupplementRow
              key={s.id}
              supplement={s}
              taken={takenIds.has(s.id!)}
              onToggle={() => toggleSupplementLog(s.id!, today)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function SupplementRow({
  supplement, taken, onToggle,
}: {
  supplement: Supplement
  taken: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={taken}
      aria-label={`${supplement.name}${taken ? ' — taken today' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 12px',
        marginBottom: 6,
        borderRadius: 14,
        border: '1px solid',
        borderColor: taken ? 'transparent' : 'var(--color-line)',
        background: taken ? 'var(--color-accent-soft)' : 'var(--color-surface)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* The "bloom": overshoot easing makes the check swell open like a petal */}
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: taken ? 'var(--color-accent-deep)' : 'var(--color-surface-alt)',
          border: taken ? 'none' : '1.5px solid var(--color-line)',
          color: '#fff',
          transform: taken ? 'scale(1)' : 'scale(0.85)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease',
        }}
      >
        {taken && <Check size={14} strokeWidth={2.5} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontFamily: "'Geist', system-ui",
            fontSize: 15,
            color: taken ? 'var(--color-accent-deep)' : 'var(--color-ink)',
          }}
        >
          {supplement.name}
        </span>
        {supplement.doseLabel && (
          <span
            style={{
              display: 'block',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--color-ink-mute)',
              marginTop: 1,
            }}
          >
            {supplement.doseLabel}
          </span>
        )}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Mount it in `src/views/Today/index.tsx`** — add the import and place it between the hero weight card and `<QuickStats />`:

```tsx
import { SupplementChecklist } from './SupplementChecklist'
// …
      {/* ── Supplements ─────────────────────────────────────── */}
      <SupplementChecklist />

      {/* ── 7-day quick stats (hidden until ≥ 2 entries) ───── */}
      <QuickStats />
```

- [ ] **Step 3: Verify in the preview**

1. Today view shows the Supplements card with three groups: "Morning · with coffee" (Omega-3, Vitamin D3 + MK-7, Creatine), "Evening · with sleepy tea" (Magnesium glycinate, Glycine), "As needed" (L-theanine).
2. Tapping a row toggles it: background shifts to accent-soft, check blooms in with overshoot. Tapping again unchecks.
3. Counter reads `n/5` (L-theanine excluded from denominator).
4. Toggle L-theanine — counter unchanged.
5. Reload the page — checked state persists (Dexie-backed).
6. No console errors.

- [ ] **Step 4: Run checks**

Run: `npm run lint && npm test && npm run build`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add src/views/Today/SupplementChecklist.tsx src/views/Today/index.tsx
git commit -m "feat: ritual-grouped supplement checklist on Today view"
```

---

## Task 7: Stack management in Settings

**Files:**
- Create: `src/views/Settings/shared.tsx`, `src/views/Settings/SupplementsSection.tsx`
- Modify: `src/views/Settings/index.tsx`

- [ ] **Step 1: Create `src/views/Settings/shared.tsx`** — move `SectionHeading` and `SettingsCard` verbatim out of `index.tsx`:

```tsx
export function SectionHeading({ children }: { children: string }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '1.4px',
      textTransform: 'uppercase', color: 'var(--color-ink-mute)', marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

export function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-surface-alt)', borderRadius: 20,
      border: '1px solid var(--color-line)', overflow: 'hidden', marginBottom: 8,
    }}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Update `src/views/Settings/index.tsx`** — delete its local `SectionHeading` and `SettingsCard` definitions and add:

```tsx
import { SectionHeading, SettingsCard } from './shared'
```

- [ ] **Step 3: Create `src/views/Settings/SupplementsSection.tsx`**

Behavior: active list sorted by `sortOrder` with up/down reorder arrows and archive; tapping a row opens inline edit (name, dose, anchor); add form at the bottom; archived items collapsed behind an "Archived (n)" toggle with restore.

```tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, X, ChevronUp, ChevronDown, Archive, ArchiveRestore } from 'lucide-react'
import { db, type Supplement } from '../../db'
import { SectionHeading, SettingsCard } from './shared'

const ANCHORS = ['morning', 'evening', 'as-needed'] as const
const ANCHOR_SHORT: Record<Supplement['anchor'], string> = {
  morning: 'AM', evening: 'PM', 'as-needed': 'PRN',
}

interface FormState {
  name: string
  doseLabel: string
  anchor: Supplement['anchor']
}

const EMPTY_FORM: FormState = { name: '', doseLabel: '', anchor: 'morning' }

export function SupplementsSection() {
  const supplements = useLiveQuery(() => db.supplements.toArray(), [])
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showArchived, setShowArchived] = useState(false)

  if (!supplements) return null

  const active = supplements
    .filter(s => s.archivedAt == null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const archived = supplements.filter(s => s.archivedAt != null)

  const startEdit = (s: Supplement) => {
    setEditingId(s.id!)
    setForm({ name: s.name, doseLabel: s.doseLabel, anchor: s.anchor })
  }

  const startAdd = () => {
    setEditingId('new')
    setForm(EMPTY_FORM)
  }

  const cancel = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const save = async () => {
    const name = form.name.trim()
    if (!name) return
    if (editingId === 'new') {
      const maxSort = active.reduce((m, s) => Math.max(m, s.sortOrder), -1)
      await db.supplements.add({
        name, doseLabel: form.doseLabel.trim(), anchor: form.anchor,
        sortOrder: maxSort + 1, createdAt: Date.now(), archivedAt: null,
      })
    } else if (editingId != null) {
      await db.supplements.update(editingId, {
        name, doseLabel: form.doseLabel.trim(), anchor: form.anchor,
      })
    }
    cancel()
  }

  const move = async (index: number, dir: -1 | 1) => {
    const a = active[index]
    const b = active[index + dir]
    if (!a?.id || !b?.id) return
    await db.transaction('rw', db.supplements, async () => {
      await db.supplements.update(a.id!, { sortOrder: b.sortOrder })
      await db.supplements.update(b.id!, { sortOrder: a.sortOrder })
    })
  }

  const archive = (id: number) => db.supplements.update(id, { archivedAt: Date.now() })
  const restore = (id: number) => db.supplements.update(id, { archivedAt: null })

  return (
    <section style={{ marginBottom: 28 }}>
      <SectionHeading>Supplements</SectionHeading>
      <SettingsCard>
        {active.map((s, i) => (
          <div key={s.id}>
            {editingId === s.id ? (
              <EditForm form={form} setForm={setForm} onSave={save} onCancel={cancel} />
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 10px 18px',
                borderBottom: '1px solid var(--color-line)',
              }}>
                <button
                  onClick={() => startEdit(s)}
                  style={{
                    flex: 1, minWidth: 0, background: 'none', border: 'none',
                    padding: 0, textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'block', fontFamily: "'Geist', system-ui", fontSize: 15, color: 'var(--color-ink)' }}>
                    {s.name}
                  </span>
                  <span style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--color-ink-mute)', marginTop: 1 }}>
                    {ANCHOR_SHORT[s.anchor]}{s.doseLabel ? ` · ${s.doseLabel}` : ''}
                  </span>
                </button>
                <IconButton label={`Move ${s.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronUp size={15} />
                </IconButton>
                <IconButton label={`Move ${s.name} down`} disabled={i === active.length - 1} onClick={() => move(i, 1)}>
                  <ChevronDown size={15} />
                </IconButton>
                <IconButton label={`Archive ${s.name}`} onClick={() => archive(s.id!)}>
                  <Archive size={15} />
                </IconButton>
              </div>
            )}
          </div>
        ))}

        {editingId === 'new' ? (
          <EditForm form={form} setForm={setForm} onSave={save} onCancel={cancel} />
        ) : (
          <button
            onClick={startAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '12px 18px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Geist', system-ui", fontSize: 14, color: 'var(--color-accent-deep)',
              textAlign: 'left',
            }}
          >
            <Plus size={16} /> Add supplement
          </button>
        )}

        {archived.length > 0 && (
          <div style={{ borderTop: '1px solid var(--color-line)' }}>
            <button
              onClick={() => setShowArchived(v => !v)}
              style={{
                display: 'block', width: '100%', padding: '10px 18px',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-ink-faint)',
              }}
            >
              {showArchived ? '▾' : '▸'} Archived ({archived.length})
            </button>
            {showArchived && archived.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px 8px 18px',
              }}>
                <span style={{ flex: 1, fontFamily: "'Geist', system-ui", fontSize: 14, color: 'var(--color-ink-mute)' }}>
                  {s.name}
                </span>
                <IconButton label={`Restore ${s.name}`} onClick={() => restore(s.id!)}>
                  <ArchiveRestore size={15} />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--color-ink-faint)', margin: '2px 4px 0' }}>
        Archiving keeps history — nothing is deleted
      </div>
    </section>
  )
}

function IconButton({
  label, disabled, onClick, children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        background: 'none', border: 'none', padding: 6, display: 'flex',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'var(--color-line)' : 'var(--color-ink-faint)',
      }}
    >
      {children}
    </button>
  )
}

function EditForm({
  form, setForm, onSave, onCancel,
}: {
  form: FormState
  setForm: (f: FormState) => void
  onSave: () => void
  onCancel: () => void
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 40, borderRadius: 10,
    border: '1.5px solid var(--color-accent)', padding: '0 12px',
    fontFamily: "'Geist', system-ui", fontSize: 14,
    background: 'var(--color-surface)', color: 'var(--color-ink)', outline: 'none',
    boxSizing: 'border-box', marginBottom: 8,
  }
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-line)' }}>
      <input
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        placeholder="Name (e.g. Creatine)"
        autoFocus
        style={inputStyle}
      />
      <input
        value={form.doseLabel}
        onChange={e => setForm({ ...form, doseLabel: e.target.value })}
        placeholder="Dose (e.g. 5g) — optional"
        style={inputStyle}
      />
      <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface)', borderRadius: 12, padding: 3, marginBottom: 10 }}>
        {ANCHORS.map(a => (
          <button
            key={a}
            onClick={() => setForm({ ...form, anchor: a })}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              background: form.anchor === a ? 'var(--color-accent-deep)' : 'transparent',
              color: form.anchor === a ? '#fff' : 'var(--color-ink-mute)',
              transition: 'all 0.15s',
            }}
          >
            {a === 'as-needed' ? 'as needed' : a}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onSave}
          style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: 'var(--color-accent-deep)', color: '#fff', fontFamily: "'Geist', system-ui", fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          aria-label="Cancel"
          style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'var(--color-surface)', color: 'var(--color-ink-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Mount it in `src/views/Settings/index.tsx`** after `<MeasurementSitesSection />`:

```tsx
import { SupplementsSection } from './SupplementsSection'
// …
      <MeasurementSitesSection />
      <SupplementsSection />
      <DataSection />
```

- [ ] **Step 5: Verify in the preview**

1. Settings shows the Supplements section with the six seeded items, anchor chips (AM/PM/PRN), dose labels.
2. Reorder with arrows — order changes and persists; Today view reflects the new order.
3. Tap a row → inline edit; change anchor morning→evening → it moves groups on Today.
4. Add a new supplement → appears at the bottom of its anchor group on Today.
5. Archive one → disappears from Today, appears under "Archived (1)"; restore it → returns.
6. Export data → JSON contains the supplement changes.
7. No console errors.

- [ ] **Step 6: Run checks**

Run: `npm run lint && npm test && npm run build`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add src/views/Settings/shared.tsx src/views/Settings/SupplementsSection.tsx src/views/Settings/index.tsx
git commit -m "feat: supplement stack management in Settings (add/edit/archive/reorder)"
```

---

## Task 8: Final verification + phase gate

- [ ] **Step 1: Full check suite**

Run: `npm run lint && npm test && npm run build`
Expected: all clean, 14 tests passing.

- [ ] **Step 2: Full manual walkthrough in the preview**

1. Fresh-eyes pass over Today: greeting → weight card → supplements → stats → mood → notes. The checklist should feel native, not bolted on.
2. Log weight + check all 5 daily supplements → counter shows `5/5` in `--color-good`.
3. Export a backup, clear all data (Danger Zone), re-import → supplements, logs, entries, and settings all restored; checklist state for today intact.
4. Dark-mode / responsive spot-check at mobile width (375px) — primary surface is the installed phone PWA.

- [ ] **Step 3: Merge**

Per superpowers:finishing-a-development-branch — present the user with merge/PR options for `v2-phase-0-1` → `main`.

- [ ] **Step 4: Phase 1 gate (from the spec)**

**STOP.** The user logs real doses for a few days. Friction check: two taps or fewer from app open to logging a morning dose. The Phase 2 (meadow) plan is written only after this gate — informed by how the checklist actually feels in use.
