// Full-screen PIN entry shown when app lock is enabled.
import { useState } from 'react'
import { Delete } from 'lucide-react'

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const PAD_KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

interface PinLockProps {
  storedHash: string
  onUnlock: () => void
}

export function PinLock({ storedHash, onUnlock }: PinLockProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)
  const maxLen = 8

  const append = (digit: string) => {
    if (pin.length >= maxLen || checking) return
    const next = pin + digit
    setPin(next)
    setError(false)
    if (next.length >= 4) tryUnlock(next)
  }

  const backspace = () => {
    if (checking) return
    setPin(p => p.slice(0, -1))
    setError(false)
  }

  const tryUnlock = async (candidate: string) => {
    setChecking(true)
    const hashed = await hashPin(candidate)
    if (hashed === storedHash) {
      onUnlock()
    } else if (candidate.length >= maxLen) {
      setError(true)
      setPin('')
    }
    setChecking(false)
  }

  const handleKey = (k: string) => {
    if (k === '⌫') backspace()
    else if (k === '') return
    else append(k)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 40px',
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: "'Instrument Serif', Georgia, serif",
        fontSize: 36, letterSpacing: '-1px', marginBottom: 8,
        color: 'var(--color-ink)',
      }}>
        Baseline
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        letterSpacing: '1.3px', textTransform: 'uppercase',
        color: 'var(--color-ink-mute)', marginBottom: 48,
      }}>
        Enter PIN to unlock
      </div>

      {/* PIN dots */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 14, height: 14, borderRadius: '50%',
              background: i < pin.length
                ? (error ? 'var(--color-blush)' : 'var(--color-accent-deep)')
                : 'var(--color-line)',
              transition: 'background 0.15s',
            }}
          />
        ))}
      </div>

      {error && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: 'var(--color-blush)', marginBottom: 12, letterSpacing: '0.3px',
        }}>
          Incorrect PIN
        </div>
      )}
      {!error && <div style={{ height: 27 }} />}

      {/* Number pad */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12, width: '100%', maxWidth: 280, marginTop: 12,
      }}>
        {PAD_KEYS.map((k, i) => (
          <button
            key={i}
            onClick={() => handleKey(k)}
            disabled={k === '' || checking}
            aria-label={k === '⌫' ? 'Delete' : k === '' ? '' : `Digit ${k}`}
            style={{
              height: 72, borderRadius: 20, border: 'none',
              background: k === '' ? 'transparent' : 'var(--color-surface)',
              color: k === '⌫' ? 'var(--color-ink-mute)' : 'var(--color-ink)',
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: k === '⌫' ? 0 : 26,
              cursor: k === '' ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: k !== '' ? '0 1px 0 rgba(0,0,0,0.04)' : 'none',
              transition: 'background 0.1s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {k === '⌫' ? <Delete size={22} strokeWidth={1.5} /> : k}
          </button>
        ))}
      </div>
    </div>
  )
}
