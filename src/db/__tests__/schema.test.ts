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
