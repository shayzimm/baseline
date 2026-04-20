import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppShell } from './components/layout/AppShell'
import { PinLock } from './components/PinLock'
import { TodayView } from './views/Today'
import { GoalsView } from './views/Goals'
import { SettingsView } from './views/Settings'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { db } from './db'

// Recharts is ~350 KB — lazy-load Progress so it doesn't block the initial bundle
const ProgressView = lazy(() =>
  import('./views/Progress').then(m => ({ default: m.ProgressView }))
)

function ProgressFallback() {
  return (
    <div style={{
      padding: '40px 20px', fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase',
      color: 'var(--color-ink-faint)', textAlign: 'center',
    }}>
      Loading…
    </div>
  )
}

export function App() {
  const [sessionUnlocked, setSessionUnlocked] = useState(
    () => sessionStorage.getItem('baseline_unlocked') === '1'
  )

  const settings = useLiveQuery(() => db.settings.get(1))
  useInstallPrompt()

  // Settings not yet loaded — show nothing briefly
  if (settings === undefined) return null

  // Show lock screen if enabled and not yet unlocked this session
  if (settings?.appLockEnabled && settings.appLockPin && !sessionUnlocked) {
    return (
      <PinLock
        storedHash={settings.appLockPin}
        onUnlock={() => {
          sessionStorage.setItem('baseline_unlocked', '1')
          setSessionUnlocked(true)
        }}
      />
    )
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<TodayView />} />
        <Route path="/progress" element={
          <Suspense fallback={<ProgressFallback />}>
            <ProgressView />
          </Suspense>
        } />
        <Route path="/goals" element={<GoalsView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
