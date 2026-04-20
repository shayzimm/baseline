// Progress photo tab: upload front/side/back sets, grid gallery, side-by-side comparison.
// Images are compressed to max 1920px longest edge at JPEG quality 0.85 before storing as Blobs.
import { useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, X, ChevronLeft, ArrowLeftRight } from 'lucide-react'
import { db, type WeeklyPic } from '../../db'

// ── Image compression ─────────────────────────────────────────────────────────

async function compressImage(file: File, maxDim = 1920, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', quality)
    }
    img.onerror = reject
    img.src = url
  })
}

// ── Upload form ────────────────────────────────────────────────────────────────

type Angle = 'front' | 'side' | 'back'
const ANGLES: Angle[] = ['front', 'side', 'back']

function UploadForm({ onClose }: { onClose: () => void }) {
  const [blobs, setBlobs] = useState<Partial<Record<Angle, Blob>>>({})
  const [previews, setPreviews] = useState<Partial<Record<Angle, string>>>({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRefs = useRef<Partial<Record<Angle, HTMLInputElement>>>({})

  const pickFile = async (angle: Angle, file: File) => {
    const compressed = await compressImage(file)
    setBlobs(b => ({ ...b, [angle]: compressed }))
    const previewUrl = URL.createObjectURL(compressed)
    setPreviews(p => {
      if (p[angle]) URL.revokeObjectURL(p[angle]!)
      return { ...p, [angle]: previewUrl }
    })
  }

  const save = async () => {
    if (Object.keys(blobs).length === 0) return
    setSaving(true)
    await db.weeklyPics.add({
      date: new Date().toISOString().slice(0, 10),
      front: blobs.front ?? null,
      side: blobs.side ?? null,
      back: blobs.back ?? null,
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
          New photo set · {new Date().toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
        </span>
        <button onClick={onClose} aria-label="Cancel" style={{ border: 'none', background: 'transparent',
          cursor: 'pointer', color: 'var(--color-ink-mute)' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {ANGLES.map(angle => (
          <div key={angle}>
            <input
              ref={el => { if (el) inputRefs.current[angle] = el }}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) pickFile(angle, e.target.files[0]) }}
            />
            <button
              onClick={() => inputRefs.current[angle]?.click()}
              aria-label={`Upload ${angle} photo`}
              style={{
                width: '100%', aspectRatio: '3/4', borderRadius: 14, border: 'none',
                background: previews[angle] ? 'transparent' : 'var(--color-surface)',
                cursor: 'pointer', overflow: 'hidden', position: 'relative',
                boxShadow: previews[angle] ? 'none' : 'inset 0 0 0 1px var(--color-line)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 6,
              }}
            >
              {previews[angle] ? (
                <img src={previews[angle]} alt={angle}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <Camera size={20} style={{ color: 'var(--color-ink-faint)' }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                    letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-ink-faint)' }}>
                    {angle}
                  </span>
                </>
              )}
            </button>
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
        disabled={saving || Object.keys(blobs).length === 0}
        style={{
          width: '100%', height: 48, borderRadius: 14, border: 'none',
          background: Object.keys(blobs).length > 0 ? 'var(--color-accent-deep)' : 'var(--color-surface)',
          color: Object.keys(blobs).length > 0 ? '#fff' : 'var(--color-ink-faint)',
          fontFamily: "'Geist', system-ui", fontSize: 15, fontWeight: 500,
          cursor: Object.keys(blobs).length > 0 ? 'pointer' : 'default',
        }}
      >
        {saving ? 'Saving…' : 'Save photo set'}
      </button>
    </div>
  )
}

// ── Blob → object URL cache ───────────────────────────────────────────────────

function BlobImg({ blob, alt, style }: { blob: Blob | null; alt: string; style?: React.CSSProperties }) {
  const [url, setUrl] = useState<string | null>(null)

  // Create object URL once and revoke on unmount
  if (blob && !url) {
    setUrl(URL.createObjectURL(blob))
  }

  // Clean up when component unmounts
  if (!blob && url) {
    URL.revokeObjectURL(url)
    setUrl(null)
  }

  if (!url) {
    return (
      <div style={{ ...style, background: 'var(--color-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Camera size={16} style={{ color: 'var(--color-ink-faint)' }} />
      </div>
    )
  }

  return <img src={url} alt={alt} style={{ ...style, objectFit: 'cover' }} />
}

// ── Comparison view ────────────────────────────────────────────────────────────

function ComparisonView({ picA, picB, onClose }: {
  picA: WeeklyPic; picB: WeeklyPic; onClose: () => void
}) {
  const [angle, setAngle] = useState<Angle>('front')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)',
      zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--color-line)' }}>
        <button onClick={onClose} aria-label="Back" style={{ border: 'none', background: 'transparent',
          cursor: 'pointer', color: 'var(--color-ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ChevronLeft size={20} /> Back
        </button>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-ink-mute)',
          display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeftRight size={13} /> Compare
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Side-by-side images */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, gap: 2, overflow: 'hidden' }}>
        {[picA, picB].map((pic, i) => (
          <div key={i} style={{ position: 'relative', overflow: 'hidden' }}>
            <BlobImg
              blob={pic[angle]}
              alt={`${angle} ${i === 0 ? 'before' : 'after'}`}
              style={{ width: '100%', height: '100%' }}
            />
            <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.8)',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)', letterSpacing: '0.5px' }}>
              {new Date(pic.date + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        ))}
      </div>

      {/* Angle picker */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 20px',
        borderTop: '1px solid var(--color-line)', justifyContent: 'center' }}>
        {ANGLES.map(a => (
          <button key={a} onClick={() => setAngle(a)} aria-pressed={angle === a}
            style={{
              padding: '8px 20px', borderRadius: 999, border: 'none',
              background: angle === a ? 'var(--color-ink)' : 'var(--color-surface)',
              color: angle === a ? '#fff' : 'var(--color-ink-soft)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              cursor: 'pointer', letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>
            {a}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Gallery grid ──────────────────────────────────────────────────────────────

function GalleryCard({ pic, onSelect, selected }: {
  pic: WeeklyPic; onSelect: (p: WeeklyPic) => void; selected: boolean
}) {
  return (
    <button
      onClick={() => onSelect(pic)}
      aria-pressed={selected}
      aria-label={`Photo set from ${pic.date}`}
      style={{
        display: 'block', background: 'none', border: 'none', padding: 0,
        cursor: 'pointer', borderRadius: 14, overflow: 'hidden',
        outline: selected ? '2.5px solid var(--color-accent-deep)' : 'none',
        outlineOffset: 2,
      }}
    >
      <BlobImg
        blob={pic.front ?? pic.side ?? pic.back}
        alt={`Progress photo ${pic.date}`}
        style={{ width: '100%', aspectRatio: '3/4', borderRadius: 14, display: 'block' }}
      />
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: 'var(--color-ink-mute)', letterSpacing: '0.5px', marginTop: 4, textAlign: 'center' }}>
        {new Date(pic.date + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
      </div>
    </button>
  )
}

// ── Main PicsTab ──────────────────────────────────────────────────────────────

export function PicsTab() {
  const pics = useLiveQuery(() => db.weeklyPics.orderBy('date').toArray())
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<WeeklyPic[]>([])
  const [comparing, setComparing] = useState(false)

  const toggleSelect = (pic: WeeklyPic) => {
    setSelected(prev => {
      const already = prev.find(p => p.id === pic.id)
      if (already) return prev.filter(p => p.id !== pic.id)
      if (prev.length >= 2) return [prev[1], pic]
      return [...prev, pic]
    })
  }

  if (comparing && selected.length === 2) {
    return (
      <ComparisonView
        picA={selected[0]}
        picB={selected[1]}
        onClose={() => setComparing(false)}
      />
    )
  }

  return (
    <div>
      {/* Upload button / form */}
      {uploading ? (
        <UploadForm onClose={() => setUploading(false)} />
      ) : (
        <button
          onClick={() => setUploading(true)}
          style={{
            width: '100%', height: 52, borderRadius: 18, border: '1px dashed var(--color-line)',
            background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, fontFamily: "'Geist', system-ui", fontSize: 14, color: 'var(--color-ink-soft)',
            cursor: 'pointer', marginBottom: 16,
          }}
        >
          <Camera size={18} /> Add progress photos
        </button>
      )}

      {/* Compare CTA */}
      {selected.length === 2 && (
        <button
          onClick={() => setComparing(true)}
          style={{
            width: '100%', height: 48, borderRadius: 14, border: 'none',
            background: 'var(--color-accent-deep)', color: '#fff',
            fontFamily: "'Geist', system-ui", fontSize: 15, fontWeight: 500,
            cursor: 'pointer', marginBottom: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <ArrowLeftRight size={18} /> Compare selected
        </button>
      )}

      {selected.length === 1 && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-ink-mute)',
          textAlign: 'center', marginBottom: 12 }}>
          Tap another to compare
        </div>
      )}

      {/* Gallery grid */}
      {pics && pics.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[...pics].reverse().map(pic => (
            <GalleryCard
              key={pic.id}
              pic={pic}
              onSelect={toggleSelect}
              selected={selected.some(s => s.id === pic.id)}
            />
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: 'var(--color-ink-faint)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          No photos yet
        </div>
      )}
    </div>
  )
}
