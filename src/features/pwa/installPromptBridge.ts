/**
 * Capture Chromium's one-shot install prompt before authenticated views mount.
 * Browsers decide eligibility; this does not infer installation across tabs.
 */
export type PazoNativeInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type IosNavigator = Navigator & { standalone?: boolean }
const listeners = new Set<() => void>()
let pending: PazoNativeInstallPrompt | null = null
let installedThisSession = false

export const isPazoStandalone = (): boolean =>
  typeof window !== 'undefined' && typeof navigator !== 'undefined' &&
  ((typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as IosNavigator).standalone === true)

const notify = () => { for (const listener of listeners) listener() }

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    if (!isPazoStandalone() && !installedThisSession) {
      pending = event as PazoNativeInstallPrompt
      notify()
    }
  })
  window.addEventListener('appinstalled', () => {
    pending = null
    installedThisSession = true
    notify()
  })
}

export const readPazoInstallState = () => ({
  pending,
  installed: installedThisSession || isPazoStandalone(),
})

export const subscribePazoInstall = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export const takePazoInstallPrompt = (): PazoNativeInstallPrompt | null => {
  const available = pending
  pending = null
  notify()
  return available
}
