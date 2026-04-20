import { useNavigate, useLocation } from 'react-router-dom'
import { Sun, TrendingUp, Target, Settings } from 'lucide-react'

const TABS = [
  { path: '/',          label: 'Today',    Icon: Sun },
  { path: '/progress',  label: 'Progress', Icon: TrendingUp },
  { path: '/goals',     label: 'Goals',    Icon: Target },
  { path: '/settings',  label: 'Settings', Icon: Settings },
] as const

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 18,
        height: 72,
        borderRadius: 32,
        zIndex: 40,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '0.5px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 24px rgba(30,60,90,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
      }}
    >
      {TABS.map(({ path, label, Icon }) => {
        const isActive = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              height: '100%',
              border: 'none',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              cursor: 'pointer',
              padding: 0,
              minWidth: 44,
              color: isActive ? 'var(--color-accent-deep)' : 'var(--color-ink-mute)',
              transition: 'color 0.2s',
            }}
          >
            <Icon size={22} strokeWidth={isActive ? 2 : 1.6} />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
