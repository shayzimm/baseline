// 5-point mood selector using custom SVG faces matching the Hearth prototype.

interface MoodPickerProps {
  value: 1 | 2 | 3 | 4 | 5 | null
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void
}

const MOODS: { rating: 1 | 2 | 3 | 4 | 5; label: string; bg: string }[] = [
  { rating: 5, label: 'Great', bg: 'var(--color-mint)' },
  { rating: 4, label: 'Good',  bg: 'var(--color-teal)' },
  { rating: 3, label: 'OK',    bg: 'var(--color-sand)' },
  { rating: 2, label: 'Meh',   bg: 'var(--color-ink-faint)' },
  { rating: 1, label: 'Low',   bg: 'var(--color-blush)' },
]

function MoodFace({ rating, size = 24 }: { rating: number; size?: number }) {
  const eyes = (
    <>
      <circle cx="8.5" cy="10" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="10" r="1.2" fill="currentColor" />
    </>
  )
  const mouths: Record<number, React.ReactNode> = {
    5: <path d="M7 14c1.5 2.5 8.5 2.5 10 0" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
    4: <path d="M8 14c1 1.5 7 1.5 8 0" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
    3: <path d="M8 15h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
    2: <path d="M8 15l8-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
    1: <path d="M8 16c1-2 7-2 8 0" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {eyes}
      {mouths[rating]}
    </svg>
  )
}

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  const selected = MOODS.find((m) => m.rating === value)

  return (
    <div
      style={{
        background: 'var(--color-surface-alt)',
        borderRadius: 24,
        padding: '18px 20px',
        border: '1px solid var(--color-line)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
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
          How are you feeling
        </span>
        {selected && (
          <span
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 18,
              color: 'var(--color-accent-deep)',
              fontStyle: 'italic',
            }}
          >
            {selected.label.toLowerCase()}
          </span>
        )}
      </div>

      <div role="radiogroup" aria-label="Mood rating" style={{ display: 'flex', gap: 8 }}>
        {MOODS.map((m) => (
          <button
            key={m.rating}
            role="radio"
            aria-checked={value === m.rating}
            aria-label={m.label}
            onClick={() => onChange(m.rating)}
            style={{
              flex: 1,
              aspectRatio: '1',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 16,
              minHeight: 44,
              background: value === m.rating ? m.bg : 'var(--color-surface)',
              color: 'var(--color-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow:
                value === m.rating
                  ? 'inset 0 0 0 1.5px var(--color-ink)'
                  : 'none',
              transition: 'all 0.2s',
            }}
          >
            <MoodFace rating={m.rating} size={26} />
          </button>
        ))}
      </div>
    </div>
  )
}
