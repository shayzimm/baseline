import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sparkles, Camera, Ruler } from 'lucide-react'
import { type ReactNode } from 'react'
import { db, upsertTodayEntry } from '../../db'
import { WeightDial } from './WeightDial'
import { MoodPicker } from './MoodPicker'
import { QuickStats } from './QuickStats'
import { SupplementChecklist } from './SupplementChecklist'

export function TodayView() {
  const today = new Date().toISOString().slice(0, 10)
  const entry = useLiveQuery(
    () => db.dailyEntries.where('date').equals(today).first(),
    [today]
  )
  const settings = useLiveQuery(() => db.settings.get(1))

  const isMetric = settings?.units !== 'imperial'
  const unit = isMetric ? 'kg' : 'lb'
  const defaultWeight = isMetric ? 70 : 154

  // Local weight state drives the dial; synced from DB on first load
  const [weight, setWeight] = useState<number>(defaultWeight)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (entry?.weightKg != null) setWeight(entry.weightKg)
  }, [entry?.weightKg])

  const moodRating = entry?.moodRating ?? null
  const notes = entry?.notes ?? ''
  const logged = entry?.weightKg != null

  const dayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const wholeW = Math.floor(weight)
  const decW = Math.round((weight % 1) * 10)

  const logWeight = async () => {
    setSaving(true)
    await upsertTodayEntry({ weightKg: weight })
    setSaving(false)
  }

  const setMood = (r: 1 | 2 | 3 | 4 | 5) => upsertTodayEntry({ moodRating: r })
  const setNotes = (n: string) => upsertTodayEntry({ notes: n })

  return (
    <div
      style={{
        padding: '0 20px',
        fontFamily: "'Geist', system-ui, sans-serif",
        color: 'var(--color-ink)',
      }}
    >
      {/* ── Greeting ───────────────────────────────────────── */}
      <div style={{ paddingTop: 8, paddingBottom: 28 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '1.4px',
            textTransform: 'uppercase',
            color: 'var(--color-ink-mute)',
            marginBottom: 6,
          }}
        >
          {dayStr} · {dateStr}
        </div>
        <div
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 34,
            lineHeight: 1.05,
            letterSpacing: '-0.5px',
          }}
        >
          Good morning, Shay.
        </div>
      </div>

      {/* ── Hero weight card ───────────────────────────────── */}
      <div
        style={{
          background: 'var(--color-surface-alt)',
          borderRadius: 28,
          padding: '28px 22px 20px',
          marginBottom: 16,
          boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -12px rgba(30,60,90,0.12)',
          border: '1px solid var(--color-line)',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '1.3px',
            textTransform: 'uppercase',
            color: 'var(--color-ink-mute)',
            marginBottom: 4,
          }}
        >
          Morning weight
        </div>

        {/* Big display number */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 8,
            padding: '8px 0 4px',
          }}
        >
          <div
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 100,
              lineHeight: 0.9,
              letterSpacing: '-3px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {wholeW}
            <span style={{ color: 'var(--color-accent)' }}>.{decW}</span>
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              color: 'var(--color-ink-mute)',
              letterSpacing: '0.5px',
            }}
          >
            {unit}
          </div>
        </div>

        <WeightDial
          value={weight}
          onChange={setWeight}
          min={isMetric ? 30 : 66}
          max={isMetric ? 300 : 660}
        />

        {/* Log button */}
        <button
          onClick={logWeight}
          disabled={saving}
          aria-label={logged ? `Logged ${weight.toFixed(1)} ${unit} — tap to update` : 'Log weight'}
          style={{
            marginTop: 8,
            width: '100%',
            height: 56,
            borderRadius: 18,
            background: logged ? 'var(--color-accent-soft)' : 'var(--color-accent-deep)',
            color: logged ? 'var(--color-accent-deep)' : '#fff',
            border: 'none',
            fontFamily: "'Geist', system-ui",
            fontSize: 17,
            fontWeight: 500,
            cursor: saving ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.25s ease',
          }}
        >
          {logged ? `✓  Logged · ${weight.toFixed(1)} ${unit}` : 'Log weight'}
        </button>

        {/* Last-logged indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 12,
            gap: 5,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            color: 'var(--color-ink-faint)',
          }}
        >
          <Sparkles size={11} strokeWidth={1.8} />
          {logged ? 'Saved today' : 'Not logged yet'}
        </div>
      </div>

      {/* ── Supplements ─────────────────────────────────────── */}
      <SupplementChecklist />

      {/* ── 7-day quick stats (hidden until ≥ 2 entries) ───── */}
      <QuickStats />

      {/* ── Mood picker ────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <MoodPicker value={moodRating} onChange={setMood} />
      </div>

      {/* ── Notes ──────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--color-surface-alt)',
          borderRadius: 24,
          padding: '18px 20px',
          marginBottom: 12,
          border: '1px solid var(--color-line)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '1.3px',
              textTransform: 'uppercase',
              color: 'var(--color-ink-mute)',
            }}
          >
            Note
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--color-ink-faint)',
            }}
          >
            {notes.length}/240
          </span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 240))}
          placeholder="How did today go?"
          aria-label="Daily notes"
          rows={3}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            background: 'transparent',
            fontFamily: "'Geist', system-ui",
            fontSize: 15,
            color: 'var(--color-ink)',
            lineHeight: 1.5,
            padding: 0,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ── Quick-add strip ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        <QuickAddButton icon={<Camera size={18} />} label="Progress photo" />
        <QuickAddButton icon={<Ruler size={18} />} label="Measurements" />
      </div>
    </div>
  )
}

function QuickAddButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      style={{
        flex: 1,
        height: 56,
        borderRadius: 18,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: "'Geist', system-ui",
        fontSize: 14,
        color: 'var(--color-ink-soft)',
        cursor: 'pointer',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
