import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Calendar, TrendingDown, TrendingUp, Edit2, Check, X } from 'lucide-react'
import { db, type Settings } from '../../db'

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Shared small components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '1.3px',
      textTransform: 'uppercase', color: 'var(--color-ink-mute)', marginBottom: 14,
    }}>
      {children}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--color-surface-alt)', borderRadius: 24, padding: '20px',
      marginBottom: 16, border: '1px solid var(--color-line)', ...style,
    }}>
      {children}
    </div>
  )
}

function IconBtn({ onClick, children, color = 'var(--color-ink-mute)' }: {
  onClick: () => void; children: React.ReactNode; color?: string
}) {
  return (
    <button onClick={onClick} style={{
      width: 36, height: 36, borderRadius: 10, border: 'none',
      background: 'var(--color-surface)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color, cursor: 'pointer', flexShrink: 0,
    }}>
      {children}
    </button>
  )
}

function InlineInput({
  value, onChange, onSave, onCancel, placeholder, autoFocus = false,
}: {
  value: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void
  placeholder: string; autoFocus?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
        autoFocus={autoFocus}
        style={{
          flex: 1, height: 44, borderRadius: 12,
          border: '1.5px solid var(--color-accent)', padding: '0 14px',
          fontFamily: "'Geist', system-ui", fontSize: 15,
          background: 'var(--color-surface)', color: 'var(--color-ink)', outline: 'none',
        }}
      />
      <IconBtn onClick={onSave} color="var(--color-good)">
        <Check size={17} />
      </IconBtn>
      <IconBtn onClick={onCancel}>
        <X size={17} />
      </IconBtn>
    </div>
  )
}

function ClearLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', marginTop: 10, padding: '2px 0',
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.5px',
      color: 'var(--color-ink-faint)', cursor: 'pointer',
    }}>
      Clear goal
    </button>
  )
}

// ── Weight goal card ───────────────────────────────────────────────────────────

