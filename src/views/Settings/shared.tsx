export function SectionHeading({ children }: { children: string }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '1.4px',
      textTransform: 'uppercase', color: 'var(--color-ink-mute)', marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

export function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-surface-alt)', borderRadius: 20,
      border: '1px solid var(--color-line)', overflow: 'hidden', marginBottom: 8,
    }}>
      {children}
    </div>
  )
}
