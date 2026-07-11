import { type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { db, localDateString } from '../../db'

export function QuickStats() {
  const settings = useLiveQuery(() => db.settings.get(1))

  const sevenDaysAgo = localDateString(new Date(Date.now() - 7 * 86_400_000))
  const today = localDateString()

  const recent = useLiveQuery(
    () => db.dailyEntries.where('date').between(sevenDaysAgo, today, true, true).toArray(),
    [sevenDaysAgo, today]
  )

  if (!recent || !settings) return null

  const withWeight = recent.filter((e) => e.weightKg != null)
  if (withWeight.length < 2) return null

  const latest = withWeight[withWeight.length - 1]
  const oldest = withWeight[0]
  const delta = latest.weightKg! - oldest.weightKg!
  const unit = settings.units === 'metric' ? 'kg' : 'lb'

  const target = settings.goals.targetWeightKg
  const startWeight = withWeight.find((e) => e.weightKg != null)?.weightKg ?? null
  const pctToGoal =
    target != null && startWeight != null && startWeight !== target
      ? Math.max(0, Math.min(100, Math.round(((startWeight - latest.weightKg!) / (startWeight - target)) * 100)))
      : null

  const TrendIcon = delta < -0.05 ? TrendingDown : delta > 0.05 ? TrendingUp : Minus
  const trendColor =
    delta < -0.05
      ? 'var(--color-good)'
      : delta > 0.05
      ? 'var(--color-blush)'
      : 'var(--color-ink-mute)'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: pctToGoal != null ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 16 }}>
      <StatCard
        label="7-day trend"
        value={`${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`}
        unit={unit}
      >
        <TrendIcon size={13} style={{ color: trendColor, flexShrink: 0 }} />
      </StatCard>

      {pctToGoal != null && (
        <StatCard label="Progress to goal" value={`${pctToGoal}`} unit="%" />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  unit,
  children,
}: {
  label: string
  value: string
  unit: string
  children?: ReactNode
}) {
  return (
    <div
      style={{
        background: 'var(--color-surface-alt)',
        borderRadius: 18,
        padding: '12px 14px 14px',
        border: '1px solid var(--color-line)',
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
          color: 'var(--color-ink-mute)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {children}
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 22,
            letterSpacing: '-0.5px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--color-ink-mute)',
            paddingBottom: 2,
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  )
}
