import { useState, useRef, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Upload, Trash2, Plus, X, Lock, LockOpen, HardDrive, Smartphone } from 'lucide-react'
import { db, exportAllData, importData, type ImportResult } from '../../db'
import { triggerInstallPrompt, canInstall } from '../../hooks/useInstallPrompt'

// ── Helpers ────────────────────────────────────────────────────────────────────

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Shared layout ──────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: string }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '1.4px',
      textTransform: 'uppercase', color: 'var(--color-ink-mute)', marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-surface-alt)', borderRadius: 20,
      border: '1px solid var(--color-line)', overflow: 'hidden', marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function SettingsRow({
  icon, label, sublabel, right, onClick, danger = false,
}: {
  icon?: React.ReactNode
  label: string
  sublabel?: string
  right?: React.ReactNode
  onClick?: () => void
  danger?: boolean
}) {
  const el = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px', minHeight: 56,
      borderBottom: '1px solid var(--color-line)',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      {icon && (
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: danger ? 'rgba(239,100,100,0.12)' : 'var(--color-surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: danger ? 'var(--color-blush)' : 'var(--color-ink-soft)',
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Geist', system-ui", fontSize: 15,
          color: danger ? 'var(--color-blush)' : 'var(--color-ink)',
          fontWeight: 400,
        }}>
          {label}
        </div>
        {sublabel && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: 'var(--color-ink-mute)', marginTop: 1,
          }}>
            {sublabel}
          </div>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )

  return onClick
    ? <button onClick={onClick} style={{ display: 'block', width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}>{el}</button>
    : el
}

// Remove bottom border from last row in a card
function LastSettingsRow(props: Parameters<typeof SettingsRow>[0]) {
  return (
    <div style={{ borderBottom: 'none' }}>
      <SettingsRow {...props} />
    </div>
  )
}

// ── Units toggle ───────────────────────────────────────────────────────────────

function UnitsSection() {
  const settings = useLiveQuery(() => db.settings.get(1))
  if (!settings) return null

  const isMetric = settings.units !== 'imperial'

  const setUnits = async (u: 'metric' | 'imperial') => {
    await db.settings.update(1, { units: u })
  }

  return (
    <section style={{ marginBottom: 28 }}>
      <SectionHeading>Preferences</SectionHeading>
      <SettingsCard>
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Geist', system-ui", fontSize: 15, color: 'var(--color-ink)' }}>
            Units
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface)', borderRadius: 12, padding: 3 }}>
            {(['metric', 'imperial'] as const).map(u => (
              <button
                key={u}
                onClick={() => setUnits(u)}
                style={{
                  padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.3px',
                  background: (u === 'metric') === isMetric ? 'var(--color-accent-deep)' : 'transparent',
                  color: (u === 'metric') === isMetric ? '#fff' : 'var(--color-ink-mute)',
                  transition: 'all 0.15s',
                }}
              >
                {u === 'metric' ? 'kg / cm' : 'lb / in'}
              </button>
            ))}
          </div>
        </div>
      </SettingsCard>
    </section>
  )
}

// ── Measurement sites ──────────────────────────────────────────────────────────

