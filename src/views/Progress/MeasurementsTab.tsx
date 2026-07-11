// Measurements tab: table of all entries (rows = dates, cols = sites) + add form.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, X } from 'lucide-react'
import { db, localDateString, type MonthlyMeasurement } from '../../db'

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {
    month: 'short', day: 'numeric', year: '2-digit',
  })
}

// ── Add form ──────────────────────────────────────────────────────────────────

function AddMeasurementForm({ sites, onClose }: { sites: string[]; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const measurements: Record<string, number> = {}
    for (const site of sites) {
      const v = parseFloat(values[site] ?? '')
      if (!isNaN(v) && v > 0) measurements[site] = v
    }
    if (Object.keys(measurements).length === 0) return
    setSaving(true)
    await db.monthlyMeasurements.add({
      date: localDateString(),
      measurements,
      notes: notes.trim() || null,
      createdAt: Date.now(),
    })
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ background: 'var(--color-surface-alt)', borderRadius: 24,
      border: '1px solid var(--color-line)', padding: '20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: '1.3px', textTransform: 'uppercase', color: 'var(--color-ink-mute)' }}>
          New measurements · {new Date().toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
        </span>
        <button onClick={onClose} aria-label="Cancel" style={{ border: 'none', background: 'transparent',
          cursor: 'pointer', color: 'var(--color-ink-mute)' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {sites.map(site => (
          <div key={site} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label
              htmlFor={`m-${site}`}
              style={{ width: 80, fontFamily: "'Geist', system-ui", fontSize: 14,
                color: 'var(--color-ink-soft)', textTransform: 'capitalize', flexShrink: 0 }}>
              {site}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                id={`m-${site}`}
                type="number"
                step="0.1"
                min="0"
                placeholder="—"
                value={values[site] ?? ''}
                onChange={e => setValues(v => ({ ...v, [site]: e.target.value }))}
                style={{
                  width: 80, padding: '8px 10px', borderRadius: 10,
                  border: '1px solid var(--color-line)',
                  background: 'var(--color-surface)', color: 'var(--color-ink)',
                  fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 18,
                  outline: 'none', textAlign: 'right',
                  // highlight on focus
                }}
              />
              <span style={{ fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, color: 'var(--color-ink-mute)' }}>cm</span>
            </div>
          </div>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value.slice(0, 240))}
        placeholder="Optional note…"
        rows={2}
        style={{ width: '100%', border: '1px solid var(--color-line)', borderRadius: 12,
          padding: '10px 12px', background: 'var(--color-surface)', resize: 'none',
          fontFamily: "'Geist', system-ui", fontSize: 14, color: 'var(--color-ink)',
          outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
      />

      <button
        onClick={save}
        disabled={saving}
        style={{
          width: '100%', height: 48, borderRadius: 14, border: 'none',
          background: 'var(--color-accent-deep)', color: '#fff',
          fontFamily: "'Geist', system-ui", fontSize: 15, fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {saving ? 'Saving…' : 'Save measurements'}
      </button>
    </div>
  )
}

// ── Measurements table ────────────────────────────────────────────────────────

function MeasurementsTable({ entries, sites }: { entries: MonthlyMeasurement[]; sites: string[] }) {
  if (entries.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        color: 'var(--color-ink-faint)', letterSpacing: '1px', textTransform: 'uppercase' }}>
        No measurements yet
      </div>
    )
  }

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div style={{ overflowX: 'auto', borderRadius: 22,
      border: '1px solid var(--color-line)', background: 'var(--color-surface-alt)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 320 }}>
        <thead>
          <tr>
            <th style={{
              padding: '10px 14px', textAlign: 'left', position: 'sticky', left: 0,
              background: 'var(--color-surface-alt)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--color-ink-mute)',
              borderBottom: '1px solid var(--color-line)', fontWeight: 500,
            }}>Date</th>
            {sites.map(site => (
              <th key={site} style={{
                padding: '10px 12px', textAlign: 'right',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--color-ink-mute)',
                borderBottom: '1px solid var(--color-line)', fontWeight: 500,
              }}>{site}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, i) => {
            const prev = sorted[i + 1]
            return (
              <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-line)' }}>
                <td style={{
                  padding: '12px 14px', position: 'sticky', left: 0,
                  background: 'var(--color-surface-alt)',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: 'var(--color-ink-mute)', whiteSpace: 'nowrap',
                }}>{formatDate(entry.date)}</td>
                {sites.map(site => {
                  const val = entry.measurements[site]
                  const prevVal = prev?.measurements[site]
                  const delta = val != null && prevVal != null ? val - prevVal : null
                  return (
                    <td key={site} style={{ padding: '12px 12px', textAlign: 'right' }}>
                      {val != null ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontFamily: "'Instrument Serif', Georgia, serif",
                            fontSize: 18, letterSpacing: '-0.3px' }}>
                            {val.toFixed(1)}
                          </span>
                          {delta != null && delta !== 0 && (
                            <span style={{
                              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                              color: delta < 0 ? 'var(--color-good)' : 'var(--color-blush)',
                            }}>
                              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-ink-faint)',
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main MeasurementsTab ──────────────────────────────────────────────────────

export function MeasurementsTab() {
  const entries = useLiveQuery(() => db.monthlyMeasurements.orderBy('date').toArray())
  const settings = useLiveQuery(() => db.settings.get(1))
  const [adding, setAdding] = useState(false)

  const sites = settings?.measurementSites ?? ['waist', 'hips', 'chest', 'thighs', 'arms']

  return (
    <div>
      {adding ? (
        <AddMeasurementForm sites={sites} onClose={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            width: '100%', height: 52, borderRadius: 18, border: '1px dashed var(--color-line)',
            background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, fontFamily: "'Geist', system-ui", fontSize: 14, color: 'var(--color-ink-soft)',
            cursor: 'pointer', marginBottom: 16,
          }}
        >
          <Plus size={18} /> Log measurements
        </button>
      )}

      <MeasurementsTable entries={entries ?? []} sites={sites} />
    </div>
  )
}
