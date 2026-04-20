import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { WeightTab } from './WeightTab'
import { PicsTab } from './PicsTab'
import { MeasurementsTab } from './MeasurementsTab'

type Tab = 'weight' | 'pics' | 'measurements'
type Range = '7D' | '30D' | '90D' | 'ALL'

const TABS: { key: Tab; label: string }[] = [
  { key: 'weight', label: 'Weight' },
  { key: 'pics', label: 'Photos' },
  { key: 'measurements', label: 'Measurements' },
]

export function ProgressView() {
  const [activeTab, setActiveTab] = useState<Tab>('weight')
  const [range, setRange] = useState<Range>('30D')

  const settings = useLiveQuery(() => db.settings.get(1))
  const unit = settings?.units === 'imperial' ? 'lb' : 'kg'

  return (
    <div style={{
      padding: '0 20px',
      fontFamily: "'Geist', system-ui, sans-serif",
      color: 'var(--color-ink)',
    }}>
      {/* Page header */}
      <div style={{ paddingTop: 8, paddingBottom: 20 }}>
        <div style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 32,
          letterSpacing: '-0.5px',
          lineHeight: 1.05,
        }}>
          Progress
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        background: 'var(--color-surface)',
        borderRadius: 16,
        padding: 4,
        marginBottom: 20,
        border: '1px solid var(--color-line)',
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            aria-selected={activeTab === t.key}
            role="tab"
            style={{
              flex: 1,
              height: 36,
              borderRadius: 12,
              border: 'none',
              background: activeTab === t.key ? 'var(--color-surface-alt)' : 'transparent',
              color: activeTab === t.key ? 'var(--color-ink)' : 'var(--color-ink-mute)',
              fontFamily: "'Geist', system-ui",
              fontSize: 13,
              fontWeight: activeTab === t.key ? 500 : 400,
              cursor: 'pointer',
              boxShadow: activeTab === t.key ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'weight' && (
        <WeightTab range={range} onRangeChange={setRange} unit={unit} />
      )}
      {activeTab === 'pics' && <PicsTab />}
      {activeTab === 'measurements' && <MeasurementsTab />}
    </div>
  )
}
