import { useEffect, useState } from 'react'
import { readPazoInstallState, subscribePazoInstall, takePazoInstallPrompt } from '../installPromptBridge'

const isIOS = (): boolean => typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
const HIDE_FOR_MS = 7 * 24 * 60 * 60 * 1000
const STORAGE_KEY = 'pazo-install-banner-dismissed-until'
const isBannerDismissed = () => {
  try { return Number(window.localStorage.getItem(STORAGE_KEY) || 0) > Date.now() }
  catch { return false }
}
type Placement = 'banner' | 'settings' | 'welcome'

export function PazoInstallControl({ lang, placement = 'settings' }: {
  lang: 'es' | 'en'; placement?: Placement
}) {
  const [state, setState] = useState(readPazoInstallState)
  const [dismissed, setDismissed] = useState(isBannerDismissed)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isPrompting, setIsPrompting] = useState(false)
  useEffect(() => subscribePazoInstall(() => setState(readPazoInstallState)), [])
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(display-mode: standalone)')
    const refresh = () => setState(readPazoInstallState())
    media.addEventListener?.('change', refresh)
    return () => media.removeEventListener?.('change', refresh)
  }, [])

  const hideBanner = () => {
    setDismissed(true)
    try { window.localStorage.setItem(STORAGE_KEY, String(Date.now() + HIDE_FOR_MS)) }
    catch { /* Private browsing may not permit storage. */ }
  }

  if (state.installed || (!state.pending && !isIOS())) return null
  if (placement === 'banner' && dismissed) return null
  const es = lang === 'es'
  const action = async () => {
    if (!state.pending) { setShowInstructions(value => !value); return }
    if (isPrompting) return
    const nativePrompt = takePazoInstallPrompt()
    if (!nativePrompt) return
    setIsPrompting(true)
    try {
      await nativePrompt.prompt()
      const choice = await nativePrompt.userChoice
      // Only 'appinstalled' or standalone mode proves installation. A browser
      // prompt acceptance is not, by itself, proof that the app was installed.
      if (choice.outcome === 'accepted' && placement === 'banner') hideBanner()
    } catch {
      // Do not claim an installation after browser rejection.
    } finally { setIsPrompting(false) }
  }

  const buttonText = isPrompting
    ? (es ? 'Abriendo…' : 'Opening…')
    : state.pending ? (es ? 'Instalar' : 'Install')
      : (es ? 'Cómo instalar' : 'How to install')

  // A01 sign-in/welcome only: no persistent overlay above the Home navigation.
  if (placement === 'welcome') return <div data-pazo-install-welcome="true"
    className="flex min-h-[30px] flex-col items-center justify-center">
    <button type="button" onClick={() => void action()} disabled={isPrompting}
      className="inline-flex min-h-[30px] items-center justify-center gap-1.5 rounded-full bg-transparent px-3 py-1 text-[11px] font-bold text-[#52756F] transition-colors hover:bg-[#EAF0DF] focus-visible:bg-[#E1E53F]/50 disabled:opacity-50">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>
      </svg>
      <span>{state.pending ? (es ? 'Instalar PAZO' : 'Install PAZO')
        : (es ? 'Añadir PAZO al inicio' : 'Add PAZO to Home Screen')}</span>
    </button>
    {showInstructions && <p role="status" className="max-w-[300px] px-3 text-center text-[10px] leading-snug text-[#5C7470]">
      {es ? 'En Safari: Compartir → Añadir a pantalla de inicio.'
        : 'In Safari: Share → Add to Home Screen.'}
    </p>}
  </div>

  if (placement === 'banner') return <aside data-pazo-install-banner="true"
    className="mx-3 mb-1 flex shrink-0 items-center gap-2 rounded-2xl bg-[#EFF4E8] px-3 py-2 shadow-sm sm:hidden"
    aria-label={es ? 'Instalar PAZO' : 'Install PAZO'}>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-black text-[#204E4A]">{es ? 'Lleva PAZO contigo' : 'Take PAZO with you'}</p>
      {showInstructions && <p role="status" className="mt-1 text-[11px] leading-snug text-[#5C7470]">
        {es ? 'En Safari: Compartir → Añadir a pantalla de inicio.' :
          'In Safari: Share → Add to Home Screen.'}
      </p>}
    </div>
    <button type="button" onClick={() => void action()} disabled={isPrompting}
      className="min-h-11 shrink-0 rounded-xl bg-[#204E4A] px-3 text-[11px] font-extrabold text-white disabled:opacity-50">
      {buttonText}
    </button>
    <button type="button" onClick={hideBanner}
      aria-label={es ? 'Ocultar sugerencia de instalación' : 'Dismiss install suggestion'}
      className="min-h-11 min-w-11 shrink-0 rounded-xl text-xl text-[#5C7470] hover:bg-[#E1E53F]/40">
      ×
    </button>
  </aside>

  return <div data-pazo-install-control="true" className="px-1 py-1">
    <button type="button" onClick={() => void action()} disabled={isPrompting}
      className="min-h-11 w-full rounded-2xl bg-[#EFF4E8] px-3 py-3 text-left text-xs font-bold text-[#204E4A] transition-colors hover:bg-[#E1E53F]/40 focus-visible:bg-[#E1E53F]/50 disabled:opacity-50">
      {isPrompting ? (es ? 'Abriendo instalación…' : 'Opening installation…') :
        state.pending ? (es ? 'Instalar PAZO' : 'Install PAZO') :
          (es ? 'Cómo instalar PAZO' : 'How to install PAZO')}
    </button>
    {showInstructions && <p role="status" className="px-3 py-2 text-xs leading-relaxed text-[#5C7470]">
      {es ? 'En Safari, toca Compartir y elige «Añadir a pantalla de inicio».' :
        'In Safari, tap Share, then Add to Home Screen.'}
    </p>}
  </div>
}
