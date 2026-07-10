import { db, type WeeklyPic } from './schema'

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
