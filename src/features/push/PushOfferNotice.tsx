import { useState } from 'react'
import { AppNotice, noticePrimary, noticeSecondary } from '../notices/AppNotice'
import type { PushOfferKind } from './pushOffer'
import { enablePush } from './pushService'

// Shown once the first-use notice is gone; closing it in any way keeps it from coming back here.
export function PushOfferNotice({ kind, petName, lang, onClose }: {
  kind: PushOfferKind
  petName: string
  lang: 'es' | 'en'
  onClose: () => void
}) {
  const l = (es: string, en: string) => (lang === 'es' ? es : en)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const activate = async () => {
    setBusy(true)
    setFailed(false)
    // Runs inside the tap: iOS only shows the permission prompt in response to one.
    const result = await enablePush(lang)
    setBusy(false)
    if (result === 'failed') setFailed(true)
    else onClose()
  }

  const title = l(`¿Te avisamos si alguien ve a ${petName}?`, `Want an alert if someone spots ${petName}?`)
  if (kind === 'install') {
    return <AppNotice kind="welcome" lang={lang} label={l('Avisos', 'Alerts')} title={title} autoFocus onDismiss={onClose}
      description={l(
        'En iPhone, los avisos funcionan con PAZO en tu pantalla de inicio: en Safari toca Compartir y luego Añadir a pantalla de inicio.',
        'On iPhone, alerts work with PAZO on your Home Screen: in Safari tap Share, then Add to Home Screen.',
      )}>
      <button type="button" data-notice-primary onClick={onClose} className={'col-span-2 ' + noticePrimary}>{l('Entendido', 'Got it')}</button>
    </AppNotice>
  }
  return <AppNotice kind="welcome" lang={lang} label={l('Avisos', 'Alerts')} title={title} autoFocus onDismiss={onClose}
    description={failed
      ? l('No se pudo activar. Inténtalo de nuevo o desde la campana.', 'Could not turn on. Try again or from the bell.')
      : l(
        `Si alguien reporta haber visto a ${petName}, o le toca una vacuna o un cuidado, te llega un aviso al momento, aunque PAZO esté cerrado.`,
        `If someone reports seeing ${petName}, or a vaccine or care is due, you get an alert right away, even with PAZO closed.`,
      )}>
    <button type="button" data-notice-primary onClick={() => void activate()} disabled={busy} className={noticePrimary + ' disabled:opacity-60'}>
      {busy ? l('Activando…', 'Turning on…') : l('Activar avisos', 'Turn on alerts')}
    </button>
    <button type="button" onClick={onClose} disabled={busy} className={noticeSecondary}>{l('Ahora no', 'Not now')}</button>
  </AppNotice>
}
