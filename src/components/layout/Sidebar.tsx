import { useNavigate, useLocation } from 'react-router-dom'
import { Sun, TrendingUp, Target, Settings } from 'lucide-react'

const TABS = [
  { path: '/',          label: 'Today',    Icon: Sun },
  { path: '/progress',  label: 'Progress', Icon: TrendingUp },
  { path: '/goals',     label: 'Goals',    Icon: Target },
  { path: '/settings',  label: 'Settings', Icon: Settings },
] as const

export function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <aside
      aria-label="Main navigation"
      style={{
        width: 220,
        flexShrink: 0,
        padding: '24px 12px',
        borderRight: '1px solid var(--color-line)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 24,
          color: 'var(--color-accent-deep)',
          padding: '8px 12px 20px',
          letterSpacing: '-0.3px',
        }}
      >
        Baseline
      </div>

      {TABS.map(({ path, label, Icon }) => {
        const isActive = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              border: 'none',
              background: isActive ? 'var(--color-accent-soft)' : 'transparent',
              color: isActive ? 'var(--color-accent-deep)' : 'var(--color-ink-mute)',
              fontFamily: "'Geist', system-ui, sans-serif",
              fontSize: 14,
              fontWeight: isActive ? 500 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              minHeight: 44,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <Icon size={18} strokeWidth={isActive ? 2 : 1.6} />
            {label}
          </button>
        )
      })}
    </aside>
  )
}
