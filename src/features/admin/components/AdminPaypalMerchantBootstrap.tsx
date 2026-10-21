import {useState} from 'react'
import {supabase} from '../../../services/supabaseClient'

type Props={lang:'es'|'en';mfaRecentlyVerified:boolean}
type Generation={generation:number;webhookUrl:string}
const urlPrefix='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-webhook?generation='
const button='min-h-11 rounded-[13px] bg-[#E1E53F] px-4 text-[13px] font-black text-[#204E4A] disabled:opacity-50'
const card='rounded-[18px] bg-[#F2F7E9] p-4 text-[#204E4A]'
// Only finite server-defined error codes may reach the user. No token, raw
// response, exception message or private merchant data is rendered.
const SAFE_BOOTSTRAP_CODES=new Set([
 'merchant_bootstrap_not_released','bootstrap_backend_unavailable',
 'live_configuration_unavailable','generation_outcome_needs_review',
 'live_draft_not_ready','verified_admin_required','invalid_bootstrap_request',
 'live_checkout_not_locked','origin_not_allowed'
])
export function AdminPaypalMerchantBootstrap({lang,mfaRecentlyVerified}:Props){
 const t=(es:string,en:string)=>lang==='es'?es:en
 const [state,setState]=useState<'idle'|'working'|'reserved'|'review'>('idle')
 const [generation,setGeneration]=useState<Generation|null>(null)
 const [failureCode,setFailureCode]=useState('')
 const reserve=async()=>{
  if(!mfaRecentlyVerified||state!=='idle')return
  setFailureCode('')
  setState('working')
  try{
   const {data,error}=await supabase.functions.invoke('pazo-admin-paypal-bootstrap',{
    method:'POST',body:{
     action:'reserve_generation',confirmation:'RESERVAR GENERACION LIVE'
    }
   })
   if(error){
    let observed=data?.code
    if(typeof observed!=='string'){
     const context=error && typeof error==='object' && 'context' in error
      ?error.context:null
     if(context instanceof Response){
      try{const body=await context.clone().json();observed=body?.code}
      catch{/* Network error or invalid response: do not leak details. */}
     }
    }
    if(typeof observed==='string'&&SAFE_BOOTSTRAP_CODES.has(observed))
     setFailureCode(observed)
    throw Error('bootstrap_unverified')
   }
   const g=data?.generation
   const webhook=data?.webhookUrl
   if(error||data?.ok!==true||data?.code!=='live_generation_reserved'||
    !Number.isSafeInteger(g)||g<1||g>9999||
    webhook!==urlPrefix+g||
    data?.mayCharge!==false||data?.liveActivated!==false||
    data?.credentialsProvisioned!==false||data?.webhookConfigured!==false)
    throw Error('bootstrap_unverified')
   setGeneration({generation:g,webhookUrl:webhook})
   setState('reserved')
  }catch{
   // A lost response is uncertain: the generation might already be reserved.
   // Never retry automatically. SQL permits an explicit later readback.
   setState('review')
  }
 }
 return <section className={card} data-pazo-live-generation-reservation="true">
  <h4 className="text-[15px] font-black">{t(
   'Generación comercial Live','Live merchant generation')}</h4>
  <p className="mt-2 text-[12px] leading-relaxed">{t(
   'Solo reserva un identificador en PAZO. No crea un pago, una suscripción ni un webhook en PayPal.',
   'Reserves an identifier in PAZO only. Does not create a payment, subscription, or PayPal webhook.')}</p>
  {state==='idle'&&<button className={'mt-3 '+button} type="button"
   disabled={!mfaRecentlyVerified} onClick={()=>void reserve()}>{t(
    'Reservar generación Live','Reserve Live generation')}</button>}
  {state==='working'&&<p className="mt-3 text-[12px]" role="status">{t(
   'Reservando en Supabase…','Reserving in Supabase…')}</p>}
  {state==='review'&&<p className="mt-3 text-[12px] font-semibold text-[#9B4236]" role="alert">{t(
   'No se pudo confirmar la respuesta. No vuelvas a pulsar el botón: la reserva requiere comprobación.',
   'Outcome uncertain. Do not retry: the reservation must be checked.')}
   {failureCode&&<span className="mt-1 block" data-pazo-bootstrap-diagnostic="true">
    {t('Diagnóstico: ','Diagnostic: ')}{failureCode}</span>}</p>}
  {state==='reserved'&&generation&&<div className="mt-3 space-y-2" role="status">
   <p className="text-[13px] font-black">{t(
    'Generación reservada: ','Generation reserved: ')}{generation.generation}</p>
   <label className="block text-[12px] font-bold">{t(
    'URL exacta para el webhook de la app Pazo en PayPal Live',
    'Exact URL for the Pazo app webhook in PayPal Live')}
    <input readOnly className="mt-2 w-full min-h-11 rounded-[12px] bg-white px-3 text-[12px]"
     value={generation.webhookUrl} onFocus={e=>e.currentTarget.select()}/>
   </label>
   <p className="text-[12px]">{t(
    'Copia esta URL en PayPal Developer Live. Todavía no hay webhook validado ni credenciales conectadas.',
    'Use this URL in PayPal Developer Live. The webhook and credentials are not verified yet.')}</p>
  </div>}
 </section>
}
