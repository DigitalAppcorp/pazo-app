import { useEffect, useRef } from 'react'
import { SupporterScreenPortal } from './SupporterScreenPortal'
import './SupporterInvitationPrompt.css'
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
        ;(onClose ?? onDismiss)()
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
  return (
    <SupporterScreenPortal>
      <div
        ref={root}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supporter-growth-title"
        aria-describedby="supporter-growth-description"
        className="supporter-growth"
      >
        <div className="supporter-growth-inner">
          <header>
            <span className="supporter-growth-brand">
              PAZO<span> / {t('CRECEMOS CONTIGO', 'GROWING WITH YOU')}</span>
            </span>
            <button
              ref={close}
              type="button"
              className="supporter-growth-close"
              aria-label={t('Cerrar invitación', 'Close invitation')}
              onClick={onClose ?? onDismiss}
            >
              ×
            </button>
          </header>
          <div className="supporter-growth-art" aria-hidden="true">
            <img
              src="/pazo-supporter-growth.png"
              alt=""
              width="1536"
              height="1024"
              fetchPriority="high"
            />
          </div>
          <main>
            {previewOnly && (
              <p className="supporter-growth-eyebrow">
                {t(
                  'Vista previa · sin invitación registrada',
                  'Preview · no invitation recorded',
                )}
              </p>
            )}
            <p className="supporter-growth-eyebrow">
              {t('AMIGO DE PAZO', 'FRIEND OF PAZO')}
            </p>
            <h2 id="supporter-growth-title">
              {t('Ayúdanos a seguir creciendo', 'Help us keep growing')}
            </h2>
            <p id="supporter-growth-description">
              {t(
                'Tu apoyo nos ayuda a crear nuevas herramientas y experiencias para ti y tu mascota.',
                'Your support helps us create new tools and experiences for you and your pet.',
              )}
            </p>
            <p className="supporter-growth-price">
              US$2.99 <span>{t('al mes', 'per month')}</span>
            </p>
            <p className="supporter-growth-free">
              {t(
                'Apoyo voluntario. PAZO sigue siendo gratis.',
                'Optional support. PAZO stays free.',
              )}
            </p>
            <div className="supporter-growth-actions">
              <button
                type="button"
                className="supporter-growth-primary"
                onClick={onExplore}
              >
                {t('Conocer Amigo de PAZO', 'Explore Friend of PAZO')}{' '}
                <span aria-hidden="true">›</span>
              </button>
              <button
                type="button"
                className="supporter-growth-secondary"
                onClick={onDismiss}
              >
                {t('Ahora no, seguir en PAZO', 'Not now, continue in PAZO')}
              </button>
              {onOptOut && (
                <button
                  type="button"
                  className="supporter-growth-optout"
                  onClick={onOptOut}
                >
                  {t(
                    'No recibir futuras invitaciones',
                    'Stop future invitations',
                  )}
                </button>
              )}
              {saveFailed && (
                <p role="alert" className="text-xs">
                  {t(
                    'No pudimos guardar tu preferencia. Puedes intentarlo otra vez o cerrar.',
                    'Your preference could not be saved. Try again or close.',
                  )}
                </p>
              )}
            </div>
          </main>
        </div>
      </div>
    </SupporterScreenPortal>
  )
}
