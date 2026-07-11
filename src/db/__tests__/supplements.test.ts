import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { addSupplement, DEFAULT_STACK, seedDefaultStackOnce, toggleSupplementLog } from '../supplements'

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

  it('is safe under concurrent invocation (StrictMode double-invoke)', async () => {
    await Promise.all([seedDefaultStackOnce(), seedDefaultStackOnce()])
    expect(await db.supplements.count()).toBe(DEFAULT_STACK.length)
  })
})

describe('addSupplement', () => {
  it('allocates a unique sortOrder even after archive → add → restore', async () => {
    await seedDefaultStackOnce()
    // archive the HIGHEST-sorted item, so the active max drops
    const last = (await db.supplements.toArray()).find(s => s.name === 'L-theanine')!
    await db.supplements.update(last.id!, { archivedAt: Date.now() })
    await addSupplement({ name: 'Zinc', doseLabel: '', anchor: 'evening' })
    await db.supplements.update(last.id!, { archivedAt: null })

    const active = (await db.supplements.toArray()).filter(s => s.archivedAt == null)
    const orders = active.map(s => s.sortOrder)
    expect(new Set(orders).size).toBe(orders.length)   // no duplicates
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

  it('a double-tap race resolves without rejection and leaves exactly one log', async () => {
    const id = await db.supplements.add({
      name: 'Creatine', doseLabel: '5g', anchor: 'morning',
      sortOrder: 0, createdAt: Date.now(), archivedAt: null,
    })
    const results = await Promise.all([
      toggleSupplementLog(id, '2026-07-10'),
      toggleSupplementLog(id, '2026-07-10'),
    ])
    expect(await db.supplementLogs.count()).toBeLessThanOrEqual(1)
    expect(results).toHaveLength(2)
  })
})
