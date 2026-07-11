import { useLiveQuery } from 'dexie-react-hooks'
import { Check } from 'lucide-react'
import { db, toggleSupplementLog, localDateString, type Supplement } from '../../db'

const ANCHOR_LABELS: Record<Supplement['anchor'], string> = {
  morning: 'Morning · with coffee',
  evening: 'Evening · with sleepy tea',
  'as-needed': 'As needed',
}

export function SupplementChecklist() {
  const today = localDateString()

  const supplements = useLiveQuery(
    async () =>
      (await db.supplements.toArray())
        .filter(s => s.archivedAt == null)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    []
  )
  const logs = useLiveQuery(
    () => db.supplementLogs.where('date').equals(today).toArray(),
    [today]
  )

  if (!supplements || supplements.length === 0) return null

  const takenIds = new Set((logs ?? []).map(l => l.supplementId))
  const daily = supplements.filter(s => s.anchor !== 'as-needed')
  const takenCount = daily.filter(s => takenIds.has(s.id!)).length

  const groups = (['morning', 'evening', 'as-needed'] as const)
    .map(anchor => ({ anchor, items: supplements.filter(s => s.anchor === anchor) }))
    .filter(g => g.items.length > 0)

  return (
    <div
      style={{
        background: 'var(--color-surface-alt)',
        borderRadius: 24,
        padding: '18px 20px',
        marginBottom: 12,
        border: '1px solid var(--color-line)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '1.3px',
            textTransform: 'uppercase',
            color: 'var(--color-ink-mute)',
          }}
        >
          Supplements
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: takenCount === daily.length && daily.length > 0
              ? 'var(--color-good)'
              : 'var(--color-ink-faint)',
          }}
        >
          {takenCount}/{daily.length}
        </span>
      </div>

      {groups.map(({ anchor, items }) => (
        <div key={anchor} style={{ marginBottom: 10 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '1px',
              color: 'var(--color-ink-faint)',
              margin: '0 0 6px 2px',
            }}
          >
            {ANCHOR_LABELS[anchor]}
          </div>
          {items.map(s => (
            <SupplementRow
              key={s.id}
              supplement={s}
              taken={takenIds.has(s.id!)}
              onToggle={() => toggleSupplementLog(s.id!, today)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function SupplementRow({
  supplement, taken, onToggle,
}: {
  supplement: Supplement
  taken: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={taken}
      aria-label={`${supplement.name}${taken ? ' — taken today' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 12px',
        marginBottom: 6,
        borderRadius: 14,
        border: '1px solid',
        borderColor: taken ? 'transparent' : 'var(--color-line)',
        background: taken ? 'var(--color-accent-soft)' : 'var(--color-surface)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* The "bloom": overshoot easing makes the check swell open like a petal */}
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: taken ? 'var(--color-accent-deep)' : 'var(--color-surface-alt)',
          border: taken ? 'none' : '1.5px solid var(--color-line)',
          color: '#fff',
          transform: taken ? 'scale(1)' : 'scale(0.85)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease',
        }}
      >
        {taken && <Check size={14} strokeWidth={2.5} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontFamily: "'Geist', system-ui",
            fontSize: 15,
            color: taken ? 'var(--color-accent-deep)' : 'var(--color-ink)',
          }}
        >
          {supplement.name}
        </span>
        {supplement.doseLabel && (
          <span
            style={{
              display: 'block',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--color-ink-mute)',
              marginTop: 1,
            }}
          >
            {supplement.doseLabel}
          </span>
        )}
      </span>
    </button>
  )
}
