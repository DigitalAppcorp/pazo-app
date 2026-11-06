import { useState } from 'react'
import { IconCalendar, IconHeart, IconPin } from '../../components/icons/PazoIcons'
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

  const reasons = [
    { icon: <IconCalendar size={16} />, text: l(`Sus vacunas y cuidados, justo a tiempo`, `Vaccines and care, right on time`) },
    { icon: <IconPin size={16} />, text: l(`Si se pierde y alguien ve a ${petName}, lo sabrás al instante`, `If ${petName} gets lost and someone spots them, you'll know instantly`) },
    { icon: <IconHeart size={16} />, text: l(`Y si alguien encuentra a ${petName}, te avisamos enseguida`, `And if someone finds ${petName}, we'll tell you right away`) },
  ]
  const list = (
    <ul className="col-span-2 mb-1 space-y-1.5">
      {reasons.map((reason) => (
        <li key={reason.text} className="flex items-center gap-2.5 text-[13px] font-bold leading-snug text-[#204E4A]">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E1E53F]/40">{reason.icon}</span>
          {reason.text}
        </li>
      ))}
    </ul>
  )

  const title = l(`Cuidemos juntos a ${petName}`, `Let's look after ${petName} together`)
  if (kind === 'install') {
    return <AppNotice kind="welcome" lang={lang} label={l('Avisos de PAZO', 'PAZO alerts')} title={title} autoFocus onDismiss={onClose}
      description={l(
        'Para avisarte en tu iPhone, primero agrega PAZO a tu pantalla de inicio: en Safari toca Compartir y luego Añadir a pantalla de inicio.',
        'To alert you on your iPhone, first add PAZO to your Home Screen: in Safari tap Share, then Add to Home Screen.',
      )}>
      {list}
      <button type="button" data-notice-primary onClick={onClose} className={'col-span-2 ' + noticePrimary}>{l('Entendido', 'Got it')}</button>
    </AppNotice>
  }
  return <AppNotice kind="welcome" lang={lang} label={l('Avisos de PAZO', 'PAZO alerts')} title={title} autoFocus onDismiss={onClose}
    description={failed
      ? l('No pudimos activarlos esta vez. Puedes intentarlo de nuevo o desde la campana.', "We couldn't turn them on this time. Try again or from the bell.")
      : l('Déjanos avisarte en tu teléfono, aunque PAZO esté cerrado:', 'Let us notify you on your phone, even with PAZO closed:')}>
    {list}
    <button type="button" data-notice-primary onClick={() => void activate()} disabled={busy} className={noticePrimary + ' disabled:opacity-60'}>
      {busy ? l('Activando…', 'Turning on…') : l('Sí, activar notificaciones', 'Yes, turn on notifications')}
    </button>
    <button type="button" onClick={onClose} disabled={busy} className={noticeSecondary}>{l('Ahora no', 'Not now')}</button>
  </AppNotice>
}
