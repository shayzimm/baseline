import { type ReactNode } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      {/* ── Mobile layout (< 768px) ─────────────────────────── */}
      <div
        className="md:hidden"
        style={{
          width: '100%',
          height: '100dvh',
          background: 'var(--color-bg)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <TopBar />
        <main
          style={{
            position: 'absolute',
            top: 56,
            bottom: 0,
            left: 0,
            right: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Extra bottom padding so content clears the floating nav bar */}
          <div style={{ paddingBottom: 108 }}>{children}</div>
        </main>
        <BottomNav />
      </div>

      {/* ── Desktop layout (≥ 768px) ─────────────────────────── */}
      <div
        className="hidden md:flex"
        style={{
          height: '100dvh',
          background: 'var(--color-bg)',
        }}
      >
        <Sidebar />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '40px 48px',
            maxWidth: 760,
          }}
        >
          {children}
        </main>
      </div>
    </>
  )
}
