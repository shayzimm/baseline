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
