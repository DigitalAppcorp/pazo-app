import {useEffect,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {getPublicSupabaseConfig} from '../../../lib/publicConfig'

// This is PAZO's real QA account screen. V2-only owner-scoped endpoint.
// No browser-selected merchant subscription ID or payment state can be trusted.
type Props={lang:'es'|'en'}
type Account={intentId:string;state:'pending'|'bound';canDownloadAcceptance:boolean}
type Result={ok?:boolean;code?:string;phase?:string;accounts?:Account[];
 providerStatus?:string;cancelled?:boolean;paidThrough?:null;mayGrantBenefits?:boolean}
const HOST='https://mrybvqdebbgcayuvgkkr.supabase.co'
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function SandboxV2AccountPanel({lang}:Props){
 const [account,setAccount]=useState<Account|null>(null)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState(false)
 const [providerStatus,setProviderStatus]=useState<string|null>(null)
 const [confirm,setConfirm]=useState(false)
 const [cancelled,setCancelled]=useState(false)
 const t=(es:string,en:string)=>lang==='es'?es:en
 const call=async(payload:object,acknowledgement=false)=>{
  const config=getPublicSupabaseConfig(import.meta.env)
  if(!config||config.url!==HOST)throw Error('INVALID_QA_CONFIG')
  const {data:{session},error:e}=await supabase.auth.getSession()
  if(e||!session?.access_token)throw Error('LOGIN_REQUIRED')
  const response=await fetch(HOST+'/functions/v1/f16-paypal-supporter',{
   method:'POST',headers:{authorization:'Bearer '+session.access_token,
    apikey:config.key,'content-type':'application/json'},
   cache:'no-store',body:JSON.stringify(payload),
  })
  if(!response.ok)throw Error('QA_SERVER_UNAVAILABLE')
  if(acknowledgement)return response
  const result=await response.json() as Result
  if(!result||result.paidThrough!==null||
    result.mayGrantBenefits===true)throw Error('UNTRUSTED_QA_STATUS')
  return result
 }
 const refresh=async()=>{
  setLoading(true);setError(false);setAccount(null)
  try {
   const result=await call({action:'list'}) as Result
   if(result.ok!==true||result.phase!=='V2_ACCOUNTS'||
      !Array.isArray(result.accounts)||result.accounts.length>1||
      result.accounts.some(a=>!INTENT.test(a.intentId||'')||
       !['pending','bound'].includes(a.state)||a.canDownloadAcceptance!==true))
    throw Error('UNTRUSTED_QA_LIST')
   setAccount(result.accounts[0]||null)
  }catch{setError(true)}
  finally{setLoading(false)}
 }
 useEffect(()=>{void refresh()},[])
 const getStatus=async()=>{
  if(!account||account.state!=='bound'||busy)return
  setBusy(true);setError(false)
  try{
   const result=await call({action:'status',intentId:account.intentId}) as Result
   if(result.ok!==true||typeof result.providerStatus!=='string')
    throw Error('NO_MERCHANT_CONFIRMATION')
   setProviderStatus(result.providerStatus)
   setCancelled(result.providerStatus==='CANCELLED')
  }catch{setError(true)}finally{setBusy(false)}
 }
 const cancel=async()=>{
  if(!account||account.state!=='bound'||!confirm||busy)return
  setBusy(true);setError(false)
  try{
   const result=await call({action:'cancel',intentId:account.intentId,
    confirmCancellation:true}) as Result
   if(result.ok!==true||result.cancelled!==true||
      result.code!=='future_renewals_cancelled')
    throw Error('CANCEL_NOT_CONFIRMED')
   setCancelled(true);setProviderStatus('CANCELLED');setConfirm(false)
  }catch{setError(true)}finally{setBusy(false)}
 }
 const download=async()=>{
  if(!account||busy)return
  setBusy(true);setError(false)
  try{
   const response=await call({action:'acknowledgement',
    intentId:account.intentId},true) as Response
   if(!response.headers.get('content-type')?.startsWith('text/plain'))
    throw Error('UNTRUSTED_ACK_TYPE')
   const body=await response.text()
   if(body.length<100||body.length>16000||
      !body.includes('pazo-supporter-sandbox.benefits-v2'))
    throw Error('UNTRUSTED_TERMS')
   const url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'}))
   const link=document.createElement('a');link.href=url
   link.download='pazo-sandbox-v2-aceptacion.txt'
   document.body.appendChild(link);link.click()
   setTimeout(()=>{link.remove();URL.revokeObjectURL(url)},1500)
  }catch{setError(true)}finally{setBusy(false)}
 }
 const button='min-h-11 rounded-full bg-[#204E4A] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-40'
 return <section aria-labelledby="qa-v2-account-title"
    className="space-y-3 rounded-[24px] bg-white p-4 text-[#204E4A]">
   <h4 id="qa-v2-account-title" className="text-base font-black">
    {t('Mi nueva prueba Sandbox con beneficios','My new four-benefit Sandbox test')}
   </h4>
   <p className="text-xs leading-relaxed text-[#476862]">
    {t('Esta prueba es independiente de la suscripción anterior. El estado de PayPal no demuestra un período pagado.',
    'This test is separate from the previous subscription. PayPal status does not prove paid coverage.')}
   </p>
   <button type="button" className={button} onClick={()=>void refresh()} disabled={busy||loading}>
    {t('Actualizar prueba','Refresh test')}
   </button>
   {loading&&<p role="status" className="text-sm">{t('Consultando cuenta…','Checking account…')}</p>}
   {error&&<p role="alert" className="rounded-2xl bg-[#FCE5D8] p-3 text-sm">
    {t('No fue posible verificar esta operación. No se mostrará como completada.',
      'Could not verify the operation. It will not be shown as complete.')}
   </p>}
   {!loading&&!error&&!account&&<p role="status" className="text-sm">
    {t('Todavía no existe una segunda suscripción Sandbox.',
      'No second Sandbox subscription has been created yet.')}
   </p>}
   {account&&<div className="space-y-3">
     <p role="status" className="text-sm font-bold">
      {account.state==='pending'
       ?t('Solicitud registrada; no hay pago verificado.',
        'Request recorded; no verified payment.')
       :t('Suscripción Sandbox vinculada; pago aún no verificado.',
        'Sandbox subscription linked; payment not yet verified.')}
     </p>
     {providerStatus&&<p role="status" className="text-sm">
      {t('Estado del proveedor: ','Provider status: ')}{providerStatus}
     </p>}
     <div className="flex flex-wrap gap-2">
      <button type="button" className={button} onClick={()=>void download()} disabled={busy}>
       {t('Descargar aceptación V2','Download V2 acceptance')}
      </button>
      {account.state==='bound'&&<button type="button" className={button}
        onClick={()=>void getStatus()} disabled={busy}>
        {t('Consultar PayPal Sandbox','Check PayPal Sandbox')}
      </button>}
      {account.state==='bound'&&!cancelled&&<button type="button" className={button}
        onClick={()=>setConfirm(true)} disabled={busy}>
        {t('Cancelar próxima renovación V2','Cancel V2 renewal')}
      </button>}
     </div>
     {confirm&&<div className="space-y-2 rounded-2xl bg-[#FCE5D8] p-3 text-sm">
       <p>{t('Solo se cancelará la nueva suscripción Sandbox, no la histórica. ¿Confirmar?',
       'Only the new Sandbox subscription will be cancelled, not the historical one. Confirm?')}</p>
       <div className="flex gap-2">
        <button type="button" className={button} onClick={()=>void cancel()} disabled={busy}>
         {t('Sí, cancelar V2','Yes, cancel V2')}
        </button>
        <button type="button" className={button} onClick={()=>setConfirm(false)} disabled={busy}>
         {t('Volver','Go back')}
        </button>
       </div>
      </div>}
     {cancelled&&<p role="status" className="text-sm font-extrabold">
       {t('PayPal confirmó que las futuras renovaciones V2 están canceladas.',
       'PayPal confirmed that future V2 renewals are cancelled.')}
      </p>}
   </div>}
 </section>
}
