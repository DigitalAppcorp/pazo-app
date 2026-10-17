import { useEffect, useRef, useState } from 'react'
import { IconHeart, IconPaw } from '../../../components/icons/PazoIcons'
import { GratitudeWallLive } from './GratitudeWallLive'

type GratitudeOrder = 'all' | 'recent' | 'longtime'

interface GratitudeWallPreviewProps {
  lang: 'es' | 'en'
  onClose: () => void
}

// F16 visual/UX preview only. There is no authorized public roster before verified
// payment eligibility AND explicit per-pet opt-in are implemented on the backend.
export const GratitudeWallPreview = ({ lang, onClose }: GratitudeWallPreviewProps) => {
  const [order, setOrder] = useState<GratitudeOrder>('all')
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    if (typeof window === 'undefined') return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [onClose])

  const tabs = [
    { key: 'all', es: 'Todos', en: 'All' },
    { key: 'recent', es: 'Recientes', en: 'Recent' },
    { key: 'longtime', es: 'Más tiempo apoyando', en: 'Longtime supporters' },
  ] as const

  // Keep existing PO-approved preview as default. The real gallery is visible
  // only after payment/consent RPCs and original assets pass the release gate.
  if (import.meta.env.VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED === 'true')
    return <GratitudeWallLive lang={lang} onClose={onClose} />

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pazo-gratitude-title"
      className="absolute inset-0 z-[110] flex flex-col overflow-hidden bg-[#FAF8F5] text-[#204E4A]">
      <header className="shrink-0 bg-[#FAF8F5]/95 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3">
          <button ref={closeRef} type="button" onClick={onClose}
            aria-label={lang === 'es' ? 'Volver a bienvenida' : 'Back to welcome'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#204E4A] shadow-[0_4px_14px_rgba(32,78,74,0.08)] transition-colors hover:bg-[#E1E53F]/40 focus-visible:bg-[#E1E53F]/40">
            <span aria-hidden="true" className="text-2xl font-bold">‹</span>
          </button>
          <div className="min-w-0">
            <h1 id="pazo-gratitude-title" className="text-[20px] font-black leading-snug">
              {lang === 'es' ? 'Gracias, Amigos de PAZO' : 'Thank you, PAZO Friends'}
            </h1>
            <p className="text-[12px] font-semibold text-[#5C7470]">
              {lang === 'es' ? 'Un espacio para agradecer a nuestras mascotas' : 'A space to celebrate our pets'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl space-y-5 px-4 pb-10 pt-3">
          <div className="relative overflow-hidden rounded-[28px] bg-[#FBE8D9] px-5 py-6 shadow-[0_8px_22px_rgba(32,78,74,0.04)]">
            <div aria-hidden="true" className="pointer-events-none absolute -right-5 -top-9 text-[#D6A372]/35">
              <IconPaw size={128}/>
            </div>
            <div aria-hidden="true" className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/85 text-[#DE6F76]">
              <IconHeart size={26} />
            </div>
            <h2 className="relative text-[23px] font-black leading-tight text-[#204E4A]">
              {lang === 'es' ? 'Pequeños gestos, grandes historias' : 'Little gestures, great stories'}
            </h2>
            <p className="relative mt-2 max-w-[31ch] text-[14px] font-medium leading-relaxed text-[#476862]">
              {lang === 'es'
                ? 'Cada mascota que aparece aquí lo hace porque su familia lo autorizó.'
                : 'Every pet shown here appears only with their family’s permission.'}
            </p>
          </div>

          <div role="group" aria-label={lang === 'es' ? 'Orden del muro' : 'Wall order'}
            className="flex gap-2 overflow-x-auto rounded-2xl bg-white/90 p-2 shadow-[0_3px_16px_rgba(32,78,74,0.04)]">
            {tabs.map(tab => (
              <button key={tab.key} type="button" aria-pressed={order === tab.key}
                onClick={() => setOrder(tab.key)}
                className={'min-h-11 shrink-0 rounded-xl px-4 py-2 text-[12px] font-extrabold transition-colors focus-visible:bg-[#E1E53F] ' +
                  (order === tab.key ? 'bg-[#204E4A] text-white' : 'bg-[#F5F6F0] text-[#5C7470] hover:bg-[#E9EFDF]')}>
                {lang === 'es' ? tab.es : tab.en}
              </button>
            ))}
          </div>

          <section aria-label={lang === 'es' ? 'Cuadrícula de mascotas' : 'Pet grid'}
            className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-black">
                {lang === 'es' ? 'Nuestros Amigos de PAZO' : 'Our PAZO Friends'}
              </h2>
              <span className="rounded-full bg-[#E8EDE3] px-3 py-1 text-[11px] font-extrabold text-[#53756C]">
                {lang === 'es' ? 'En desarrollo' : 'In development'}
              </span>
            </div>

            {/* Layout-only ghost cells: no names, portraits, badges or fake supporters. */}
            <div aria-hidden="true" className="grid grid-cols-2 gap-3">
              {['#FBE6D4', '#D8EBD8', '#F8DDE7', '#DFE8FA'].map((color, index) => (
                <div key={index} className="flex min-h-[155px] flex-col items-center justify-center gap-3 rounded-[24px] bg-white p-3 shadow-[0_4px_15px_rgba(32,78,74,0.045)]">
                  <div className="flex h-[92px] w-full items-center justify-center rounded-[20px]" style={{ backgroundColor: color }}>
                    <IconPaw size={33} className="text-[#204E4A]/25" />
                  </div>
                  <div className="h-2.5 w-20 rounded-full bg-[#E7EDE6]" />
                </div>
              ))}
            </div>
            <div role="status" className="rounded-[22px] bg-white px-5 py-5 text-center shadow-sm">
              <p className="text-[15px] font-extrabold">
                {lang === 'es' ? 'Aún no hay mascotas participantes' : 'No participating pets yet'}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#5C7470]">
                {lang === 'es'
                  ? 'Esta cuadrícula solo muestra dónde aparecerán las mascotas. Se llenará cuando exista una membresía verificada y sus dueños acepten aparecer.'
                  : 'These spaces are only a layout preview. Pets will appear after membership verification and their owners’ permission.'}
              </p>
              {order !== 'all' && (
                <p className="mt-2 text-[12px] font-semibold text-[#5C7470]">
                  {lang === 'es'
                    ? 'El orden elegido se aplicará cuando existan participantes reales.'
                    : 'Selected sorting will apply once real participants are available.'}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