function MeasurementSitesSection() {
  const settings = useLiveQuery(() => db.settings.get(1))
  const [adding, setAdding] = useState(false)
  const [newSite, setNewSite] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  if (!settings) return null

  const addSite = async () => {
    const name = newSite.trim().toLowerCase()
    if (!name || settings.measurementSites.includes(name)) return
    await db.settings.update(1, { measurementSites: [...settings.measurementSites, name] })
    setNewSite('')
    setAdding(false)
  }

  const removeSite = async (site: string) => {
    await db.settings.update(1, {
      measurementSites: settings.measurementSites.filter(s => s !== site),
    })
  }

  return (
    <section style={{ marginBottom: 28 }}>
      <SectionHeading>Measurement Sites</SectionHeading>
      <SettingsCard>
        {settings.measurementSites.map((site, i) => (
          <div key={site} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: i < settings.measurementSites.length - 1 ? '1px solid var(--color-line)' : 'none',
          }}>
            <span style={{ fontFamily: "'Geist', system-ui", fontSize: 15, color: 'var(--color-ink)', textTransform: 'capitalize' }}>
              {site}
            </span>
            <button
              onClick={() => removeSite(site)}
              aria-label={`Remove ${site}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-faint)', padding: 6, display: 'flex' }}
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        ))}

        {settings.measurementSites.length === 0 && !adding && (
          <div style={{ padding: '16px 18px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-ink-faint)' }}>
            No measurement sites
          </div>
        )}

        {adding ? (
          <div style={{ padding: '10px 14px', display: 'flex', gap: 8, borderTop: settings.measurementSites.length > 0 ? '1px solid var(--color-line)' : 'none' }}>
            <input
              ref={inputRef}
              value={newSite}
              onChange={e => setNewSite(e.target.value)}
              placeholder="Site name (e.g. neck)"
              onKeyDown={e => { if (e.key === 'Enter') addSite(); if (e.key === 'Escape') { setAdding(false); setNewSite('') } }}
              style={{
                flex: 1, height: 40, borderRadius: 10,
                border: '1.5px solid var(--color-accent)', padding: '0 12px',
                fontFamily: "'Geist', system-ui", fontSize: 14,
                background: 'var(--color-surface)', color: 'var(--color-ink)', outline: 'none',
              }}
            />
            <button onClick={addSite} style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'var(--color-good)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={16} />
            </button>
            <button onClick={() => { setAdding(false); setNewSite('') }} style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'var(--color-surface)', color: 'var(--color-ink-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '12px 18px',
              background: 'none', border: 'none', cursor: 'pointer',
              borderTop: settings.measurementSites.length > 0 ? '1px solid var(--color-line)' : 'none',
              fontFamily: "'Geist', system-ui", fontSize: 14, color: 'var(--color-accent-deep)',
              textAlign: 'left',
            }}
          >
            <Plus size={16} /> Add site
          </button>
        )}
      </SettingsCard>
    </section>
  )
}

// ── Data section (export + import + storage) ───────────────────────────────────

function DataSection() {
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)

  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null)

  useEffect(() => {
    navigator.storage?.estimate().then(e => {
      if (e.usage != null && e.quota != null) {
        setStorageInfo({ used: e.usage, quota: e.quota })
      }
    }).catch(() => {})
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `baseline-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExported(true)
      setTimeout(() => setExported(false), 3000)
    } finally {
      setExporting(false)
    }
  }

  const handleImportFile = async (file: File) => {
    setImporting(true)
    setImportError(null)
    setImportResult(null)
    try {
      const text = await file.text()
      const raw = JSON.parse(text)
      const result = await importData(raw)
      setImportResult(result)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section style={{ marginBottom: 28 }}>
      <SectionHeading>Data</SectionHeading>
      <SettingsCard>
        {/* Export */}
        <SettingsRow
          icon={<Download size={17} />}
          label={exporting ? 'Preparing…' : exported ? 'Exported ✓' : 'Export all data'}
          sublabel="Downloads a JSON backup file"
          onClick={handleExport}
        />

        {/* Import */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleImportFile(e.target.files[0]) }}
          />
          <SettingsRow
            icon={<Upload size={17} />}
            label={importing ? 'Importing…' : 'Import from backup'}
            sublabel="Merge entries from a JSON backup file"
            onClick={() => fileInputRef.current?.click()}
          />
          {importResult && (
            <div style={{ padding: '10px 18px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-good)', borderTop: '1px solid var(--color-line)' }}>
              Imported {importResult.entries} entries · {importResult.measurements} measurements · {importResult.supplements} supplements · {importResult.supplementLogs} logs ✓
            </div>
          )}
          {importError && (
            <div style={{ padding: '10px 18px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-blush)', borderTop: '1px solid var(--color-line)' }}>
              Error: {importError}
            </div>
          )}
        </div>

        {/* Storage */}
        {storageInfo && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--color-line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-soft)', flexShrink: 0 }}>
                <HardDrive size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Geist', system-ui", fontSize: 15, color: 'var(--color-ink)' }}>
                  Storage
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-ink-mute)', marginTop: 1 }}>
                  {formatBytes(storageInfo.used)} used of {formatBytes(storageInfo.quota)}
                </div>
                <div style={{ marginTop: 6, height: 4, borderRadius: 999, background: 'var(--color-line)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 999,
                    width: `${Math.min(100, (storageInfo.used / storageInfo.quota) * 100).toFixed(1)}%`,
                    background: 'var(--color-accent-deep)',
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </SettingsCard>
    </section>
  )
}

// ── Install prompt ─────────────────────────────────────────────────────────────

function InstallSection() {
  const [installed, setInstalled] = useState(false)

  // Only render if the browser has a deferred install prompt available
  if (!canInstall() && !installed) return null

  return (
    <section style={{ marginBottom: 28 }}>
      <SectionHeading>App</SectionHeading>
      <SettingsCard>
        <div style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--color-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-deep)', flexShrink: 0 }}>
              <Smartphone size={17} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Geist', system-ui", fontSize: 15, color: 'var(--color-ink)' }}>
                {installed ? 'Added to Home Screen ✓' : 'Add to Home Screen'}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-ink-mute)', marginTop: 1 }}>
                {installed ? 'Installed as a standalone app' : 'Install Baseline as a standalone app'}
              </div>
            </div>
            {!installed && (
              <button
                onClick={() => {
                  const triggered = triggerInstallPrompt()
                  if (triggered) setInstalled(true)
                }}
                style={{
                  padding: '6px 14px', borderRadius: 10, border: 'none',
                  background: 'var(--color-accent-soft)', cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.3px',
                  color: 'var(--color-accent-deep)', flexShrink: 0,
                }}
              >
                Install
              </button>
            )}
          </div>
        </div>
      </SettingsCard>
    </section>
  )
}

