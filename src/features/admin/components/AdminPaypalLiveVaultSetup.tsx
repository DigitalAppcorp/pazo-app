import {useEffect,useRef,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'

type Props={lang:'es'|'en';mfaRecentlyVerified:boolean;credentialsStored?:boolean;onStored:()=>void}
type State='idle'|'preparing'|'prepared'|'review'
const good=/^[A-Za-z0-9_-]{20,512}$/
const action='min-h-11 w-full rounded-[14px] bg-[#E1E53F] px-4 py-3 text-[13px] font-black text-[#204E4A] disabled:opacity-50'
const input='mt-2 min-h-12 w-full rounded-[14px] bg-white px-4 py-3 text-[13px] font-semibold text-[#204E4A] focus-visible:bg-[#EFF5DC]'
const allowed=new Set(['live_vault_setup_not_released','fresh_admin_mfa_required',
 'original_generation_unavailable','live_draft_unavailable',
 'live_provider_verification_unavailable','credential_save_outcome_needs_review',
 'generation_changed','live_setup_metadata_unavailable'])
async function reason(error:unknown,data:unknown):Promise<string>{
 let observed:unknown=data
 if(error&&typeof error==='object'&&'context' in error&&error.context instanceof Response){
  try{observed=await error.context.clone().json()}catch{/* keep secrets private */}
 }
 const code=observed&&typeof observed==='object'&&'code' in observed?observed.code:null
 return typeof code==='string'&&allowed.has(code)?code:'credential_save_outcome_needs_review'
}
export function AdminPaypalLiveVaultSetup({lang,mfaRecentlyVerified,credentialsStored=false,onStored}:Props){
 const t=(es:string,en:string)=>lang==='es'?es:en
 const [id,setId]=useState('')
 const [secret,setSecret]=useState('')
 const [state,setState]=useState<State>('idle')
 const [error,setError]=useState('')
 const prepared=credentialsStored||state==='prepared'
 const epoch=useRef(0)
 useEffect(()=>{
  ++epoch.current;setId('');setSecret('');setState('idle');setError('')
  return ()=>{++epoch.current}
 },[mfaRecentlyVerified])
 const prepare=async()=>{
  if(!mfaRecentlyVerified||!good.test(id)||!good.test(secret)||
   state==='preparing'||state==='prepared'||state==='review'||credentialsStored)return
  const current=epoch.current
  const payload={action:'prepare_live_vault',
   confirmation:'PREPARAR CREDENCIALES LIVE',clientId:id,clientSecret:secret}
  setId('');setSecret('');setError('');setState('preparing')
  try{
   const {data,error:apiError}=await supabase.functions.invoke('pazo-admin-paypal-vault',{
    method:'POST',body:payload})
   if(epoch.current!==current)return
   if(apiError){
    setError(await reason(apiError,data));setState('review');return
   }
   if(data?.ok!==true||data.code!=='live_vault_credentials_prepared'||
    data.credentialsStored!==true||data.liveActivated!==false||
    data.mayCharge!==false||data.merchantIdentityVerified!==false||
    !Number.isSafeInteger(data.generation)||data.generation<1)
    throw Error('unverified_storage')
   setState('prepared');onStored()
  }catch{if(epoch.current===current){setError('credential_save_outcome_needs_review');setState('review')}}
  finally{payload.clientId='';payload.clientSecret=''}
 }
 return <section className="rounded-[18px] bg-[#F2F7E9] p-4 text-[#204E4A]"
  data-pazo-live-vault-setup="true">
  <h4 className="text-[15px] font-black">{t(
   'Preparar PayPal Live desde Administración','Prepare PayPal Live in Admin')}</h4>
  <p className="mt-2 text-[12px] leading-relaxed">{t(
   'Las claves se comprueban contra el plan y webhook ya configurados y se guardan cifradas en Supabase Vault. No se crea ninguna suscripción ni cobro durante este paso.',
   'Keys are checked against the existing plan and webhook and stored encrypted in Supabase Vault. No subscription or charge is created by this action.')}</p>
  {!mfaRecentlyVerified&&!prepared?<p role="status" className="mt-3 text-[12px]">{t(
   'Comprueba primero un código nuevo del autenticador en la sección superior.',
   'Verify a fresh authenticator code above before proceeding.')}</p>:null}
  {mfaRecentlyVerified&&!prepared&&state!=='review'&&<form autoComplete="off" className="mt-3 space-y-3"
   onSubmit={event=>{event.preventDefault();void prepare()}}>
   <label className="block text-[12px] font-bold">Client ID · Live
    <input type="password" autoComplete="off" spellCheck={false} maxLength={512}
     disabled={state==='preparing'} className={input} value={id}
     onChange={event=>setId(event.target.value)}/>
   </label>
   <label className="block text-[12px] font-bold">Client Secret · Live
    <input type="password" autoComplete="new-password" spellCheck={false} maxLength={512}
     disabled={state==='preparing'} className={input} value={secret}
     onChange={event=>setSecret(event.target.value)}/>
   </label>
   <button type="submit" className={action} disabled={state==='preparing'||!good.test(id)||!good.test(secret)}>
    {state==='preparing'?t('Comprobando y guardando…','Verifying and storing…'):
     t('Comprobar y guardar credenciales Live','Verify and save Live credentials')}</button>
  </form>}
  {prepared&&<p role="status" className="mt-3 text-[12px] font-bold">{t(
   'Claves comprobadas y guardadas en Vault. Guardarlas no crea suscripciones ni autoriza cobros.',
   'Credentials verified and stored in Vault. Storing them does not create subscriptions or authorize payments.')}</p>}
  {state==='review'&&!prepared&&<><p role="alert" className="mt-3 text-[12px] font-semibold text-[#9B4236]">{t(
   'Resultado pendiente de revisión. No reintentes sin consultar el estado en el panel. Código: ',
   'Review required. Do not retry before checking the panel status. Code: ')}{error}</p>
   <button type="button" className={'mt-3 '+action} onClick={onStored}>{t(
    'Consultar estado del guardado','Check storage status')}</button></>}
 </section>
}