function WeightGoalCard({ settings }: { settings: Settings }) {
  const isMetric = settings.units !== 'imperial'
  const unit = isMetric ? 'kg' : 'lb'
  const toDisplay = (kg: number) => isMetric ? kg : kg * 2.20462
  const fromDisplay = (val: number) => isMetric ? val : val / 2.20462

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const stats = useLiveQuery(async () => {
    const all = await db.dailyEntries.orderBy('date').toArray()
    const w = all.filter(e => e.weightKg != null)
    if (!w.length) return null
    return { first: w[0], latest: w[w.length - 1] }
  })

  const targetKg = settings.goals?.targetWeightKg ?? null
  const currentKg = stats?.latest?.weightKg ?? null
  const startKg = stats?.first?.weightKg ?? null

  const currentDisplay = currentKg != null ? toDisplay(currentKg) : null
  const targetDisplay = targetKg != null ? toDisplay(targetKg) : null
  const startDisplay = startKg != null ? toDisplay(startKg) : null

  let progress = 0
  let changeFromStart = 0
  let remaining = 0
  if (currentKg != null && startKg != null && targetKg != null && startKg !== targetKg) {
    progress = Math.min(1, Math.max(0, (currentKg - startKg) / (targetKg - startKg)))
    changeFromStart = currentKg - startKg
    remaining = targetKg - currentKg
  } else if (currentKg != null && startKg != null) {
    changeFromStart = currentKg - startKg
  }

  const isLoss = targetKg != null && startKg != null && targetKg < startKg

  const saveTarget = async () => {
    const parsed = parseFloat(draft)
    if (isNaN(parsed) || parsed <= 0) return
    const goals = settings.goals ?? { targetWeightKg: null, targetBodyFatPct: null, targetMeasurements: {} }
    await db.settings.update(1, { goals: { ...goals, targetWeightKg: fromDisplay(parsed) } })
    setEditing(false)
  }

  const clearTarget = async () => {
    const goals = settings.goals ?? { targetWeightKg: null, targetBodyFatPct: null, targetMeasurements: {} }
    await db.settings.update(1, { goals: { ...goals, targetWeightKg: null } })
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <SectionLabel>Weight Goal</SectionLabel>
        {targetDisplay != null && !editing && (
          <button onClick={() => { setDraft(targetDisplay.toFixed(1)); setEditing(true) }}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-ink-mute)', padding: 4, marginTop: -6 }}>
            <Edit2 size={14} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Current → Target */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 2 }}>
            Current
          </div>
          <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, letterSpacing: '-0.5px' }}>
            {currentDisplay != null ? `${currentDisplay.toFixed(1)}` : '—'}
            {currentDisplay != null && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--color-ink-mute)', marginLeft: 4 }}>{unit}</span>
            )}
          </div>
        </div>

        {targetDisplay != null && !editing && (
          <>
            <div style={{ color: 'var(--color-ink-faint)', fontSize: 20, marginTop: 12, lineHeight: 1 }}>→</div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 2 }}>
                Target
              </div>
              <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, letterSpacing: '-0.5px', color: 'var(--color-accent-deep)' }}>
                {targetDisplay.toFixed(1)}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--color-accent)', marginLeft: 4 }}>{unit}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Set/edit target */}
      {(editing || targetDisplay == null) && (
        <div style={{ marginBottom: 14 }}>
          <InlineInput
            value={draft}
            onChange={setDraft}
            onSave={saveTarget}
            onCancel={() => { setEditing(false); setDraft('') }}
            placeholder={`Target weight (${unit})`}
            autoFocus={editing}
          />
        </div>
      )}

      {/* Progress bar */}
      {targetDisplay != null && currentDisplay != null && startDisplay != null && (
        <>
          <div style={{ height: 6, borderRadius: 999, background: 'var(--color-line)', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              height: '100%', borderRadius: 999, transition: 'width 0.4s ease',
              width: `${Math.round(progress * 100)}%`,
              background: progress >= 1 ? 'var(--color-good)' : 'var(--color-accent-deep)',
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {isLoss
                ? <TrendingDown size={13} style={{ color: 'var(--color-good)' }} />
                : <TrendingUp size={13} style={{ color: 'var(--color-accent-deep)' }} />}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-ink-mute)' }}>
                {toDisplay(changeFromStart) >= 0 ? '+' : ''}{toDisplay(changeFromStart).toFixed(1)} {unit} since start
              </span>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: progress >= 1 ? 'var(--color-good)' : 'var(--color-ink-mute)' }}>
              {progress >= 1 ? 'Goal reached ✓' : `${Math.round(progress * 100)}%`}
            </span>
          </div>

          {progress < 1 && Math.abs(remaining) > 0.05 && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--color-ink-faint)', letterSpacing: '0.5px' }}>
              {Math.abs(toDisplay(remaining)).toFixed(1)} {unit} {remaining < 0 ? 'to lose' : 'to gain'}
            </div>
          )}
        </>
      )}

      {/* No weight logged yet */}
      {currentDisplay == null && targetDisplay != null && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--color-ink-faint)', letterSpacing: '0.5px' }}>
          Log your weight on the Today tab to track progress
        </div>
      )}

      {targetDisplay != null && !editing && <ClearLink onClick={clearTarget} />}
    </Card>
  )
}

// ── Body fat goal card ─────────────────────────────────────────────────────────

function BodyFatGoalCard({ settings }: { settings: Settings }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const target = settings.goals?.targetBodyFatPct ?? null

  const save = async () => {
    const parsed = parseFloat(draft)
    if (isNaN(parsed) || parsed <= 0 || parsed > 70) return
    const goals = settings.goals ?? { targetWeightKg: null, targetBodyFatPct: null, targetMeasurements: {} }
    await db.settings.update(1, { goals: { ...goals, targetBodyFatPct: parsed } })
    setEditing(false)
  }

  const clear = async () => {
    const goals = settings.goals ?? { targetWeightKg: null, targetBodyFatPct: null, targetMeasurements: {} }
    await db.settings.update(1, { goals: { ...goals, targetBodyFatPct: null } })
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <SectionLabel>Body Fat % Goal</SectionLabel>
        {target != null && !editing && (
          <button onClick={() => { setDraft(target.toFixed(1)); setEditing(true) }}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-ink-mute)', padding: 4, marginTop: -6 }}>
            <Edit2 size={14} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {target != null && !editing ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, letterSpacing: '-0.5px', color: 'var(--color-accent-deep)' }}>
              {target.toFixed(1)}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--color-ink-mute)' }}>%</span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--color-ink-faint)', letterSpacing: '0.5px', marginTop: 6 }}>
            Track via DEXA, smart scale, or calipers
          </div>
          <ClearLink onClick={clear} />
        </>
      ) : (
        <InlineInput
          value={draft}
          onChange={setDraft}
          onSave={save}
          onCancel={() => { setEditing(false); setDraft('') }}
          placeholder="Target body fat %"
          autoFocus={editing}
        />
      )}
    </Card>
  )
}

// ── Measurement goals card ─────────────────────────────────────────────────────

