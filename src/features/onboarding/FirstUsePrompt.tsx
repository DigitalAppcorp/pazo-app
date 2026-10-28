import type {FirstUseIntent} from './firstUse'
import {AppNotice, noticePrimary, noticeSecondary} from '../notices/AppNotice'

export function FirstUsePrompt({petName,intent,lang,onQr,onCare,onExplore,onDismiss}:{
  petName:string;intent:FirstUseIntent;lang:'es'|'en';onQr:()=>void;onCare:()=>void;onExplore:()=>void;onDismiss:()=>void
}) {
  const l=(es:string,en:string)=>lang==='es'?es:en
  return <AppNotice kind="welcome" lang={lang} label={l('Para empezar','To get started')}
    title={l(`Todo listo, ${petName}`,`All set, ${petName}`)} autoFocus onDismiss={onDismiss}
    description={intent==='qr'?l('Abre su pasaporte para ver y compartir el QR.','Open their passport to view and share the QR.'):l('Su pasaporte y sus cuidados, siempre a mano. Elige por dónde empezar.','Their passport and care, always at hand. Choose where to start.')}>
    <button type="button" data-notice-primary onClick={onQr} className={'col-span-2 '+noticePrimary}>{l('Ver pasaporte QR','View QR passport')} <span aria-hidden="true" className="ml-2">→</span></button>
    <button type="button" onClick={onCare} className={noticeSecondary}>{l('Abrir Agenda','Open Agenda')}</button>
    <button type="button" onClick={onExplore} className={noticeSecondary}>{l('Explorar PAZO','Explore PAZO')}</button>
  </AppNotice>
}