// ── App lock (PIN) ─────────────────────────────────────────────────────────────

type PinSetupStep = 'enter' | 'confirm'

function AppLockSection() {
  const settings = useLiveQuery(() => db.settings.get(1))
  const [showSetup, setShowSetup] = useState(false)
  const [step, setStep] = useState<PinSetupStep>('enter')
  const [pinA, setPinA] = useState('')
  const [pinB, setPinB] = useState('')
  const [pinError, setPinError] = useState('')
  const [disabling, setDisabling] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)

  if (!settings) return null

  const lockEnabled = settings.appLockEnabled

  const startSetup = () => {
    setShowSetup(true)
    setStep('enter')
    setPinA('')
    setPinB('')
    setPinError('')
  }

  const handlePinANext = () => {
    if (pinA.length < 4) { setPinError('PIN must be 4 digits'); return }
    if (!/^\d{4,8}$/.test(pinA)) { setPinError('Digits only (4–8)'); return }
    setPinError('')
    setStep('confirm')
  }

  const handlePinConfirm = async () => {
    if (pinA !== pinB) { setPinError('PINs do not match'); return }
    const hashed = await hashPin(pinA)
    await db.settings.update(1, { appLockEnabled: true, appLockPin: hashed })
    setShowSetup(false)
    setPinA('')
    setPinB('')
  }

  const handleDisable = async () => {
    setDisabling(true)
    await db.settings.update(1, { appLockEnabled: false, appLockPin: null })
    setDisabling(false)
    setConfirmDisable(false)
    // Also clear the session unlock so lock takes effect immediately
    sessionStorage.removeItem('baseline_unlocked')
  }

  return (
    <section style={{ marginBottom: 28 }}>
      <SectionHeading>Security</SectionHeading>
      <SettingsCard>
        {!showSetup ? (
          <div style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: lockEnabled ? 'var(--color-accent-deep)' : 'var(--color-ink-soft)', flexShrink: 0 }}>
                {lockEnabled ? <Lock size={17} /> : <LockOpen size={17} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Geist', system-ui", fontSize: 15, color: 'var(--color-ink)' }}>
                  App Lock
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-ink-mute)', marginTop: 1 }}>
                  {lockEnabled ? 'PIN required on open' : 'No PIN set'}
                </div>
              </div>
              {lockEnabled ? (
                <button
                  onClick={() => setConfirmDisable(true)}
                  disabled={disabling}
                  style={{
                    padding: '6px 14px', borderRadius: 10, border: 'none',
                    background: 'var(--color-surface)', cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.3px',
                    color: 'var(--color-blush)',
                  }}
                >
                  Disable
                </button>
              ) : (
                <button
                  onClick={startSetup}
                  style={{
                    padding: '6px 14px', borderRadius: 10, border: 'none',
                    background: 'var(--color-accent-soft)', cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.3px',
                    color: 'var(--color-accent-deep)',
                  }}
                >
                  Enable
                </button>
              )}
            </div>

            {confirmDisable && (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(239,100,100,0.08)', border: '1px solid rgba(239,100,100,0.2)' }}>
                <div style={{ fontFamily: "'Geist', system-ui", fontSize: 14, color: 'var(--color-blush)', marginBottom: 10 }}>
                  Disable PIN lock?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleDisable} style={{ flex: 1, height: 36, borderRadius: 10, border: 'none', background: 'var(--color-blush)', color: '#fff', fontFamily: "'Geist', system-ui", fontSize: 14, cursor: 'pointer' }}>
                    Yes, disable
                  </button>
                  <button onClick={() => setConfirmDisable(false)} style={{ flex: 1, height: 36, borderRadius: 10, border: 'none', background: 'var(--color-surface)', color: 'var(--color-ink-mute)', fontFamily: "'Geist', system-ui", fontSize: 14, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '16px 18px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-ink-mute)', marginBottom: 12 }}>
              {step === 'enter' ? 'Set a PIN (4–8 digits)' : 'Confirm your PIN'}
            </div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={step === 'enter' ? pinA : pinB}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                if (step === 'enter') setPinA(val); else setPinB(val)
                setPinError('')
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (step === 'enter') handlePinANext(); else handlePinConfirm()
                }
                if (e.key === 'Escape') setShowSetup(false)
              }}
              autoFocus
              placeholder="••••"
              style={{
                width: '100%', height: 48, borderRadius: 12,
                border: `1.5px solid ${pinError ? 'var(--color-blush)' : 'var(--color-accent)'}`,
                padding: '0 16px', marginBottom: 8,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 20, letterSpacing: '4px',
                background: 'var(--color-surface)', color: 'var(--color-ink)', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {pinError && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-blush)', marginBottom: 8 }}>
                {pinError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={step === 'enter' ? handlePinANext : handlePinConfirm}
                style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: 'var(--color-accent-deep)', color: '#fff', fontFamily: "'Geist', system-ui", fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
              >
                {step === 'enter' ? 'Next' : 'Save PIN'}
              </button>
              <button
                onClick={() => { setShowSetup(false); setPinA(''); setPinB('') }}
                style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'var(--color-surface)', color: 'var(--color-ink-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </SettingsCard>
    </section>
  )
}

// ── Danger zone ────────────────────────────────────────────────────────────────

function DangerZone() {
  const [confirm, setConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [cleared, setCleared] = useState(false)

  const clearAll = async () => {
    setClearing(true)
    await db.dailyEntries.clear()
    await db.weeklyPics.clear()
    await db.monthlyMeasurements.clear()
    await db.supplements.clear()
    await db.supplementLogs.clear()
    await db.withingsAuth.clear()
    await db.settings.put({
      id: 1,
      units: 'metric',
      measurementSites: ['waist', 'hips', 'chest', 'thighs', 'arms'],
      goals: { targetWeightKg: null, targetBodyFatPct: null, targetMeasurements: {} },
      appLockEnabled: false,
      appLockPin: null,
    })
    sessionStorage.removeItem('baseline_unlocked')
    setClearing(false)
    setConfirm(false)
    setCleared(true)
  }

  return (
    <section style={{ marginBottom: 40 }}>
      <SectionHeading>Danger Zone</SectionHeading>
      <SettingsCard>
        {!confirm ? (
          <LastSettingsRow
            icon={<Trash2 size={17} />}
            label="Clear all data"
            sublabel="Permanently delete all entries, photos, supplements, and goals"
            onClick={() => setConfirm(true)}
            danger
          />
        ) : (
          <div style={{ padding: '16px 18px' }}>
            <div style={{ fontFamily: "'Geist', system-ui", fontSize: 15, color: 'var(--color-blush)', marginBottom: 6 }}>
              This cannot be undone.
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-ink-mute)', marginBottom: 14 }}>
              All weight entries, progress photos, measurements, supplements, and goals will be permanently deleted.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={clearAll}
                disabled={clearing}
                style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: 'var(--color-blush)', color: '#fff', fontFamily: "'Geist', system-ui", fontSize: 15, fontWeight: 500, cursor: clearing ? 'wait' : 'pointer' }}
              >
                {clearing ? 'Clearing…' : 'Yes, delete everything'}
              </button>
              <button
                onClick={() => setConfirm(false)}
                style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: 'var(--color-surface)', color: 'var(--color-ink-mute)', fontFamily: "'Geist', system-ui", fontSize: 15, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {cleared && (
          <div style={{ padding: '12px 18px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--color-good)', borderTop: '1px solid var(--color-line)' }}>
            All data cleared ✓
          </div>
        )}
      </SettingsCard>
    </section>
  )
}

// ── Main SettingsView ──────────────────────────────────────────────────────────

export function SettingsView() {
  return (
    <div style={{ padding: '0 20px', fontFamily: "'Geist', system-ui, sans-serif", color: 'var(--color-ink)' }}>
      <div style={{ paddingTop: 8, paddingBottom: 20 }}>
        <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, letterSpacing: '-0.5px', lineHeight: 1.05 }}>
          Settings
        </div>
      </div>

      <UnitsSection />
      <MeasurementSitesSection />
      <DataSection />
      <InstallSection />
      <AppLockSection />
      <DangerZone />

      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '1.2px',
        textTransform: 'uppercase', color: 'var(--color-ink-faint)',
        textAlign: 'center', paddingBottom: 8,
      }}>
        Baseline · all data stored locally
      </div>
    </div>
  )
}
