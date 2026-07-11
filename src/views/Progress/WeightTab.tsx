import { useLiveQuery } from 'dexie-react-hooks'
import { db, localDateString } from '../../db'
import { WeightChart } from './WeightChart'
import { EntryList } from './EntryList'

type Range = '7D' | '30D' | '90D' | 'ALL'
const RANGES: Range[] = ['7D', '30D', '90D', 'ALL']
const RANGE_DAYS: Record<Range, number | null> = { '7D': 7, '30D': 30, '90D': 90, ALL: null }

interface WeightTabProps {
  range: Range
  onRangeChange: (r: Range) => void
  unit: string
}

function getRangeStart(range: Range): string {
  const days = RANGE_DAYS[range]
  if (days === null) return '1970-01-01'
  return localDateString(new Date(Date.now() - days * 86_400_000))
}

export function WeightTab({ range, onRangeChange, unit }: WeightTabProps) {
  const today = localDateString()
  const rangeStart = getRangeStart(range)

  const entries = useLiveQuery(
    () => db.dailyEntries.where('date').between(rangeStart, today, true, true).toArray(),
    [rangeStart, today]
  )
  const settings = useLiveQuery(() => db.settings.get(1))

  const withWeight = (entries ?? []).filter(e => e.weightKg != null)
  const latest = withWeight.at(-1)
  const earliest = withWeight[0]
  const totalChange = latest && earliest ? latest.weightKg! - earliest.weightKg! : null

  return (
    <div>
      {/* Summary line */}
      {totalChange !== null && (
        <div style={{ paddingBottom: 20 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--color-ink-mute)', marginBottom: 4 }}>
            {range === 'ALL' ? 'All time' : `Last ${RANGE_DAYS[range]} days`}
          </div>
          <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28,
            letterSpacing: '-0.4px', color: 'var(--color-ink)', lineHeight: 1.1 }}>
            {totalChange === 0 ? 'No change' : (
              <>
                {totalChange > 0 ? 'Up ' : 'Down '}
                <em style={{ color: 'var(--color-accent-deep)' }}>
                  {Math.abs(totalChange).toFixed(1)} {unit}
                </em>
              </>
            )}
          </div>
        </div>
      )}

      {/* Chart card */}
      <div style={{
        background: 'var(--color-surface-alt)', borderRadius: 28,
        padding: '20px 16px 12px', border: '1px solid var(--color-line)',
        marginBottom: 16,
        boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -12px rgba(30,60,90,0.10)',
      }}>
        {/* Current weight + range total */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          {latest?.weightKg != null && (
            <>
              <span style={{ fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 40, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {Math.floor(latest.weightKg)}
                <span style={{ color: 'var(--color-accent)' }}>
                  .{Math.round((latest.weightKg % 1) * 10)}
                </span>
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, color: 'var(--color-ink-mute)' }}>{unit}</span>
            </>
          )}
          {totalChange !== null && totalChange !== 0 && (
            <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: totalChange < 0 ? 'var(--color-good)' : 'var(--color-blush)' }}>
              {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)}
            </span>
          )}
        </div>

        <WeightChart
          entries={entries ?? []}
          targetWeightKg={settings?.goals.targetWeightKg ?? null}
          unit={unit}
        />

        {/* Range picker */}
        <div style={{ display: 'flex', gap: 4, marginTop: 12, justifyContent: 'center' }}>
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              aria-pressed={range === r}
              style={{
                padding: '6px 14px', borderRadius: 999, border: 'none',
                background: range === r ? 'var(--color-ink)' : 'transparent',
                color: range === r ? '#fff' : 'var(--color-ink-mute)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                cursor: 'pointer', letterSpacing: '0.3px', transition: 'all 0.15s',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Entry list */}
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--color-ink-mute)',
        marginBottom: 8 }}>
        Entries
      </div>
      <div style={{ background: 'var(--color-surface-alt)', borderRadius: 22,
        border: '1px solid var(--color-line)', overflow: 'hidden' }}>
        <EntryList entries={entries ?? []} unit={unit} />
      </div>
    </div>
  )
}
