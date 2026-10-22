import {useEffect,useRef,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {useAuth} from '../../../context/AuthContext'
import {parsePazoLiveReleaseStatus,type PazoLiveReleaseStatus} from '../liveReleaseStatus.mjs'
type Props={lang:'es'|'en';mfaRecentlyVerified:boolean;revision?:string;onChanged:()=>void}
type Action='canary'|'public'|'stop'
const confirmations={canary:'AUTORIZO PRUEBA LIVE DE 2.99 USD',public:'AUTORIZO PUBLICAR CHECKOUT LIVE',stop:'DETENER NUEVAS COMPRAS'}
const actionClass='min-h-11 rounded-[15px] bg-[#E1E53F] px-4 py-3 text-[13px] font-black text-[#204E4A] disabled:cursor-not-allowed disabled:opacity-50'
function ReleaseAction({value,lang,mfaRecentlyVerified,onRefresh,onChanged}:{
 value:PazoLiveReleaseStatus;lang:'es'|'en';mfaRecentlyVerified:boolean;onRefresh:()=>void;onChanged:()=>void
}){
 const t=(es:string,en:string)=>lang==='es'?es:en
 const [action,setAction]=useState<Action>(value.mode==='off'?'canary':'stop')
 const [consent,setConsent]=useState(false)
 const [state,setState]=useState<'idle'|'busy'|'uncertain'>('idle')
 const busy=useRef(false);const current=useRef(false)
 useEffect(()=>{current.current=true;return ()=>{current.current=false}},[])
 const allowed=mfaRecentlyVerified&&(action==='stop'||value.originalOperator&&value.preparationReady)
 const submit=async()=>{
  if(busy.current||state==='uncertain'||!allowed||!consent)return
  busy.current=true;setState('busy');setConsent(false)
  try{
   const {data,error}=await supabase.functions.invoke('pazo-admin-paypal-release',{body:{
    action,expectedRevision:value.revision,requestId:crypto.randomUUID(),confirmation:confirmations[action]
   }})
   if(!current.current)return
   if(error||!['release_request_already_recorded','new_checkout_already_stopped','release_state_updated'].includes(data?.code)||
    data?.mayCharge!==false||!['off','canary','public'].includes(data?.mode)||!Number.isSafeInteger(data?.revision)){
    // An HTTP error can follow a committed operation. Query; never resend.
    setState('uncertain');return
   }
   onChanged();onRefresh()
  }catch{if(current.current)setState('uncertain')}
  finally{busy.current=false}
 }
 return <div className="mt-3 space-y-3">
  {!mfaRecentlyVerified&&<p className="text-[12px]">{t('Verifica un código nuevo del autenticador para autorizar cambios.','Verify a new authenticator code to authorize changes.')}</p>}
  {state==='uncertain'?<p role="alert" className="text-[13px]">{t(
   'No se pudo confirmar el resultado. Consulta el estado antes de solicitar otro cambio.',
   'The outcome could not be confirmed. Read status before requesting another change.')}</p>:<>
   <label className="block text-[13px] font-bold">{t('Operación','Operation')}
    <select aria-label={t('Operación Live','Live operation')} value={action} disabled={state==='busy'}
     className="mt-1 min-h-12 w-full rounded-[14px] bg-[#F5F8F1] px-3 text-[13px]"
     onChange={e=>{setAction(e.target.value as Action);setConsent(false)}}>
     {value.mode==='off'?<option value="canary">{t('Autorizar prueba privada de US$2.99','Authorize private US$2.99 test')}</option>:<>
      <option value="stop">{t('Detener nuevas compras','Stop new purchases')}</option>
      {value.mode==='canary'&&<option value="public">{t('Autorizar checkout público tras la prueba','Authorize public checkout after the test')}</option>}
     </>}
    </select>
   </label>
   <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[13px]">
    <input type="checkbox" checked={consent} disabled={!allowed||state==='busy'} className="mt-1 h-5 w-5 shrink-0 accent-[#204E4A]"
     onChange={e=>setConsent(e.target.checked)}/>
    <span>{action==='stop'?t('Confirmo detener nuevas compras; las suscripciones existentes conservan su gestión y conciliación.',
     'I confirm stopping new purchases; existing subscriptions retain management and reconciliation.'):
     action==='canary'?t('Autorizo una prueba Live de US$2.99 para mi cuenta. Todavía debo aprobar la suscripción en PayPal.',
     'I authorize a US$2.99 Live test for my account. I must still approve the subscription in PayPal.'):
     t('Autorizo abrir nuevas suscripciones al público únicamente si el servidor confirma la prueba y sus verificaciones.',
     'I authorize public subscriptions only if the server confirms the test and its checks.')}</span>
   </label>
   <button type="button" className={actionClass} disabled={!allowed||!consent||state==='busy'} onClick={()=>void submit()}>
    {state==='busy'?t('Comprobando y guardando…','Checking and saving…'):t('Confirmar operación','Confirm operation')}</button>
  </>}
  <button type="button" className={actionClass} disabled={state==='busy'} onClick={onRefresh}>
   {t('Consultar estado de activación','Read activation status')}</button>
 </div>
}
export function AdminLiveReleaseControl({lang,mfaRecentlyVerified,revision,onChanged}:Props){
 const {user}=useAuth();const owner=user?.id??null
 const [refresh,setRefresh]=useState(0);const key=JSON.stringify([owner,revision,refresh])
 const [result,setResult]=useState<{key:string;value:PazoLiveReleaseStatus|null}|null>(null)
 const value=result?.key===key?result.value:null
 const state=!owner||result?.key===key&&!value?'unavailable':result?.key!==key?'loading':'verified'
 const t=(es:string,en:string)=>lang==='es'?es:en
 useEffect(()=>{
  let current=true;if(!owner)return
  void(async()=>{
   try{
    const {data,error}=await supabase.rpc('pazo_admin_live_release_status')
    const parsed=parsePazoLiveReleaseStatus(data)
    if(error||!parsed)throw Error('unavailable')
    if(current)setResult({key,value:parsed})
   }catch{if(current)setResult({key,value:null})}
  })()
  return ()=>{current=false}
 },[key,owner])
 return <section data-pazo-live-release-control className="min-w-0 rounded-[22px] bg-white p-4 text-[#204E4A] sm:p-6">
  <h4 className="text-[17px] font-black">{t('Activación de PayPal Live','PayPal Live activation')}</h4>
  {state==='loading'&&<p role="status" className="mt-2 text-[13px]">{t('Consultando controles seguros…','Reading secure controls…')}</p>}
  {state==='unavailable'&&<><p role="alert" className="mt-2 text-[13px]">{t(
   'No se pudo verificar el estado de activación. No solicites cambios hasta consultarlo.',
   'Activation status could not be verified. Read status before requesting changes.')}</p>
   <button type="button" className={actionClass+' mt-3'} onClick={()=>setRefresh(n=>n+1)}>{t('Consultar estado de activación','Read activation status')}</button></>}
  {state==='verified'&&value&&<>
   <p role="status" className="mt-2 text-[13px] font-bold">{value.mode==='off'?t('Nuevas compras Live apagadas.','New Live purchases are off.'):
    value.mode==='canary'?t('Prueba privada limitada a la cuenta autorizada.','Private test limited to the authorized account.'):
    t('Nuevas compras Live abiertas al público.','New Live purchases are open to the public.')}</p>
   <p className="mt-1 text-[12px]">{t('Última consulta: ','Last checked: ')}{new Date(value.asOf).toLocaleString(lang)}</p>
   {!value.engineeringVerified&&<p className="mt-2 text-[12px]">{t('La preparación técnica y la validación HTTPS siguen pendientes.','Technical preparation and HTTPS validation are still pending.')}</p>}
   <p className="mt-2 text-[12px]">{t('Guardar claves no activa cobros. La apertura al público exige una venta conciliada y la cancelación confirmada de la prueba.',
    'Saving keys does not activate payments. Public release requires a reconciled sale and confirmed test cancellation.')}</p>
   <ReleaseAction key={JSON.stringify([key,mfaRecentlyVerified,value.mode,value.revision])} value={value} lang={lang}
    mfaRecentlyVerified={mfaRecentlyVerified} onRefresh={()=>setRefresh(n=>n+1)} onChanged={onChanged}/>
  </>}
 </section>
}
