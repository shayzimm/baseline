import Dexie, { type Table } from 'dexie'

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

export interface WeeklyPic {
  id?: number
  date: string
  front: Blob | null
  side: Blob | null
  back: Blob | null
  notes: string | null
  createdAt: number
}

export interface MonthlyMeasurement {
  id?: number
  date: string
  measurements: Record<string, number>   // { waist: 82, hips: 96, ... }
  notes: string | null
  createdAt: number
}

export interface Settings {
  id: 1                  // singleton — always ID 1
  units: 'metric' | 'imperial'
  measurementSites: string[]
  goals: {
    targetWeightKg: number | null
    targetBodyFatPct: number | null
    targetMeasurements: Record<string, number>
  }
  appLockEnabled: boolean
  appLockPin: string | null   // hashed with SHA-256, never plaintext
}

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

export const db = new BaselineDB()

// Seed default settings on first open (runs once when DB is created)
db.on('populate', async () => {
  await db.settings.add({
    id: 1,
    units: 'metric',
    measurementSites: ['waist', 'hips', 'chest', 'thighs', 'arms'],
    goals: { targetWeightKg: null, targetBodyFatPct: null, targetMeasurements: {} },
    appLockEnabled: false,
    appLockPin: null,
  })
})

// ─── Typed helpers ────────────────────────────────────────────────────────────

export async function upsertTodayEntry(
  data: Partial<Omit<DailyEntry, 'id' | 'date' | 'createdAt'>>
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const existing = await db.dailyEntries.where('date').equals(today).first()
  if (existing?.id != null) {
    await db.dailyEntries.update(existing.id, { ...data, updatedAt: Date.now() })
  } else {
    await db.dailyEntries.add({
      date: today,
      weightKg: null,
      moodRating: null,
      notes: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...data,
    })
  }
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(1)
  if (!s) throw new Error('Settings row missing — DB populate hook did not run')
  return s
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importData(raw: unknown): Promise<{ entries: number; measurements: number }> {
  if (typeof raw !== 'object' || raw == null) throw new Error('Invalid data format')
  const data = raw as Record<string, unknown>
  if (data['version'] !== 1) throw new Error('Unsupported backup version')

  let entriesCount = 0
  let measurementsCount = 0

  if (Array.isArray(data['entries'])) {
    for (const e of data['entries'] as DailyEntry[]) {
      if (!e.date) continue
      const existing = await db.dailyEntries.where('date').equals(e.date).first()
      if (existing?.id != null) {
        await db.dailyEntries.update(existing.id, {
          weightKg: e.weightKg ?? null,
          moodRating: e.moodRating ?? null,
          notes: e.notes ?? null,
          updatedAt: Date.now(),
        })
      } else {
        await db.dailyEntries.add({
          date: e.date,
          weightKg: e.weightKg ?? null,
          moodRating: e.moodRating ?? null,
          notes: e.notes ?? null,
          createdAt: e.createdAt ?? Date.now(),
          updatedAt: Date.now(),
        })
      }
      entriesCount++
    }
  }

  if (Array.isArray(data['measurements'])) {
    for (const m of data['measurements'] as MonthlyMeasurement[]) {
      if (!m.date) continue
      await db.monthlyMeasurements.add({
        date: m.date,
        measurements: m.measurements ?? {},
        notes: m.notes ?? null,
        createdAt: m.createdAt ?? Date.now(),
      })
      measurementsCount++
    }
  }

  return { entries: entriesCount, measurements: measurementsCount }
}
