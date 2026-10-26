import {useEffect,useRef,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'

// This is an operator-only, nonfinancial read. No checkout, replay or closing
// action is reachable from this component. Deployment remains gated separately.
export const PAZO_F18_ORIGINAL_ADMIN_AUDIT_RELEASED=true

type Props={lang:'es'|'en';mfaRecentlyVerified:boolean}
type Tri=boolean|null
type Report={
 auditCode:string|null
 eventReadStage:string|null
 originalPlanVerified:Tri
 evidenceComplete:Tri
 eventReadable:Tri
 signedEventMatches:Tri
 providerHttpStatus:number|null
 providerErrorName:string|null
 providerStatus:string|null
 transactionsComplete:Tri
 transactionCount:number|null
 completedPayments:number|null
}
const label='min-h-11 rounded-[15px] bg-[#E1E53F] px-4 py-3 text-[13px] font-black text-[#204E4A] disabled:opacity-50'
const auditLabels:Record<string,[string,string]>={
 qa_scope_read_unavailable:['No se pudo resolver el contrato original en el servidor.','The server could not resolve the original contract.'],
 qa_binding_read_unavailable:['La vinculación original no pudo verificarse.','Original subscription binding could not be verified.'],
 qa_generation_reader_unavailable:['No se pudo preparar la generación original de PayPal.','The original PayPal generation reader was unavailable.'],
 qa_provider_read_subscription_get_unavailable:['PayPal no devolvió la suscripción original.','PayPal did not return the original subscription.'],
 qa_provider_read_plan_get_unavailable:['No se pudo verificar el plan original.','The original plan could not be verified.'],
 qa_provider_read_oauth_unavailable:['No se pudo establecer la consulta de lectura en PayPal.','PayPal read authentication could not be established.'],
 qa_signed_event_unverified:['La consulta del evento firmado no quedó verificada.','The signed-event lookup was not verified.']
}
const eventLabels:Record<string,[string,string]>={
 not_attempted:['Consulta del evento no iniciada','Event lookup not started'],
 event_absent:['No existe evento original en el alcance autorizado','No event in authorized original scope'],
 reader_unavailable:['Lector del evento original no disponible','Original event reader unavailable'],
 provider_unavailable:['PayPal no devolvió un evento original verificable','PayPal did not return a verifiable original event'],
 mismatch:['El evento leído no coincide con el comprobante firmado','Event does not match the signed receipt'],
 verified:['Evento original verificado','Original event verified']
}
function isReport(value:unknown):value is Report{
 if(!value||typeof value!=='object'||Array.isArray(value))return false
 const v=value as Record<string,unknown>
 return ['evidenceComplete','eventReadable','signedEventMatches','transactionsComplete'].every(
   k=>[true,false,null].includes(v[k] as boolean|null))&&
  (v.auditCode===null||typeof v.auditCode==='string'&&/^qa_[a-z_]{3,100}$/.test(v.auditCode))&&
  (v.eventReadStage===null||typeof v.eventReadStage==='string'&&/^[a-z_]{3,40}$/.test(v.eventReadStage))&&
  (v.providerHttpStatus===null||Number.isSafeInteger(v.providerHttpStatus)&&
   Number(v.providerHttpStatus)>=400&&Number(v.providerHttpStatus)<=599)&&
  (v.providerErrorName===null||typeof v.providerErrorName==='string'&&v.providerErrorName.length<=32)&&
  (v.providerStatus===null||typeof v.providerStatus==='string'&&v.providerStatus.length<=30)&&
  ['transactionCount','completedPayments'].every(k=>
   v[k]===null||Number.isSafeInteger(v[k])&&Number(v[k])>=0)
}
export function AdminPaypalOriginalAudit({lang,mfaRecentlyVerified}:Props){
 const t=(es:string,en:string)=>lang==='es'?es:en
 const [state,setState]=useState<'idle'|'reading'|'complete'|'unavailable'>('idle')
 const [report,setReport]=useState<Report|null>(null)
 const attempted=useRef(false)
 const active=useRef(true)
 useEffect(()=>{active.current=true;return ()=>{active.current=false}},[])
 const read=async()=>{
  if(!PAZO_F18_ORIGINAL_ADMIN_AUDIT_RELEASED||!mfaRecentlyVerified||attempted.current)return
  attempted.current=true
  setState('reading');setReport(null)
  try{
   const {data,error}=await supabase.functions.invoke('pazo-admin-paypal-original-audit',{
    body:{action:'read_original',confirmation:'CONSULTAR EVIDENCIA ORIGINAL'}
   })
   if(!active.current)return
   if(error||data?.code!=='original_evidence_checked'||data?.ok!==true||
    data?.mayCharge!==false||data?.mayCancel!==false||
    data?.mayGrantBenefits!==false||!isReport(data.audit))throw Error('audit_unavailable')
   setReport(data.audit)
   setState('complete')
  }catch{if(active.current)setState('unavailable')}
 }
 // Do not show a nonfunctional control to administrators before the
 // separately authorized Edge deployment and frontend release.
 if(!PAZO_F18_ORIGINAL_ADMIN_AUDIT_RELEASED)return null
 const status=(v:Tri)=>v===true?t('Verificado','Verified'):
  v===false?t('No se pudo verificar','Could not verify'):t('Sin evidencia','No evidence')
 return <section data-pazo-f18-original-admin-audit className="mt-4 rounded-[18px] bg-[#F2F7E9] p-4 text-[#204E4A]">
  <h5 className="text-[15px] font-black">{t('Comprobación de PayPal original','Original PayPal evidence check')}</h5>
  <p className="mt-2 text-[12px] leading-relaxed">{t(
   'Consulta la solicitud anterior, sin iniciar compras, cancelar suscripciones ni otorgar beneficios.',
   'Checks the previous request without starting a purchase, cancelling a subscription or granting benefits.')}</p>
  {!PAZO_F18_ORIGINAL_ADMIN_AUDIT_RELEASED&&<p className="mt-2 text-[12px]">
   {t('Comprobación pendiente de habilitación técnica.','Check pending technical activation.')}
  </p>}
  <button type="button" className={label+' mt-3'}
   disabled={!PAZO_F18_ORIGINAL_ADMIN_AUDIT_RELEASED||!mfaRecentlyVerified||attempted.current||state==='reading'}
   onClick={()=>void read()}>{state==='reading'?t('Consultando evidencia…','Checking evidence…'):
    t('Consultar evidencia una vez','Check evidence once')}</button>
  {!mfaRecentlyVerified&&PAZO_F18_ORIGINAL_ADMIN_AUDIT_RELEASED&&<p className="mt-2 text-[12px]">
   {t('Confirma un nuevo código del autenticador antes de consultar.','Verify a new authenticator code before checking.')}
  </p>}
  {state==='unavailable'&&<p role="alert" className="mt-3 text-[12px]">
   {t('La consulta no pudo confirmarse. La suscripción y los registros permanecen sin cambios.',
   'The check could not be confirmed. Subscription and financial records remain unchanged.')}</p>}
  {state==='complete'&&report&&<div role="status" className="mt-3 space-y-2 text-[12px]">
   <p className="font-bold">{t('Resultado de consulta','Read result')}</p>
   {report.auditCode&&<p>{t('Diagnóstico: ','Diagnostic: ')}
    {auditLabels[report.auditCode]?.[lang==='es'?0:1]||
     t('No pudo completarse la auditoría original.','The original audit could not be completed.')}</p>}
   {report.auditCode&&<p className="break-words text-[11px] text-[#5F716A]">
    {t('Código técnico: ','Technical code: ')}<code>{report.auditCode}</code>
   </p>}
   {report.eventReadStage&&<p>
    {t('Etapa del evento: ','Event lookup stage: ')}
    {eventLabels[report.eventReadStage]?.[lang==='es'?0:1]||
     t('Sin verificación','Unverified')}</p>}
   {report.providerHttpStatus&&<p>{t('Respuesta HTTP de PayPal: ',
    'PayPal HTTP response: ')}{report.providerHttpStatus}</p>}
   {report.providerErrorName&&<p>{t('Código del proveedor: ',
    'Provider error code: ')}<code>{report.providerErrorName}</code></p>}
   {report.providerHttpStatus===404&&<p>{t(
    'PayPal respondió 404 al consultar un recurso original. Esto NO confirma que no exista un cobro.',
    'PayPal returned 404 while checking an original resource. This does NOT prove no payment occurred.')}</p>}
   {report.providerHttpStatus!==404&&<p>{t('Estado de suscripción verificado: ',
    'Verified subscription status: ')}{report.providerStatus||'—'}</p>}
   <p>{t('Evento original consultable: ','Original event readable: ')}{status(report.eventReadable)}</p>
   <p>{t('Correspondencia con evento firmado: ','Signed event matching: ')}{status(report.signedEventMatches)}</p>
   <p>{t('Auditoría completa: ','Audit complete: ')}{status(report.evidenceComplete)}</p>
   {report.evidenceComplete===true&&report.transactionsComplete===true&&
    Number.isSafeInteger(report.completedPayments)&&<p>{t('Pagos completados en el intervalo consultado: ',
     'Completed payments within the queried interval: ')}{report.completedPayments}</p>}
   <p>{t('No se han desbloqueado nuevas compras ni modificado registros financieros.',
     'No new purchases were unlocked and no financial records were modified.')}</p>
  </div>}
 </section>
}
