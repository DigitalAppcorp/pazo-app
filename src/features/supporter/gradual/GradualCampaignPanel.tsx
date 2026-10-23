import {useState} from 'react'
import {useGradualStatus,type GradualState} from './useGradualStatus'
const button='min-h-11 rounded-full bg-[#EAF0DD] px-4 py-2 text-[13px] font-bold text-[#204E4A] hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F] disabled:opacity-50'
const copy:Record<GradualState,[string,string]>={
 not_joined:['Puedes expresar tu interés en Amigo de PAZO.','You can express interest in Friend of PAZO.'],
 waiting:['Estás en la lista de espera. Todavía no tienes permiso de pago. No hay fecha garantizada.','You are on the waiting list. Checkout is not yet available. There is no guaranteed date.'],
 slot_granted:['Tu cupo está disponible. Puedes revisar las condiciones y continuar voluntariamente con PayPal.','Your slot is available. Review the terms and continue voluntarily with PayPal.'],
 paying:['Tu solicitud de PayPal sigue abierta. Retoma el mismo intento desde Administrar mi suscripción.','Your PayPal request is still open. Resume the same attempt in Manage my subscription.'],
 payment_verifying:['Estamos verificando el pago. Regresar de PayPal no confirma un cobro.','We are verifying payment. Returning from PayPal does not confirm a charge.'],
 benefits_ended:['Tu período pagado verificado terminó. Puedes consultar la gestión de tu membresía; PAZO sigue siendo gratis.','Your verified paid period ended. Membership management remains available; PAZO stays free.'],
 benefits_active:['Tu pago y tus beneficios están verificados.','Your payment and benefits are verified.'],
 issue:['Hay una comprobación pendiente. Conservamos tu solicitud para revisarla sin duplicar el cobro.','Verification needs review. Your original request is preserved without duplicating payment.'],
 withdrawn:['Retiraste tu interés. PAZO sigue siendo gratis.','You withdrew your interest. PAZO remains free.'],
 declined:['Elegiste no participar en esta campaña. PAZO sigue siendo gratis.','You declined this campaign. PAZO remains free.'],
}
export function GradualCampaignPanel({lang,reviewOnly=false}:{lang:'es'|'en';reviewOnly?:boolean}){
 return <GradualCampaignPanelView lang={lang} reviewOnly={reviewOnly} status={useGradualStatus()}/>
}
export function GradualCampaignPanelView({lang,reviewOnly=false,status}:{lang:'es'|'en';reviewOnly?:boolean;status:ReturnType<typeof useGradualStatus>}){
 const {value,busy,act,refresh,loading,error}=status
 const [failed,setFailed]=useState(false);const [component,setComponent]=useState('badge')
 const t=(es:string,en:string)=>lang==='es'?es:en
 const action=async(kind:string)=>{setFailed(false);if(!await act(kind,kind==='issue'?component:undefined))setFailed(true)}
 if(reviewOnly&&(!value?.benefitsActive||value.feedback))return null
 if(loading)return <p role="status" className="text-[13px]">{t('Consultando tu estado…','Reading your status…')}</p>
 if(error)return <div className="space-y-2 rounded-2xl bg-[#F4F6EF] p-3"><p role="status" className="text-[13px]">{t('No pudimos consultar la campaña. Esto no confirma ni rechaza tu pago.','Campaign status is unavailable. This does not confirm or reject payment.')}</p><button type="button" className={button} onClick={refresh}>{t('Consultar estado','Read status')}</button></div>
 if(!value||!value.eligible&&!value.benefitsActive)return null
 return <section aria-label={t('Apertura gradual Amigo de PAZO','Friend of PAZO gradual availability')} className="space-y-3 rounded-[22px] bg-white p-4 text-[#204E4A]" data-pazo-gradual-state={value.myState}>
  <h3 className="text-[16px] font-black">{t('Tu participación','Your participation')}</h3>
  <p role="status" className="text-[13px] leading-relaxed">{copy[value.myState][lang==='es'?0:1]}</p>
  {!value.benefitsActive&&<p className="text-[12px] leading-relaxed">{t('Apoyo voluntario: US$2.99 al mes, con renovación hasta que canceles. Expresar interés o estar en cola no crea cobros. PAZO básico sigue siendo gratis.','Optional support: US$2.99 per month, renewing until canceled. Expressing interest or waiting creates no charge. Basic PAZO remains free.')}</p>}
  {value.campaignState!=='active'&&<p className="text-[12px]">{t('Nuevas compras temporalmente limitadas. Tu gestión de membresía continúa disponible.','New purchases are temporarily limited. Membership management remains available.')}</p>}
  {['not_joined','withdrawn'].includes(value.myState)&&<div className="flex flex-wrap gap-2">
   <button type="button" disabled={busy} className={button} onClick={()=>void action('interest')}>{t('Quiero participar','I want to participate')}</button>
   <button type="button" disabled={busy} className={button} onClick={()=>void action('decline')}>{t('Ahora no','Not now')}</button>
  </div>}
  {['waiting','slot_granted'].includes(value.myState)&&<button type="button" disabled={busy} className={button} onClick={()=>void action('withdraw')}>{t('Retirar mi interés','Withdraw my interest')}</button>}
  {value.benefitsActive&&!value.feedback&&<div className="space-y-2">
   <h4 className="font-bold">{t('Comprobación voluntaria de beneficios','Optional benefit check')}</h4>
   <p className="text-[13px]">{t('Queremos ofrecerte una experiencia excelente. Comprueba tu insignia, perfil/publicaciones, acceso y gestión. Responder u omitir no modifica tus derechos.','We want to offer an excellent experience. Check your badge, profile/posts, access and management. Answering or skipping never changes your rights.')}</p>
   <label className="block text-[13px]">{t('¿Qué quieres revisar?','What would you like to review?')}
    <select className="mt-1 min-h-11 w-full rounded-xl bg-[#F4F6EF] px-3" value={component} onChange={e=>setComponent(e.target.value)}>
     <option value="badge">{t('Insignia','Badge')}</option><option value="profile_posts">{t('Perfil y publicaciones','Profile and posts')}</option><option value="access">{t('Acceso a beneficios','Benefit access')}</option><option value="management">{t('Gestión de membresía','Membership management')}</option>
    </select>
   </label>
   <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className={button} onClick={()=>void action('ok')}>{t('Todo funciona correctamente','Everything works correctly')}</button><button type="button" disabled={busy} className={button} onClick={()=>void action('issue')}>{t('Encontré un problema','I found a problem')}</button><button type="button" disabled={busy} className={button} onClick={()=>void action('skipped')}>{t('Omitir','Skip')}</button></div>
  </div>}
  {value.feedback&&<p className="text-[13px]">{t('Tu respuesta quedó registrada. Los problemas se atienden mediante soporte privado.','Your response is recorded. Problems are handled through private support.')}</p>}
  {failed&&<p role="alert" className="text-[13px]">{t('Resultado sin confirmar. Consulta el estado antes de repetir.','Outcome unconfirmed. Read status before repeating.')}</p>}
  <button type="button" className={button} disabled={busy} onClick={refresh}>{t('Actualizar mi estado','Refresh my status')}</button>
 </section>
}
