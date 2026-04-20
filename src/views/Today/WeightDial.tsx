import { useRef, useState } from 'react'

interface WeightDialProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  /** Background colour for the edge fade — should match the card background */
  fadeBg?: string
}

export function WeightDial({
  value,
  onChange,
  min = 30,
  max = 300,
  fadeBg = 'var(--color-surface-alt)',
}: WeightDialProps) {
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ x: number; v: number } | null>(null)
  const TICK_PX = 12 // pixels per 0.1 kg

  const commit = (v: number) => {
    const clamped = Math.max(min, Math.min(max, v))
    onChange(Math.round(clamped * 10) / 10)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, v: value }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return
    // drag left = value increases (heavier feels like scrolling right on a ruler)
    const dx = e.clientX - dragStart.current.x
    const dv = (-dx / TICK_PX) * 0.1
    commit(dragStart.current.v + dv)
  }

  const onPointerUp = () => {
    setDragging(false)
    dragStart.current = null
  }

  // Build tick marks centred on the current value (±7 kg visible on each side)
  const span = 7
  const baseLo = Math.floor((value - span) * 10)
  const baseHi = Math.ceil((value + span) * 10)
  const ticks: Array<{ v: number; offset: number; isWhole: boolean; isHalf: boolean }> = []
  for (let raw = baseLo; raw <= baseHi; raw++) {
    const vr = raw / 10
    const offset = (vr - value) * TICK_PX * 10
    const isWhole = raw % 10 === 0
    const isHalf = !isWhole && raw % 5 === 0
    ticks.push({ v: vr, offset, isWhole, isHalf })
  }

  return (
    <div
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label="Weight"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') commit(value - 0.1)
        if (e.key === 'ArrowRight') commit(value + 0.1)
        if (e.key === 'ArrowUp') commit(value - 1)
        if (e.key === 'ArrowDown') commit(value + 1)
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'relative',
        height: 110,
        userSelect: 'none',
        touchAction: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        outline: 'none',
      }}
    >
      {/* Centre indicator — the "cursor" of the ruler */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          bottom: 28,
          left: '50%',
          width: 2,
          background: 'var(--color-accent-deep)',
          borderRadius: 2,
          zIndex: 3,
          marginLeft: -1,
          boxShadow: '0 0 0 4px var(--color-accent-soft)',
        }}
      />

      {/* Tick marks */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 18, left: '50%', height: 60 }}>
          {ticks.map(({ v, offset, isWhole, isHalf }) => (
            <div key={v.toFixed(1)}>
              <div
                style={{
                  position: 'absolute',
                  left: offset,
                  top: 0,
                  width: 1,
                  height: isWhole ? 36 : isHalf ? 22 : 12,
                  background: isWhole ? 'var(--color-ink-soft)' : 'var(--color-ink-faint)',
                  opacity: isWhole ? 0.9 : 0.55,
                }}
              />
              {isWhole && (
                <div
                  style={{
                    position: 'absolute',
                    left: offset,
                    top: 40,
                    transform: 'translateX(-50%)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: 'var(--color-ink-mute)',
                    letterSpacing: '0.5px',
                  }}
                >
                  {v.toFixed(0)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edge fade — hides ticks at the edges for a clean infinity effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(to right, ${fadeBg} 0%, transparent 18%, transparent 82%, ${fadeBg} 100%)`,
        }}
      />
    </div>
  )
}
