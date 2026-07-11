import { db, type Supplement } from './schema'

// The user's current evidence-based stack, seeded on first run of the
// feature. Anchors mirror real rituals: morning coffee, evening sleepy tea.
export const DEFAULT_STACK: Array<Pick<Supplement, 'name' | 'doseLabel' | 'anchor'>> = [
  { name: 'Omega-3', doseLabel: 'Nordic Naturals', anchor: 'morning' },
  { name: 'Vitamin D3 + MK-7', doseLabel: '', anchor: 'morning' },
  { name: 'Creatine', doseLabel: '5g', anchor: 'morning' },
  { name: 'Magnesium glycinate', doseLabel: '', anchor: 'evening' },
  { name: 'Glycine', doseLabel: 'powder', anchor: 'evening' },
  { name: 'L-theanine', doseLabel: '', anchor: 'as-needed' },
]

// Seed only when the table has never had rows. Archived rows keep the
// count > 0, so this cannot re-seed over a deliberately emptied stack.
// The rw transaction makes check+write atomic: IndexedDB serializes
// readwrite transactions on the same store, so a StrictMode double-invoke
// (two concurrent calls) cannot both see an empty table and double-seed.
export async function seedDefaultStackOnce(): Promise<void> {
  await db.transaction('rw', db.supplements, async () => {
    const count = await db.supplements.count()
    if (count > 0) return
    const now = Date.now()
    await db.supplements.bulkAdd(
      DEFAULT_STACK.map((s, i) => ({ ...s, sortOrder: i, createdAt: now, archivedAt: null }))
    )
  })
}

// Add a supplement with the next sortOrder. The max is taken over ALL
// rows including archived: restore() keeps a row's sortOrder, so
// allocating from the active max alone can hand out a duplicate
// (archive the top item → add → restore = two rows sharing an order,
// which makes the reorder swap a silent no-op). Transactional so a
// double-submit can't compute the same stale max twice.
export async function addSupplement(
  fields: Pick<Supplement, 'name' | 'doseLabel' | 'anchor'>
): Promise<number> {
  return db.transaction('rw', db.supplements, async () => {
    const all = await db.supplements.toArray()
    const maxSort = all.reduce((m, s) => Math.max(m, s.sortOrder), -1)
    return db.supplements.add({
      ...fields,
      sortOrder: maxSort + 1,
      createdAt: Date.now(),
      archivedAt: null,
    })
  })
}

// Toggle a day's log row for a supplement. Returns true if now taken.
// Absence of a row IS the miss — no "missed" records are ever written.
export async function toggleSupplementLog(supplementId: number, date: string): Promise<boolean> {
  const existing = await db.supplementLogs
    .where('[supplementId+date]').equals([supplementId, date]).first()
  if (existing?.id != null) {
    await db.supplementLogs.delete(existing.id)
    return false
  }
  try {
    await db.supplementLogs.add({ supplementId, date, takenAt: Date.now() })
  } catch (err) {
    // A concurrent toggle won the race — the unique [supplementId+date]
    // index rejected our add. The day is logged either way.
    if (err instanceof Error && err.name === 'ConstraintError') return true
    throw err
  }
  return true
}
