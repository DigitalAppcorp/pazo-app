import { useEffect, useRef } from 'react'
import { PazoStateIllustration } from '../illustrations/PazoStateIllustration'
import { noticeSurface } from '../notices/AppNotice'

export function FirstCarePrompt({ petName, lang, onStart, onDismiss }: {
  petName: string
  lang: 'es' | 'en'
  onStart: () => void
  onDismiss: () => void
}) {
  const es = lang === 'es'
  const start = useRef<HTMLButtonElement>(null)
  useEffect(() => { start.current?.focus({ preventScroll: true }) }, [])
  const dismiss = () => {
    onDismiss()
    document.querySelector<HTMLButtonElement>('nav[data-pazo-floating-nav] button[aria-current="page"]')?.focus({ preventScroll: true })
  }

  return <section aria-label={es ? 'Primer cuidado' : 'First care reminder'} data-pazo-app-notice="first-care"
    onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); dismiss() } }}
    className={noticeSurface}>
    <button type="button" onClick={dismiss} aria-label={es ? 'Cerrar aviso' : 'Dismiss notice'}
      className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full text-[#5C7470] hover:bg-[#204E4A]/5 focus-visible:bg-[#E1E53F] focus-visible:outline-none">
      <span aria-hidden="true">×</span>
    </button>
    <div className="flex items-start gap-3 pr-5">
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#5C7470]">{es ? 'Primer cuidado' : 'First care reminder'}</p>
        <h2 className="break-words text-[20px] font-black leading-[1.2] tracking-tight">{es ? `Agenda un cuidado para ${petName}` : `Schedule care for ${petName}`}</h2>
      </div>
      <PazoStateIllustration kind="welcome" />
    </div>
    <p className="mt-3 text-[13px] leading-[1.6] text-[#5C7470]">
      {es ? 'Puedes empezar por su próxima vacuna. Elige cuál es y en qué fecha toca.' : 'Start with their next vaccine. Choose which one and when it’s due.'}
    </p>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button type="button" ref={start} onClick={onStart}
        className="min-h-12 rounded-2xl bg-[#204E4A] px-3 py-3 text-[13px] font-extrabold leading-snug text-white hover:bg-[#183D3A] focus-visible:bg-[#E1E53F] focus-visible:text-[#204E4A] focus-visible:underline focus-visible:outline-none">
        {es ? 'Agendar cuidado' : 'Schedule care'}
      </button>
      <button type="button" onClick={dismiss}
        className="min-h-12 rounded-2xl bg-[#F3F6EE] px-2 py-3 text-[12px] font-extrabold leading-snug text-[#204E4A] hover:bg-[#E7EEDC] focus-visible:bg-[#E1E53F] focus-visible:underline focus-visible:outline-none">
        {es ? 'Ahora no' : 'Not now'}
      </button>
    </div>
  </section>
}
