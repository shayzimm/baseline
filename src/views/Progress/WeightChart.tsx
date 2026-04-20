// Recharts line chart for weight over time.
// ResponsiveContainer fills whatever width the parent gives it.
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { type DailyEntry } from '../../db'

interface WeightChartProps {
  entries: DailyEntry[]
  targetWeightKg: number | null
  unit: string
}

function formatDate(iso: string, short = false) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-AU', short ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-ink)',
      borderRadius: 10,
      padding: '6px 12px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      color: '#fff',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      <div style={{ opacity: 0.6, fontSize: 10, marginBottom: 2 }}>{formatDate(label)}</div>
      <div style={{ fontWeight: 500 }}>{payload[0].value.toFixed(1)} {payload[0].payload.unit}</div>
    </div>
  )
}

export function WeightChart({ entries, targetWeightKg, unit }: WeightChartProps) {
  if (entries.length === 0) {
    return (
      <div style={{
        height: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: 'var(--color-ink-faint)',
        letterSpacing: '1px',
        textTransform: 'uppercase',
      }}>
        No data yet — log your first weight on the Today tab
      </div>
    )
  }

  const data = entries
    .filter(e => e.weightKg != null)
    .map(e => ({ date: e.date, weight: e.weightKg!, unit }))

  if (data.length === 0) return null

  const weights = data.map(d => d.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const padding = Math.max(0.5, (maxW - minW) * 0.15)
  const yMin = Math.floor((minW - padding) * 2) / 2
  const yMax = Math.ceil((maxW + padding) * 2) / 2

  // Show every Nth label so the axis doesn't crowd
  const labelEvery = data.length <= 7 ? 1 : data.length <= 14 ? 2 : data.length <= 30 ? 5 : 10

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="oklch(92% 0.01 235)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={(v, i) => i % labelEvery === 0 ? formatDate(v, true) : ''}
          tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fill: 'oklch(62% 0.015 240)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[yMin, yMax]}
          tickFormatter={v => v.toFixed(1)}
          tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fill: 'oklch(62% 0.015 240)' }}
          axisLine={false}
          tickLine={false}
          width={38}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'oklch(48% 0.11 232)', strokeWidth: 1, strokeDasharray: '3 3' }} />
        {targetWeightKg != null && (
          <ReferenceLine
            y={targetWeightKg}
            stroke="oklch(72% 0.07 195)"
            strokeDasharray="4 3"
            label={{ value: 'goal', position: 'right', fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fill: 'oklch(72% 0.07 195)' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="weight"
          stroke="oklch(48% 0.11 232)"
          strokeWidth={2}
          dot={data.length <= 14 ? { fill: 'oklch(48% 0.11 232)', r: 3, strokeWidth: 0 } : false}
          activeDot={{ fill: 'oklch(48% 0.11 232)', r: 5, stroke: '#fff', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
