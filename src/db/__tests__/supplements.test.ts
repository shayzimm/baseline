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
