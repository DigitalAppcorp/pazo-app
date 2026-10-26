import type {Ref} from 'react'
import type {SupporterStatus} from '../useSupporterMembershipStatus'
import {IconPaw} from '../../../components/icons/PazoIcons'
import './supporterProfileEntry.css'

export function SupporterProfileEntry({status,lang,onClick,buttonRef}:{status:SupporterStatus;lang:'es'|'en';onClick:()=>void;buttonRef:Ref<HTMLButtonElement>}){
 const t=(es:string,en:string)=>lang==='es'?es:en
 const paid=status.kind==='verified',invite=status.kind==='inactive'
 return <button ref={buttonRef} type="button" onClick={onClick} className={'supporter-profile-entry '+(paid?'is-active':'is-invitation')}
  aria-label={t('Amigo de PAZO, ','Friend of PAZO, ')+(paid?t('ver mis beneficios','view my benefits'):invite?t('conocer el apoyo voluntario','explore voluntary support'):t('consultar mi estado','check my status'))}>
  <span className="supporter-entry-copy"><strong>{t('Amigo de PAZO','Friend of PAZO')}</strong><span>{paid?t('Tus beneficios están activos.','Your benefits are active.'):invite?t('Un apoyo voluntario para mantener PAZO en marcha y ayudarnos a crecer.','Voluntary support to keep PAZO going and help us grow.'):status.kind==='checking'?t('Comprobando tu membresía…','Checking your membership…'):t('Consulta tu membresía y sus beneficios.','Check your membership and benefits.')}</span><span className="supporter-entry-action">{paid?t('Ver mis beneficios','View my benefits'):invite?t('Conocer el apoyo','Explore support'):t('Consultar estado','Check status')} <span aria-hidden="true">›</span></span></span>
  {paid?<img className="supporter-entry-badge" src="/supporter/amigo-pazo-inicio.png" alt="" width="58" height="58"/>:invite?<span className="supporter-entry-corgi" aria-hidden="true"/>:<IconPaw size={30}/>}
 </button>
}
