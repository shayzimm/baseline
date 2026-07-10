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
export async function seedDefaultStackOnce(): Promise<void> {
  const count = await db.supplements.count()
  if (count > 0) return
  const now = Date.now()
  await db.supplements.bulkAdd(
    DEFAULT_STACK.map((s, i) => ({ ...s, sortOrder: i, createdAt: now, archivedAt: null }))
  )
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
  await db.supplementLogs.add({ supplementId, date, takenAt: Date.now() })
  return true
}
