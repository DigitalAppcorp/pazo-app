import { useEffect, useRef, useState } from 'react'
import { PazoStateIllustration } from '../../illustrations/PazoStateIllustration'
import { noticeSurface } from '../../notices/AppNotice'
import { readPazoInstallState, subscribePazoInstall, takePazoInstallPrompt } from '../installPromptBridge'

const dismissedKey = 'pazo_first_pet_install_dismissed'

function wasDismissed() {
  try { return window.localStorage.getItem(dismissedKey) === '1' } catch { return false }
}

function manualSteps(es: boolean) {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const embedded = /FBAN|FBAV|Instagram|TikTok|\bwv\b/i.test(ua) || (ios && !/Safari|CriOS|FxiOS/i.test(ua))
  if (embedded) return es
    ? `En el menú de este navegador, elige «Abrir en el navegador» y continúa en ${ios ? 'Safari' : 'Chrome'}.`
    : `From this browser's menu, choose “Open in browser” and continue in ${ios ? 'Safari' : 'Chrome'}.`
  if (ios) return es
    ? 'En Safari, toca Compartir y elige «Añadir a pantalla de inicio».'
    : 'In Safari, tap Share, then choose “Add to Home Screen.”'
  return es
    ? 'Abre PAZO en Chrome y busca «Instalar aplicación» o «Añadir a pantalla de inicio» en el menú.'
    : 'Open PAZO in Chrome and look for “Install app” or “Add to Home screen” in the menu.'
}

export function FirstPetInstallPrompt({ lang, onDismiss }: { lang: 'es' | 'en'; onDismiss: () => void }) {
  const es = lang === 'es'
  const [state, setState] = useState(readPazoInstallState)
  const [dismissed] = useState(wasDismissed)
  const [showSteps, setShowSteps] = useState(false)
  const [opening, setOpening] = useState(false)
  const primary = useRef<HTMLButtonElement>(null)
  const inFlight = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const refresh = () => setState(readPazoInstallState())
    const stop = subscribePazoInstall(refresh)
    const media = window.matchMedia?.('(display-mode: standalone)')
    media?.addEventListener?.('change', refresh)
    refresh()
    return () => { mounted.current = false; stop(); media?.removeEventListener?.('change', refresh) }
  }, [])

  useEffect(() => {
    if (!state.installed && !dismissed) primary.current?.focus({ preventScroll: true })
  }, [state.installed, dismissed])

  if (state.installed || dismissed) return null

  const dismiss = () => {
    try { window.localStorage.setItem(dismissedKey, '1') } catch { /* local storage unavailable */ }
    onDismiss()
    document.querySelector<HTMLButtonElement>('nav[data-pazo-floating-nav] button[aria-current="page"]')?.focus({ preventScroll: true })
  }

  const install = async () => {
    if (inFlight.current) return
    const prompt = takePazoInstallPrompt()
    if (!prompt) { setShowSteps((value) => !value); return }
    inFlight.current = true
    setOpening(true)
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      if (!mounted.current) return
      // Prompt acceptance is not proof of an installed or opened PWA.
      if (choice.outcome === 'dismissed') dismiss()
      else onDismiss()
    } catch {
      if (mounted.current) setShowSteps(true)
    } finally {
      inFlight.current = false
      if (mounted.current) setOpening(false)
    }
  }

  return (
    <section aria-label={es ? 'Instalar PAZO' : 'Install PAZO'} data-pazo-app-notice="first-install"
      onKeyDown={(event) => { if (event.key === 'Escape' && !inFlight.current) { event.stopPropagation(); dismiss() } }}
      className={noticeSurface}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black leading-tight">{es ? 'Ten PAZO a mano' : 'Keep PAZO handy'}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#5C7470]">
            {es ? 'Abre el perfil y la agenda de tu mascota desde un icono en tu pantalla.' : 'Open your pet’s profile and care schedule from an icon on your home screen.'}
          </p>
        </div>
        <PazoStateIllustration kind="welcome" />
      </div>
      {showSteps && <p role="status" className="mt-3 rounded-xl bg-[#F3F6EE] p-3 text-[13px] leading-relaxed text-[#315B55]">{manualSteps(es)}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" ref={primary} disabled={opening} onClick={() => { void install() }}
          aria-expanded={state.pending || opening ? undefined : showSteps}
          className="min-h-12 rounded-2xl bg-[#204E4A] px-3 py-2 text-[13px] font-extrabold text-white hover:bg-[#183D3A] focus-visible:bg-[#E1E53F] focus-visible:text-[#204E4A] focus-visible:outline-none disabled:opacity-60">
          {opening ? (es ? 'Abriendo…' : 'Opening…') : state.pending ? (es ? 'Instalar PAZO' : 'Install PAZO') : (es ? 'Cómo instalar' : 'How to install')}
        </button>
        <button type="button" disabled={opening} onClick={dismiss}
          className="min-h-12 rounded-2xl bg-[#F3F6EE] px-2 py-2 text-[13px] font-extrabold text-[#204E4A] hover:bg-[#E7EEDC] focus-visible:bg-[#E1E53F] focus-visible:outline-none disabled:opacity-60">
          {es ? 'Ahora no' : 'Not now'}
        </button>
      </div>
    </section>
  )
}
