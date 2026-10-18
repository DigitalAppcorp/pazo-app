import {useEffect,useRef,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {getPublicSupabaseConfig} from '../../../lib/publicConfig'

// This is PAZO's real QA account screen. V2-only owner-scoped endpoint.
// No browser-selected merchant subscription ID or payment state can be trusted.
type Props={lang:'es'|'en';reviewRevision?:number;onAccountInspection?:(state:'checking'|'none'|'pending'|'bound'|'unavailable')=>void}
type Account={intentId:string;state:'pending'|'bound';canDownloadAcceptance:boolean}
type Result={ok?:boolean;code?:string;phase?:string;accounts?:Account[];
 providerStatus?:string;cancelled?:boolean;paidThrough?:string|null;mayGrantBenefits?:boolean;cycleVerified?:boolean;
 approvalUrl?:string|null}
const HOST='https://mrybvqdebbgcayuvgkkr.supabase.co'
const safeSandboxApprovalUrl=(raw:unknown):string|null=>{
 if(typeof raw!=='string'||raw.length>2048)return null
 try {
  const url=new URL(raw)
  return url.protocol==='https:'&&
   ['sandbox.paypal.com','www.sandbox.paypal.com'].includes(url.hostname)&&
   !url.username&&!url.password&&!url.port&&!url.hash&&
   url.toString()===raw&&
   url.pathname.startsWith('/webapps/billing/subscriptions')&&
   /^BA-[A-Za-z0-9_-]{6,128}$/.test(url.searchParams.get('ba_token')||'')&&
   [...url.searchParams.keys()].every(k=>k==='ba_token') ? raw:null
 }catch{return null}
}

const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function SandboxV2AccountPanel({lang,reviewRevision=0,onAccountInspection}:Props){
 const initialAccountCheck=useRef(false)
 const [account,setAccount]=useState<Account|null>(null)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState(false)
 const [providerStatus,setProviderStatus]=useState<string|null>(null)
 const [recoveryMessage,setRecoveryMessage]=useState<'unavailable'|'changed'|'failed'|null>(null)
 const [confirm,setConfirm]=useState(false)
 const [cancelled,setCancelled]=useState(false)
 const [paidThrough,setPaidThrough]=useState<string|null>(null)
 const t=(es:string,en:string)=>lang==='es'?es:en
 const call=async(payload:object,acknowledgement=false)=>{
  const config=getPublicSupabaseConfig(import.meta.env)
  if(!config||config.url!==HOST)throw Error('INVALID_QA_CONFIG')
  const {data:{session},error:e}=await supabase.auth.getSession()
  if(e||!session?.access_token)throw Error('LOGIN_REQUIRED')
  const response=await fetch(HOST+'/functions/v1/f16-paypal-supporter-v2-qa',{
   method:'POST',headers:{authorization:'Bearer '+session.access_token,
    apikey:config.key,'content-type':'application/json'},
   cache:'no-store',body:JSON.stringify(payload),
  })
  if(!response.ok)throw Error('QA_SERVER_UNAVAILABLE')
  if(acknowledgement)return response
  const result=await response.json() as Result
  if(!result|| (result.paidThrough!==null&&result.paidThrough!==undefined &&
    !Number.isFinite(Date.parse(result.paidThrough))) ||
    (result.mayGrantBenefits===true &&
      !(result.cycleVerified===true&&typeof result.paidThrough==='string')))
    throw Error('UNTRUSTED_QA_STATUS')
  return result
 }
 const refresh=async()=>{
  onAccountInspection?.('checking')
  setLoading(true);setError(false);setAccount(null)
  try {
   const result=await call({action:'list'}) as Result
   if(result.ok!==true||result.phase!=='V2_ACCOUNTS'||
      !Array.isArray(result.accounts)||result.accounts.length>1||
      result.accounts.some(a=>!INTENT.test(a.intentId||'')||
       !['pending','bound'].includes(a.state)||a.canDownloadAcceptance!==true))
    throw Error('UNTRUSTED_QA_LIST')
   const found=result.accounts[0]||null
   setAccount(found)
   onAccountInspection?.(found?.state||'none')
  }catch{setError(true);onAccountInspection?.('unavailable')}
  finally{setLoading(false)}
 }
 useEffect(()=>{
  // React Strict Mode reruns effects in local QA. Avoid duplicate admission checks.
  if(initialAccountCheck.current)return
  initialAccountCheck.current=true
  void refresh()
 },[])
 useEffect(()=>{
  // Explicit user-triggered review after an ambiguous or 409 checkout.
  // This action reads the existing account; it NEVER invokes begin.
  if(reviewRevision>0)void refresh()
 },[reviewRevision])
 const verifyPayment=async()=>{
  if(!account||account.state!=='bound'||busy)return
  setBusy(true);setError(false)
  try{
   const result=await call({action:'verify_payment'}) as Result
   if(result.ok!==true||result.code!=='verified_first_sandbox_cycle'||
      result.cycleVerified!==true||result.mayGrantBenefits!==true||
      typeof result.paidThrough!=='string')
    throw Error('NO_VERIFIED_SANDBOX_PAYMENT')
   setPaidThrough(result.paidThrough)
  }catch{setError(true)}finally{setBusy(false)}
 }
 const getStatus=async()=>{
  if(!account||account.state!=='bound'||busy)return
  setBusy(true);setError(false)
  try{
   // The existing v4 owner-scoped PayPal GET also verifies provider status.
   // Avoid the older cancellation-management status path.
   const result=await call({action:'resume_approval'}) as Result
   if(result.ok!==true||typeof result.phase!=='string'||
      !['APPROVAL_PENDING','APPROVED','ACTIVE','CANCELLED','EXPIRED','SUSPENDED'].includes(result.phase))
    throw Error('NO_MERCHANT_CONFIRMATION')
   setProviderStatus(result.phase)
   setRecoveryMessage(result.phase==='APPROVAL_PENDING'&&result.code==='approval_link_unavailable'
     ? 'unavailable':null)
   setCancelled(result.phase==='CANCELLED')
  }catch{setError(true)}finally{setBusy(false)}
 }
 const resumeApproval=async()=>{
  if(!account||account.state!=='bound'||busy)return
  setBusy(true);setError(false);setRecoveryMessage(null)
  try {
   const result=await call({action:'resume_approval'}) as Result
   if(result.ok!==true)throw Error('INVALID_QA_RESUME')
   if(result.phase==='APPROVAL_PENDING'&&result.code==='approval_can_resume'){
    const url=safeSandboxApprovalUrl(result.approvalUrl)
    if(!url)throw Error('UNTRUSTED_APPROVAL_LINK')
    window.location.assign(url)
    return
   }
   if(result.phase==='APPROVAL_PENDING'&&result.code==='approval_link_unavailable'){
    setProviderStatus('APPROVAL_PENDING')
    setRecoveryMessage('unavailable');return
   }
   if(typeof result.phase==='string'&&
      ['ACTIVE','APPROVED','CANCELLED','EXPIRED','SUSPENDED'].includes(result.phase)){
    setProviderStatus(result.phase);setRecoveryMessage('changed');return
   }
   throw Error('UNKNOWN_RECOVERY')
  }catch{setRecoveryMessage('failed')}
  finally{setBusy(false)}
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
    className="space-y-3 rounded-[24px] bg-white p-4 text-[#204E4A] shadow-[0_4px_16px_rgba(32,78,74,0.04)]">
   <h4 id="qa-v2-account-title" className="text-base font-black">
    {t('Estado de mi suscripción de prueba','My test subscription status')}
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
   <details className="space-y-2 rounded-2xl bg-[#F0F3ED] p-3"
     aria-label={t('Comparación de las cuatro insignias originales','Four original badges inspection')}>
     <summary className="min-h-11 cursor-pointer py-2 text-xs font-extrabold focus-visible:bg-[#E1E53F]/40">
       {t('Ver ejemplos de insignias','View badge examples')}
     </summary>
    <p className="text-xs font-semibold">
     {t('Revisión visual de archivos originales: estas muestras NO representan beneficios concedidos.',
      'Original artwork inspection only: these samples do NOT represent granted benefits.')}
    </p>
    <div className="grid grid-cols-4 gap-2">
     {([
      ['amigo-pazo-inicio.png',t('Inicio','Start')],
      ['amigo-pazo-3-meses.png',t('3 meses','3 months')],
      ['amigo-pazo-6-meses.png',t('6 meses','6 months')],
      ['amigo-pazo-12-meses.png',t('12 meses','12 months')],
     ] as const).map(([file,caption])=><div key={file} className="flex flex-col items-center gap-1">
      <img src={'/supporter/'+file} alt={caption} loading="lazy"
       className="h-[52px] w-[52px] object-contain"/>
      <span className="text-[10px] font-bold text-center">{caption}</span>
     </div>)}
    </div>
   </details>
   {account&&<div className="space-y-3">
     <p role="status" className="text-sm font-bold">
      {paidThrough
       ? t('Pago de prueba verificado para este período.', 'Test payment verified for this period.')
       : account.state==='pending'
       ? t('Solicitud registrada; no hay pago verificado.', 'Request recorded; no verified payment.')
       : t('Solicitud PayPal registrada. No se ha verificado un pago ni activado una membresía.', 'PayPal request recorded. No payment or membership has been verified.')}
     </p>
     {paidThrough&&<p role="status" className="rounded-2xl bg-[#E8EFEB] p-3 text-sm font-extrabold">
      {t('Período Sandbox verificado hasta: ','Sandbox period verified until: ')}
      {new Date(paidThrough).toLocaleDateString(lang==='es'?'es-US':'en-US')}
     </p>}
     {providerStatus&&<p role="status" className="text-sm">
      {t('Estado del proveedor: ','Provider status: ')}{providerStatus}
     </p>}
     {account.state==='bound'&&!paidThrough&&!cancelled&&
      (providerStatus===null||providerStatus==='APPROVAL_PENDING')&&
      <div className="space-y-2 rounded-2xl bg-[#EDF2E1] p-3">
       <p className="text-[12px] leading-relaxed text-[#204E4A]">
         {t('Puedes retomar tu solicitud anterior. PAZO consultará primero a PayPal y solo abrirá la aprobación si todavía está pendiente; no creará otra suscripción.',
           'You can continue the previous request. PAZO will first check PayPal and open approval only if it is still pending; it will not create another subscription.')}
       </p>
       <button type="button" className={button} onClick={()=>void resumeApproval()} disabled={busy}>
         {t('Retomar en PayPal','Continue in PayPal')}
       </button>
     </div>}
     {recoveryMessage&&<p role="status" className="rounded-2xl bg-[#FCE5D8] p-3 text-[12px] leading-relaxed text-[#204E4A]">
       {recoveryMessage==='unavailable'
         ? t('PayPal no devolvió el enlace original. No se creó otra solicitud; esta operación necesita recuperación controlada.',
             'PayPal did not return the original approval link. No new request was made; this operation requires controlled recovery.')
         : recoveryMessage==='changed'
           ? t('El estado de PayPal cambió. Comprueba el pago antes de intentar una operación nueva.',
               'PayPal status changed. Check payment before attempting a new operation.')
           : t('No pudimos recuperar la aprobación original. No se ha solicitado otro cobro.',
               'Could not recover the original approval. No other payment was requested.')}
     </p>}
     <div className="flex flex-wrap gap-2">
      <button type="button" className={button} onClick={()=>void download()} disabled={busy}>
       {t('Descargar aceptación V2','Download V2 acceptance')}
      </button>
      {account.state==='bound'&&<button type="button" className={button}
        onClick={()=>void verifyPayment()} disabled={busy}>
        {t('Verificar pago real Sandbox','Verify actual Sandbox payment')}
      </button>}
      {account.state==='bound'&&<button type="button" className={button}
        onClick={()=>void getStatus()} disabled={busy}>
        {t('Consultar PayPal Sandbox','Check PayPal Sandbox')}
      </button>}
      {account.state==='bound'&&['ACTIVE','SUSPENDED'].includes(providerStatus||'')&&!cancelled&&<button type="button" className={button}
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
