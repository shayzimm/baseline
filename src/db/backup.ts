import { db, type DailyEntry, type MonthlyMeasurement, type Settings, type Supplement, type SupplementLog, type WeeklyPic } from './schema'

export const BACKUP_VERSION = 2

// Tables included in JSON backups. withingsAuth is deliberately excluded:
// a backup holding a live refresh token would grant Withings access to
// anyone with the file (restoring on a new device re-links the scale
// instead). weeklyPics ships metadata only — Blobs can't JSON.stringify.
export const EXPORTED_TABLES = [
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
