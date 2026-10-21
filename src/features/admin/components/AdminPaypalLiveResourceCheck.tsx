import {useEffect,useRef,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'

type Props={lang:'es'|'en';mfaRecentlyVerified:boolean;onVerified:()=>Promise<void>}
type Reservation={generation:number;webhookId:string;webhookUrl:string}
const endpoint='pazo-admin-paypal-live-inspect'
const webhookPrefix='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-webhook?generation='
const field='mt-2 min-h-12 w-full rounded-[14px] bg-white px-4 py-3 text-[14px] font-semibold focus-visible:bg-[#EFF5DC]'
const safeCodes=new Set(['verified_admin_required','resource_inspection_not_released',
 'resource_inspection_unavailable','resource_metadata_unavailable','reserved_generation_required',
 'invalid_resource_request','stored_webhook_conflict','live_config_incomplete',
 'live_oauth_unverified','live_plan_unverified','live_plan_terms_unverified',
 'live_webhook_unverified','live_webhook_events_missing','live_webhook_events_unexpected',
 'live_provider_unavailable','generation_changed_during_inspection','resource_record_unconfirmed'])
async function diagnostic(data:unknown,error:unknown):Promise<string>{
 let candidate:unknown=data
 if(error&&typeof error==='object'&&'context' in error&&error.context instanceof Response){
  try{candidate=await error.context.clone().json()}catch{/* Never display raw errors. */}
 }
 const code=candidate&&typeof candidate==='object'&&'code' in candidate?candidate.code:null
 if(typeof code!=='string'||!safeCodes.has(code))return 'resource_inspection_unavailable'
 if(code!=='live_webhook_events_unexpected'||!candidate||
  typeof candidate!=='object'||!('eventMismatch' in candidate))return code
 const mismatch=candidate.eventMismatch
 if(!mismatch||typeof mismatch!=='object')return code
 const count=(name:'receivedCount'|'extraCount'|'duplicateCount'|'malformedCount')=>{
  const raw=name in mismatch?(mismatch as Record<string,unknown>)[name]:null
  return typeof raw==='number'&&Number.isSafeInteger(raw)&&raw>=0&&raw<=500?raw:null
 }
 const details=['receivedCount','extraCount','duplicateCount','malformedCount'] as const
 const amounts=details.map(key=>count(key))
 if(amounts.some(value=>value===null))return code
 const names='unexpectedTypes' in mismatch?mismatch.unexpectedTypes:null
 const events=Array.isArray(names)?names.filter((name):name is string=>
  typeof name==='string'&&/^[A-Z][A-Z0-9._]{0,70}$/.test(name)).slice(0,12):[]
 return code+' | API event_types='+amounts[0]+
  ', extra='+amounts[1]+', duplicados='+amounts[2]+
  ', malformados='+amounts[3]+(events.length?', adicionales: '+events.join(', '):'')
}
export function AdminPaypalLiveResourceCheck({lang,mfaRecentlyVerified,onVerified}:Props){
 const t=(es:string,en:string)=>lang==='es'?es:en
 const [reservation,setReservation]=useState<Reservation|null>(null)
 const [webhookId,setWebhookId]=useState('')
 const [clientId,setClientId]=useState('')
 const [clientSecret,setClientSecret]=useState('')
 const [state,setState]=useState<'idle'|'loading'|'ready'|'checking'|'verified'|'error'>('idle')
 const [code,setCode]=useState('')
 const epoch=useRef(0)
 useEffect(()=>{
  const current=++epoch.current
  setClientId('');setClientSecret('');setReservation(null);setCode('')
  if(!mfaRecentlyVerified){setState('idle');return}
  setState('loading')
  void (async()=>{
   try{
    const {data,error}=await supabase.functions.invoke(endpoint,{body:{action:'read_reservation'}})
    if(epoch.current!==current)return
    if(error){setCode(await diagnostic(data,error));setState('error');return}
    if(data?.ok!==true||data.code!=='reserved_generation_read'||
     !Number.isSafeInteger(data.generation)||data.generation<1||data.generation>9999||
     data.webhookUrl!==webhookPrefix+data.generation||typeof data.webhookId!=='string'||
     data.mayCharge!==false||data.liveActivated!==false||data.credentialsStored!==false)
     throw Error('unverified')
    setReservation({generation:data.generation,webhookId:data.webhookId,webhookUrl:data.webhookUrl})
    setWebhookId(data.webhookId);setState('ready')
   }catch{
    if(epoch.current===current){setCode('resource_metadata_unavailable');setState('error')}
   }
  })()
  return ()=>{epoch.current++}
 },[mfaRecentlyVerified])
 const inspect=async()=>{
  if(!mfaRecentlyVerified||!reservation||state==='checking'||state==='verified')return
  const current=epoch.current
  const payload={action:'inspect_resources',confirmation:'COMPROBAR RECURSOS LIVE',
   webhookId:webhookId.trim(),clientId:clientId.trim(),clientSecret:clientSecret.trim()}
  setClientId('');setClientSecret('');setState('checking');setCode('')
  try{
   const {data,error}=await supabase.functions.invoke(endpoint,{body:payload})
   if(epoch.current!==current)return
   if(error){setCode(await diagnostic(data,error));setState('error');return}
   if(data?.ok!==true||data.code!=='live_resource_configuration_recorded'||
    data.generation!==reservation.generation||data.planReadVerified!==true||
    data.webhookReadVerified!==true||data.credentialsStored!==false||
    data.mayCharge!==false||data.liveActivated!==false||
    data.merchantIdentityVerified!==false||data.webhookDeliveryVerified!==false)
    throw Error('unverified')
   setState('verified')
   await onVerified()
  }catch{
   if(epoch.current===current){setCode('resource_record_unconfirmed');setState('error')}
  }finally{payload.clientId='';payload.clientSecret=''}
 }
 return <section className="rounded-[18px] bg-[#F2F7E9] p-4 text-[#204E4A]" data-pazo-live-resource-check="true">
  <h4 className="text-[15px] font-black">{t('Comprobar plan y webhook Live','Check Live plan and webhook')}</h4>
  <p className="mt-2 text-[12px] leading-relaxed">{t(
   'Las claves se usan solo en esta comprobación y se vacían al enviarlas. No se guardan ni se activa ningún cobro.',
   'Keys are used only for this check and cleared when submitted. They are not stored and no charges are enabled.')}</p>
  {!mfaRecentlyVerified&&<p className="mt-3 text-[12px]" role="status">{t(
   'Verifica un código reciente del autenticador en el control superior.',
   'Verify a recent authenticator code using the control above.')}</p>}
  {state==='loading'&&<p className="mt-3 text-[12px]" role="status">{t('Leyendo la reserva existente…','Reading the existing reservation…')}</p>}
  {reservation&&<form className="mt-3 space-y-3" autoComplete="off"
   onSubmit={e=>{e.preventDefault();void inspect()}}>
   <p className="text-[12px] font-bold">{t('Generación reservada: ','Reserved generation: ')}{reservation.generation}</p>
   <label className="block text-[12px] font-bold">Webhook ID
    <input className={field} value={webhookId} maxLength={100} autoComplete="off" spellCheck={false}
     disabled={state==='checking'||state==='verified'} onChange={e=>setWebhookId(e.target.value)}/>
   </label>
   <label className="block text-[12px] font-bold">Client ID · Live
    <input className={field} type="password" autoComplete="new-password" value={clientId}
     maxLength={512} spellCheck={false} disabled={!mfaRecentlyVerified||state==='checking'||state==='verified'}
     onChange={e=>setClientId(e.target.value)}/>
   </label>
   <label className="block text-[12px] font-bold">Client Secret · Live
    <input className={field} type="password" autoComplete="new-password" value={clientSecret}
     maxLength={512} spellCheck={false} disabled={!mfaRecentlyVerified||state==='checking'||state==='verified'}
     onChange={e=>setClientSecret(e.target.value)}/>
   </label>
   <button type="submit" className="min-h-11 w-full rounded-[13px] bg-[#E1E53F] px-4 py-3 text-[13px] font-black disabled:opacity-50"
    disabled={!mfaRecentlyVerified||state==='checking'||state==='verified'||
     !/^[A-Za-z0-9_-]{8,100}$/.test(webhookId.trim())||
     !/^[A-Za-z0-9_-]{20,512}$/.test(clientId.trim())||
     !/^[A-Za-z0-9_-]{20,512}$/.test(clientSecret.trim())}>
    {state==='checking'?t('Comprobando…','Checking…'):t('Comprobar sin guardar claves','Check without storing keys')}
   </button>
  </form>}
  {state==='verified'&&<p role="status" className="mt-3 text-[12px] font-bold">{t(
   'Plan y webhook comprobados y registrados. Claves no guardadas. Live sigue apagado. Falta verificar el comercio y la entrega firmada.',
   'Plan and webhook checked and recorded. Keys not stored. Live remains off. Merchant identity and signed delivery still need verification.')}</p>}
  {state==='error'&&<p role="alert" className="mt-3 text-[12px] font-semibold text-[#9B4236]">{t(
   'No se confirmó la comprobación. Comparte únicamente este diagnóstico: ',
   'The check was not confirmed. Share only this diagnostic: ')}{code}</p>}
 </section>
}
