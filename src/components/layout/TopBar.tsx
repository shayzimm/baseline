import { User } from 'lucide-react'

export function TopBar() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        height: 56,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '0 16px 10px',
      }}
    >
      {/* Baseline wordmark / logo */}
      <div
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 20,
          color: 'var(--color-accent-deep)',
          lineHeight: 1,
          letterSpacing: '-0.3px',
        }}
      >
        Baseline
      </div>

      <button
        aria-label="Settings"
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          border: 'none',
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-ink-soft)',
          cursor: 'pointer',
        }}
      >
        <User size={18} />
      </button>
    </div>
  )
}
