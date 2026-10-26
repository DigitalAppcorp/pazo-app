import {exitSupporterScreen} from './supporterExit'
import { useEffect, useRef } from 'react'
import { SupporterScreenPortal } from './SupporterScreenPortal'
import {GardenStory} from './SupporterArt'
import {SupporterHeader} from './SupporterPresentation'
type Props = {
  lang: 'es' | 'en'
  onExplore: () => void
  onDismiss: () => void
  onClose?: () => void
  onOptOut?: () => void
  onShown?: () => void
  previewOnly?: boolean
  saveFailed?: boolean
}
export function SupporterInvitationPrompt({
  lang,
  onExplore,
  onDismiss,
  onClose,
  onOptOut,
  onShown,
  previewOnly = false,
  saveFailed = false,
}: Props) {
  const close = useRef<HTMLButtonElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const shown = useRef(false)
  const t = (es: string, en: string) => (lang === 'es' ? es : en)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    close.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        ;exitSupporterScreen(onClose ?? onDismiss)
      }
      if (e.key === 'Tab') {
        const nodes = Array.from(
          root.current?.querySelectorAll<HTMLButtonElement>(
            'button:not(:disabled)',
          ) ?? [],
        )
        const i = nodes.indexOf(document.activeElement as HTMLButtonElement)
        if (e.shiftKey && i <= 0) {
          e.preventDefault()
          nodes.at(-1)?.focus()
        } else if (!e.shiftKey && i === nodes.length - 1) {
          e.preventDefault()
          nodes[0]?.focus()
        }
      }
    }
    document.addEventListener('keydown', key)
    const report = () => {
      if (!shown.current && document.visibilityState === 'visible') {
        shown.current = true
        onShown?.()
      }
    }
    document.addEventListener('visibilitychange', report)
    let second = 0
    const frame = requestAnimationFrame(() => {
      second = requestAnimationFrame(report)
    })
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(second)
      document.removeEventListener('keydown', key)
      document.removeEventListener('visibilitychange', report)
      previous?.focus()
    }
  }, [onDismiss, onClose, onShown])
  return <SupporterScreenPortal>
    <div ref={root} role="dialog" aria-modal="true" aria-labelledby="supporter-growth-title" aria-describedby="supporter-growth-description" className="amigo invitation" data-preview-only={previewOnly||undefined}>
      <SupporterHeader lang={lang} title={t('Amigo de PAZO','Friend of PAZO')} buttonRef={close} onBack={()=>exitSupporterScreen(onClose??onDismiss)}/>
      <main className="a-scroll"><div className="a-content">
        <GardenStory lang={lang} className="invitation-garden"/>
        <div className="invitation-copy"><h1 id="supporter-growth-title">{t('Tu apoyo mantiene','Your support keeps')}<br/>{t('PAZO en marcha.','PAZO going.')}</h1>
          <p id="supporter-growth-description">{t('Amigo de PAZO es un apoyo voluntario para sostener este proyecto. Tu aporte nos ayuda a mejorar lo que ya usas y a crear nuevas experiencias para ti y tu mascota.','Friend of PAZO is a voluntary way to sustain this project. Your contribution helps us improve what you already use and create new experiences for you and your pet.')}</p>
          <div className="invite-price"><strong>US$2.99</strong><span>{t('al mes','per month')}</span></div><p className="free-line">{t('PAZO sigue siendo gratis. Apoyar es tu decisión.','PAZO stays free. Supporting is your choice.')}</p>
        </div><div className="a-actions">
          <button type="button" className="a-button" onClick={onExplore}>{t('Conocer Amigo de PAZO','Explore Friend of PAZO')} <span aria-hidden="true">›</span></button>
          <button type="button" className="a-button quiet" onClick={()=>exitSupporterScreen(onDismiss)}>{t('Ahora no, seguir en PAZO','Not now, continue in PAZO')}</button>
          {onOptOut&&<button type="button" className="text-action" onClick={onOptOut}>{t('No recibir más invitaciones','Stop future invitations')}</button>}
          {saveFailed&&<p role="alert">{t('No pudimos guardar tu preferencia. Puedes intentarlo otra vez o cerrar.','Your preference could not be saved. Try again or close.')}</p>}
        </div>
      </div></main>
    </div>
  </SupporterScreenPortal>
}
