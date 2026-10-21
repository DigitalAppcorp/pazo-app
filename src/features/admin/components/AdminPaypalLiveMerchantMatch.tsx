import {useEffect,useRef,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'

type Props={lang:'es'|'en';mfaRecentlyVerified:boolean}
const merchantPattern=/^[2-9A-HJ-NP-Z]{13}$/
const keyPattern=/^[A-Za-z0-9_-]{20,512}$/
const input='mt-2 min-h-12 w-full rounded-[14px] bg-white px-4 py-3 text-[14px] font-semibold focus-visible:bg-[#EFF5DC]'
const endpoint='pazo-admin-paypal-live-inspect'
const allowedCodes=new Set([
 'verified_admin_required','resource_inspection_not_released',
 'resource_inspection_unavailable','resource_metadata_unavailable',
 'reserved_generation_required','invalid_resource_request','stored_webhook_conflict',
 'live_oauth_unverified','live_plan_unverified','live_plan_terms_unverified',
 'live_webhook_unverified','live_webhook_events_missing','live_webhook_events_unexpected',
 'live_provider_unavailable','live_merchant_oauth_unverified',
 'live_merchant_read_permission_required','live_merchant_identity_unverified',
 'live_merchant_identity_unavailable','live_merchant_id_mismatch',
 'generation_changed_during_inspection'
])
async function safeCode(data:unknown,error:unknown):Promise<string>{
 let candidate:unknown=data
 if(error&&typeof error==='object'&&'context' in error&&error.context instanceof Response){
  try{candidate=await error.context.clone().json()}catch{/* No raw provider errors. */}
 }
 const code=candidate&&typeof candidate==='object'&&'code' in candidate?candidate.code:null
 return typeof code==='string'&&allowedCodes.has(code)?code:'live_merchant_identity_unavailable'
}
export function AdminPaypalLiveMerchantMatch({lang,mfaRecentlyVerified}:Props){
 const t=(es:string,en:string)=>lang==='es'?es:en
 const [merchantId,setMerchantId]=useState('')
 const [clientId,setClientId]=useState('')
 const [clientSecret,setClientSecret]=useState('')
 const [state,setState]=useState<'idle'|'checking'|'matched'|'error'>('idle')
 const [code,setCode]=useState('')
 const epoch=useRef(0)
 useEffect(()=>{
  ++epoch.current
  setMerchantId('');setClientId('');setClientSecret('')
  setCode('');setState('idle')
  return ()=>{++epoch.current}
 },[mfaRecentlyVerified])
 const verify=async()=>{
  if(!mfaRecentlyVerified||state==='checking'||state==='matched'||
   !merchantPattern.test(merchantId)||!keyPattern.test(clientId)||
   !keyPattern.test(clientSecret))return
  const current=epoch.current
  const payload={action:'verify_merchant_id',confirmation:'COMPROBAR COMERCIO LIVE',
   merchantId,clientId,clientSecret}
  setMerchantId('');setClientId('');setClientSecret('')
  setCode('');setState('checking')
  try{
   const {data,error}=await supabase.functions.invoke(endpoint,{body:payload})
   if(epoch.current!==current)return
   if(error){setCode(await safeCode(data,error));setState('error');return}
   if(data?.ok!==true||data.code!=='live_merchant_id_read_match'||
    data.merchantIdMatched!==true||data.merchantBindingStored!==false||
    data.merchantIdentityVerified!==false||data.credentialsStored!==false||
    data.webhookDeliveryVerified!==false||data.liveActivated!==false||
    data.mayCharge!==false||!Number.isSafeInteger(data.generation))throw Error('unverified')
   setState('matched')
  }catch{
   if(epoch.current===current){setCode('live_merchant_identity_unavailable');setState('error')}
  }finally{payload.merchantId='';payload.clientId='';payload.clientSecret=''}
 }
 return <section className="rounded-[18px] bg-[#F2F7E9] p-4 text-[#204E4A]" data-pazo-live-merchant-match="true">
  <h4 className="text-[15px] font-black">{t('Comprobar identidad del comercio Live','Check Live merchant identity')}</h4>
  <p className="mt-2 text-[12px] leading-relaxed">{t(
   'Copia tu ID de comercio desde PayPal Business solo aquí. La comprobación consulta temporalmente el identificador de la cuenta por la API de saldos; no muestra ni guarda saldos, ID ni claves. No activa cobros ni vincula permanentemente la cuenta.',
   'Enter your merchant ID from PayPal Business only here. This check temporarily reads the account identifier through the balances API; it does not display or store balances, ID or keys. It neither charges nor permanently binds the account.')}</p>
  {!mfaRecentlyVerified&&<p className="mt-3 text-[12px]" role="status">{t(
   'Antes verifica un código reciente del autenticador en el control de arriba.',
   'First verify a fresh authenticator code in the control above.')}</p>}
  {mfaRecentlyVerified&&state!=='matched'&&<form className="mt-3 space-y-3" autoComplete="off"
   onSubmit={e=>{e.preventDefault();void verify()}}>
   <label className="block text-[12px] font-bold">{t('ID de comercio PayPal Live','PayPal Live Merchant ID')}
    <input className={input} type="password" value={merchantId} autoComplete="off"
     maxLength={13} spellCheck={false} disabled={state==='checking'}
     onChange={e=>setMerchantId(e.target.value)}/>
   </label>
   <label className="block text-[12px] font-bold">Client ID · Live
    <input className={input} type="password" value={clientId} autoComplete="new-password"
     maxLength={512} spellCheck={false} disabled={state==='checking'}
     onChange={e=>setClientId(e.target.value)}/>
   </label>
   <label className="block text-[12px] font-bold">Client Secret · Live
    <input className={input} type="password" value={clientSecret} autoComplete="new-password"
     maxLength={512} spellCheck={false} disabled={state==='checking'}
     onChange={e=>setClientSecret(e.target.value)}/>
   </label>
   <button type="submit" className="min-h-11 w-full rounded-[13px] bg-[#E1E53F] px-4 py-3 text-[13px] font-black disabled:opacity-50"
    disabled={state==='checking'||!merchantPattern.test(merchantId)||
     !keyPattern.test(clientId)||!keyPattern.test(clientSecret)}>
    {state==='checking'?t('Comparando identidad…','Checking identity…'):
     t('Comprobar comercio sin guardar datos','Check merchant without storing data')}
   </button>
  </form>}
  {state==='matched'&&<p className="mt-3 text-[12px] font-bold" role="status">{t(
   'El ID de PayPal Business coincide con la cuenta consultada por las credenciales Live. No se guardó ninguna clave, ID ni saldo. Falta la vinculación permanente y la prueba del webhook firmado; Live sigue apagado.',
   'PayPal Business merchant ID matches the Live credential account. No ID, key or balance was stored. Permanent binding and signed webhook verification remain pending; Live is off.')}</p>}
  {state==='error'&&<p className="mt-3 text-[12px] font-semibold text-[#9B4236]" role="alert">{t(
   'La comprobación no terminó. Comparte solo este código: ',
   'Check could not finish. Share only this code: ')}{code}</p>}
 </section>
}
