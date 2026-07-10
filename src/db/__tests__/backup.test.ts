import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { exportAllData, EXPORTED_TABLES, importData } from '../backup'

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

  it('accounts for every Dexie table — new tables must be added to the manifest or deliberately excluded', () => {
    const KNOWN_EXCLUSIONS = ['withingsAuth'] // holds OAuth tokens; must never be exported
    const allTables = db.tables.map(t => t.name).sort()
    expect(allTables).toEqual([...EXPORTED_TABLES, ...KNOWN_EXCLUSIONS].sort())
  })
})

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

  it('v1 merge preserves the existing source field (does not clobber withings provenance)', async () => {
    await db.dailyEntries.add({
      date: '2026-03-30', weightKg: 82.0, moodRating: null, notes: null,
      source: 'withings', createdAt: 1, updatedAt: 1,
    })
    await importData({
      version: 1,
      entries: [{ date: '2026-03-30', weightKg: 82.1, moodRating: 3, notes: null, createdAt: 1, updatedAt: 1 }],
    })
    const entry = await db.dailyEntries.where('date').equals('2026-03-30').first()
    expect(entry?.source).toBe('withings')
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

  it('skips malformed supplement and log rows instead of corrupting the tables', async () => {
    const result = await importData({
      version: 2,
      tables: {
        supplements: [
          { name: 'No id — would mint a duplicate on every import', doseLabel: '', anchor: 'morning', sortOrder: 0, createdAt: 1, archivedAt: null },
          { id: 7, name: 'Valid', doseLabel: '', anchor: 'morning', sortOrder: 0, createdAt: 1, archivedAt: null },
        ],
        supplementLogs: [
          { supplementId: '7', date: '2026-07-10', takenAt: 1 },
          { supplementId: 7, date: '2026-07-10', takenAt: 1 },
        ],
      },
    })
    expect(result.supplements).toBe(1)
    expect(result.supplementLogs).toBe(1)
    expect(await db.supplements.count()).toBe(1)
    expect(await db.supplementLogs.count()).toBe(1)
  })

  it('re-importing the same file does not duplicate measurements', async () => {
    await db.monthlyMeasurements.add({ date: '2026-07-01', measurements: { waist: 80 }, notes: null, createdAt: 1 })
    const backup = await exportAllData()
    const result = await importData(backup)
    expect(result.measurements).toBe(0)
    expect(await db.monthlyMeasurements.count()).toBe(1)
  })

  it('imported settings merge over defaults so missing fields cannot crash consumers', async () => {
    await importData({
      version: 2,
      tables: { settings: [{ id: 1, units: 'imperial' }] },
    })
    const s = await db.settings.get(1)
    expect(s?.units).toBe('imperial')
    expect(s?.goals).toBeDefined()          // seeded default survives
    expect(s?.measurementSites).toContain('waist')
  })

  it('never imports weeklyPics even when present in the file', async () => {
    await importData({
      version: 2,
      tables: { weeklyPics: [{ date: '2026-07-10', notes: 'junk without blobs', createdAt: 1 }] },
    })
    expect(await db.weeklyPics.count()).toBe(0)
  })
})
