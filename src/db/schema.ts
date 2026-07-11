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

// The app's canonical "today". Uses the device's LOCAL calendar date —
// toISOString() would give the UTC date, which in UTC+8 is still
// yesterday until 8am: exactly when morning supplements get logged.
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function upsertTodayEntry(
  data: Partial<Omit<DailyEntry, 'id' | 'date' | 'createdAt'>>
): Promise<void> {
  const today = localDateString()
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
