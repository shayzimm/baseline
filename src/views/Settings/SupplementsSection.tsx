import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, X, ChevronUp, ChevronDown, Archive, ArchiveRestore } from 'lucide-react'
import { db, type Supplement } from '../../db'
import { SectionHeading, SettingsCard } from './shared'

const ANCHORS = ['morning', 'evening', 'as-needed'] as const
const ANCHOR_SHORT: Record<Supplement['anchor'], string> = {
  morning: 'AM', evening: 'PM', 'as-needed': 'PRN',
}

interface FormState {
  name: string
  doseLabel: string
  anchor: Supplement['anchor']
}

const EMPTY_FORM: FormState = { name: '', doseLabel: '', anchor: 'morning' }

export function SupplementsSection() {
  const supplements = useLiveQuery(() => db.supplements.toArray(), [])
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showArchived, setShowArchived] = useState(false)

  if (!supplements) return null

  const active = supplements
    .filter(s => s.archivedAt == null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const archived = supplements.filter(s => s.archivedAt != null)

  const startEdit = (s: Supplement) => {
    setEditingId(s.id!)
    setForm({ name: s.name, doseLabel: s.doseLabel, anchor: s.anchor })
  }

  const startAdd = () => {
    setEditingId('new')
    setForm(EMPTY_FORM)
  }

  const cancel = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const save = async () => {
    const name = form.name.trim()
    if (!name) return
    if (editingId === 'new') {
      const maxSort = active.reduce((m, s) => Math.max(m, s.sortOrder), -1)
      await db.supplements.add({
        name, doseLabel: form.doseLabel.trim(), anchor: form.anchor,
        sortOrder: maxSort + 1, createdAt: Date.now(), archivedAt: null,
      })
    } else if (editingId != null) {
      await db.supplements.update(editingId, {
        name, doseLabel: form.doseLabel.trim(), anchor: form.anchor,
      })
    }
    cancel()
  }

  const move = async (index: number, dir: -1 | 1) => {
    const a = active[index]
    const b = active[index + dir]
    if (!a?.id || !b?.id) return
    await db.transaction('rw', db.supplements, async () => {
      await db.supplements.update(a.id!, { sortOrder: b.sortOrder })
      await db.supplements.update(b.id!, { sortOrder: a.sortOrder })
    })
  }

  const archive = (id: number) => db.supplements.update(id, { archivedAt: Date.now() })
  const restore = (id: number) => db.supplements.update(id, { archivedAt: null })

  return (
    <section style={{ marginBottom: 28 }}>
      <SectionHeading>Supplements</SectionHeading>
      <SettingsCard>
        {active.map((s, i) => (
          <div key={s.id}>
            {editingId === s.id ? (
              <EditForm form={form} setForm={setForm} onSave={save} onCancel={cancel} />
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 10px 18px',
                borderBottom: '1px solid var(--color-line)',
              }}>
                <button
                  onClick={() => startEdit(s)}
                  style={{
                    flex: 1, minWidth: 0, background: 'none', border: 'none',
                    padding: 0, textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'block', fontFamily: "'Geist', system-ui", fontSize: 15, color: 'var(--color-ink)' }}>
                    {s.name}
                  </span>
                  <span style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--color-ink-mute)', marginTop: 1 }}>
                    {ANCHOR_SHORT[s.anchor]}{s.doseLabel ? ` · ${s.doseLabel}` : ''}
                  </span>
                </button>
                <IconButton label={`Move ${s.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronUp size={15} />
                </IconButton>
                <IconButton label={`Move ${s.name} down`} disabled={i === active.length - 1} onClick={() => move(i, 1)}>
                  <ChevronDown size={15} />
                </IconButton>
                <IconButton label={`Archive ${s.name}`} onClick={() => archive(s.id!)}>
                  <Archive size={15} />
                </IconButton>
              </div>
            )}
          </div>
        ))}

        {editingId === 'new' ? (
          <EditForm form={form} setForm={setForm} onSave={save} onCancel={cancel} />
        ) : (
          <button
            onClick={startAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '12px 18px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Geist', system-ui", fontSize: 14, color: 'var(--color-accent-deep)',
              textAlign: 'left',
            }}
          >
            <Plus size={16} /> Add supplement
          </button>
        )}

        {archived.length > 0 && (
          <div style={{ borderTop: '1px solid var(--color-line)' }}>
            <button
              onClick={() => setShowArchived(v => !v)}
              style={{
                display: 'block', width: '100%', padding: '10px 18px',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-ink-faint)',
              }}
            >
              {showArchived ? '▾' : '▸'} Archived ({archived.length})
            </button>
            {showArchived && archived.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px 8px 18px',
              }}>
                <span style={{ flex: 1, fontFamily: "'Geist', system-ui", fontSize: 14, color: 'var(--color-ink-mute)' }}>
                  {s.name}
                </span>
                <IconButton label={`Restore ${s.name}`} onClick={() => restore(s.id!)}>
                  <ArchiveRestore size={15} />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--color-ink-faint)', margin: '2px 4px 0' }}>
        Archiving keeps history — nothing is deleted
      </div>
    </section>
  )
}

function IconButton({
  label, disabled, onClick, children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        background: 'none', border: 'none', padding: 6, display: 'flex',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'var(--color-line)' : 'var(--color-ink-faint)',
      }}
    >
      {children}
    </button>
  )
}

function EditForm({
  form, setForm, onSave, onCancel,
}: {
  form: FormState
  setForm: (f: FormState) => void
  onSave: () => void
  onCancel: () => void
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 40, borderRadius: 10,
    border: '1.5px solid var(--color-accent)', padding: '0 12px',
    fontFamily: "'Geist', system-ui", fontSize: 14,
    background: 'var(--color-surface)', color: 'var(--color-ink)', outline: 'none',
    boxSizing: 'border-box', marginBottom: 8,
  }
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-line)' }}>
      <input
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        placeholder="Name (e.g. Creatine)"
        autoFocus
        style={inputStyle}
      />
      <input
        value={form.doseLabel}
        onChange={e => setForm({ ...form, doseLabel: e.target.value })}
        placeholder="Dose (e.g. 5g) — optional"
        style={inputStyle}
      />
      <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface)', borderRadius: 12, padding: 3, marginBottom: 10 }}>
        {ANCHORS.map(a => (
          <button
            key={a}
            onClick={() => setForm({ ...form, anchor: a })}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              background: form.anchor === a ? 'var(--color-accent-deep)' : 'transparent',
              color: form.anchor === a ? '#fff' : 'var(--color-ink-mute)',
              transition: 'all 0.15s',
            }}
          >
            {a === 'as-needed' ? 'as needed' : a}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onSave}
          style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: 'var(--color-accent-deep)', color: '#fff', fontFamily: "'Geist', system-ui", fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          aria-label="Cancel"
          style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'var(--color-surface)', color: 'var(--color-ink-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
