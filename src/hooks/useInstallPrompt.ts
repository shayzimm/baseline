import { useEffect, useRef } from 'react'

// Captures the browser's beforeinstallprompt event so it can be triggered later.
// Stored in module scope so any component can access it via triggerInstallPrompt().

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

export function triggerInstallPrompt(): boolean {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  deferredPrompt.userChoice.then(() => { deferredPrompt = null })
  return true
}

export function canInstall(): boolean {
  return deferredPrompt != null
}

// Call once at the app root to start listening.
export function useInstallPrompt() {
  const registered = useRef(false)

  useEffect(() => {
    if (registered.current) return
    registered.current = true

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e as BeforeInstallPromptEvent
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
}
