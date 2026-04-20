// Scrollable list of daily entries with inline edit and delete.
import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { db, type DailyEntry } from '../../db'

const MOOD_LABELS: Record<number, string> = { 5: 'Great', 4: 'Good', 3: 'OK', 2: 'Meh', 1: 'Low' }

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

interface EntryRowProps {
  entry: DailyEntry
  unit: string
  onDeleted: () => void
}

function EntryRow({ entry, unit, onDeleted }: EntryRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(entry.weightKg?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = async () => {
    const parsed = parseFloat(draft)
    if (isNaN(parsed) || parsed <= 0) return
    setSaving(true)
    await db.dailyEntries.update(entry.id!, { weightKg: parsed, updatedAt: Date.now() })
    setSaving(false)
    setEditing(false)
  }

  const remove = async () => {
    await db.dailyEntries.delete(entry.id!)
    onDeleted()
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: '1px solid var(--color-line)',
      gap: 12,
      minHeight: 56,
    }}>
      {/* Date */}
      <div style={{ width: 100, flexShrink: 0 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-ink-mute)' }}>
          {formatDate(entry.date)}
        </div>
      </div>

      {/* Weight */}
      <div style={{ flex: 1 }}>
        {editing ? (
          <input
            type="number"
            step="0.1"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            autoFocus
            style={{
              width: 80,
              padding: '4px 8px',
              borderRadius: 8,
              border: '1.5px solid var(--color-accent)',
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 18,
              background: 'var(--color-surface-alt)',
              color: 'var(--color-ink)',
              outline: 'none',
            }}
          />
        ) : (
          <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 20, letterSpacing: '-0.3px' }}>
            {entry.weightKg != null ? `${entry.weightKg.toFixed(1)} ${unit}` : '—'}
          </span>
        )}
      </div>

      {/* Mood */}
      {entry.moodRating != null && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: 'var(--color-ink-mute)', letterSpacing: '0.5px' }}>
          {MOOD_LABELS[entry.moodRating]}
        </div>
      )}

      {/* Actions */}
      {editing ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn label="Save" onClick={save} color={saving ? 'var(--color-ink-faint)' : 'var(--color-good)'}>
            <Check size={15} strokeWidth={2.5} />
          </IconBtn>
          <IconBtn label="Cancel" onClick={() => setEditing(false)} color="var(--color-ink-mute)">
            <X size={15} strokeWidth={2} />
          </IconBtn>
        </div>
      ) : confirmDelete ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--color-blush)' }}>Delete?</span>
          <IconBtn label="Confirm delete" onClick={remove} color="var(--color-blush)">
            <Check size={15} strokeWidth={2.5} />
          </IconBtn>
          <IconBtn label="Cancel delete" onClick={() => setConfirmDelete(false)} color="var(--color-ink-mute)">
            <X size={15} strokeWidth={2} />
          </IconBtn>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn label="Edit entry" onClick={() => { setDraft(entry.weightKg?.toString() ?? ''); setEditing(true) }} color="var(--color-ink-mute)">
            <Pencil size={14} strokeWidth={1.8} />
          </IconBtn>
          <IconBtn label="Delete entry" onClick={() => setConfirmDelete(true)} color="var(--color-ink-mute)">
            <Trash2 size={14} strokeWidth={1.8} />
          </IconBtn>
        </div>
      )}
    </div>
  )
}

function IconBtn({ label, onClick, color, children }: {
  label: string; onClick: () => void; color: string; children: React.ReactNode
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: 8, border: 'none',
        background: 'var(--color-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

interface EntryListProps {
  entries: DailyEntry[]
  unit: string
}

export function EntryList({ entries, unit }: EntryListProps) {
  const [deleted, setDeleted] = useState<Set<number>>(new Set())

  if (entries.length === 0) {
    return (
      <div style={{ padding: '24px 16px', fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, color: 'var(--color-ink-faint)', textAlign: 'center',
        letterSpacing: '1px', textTransform: 'uppercase' }}>
        No entries in this range
      </div>
    )
  }

  const visible = entries.filter(e => e.id != null && !deleted.has(e.id!))

  return (
    <div>
      {[...visible].reverse().map(entry => (
        <EntryRow
          key={entry.id}
          entry={entry}
          unit={unit}
          onDeleted={() => setDeleted(s => new Set(s).add(entry.id!))}
        />
      ))}
    </div>
  )
}
