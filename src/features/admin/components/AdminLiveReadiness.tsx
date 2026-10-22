import {useEffect,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {useAuth} from '../../../context/AuthContext'
import {parsePazoLiveReadiness,type PazoLiveReadiness} from '../liveReadiness.mjs'

const messages:Record<string,[string,string]>={
 terms_unavailable:['Condiciones de la membresía pendientes.','Membership terms are pending.'],
 account_backend_unavailable:['Gestión de la cuenta pendiente.','Account management is pending.'],
 benefits_backend_unavailable:['Preparación de beneficios pendiente.','Benefits setup is pending.'],
 finance_backend_unavailable:['Registro financiero pendiente.','Financial ledger setup is pending.'],
 controlled_release_pending:['Falta completar la habilitación controlada y su validación.','Controlled activation and its validation are still pending.'],
 live_credentials_pending:['Las credenciales Live aún no están guardadas.','Live credentials have not been stored.'],
 provider_verification_pending:['La comprobación de PayPal Live está pendiente.','PayPal Live verification is pending.'],
 private_worker_unavailable:['El procesamiento de pagos no está disponible.','Payment processing is unavailable.']
}
export function AdminLiveReadiness({lang,revision}:{lang:'es'|'en';revision?:string}){
 const {user}=useAuth()
 const ownerId=user?.id??null
 const [refresh,setRefresh]=useState(0)
 const key=JSON.stringify([ownerId,revision,refresh])
 const [result,setResult]=useState<{key:string;state:'verified'|'unavailable';value:PazoLiveReadiness|null}|null>(null)
 const value=result?.key===key?result.value:null
 const state=!ownerId?'unavailable':result?.key===key?result.state:'loading'
 const t=(es:string,en:string)=>lang==='es'?es:en
 useEffect(()=>{
  let current=true
  if(!ownerId)return
  void (async()=>{
   try{
    const {data,error}=await supabase.rpc('pazo_admin_live_readiness')
    const parsed=parsePazoLiveReadiness(data)
    if(error||!parsed)throw Error('unverified_readiness')
    if(current)setResult({key,value:parsed,state:'verified'})
   }catch{if(current)setResult({key,value:null,state:'unavailable'})}
  })()
  return ()=>{current=false}
 },[key,ownerId])
 return <section data-pazo-live-readiness className="rounded-[18px] bg-[#F2F7E9] p-4 text-[#204E4A]">
  <h4 className="text-[15px] font-black">{t('Estado de preparación de PayPal Live','PayPal Live preparation status')}</h4>
  {state==='loading'&&<p role="status" className="mt-2 text-[13px]">{t('Consultando el estado seguro…','Reading secure status…')}</p>}
  {state==='unavailable'&&<p role="alert" className="mt-2 text-[13px]">{t(
   'No se pudo comprobar la preparación. No reingreses las claves ni actives cobros hasta verificar el estado.',
   'Preparation could not be verified. Check status before re-entering keys or enabling payments.')}</p>}
  {state==='verified'&&value&&<>
   <p role="status" className="mt-2 text-[13px] font-bold">{value.checkoutActive?
    t('El servidor indica checkout Live activo.','The server reports Live checkout active.'):
    t('Checkout Live apagado.','Live checkout is off.')}</p>
   <p className="mt-2 text-[12px]">{value.checks.credentialsStored?
    t('Credenciales originales guardadas. No vuelvas a introducirlas.','Original credentials are stored. Do not enter them again.'):
    t('Las credenciales originales todavía no constan como guardadas.','Original credentials are not yet recorded as stored.')}</p>
   <ul className="mt-3 list-disc space-y-1 pl-5 text-[12px]">
    {value.blockers.map(code=><li key={code}>{messages[code][lang==='es'?0:1]}</li>)}
   </ul>
   <p className="mt-3 text-[12px]">{t('Guardar claves no autoriza cobros. La prueba real requiere tu confirmación expresa.',
    'Storing keys does not authorize payments. A real test requires your explicit confirmation.')}</p>
  </>}
  <button type="button" disabled={state==='loading'} onClick={()=>setRefresh(n=>n+1)}
   className="mt-3 min-h-11 rounded-[14px] bg-[#E1E53F] px-4 py-3 text-[13px] font-black disabled:opacity-50">
   {t('Actualizar preparación','Refresh preparation')}</button>
 </section>
}