function MeasurementGoalsCard({ settings }: { settings: Settings }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const targetMeasurements = settings.goals?.targetMeasurements ?? {}

  const save = async (site: string) => {
    const parsed = parseFloat(draft)
    if (isNaN(parsed) || parsed <= 0) return
    const goals = settings.goals ?? { targetWeightKg: null, targetBodyFatPct: null, targetMeasurements: {} }
    await db.settings.update(1, {
      goals: { ...goals, targetMeasurements: { ...targetMeasurements, [site]: parsed } },
    })
    setEditing(null)
  }

  const clear = async (site: string) => {
    const updated = { ...targetMeasurements }
    delete updated[site]
    const goals = settings.goals ?? { targetWeightKg: null, targetBodyFatPct: null, targetMeasurements: {} }
    await db.settings.update(1, { goals: { ...goals, targetMeasurements: updated } })
  }

  return (
    <Card>
      <SectionLabel>Measurement Goals</SectionLabel>

      {settings.measurementSites.map(site => {
        const target = targetMeasurements[site]
        const isEditingThis = editing === site

        return (
          <div key={site} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 76, fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: 'var(--color-ink-soft)', textTransform: 'capitalize', flexShrink: 0,
            }}>
              {site}
            </div>

            {isEditingThis ? (
              <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                <input
                  type="number" step="0.5" value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Target cm"
                  onKeyDown={e => { if (e.key === 'Enter') save(site); if (e.key === 'Escape') setEditing(null) }}
                  autoFocus
                  style={{
                    flex: 1, height: 36, borderRadius: 10,
                    border: '1.5px solid var(--color-accent)', padding: '0 10px',
                    fontFamily: "'Geist', system-ui", fontSize: 14,
                    background: 'var(--color-surface)', color: 'var(--color-ink)', outline: 'none',
                  }}
                />
                <button onClick={() => save(site)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--color-good)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={15} />
                </button>
                <button onClick={() => setEditing(null)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--color-surface)', color: 'var(--color-ink-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={15} />
                </button>
              </div>
            ) : target != null ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 20 }}>
                  {target}{' '}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-ink-mute)' }}>cm</span>
                </span>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button onClick={() => { setDraft(target.toString()); setEditing(site) }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-ink-mute)', padding: 6 }}>
                    <Edit2 size={13} strokeWidth={1.8} />
                  </button>
                  <button onClick={() => clear(site)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-ink-faint)', padding: 6 }}>
                    <X size={13} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setDraft(''); setEditing(site) }}
                style={{
                  flex: 1, height: 36, borderRadius: 10,
                  border: '1px dashed var(--color-line)', background: 'transparent',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: 'var(--color-ink-faint)', letterSpacing: '0.5px',
                  cursor: 'pointer', textAlign: 'left', padding: '0 12px',
                }}
              >
                Set target
              </button>
            )}
          </div>
        )
      })}
    </Card>
  )
}

// ── Main GoalsView ─────────────────────────────────────────────────────────────

export function GoalsView() {
  const settings = useLiveQuery(() => db.settings.get(1))

  const trackingStats = useLiveQuery(async () => {
    const all = await db.dailyEntries.orderBy('date').toArray()
    const w = all.filter(e => e.weightKg != null)
    if (!w.length) return null
    const start = new Date(w[0].date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = Math.floor((today.getTime() - start.getTime()) / 86400000)
    return { days, firstDate: w[0].date }
  })

  if (!settings) return null

  return (
    <div style={{ padding: '0 20px', fontFamily: "'Geist', system-ui, sans-serif", color: 'var(--color-ink)' }}>
      {/* Page header */}
      <div style={{ paddingTop: 8, paddingBottom: 20 }}>
        <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, letterSpacing: '-0.5px', lineHeight: 1.05 }}>
          Goals
        </div>
      </div>

      {/* Days tracking card */}
      {trackingStats && trackingStats.days > 0 && (
        <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: 'var(--color-accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Calendar size={20} style={{ color: 'var(--color-accent-deep)' }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, lineHeight: 1, letterSpacing: '-0.5px' }}>
              {trackingStats.days}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--color-ink-mute)', marginLeft: 6 }}>
                {trackingStats.days === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--color-ink-mute)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: 2 }}>
              Tracking · since {formatDate(trackingStats.firstDate)}
            </div>
          </div>
        </Card>
      )}

      <WeightGoalCard settings={settings} />
      <BodyFatGoalCard settings={settings} />
      {settings.measurementSites.length > 0 && <MeasurementGoalsCard settings={settings} />}
    </div>
  )
}
