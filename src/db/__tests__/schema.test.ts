import { beforeEach, describe, expect, it } from 'vitest'
import { db, getSettings, localDateString } from '../schema'

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
})

describe('localDateString', () => {
  it('returns the LOCAL calendar date, not the UTC one', () => {
    // 00:30 local on Jan 1 — in any timezone ahead of UTC, toISOString()
    // would report Dec 31. The local date must win.
    const justAfterLocalMidnight = new Date(2026, 0, 1, 0, 30)
    expect(localDateString(justAfterLocalMidnight)).toBe('2026-01-01')
  })

  it('pads month and day', () => {
    expect(localDateString(new Date(2026, 2, 5))).toBe('2026-03-05')
  })

  it('defaults to now', () => {
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(localDateString()).toBe(expected)
  })
})
