import {useCallback,useEffect,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {AdminGlyph} from './AdminVisuals'
import {AdminPaypalMfaStepUp} from './AdminPaypalMfaStepUp'
import {AdminPaypalMerchantBootstrap} from './AdminPaypalMerchantBootstrap'
import {AdminPaypalLiveResourceCheck} from './AdminPaypalLiveResourceCheck'
import {AdminPaypalLiveVaultSetup} from './AdminPaypalLiveVaultSetup'
import {AdminLiveReadiness} from './AdminLiveReadiness'
import {AdminLiveReleaseControl} from './AdminLiveReleaseControl'
import {AdminPaypalLiveConsole} from './AdminPaypalLiveConsole'
import {normalizePazoDraft,savePazoAdminDraftWithReadback} from '../paypalDraftSave.mjs'

type Env='sandbox'|'live'
type Config={
 environment:Env;plan_id:string;price_minor:number;currency:'USD';
 interval_unit:'MONTH';product_name:string;return_origin:string;webhook_id:string;
 client_id_stored:boolean;client_secret_stored:boolean;
 validation_status:'not_configured'|'not_verified'|'valid'|'invalid';
 edge_generation_verified?:boolean;
 validated_at:string|null;updated_at:string
}
type Settings={
 active_environment:Env;live_checkout_enabled:boolean;
 checkout_source:string;environments:Config[]
}
type Audit={environment:Env;kind:'draft'|'credentials'|'validation';recorded_at:string;actor:string;details:Record<string,unknown>}
type Props={lang:'es'|'en'}
// The inspected hosted Edge is still v3; do not present an inoperable control.
const LIVE_RESOURCE_INSPECTION_RELEASED=false
// Legacy Edge-secret provisioning stays locked. Current Live uses immutable
// Vault generations and independently verified server release controls.
const LIVE_EDGE_PROVISIONING_RELEASED=false
// The secret-staging Edge remains locked until CI + role security review.
const LIVE_VAULT_SETUP_RELEASED=true
// The generation reservation UI is not exposed until the Edge backend gets an explicit PO GO.
const LIVE_MERCHANT_BOOTSTRAP_RELEASED=true
const fieldClass='min-h-12 w-full rounded-[14px] bg-[#F5F8F1] px-4 py-3 text-[14px] font-semibold text-[#204E4A] placeholder:text-[#9BAD9D] focus-visible:bg-[#EFF5DC]'
const actionClass='min-h-11 rounded-[15px] bg-[#E1E53F] px-4 py-3 text-[13px] font-black text-[#204E4A] hover:bg-[#E9EF6A] disabled:opacity-50 disabled:cursor-not-allowed'
const cardClass='min-w-0 rounded-[22px] bg-white p-4 shadow-[0_7px_29px_rgba(32,78,74,.055)] sm:p-6'
function safeError(){return 'No fue posible completar la operación. Verifica tu sesión y vuelve a intentarlo.'}
export function AdminPayPalSettings({lang}:Props){
 const t=(es:string,en:string)=>lang==='es'?es:en
 const [env,setEnv]=useState<Env>('sandbox')
 const [recentAdminMfa,setRecentAdminMfa]=useState(false)
 const [advancedLive,setAdvancedLive]=useState(false)
 const [liveCredentialsStored,setLiveCredentialsStored]=useState<boolean|null>(null)
 const [liveReadinessRevision,setLiveReadinessRevision]=useState(0)
 const onLiveCredentialsObserved=useCallback((stored:boolean|null)=>setLiveCredentialsStored(stored),[])
 // A session may have aal2 for hours; PO actions require a fresh TOTP event.
 useEffect(()=>{
  if(!recentAdminMfa)return
  const timer=window.setTimeout(()=>setRecentAdminMfa(false),240000)
  return ()=>window.clearTimeout(timer)
 },[recentAdminMfa])
 const [settings,setSettings]=useState<Settings|null>(null)
 const [history,setHistory]=useState<Audit[]>([])
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [draftFeedback,setDraftFeedback]=useState<{state:'verified'|'rejected'|'uncertain';text:string}|null>(null)
 const [price,setPrice]=useState('2.99')
 const [plan,setPlan]=useState('')
 const [origin,setOrigin]=useState('')
 const [webhook,setWebhook]=useState('')
 const [clientId,setClientId]=useState('')
 const [clientSecret,setClientSecret]=useState('')
 const [legacyHealth,setLegacyHealth]=useState<'idle'|'checking'|'verified'|'unavailable'>('idle')
 const [liveResourceHealth,setLiveResourceHealth]=useState<'idle'|'checking'|'verified'|'unavailable'>('idle')
 const config=settings?.environments.find(x=>x.environment===env)
 const liveConfig=settings?.environments.find(x=>x.environment==='live')
 // Development origin is not a webhook destination or a public PayPal return URL.
 const localDevelopment=import.meta.env.DEV&&typeof window!=='undefined'&&
   ['localhost','127.0.0.1'].includes(window.location.hostname)
 // A PayPal OAuth success in Vault is not evidence that per-generation Edge
 // secrets have been provisioned, verified or pinned to the merchant.
 const liveOAuthReady=LIVE_EDGE_PROVISIONING_RELEASED&&liveConfig?.edge_generation_verified===true
 const livePlanStaged=Boolean(liveConfig?.plan_id&&/^P-[A-Za-z0-9]{10,75}$/.test(liveConfig.plan_id))
 const liveWebhookStaged=Boolean(liveConfig?.webhook_id)
 // Live credential status comes from the server, not stale draft/Edge flags.
 useEffect(()=>{
  if(env!=='live')return
  let active=true
  setLiveCredentialsStored(null)
  void (async()=>{
   try{
    const {data,error}=await supabase.rpc('pazo_admin_live_readiness')
    if(!active)return
    const v=data as {source?:unknown;checks?:{credentialsStored?:unknown}}|null
    setLiveCredentialsStored(!error&&v?.source==='pazo_live_admin_readiness_v1'&&
     typeof v.checks?.credentialsStored==='boolean'?v.checks.credentialsStored:null)
   }catch{if(active)setLiveCredentialsStored(null)}
  })()
  return ()=>{active=false}
 },[env,liveConfig?.updated_at,liveReadinessRevision])


 const load=useCallback(async(showLoading=true)=>{
  if(showLoading)setLoading(true)
  setError('')
  try{
   const [{data,error:dbError},{data:auditData}]=await Promise.all([
    supabase.rpc('pazo_admin_paypal_settings'),
    supabase.rpc('pazo_admin_paypal_audit')
   ])
   if(dbError||!data||!Array.isArray((data as Settings).environments))
    throw Error('no data')
   setSettings(data as Settings)
   setHistory(Array.isArray(auditData)?(auditData as Audit[]):[])
  }catch{setError(safeError())}
  finally{if(showLoading)setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{
  if(!config)return
  setPrice((config.price_minor/100).toFixed(2))
  setPlan(config.plan_id)
  setOrigin(config.return_origin)
  setWebhook(config.webhook_id)
  setClientId('')
  setClientSecret('')
  setNotice('')
 },[env,config?.updated_at,config?.environment])
 const saveDraft=async()=>{
  const draft=normalizePazoDraft({environment:env,price,planId:plan,origin,webhookId:webhook})
  if(!draft){
   setDraftFeedback({state:'rejected',text:t(
    'No se guardó. Verifica precio, dominio HTTPS sin rutas y los identificadores opcionales de PayPal.',
    'Not saved. Verify price, HTTPS domain without paths and optional PayPal IDs.')})
   return
  }
  setBusy(true);setError('');setNotice('');setDraftFeedback(null)
  try{
   const outcome=await savePazoAdminDraftWithReadback({
    draft,
    write:values=>supabase.rpc('pazo_admin_paypal_save_draft',values),
    read:()=>supabase.rpc('pazo_admin_paypal_settings')
   })
   if(outcome.state==='verified'&&outcome.settings){
    setSettings(outcome.settings as Settings)
    try{
     const {data:auditData}=await supabase.rpc('pazo_admin_paypal_audit')
     if(Array.isArray(auditData))setHistory(auditData as Audit[])
    }catch{
     // The persisted draft is still verified even if audit display reload fails.
    }
    setDraftFeedback({state:'verified',text:t(
     'Borrador guardado y verificado en Supabase. No modifica cobros actuales.',
     'Draft saved and verified in Supabase. Current checkout is unchanged.')})
   }else if(outcome.state==='uncertain'){
    setDraftFeedback({state:'uncertain',text:t(
     'El guardado pudo efectuarse, pero no fue posible comprobarlo. Recarga antes de volver a intentarlo. Referencia: '+outcome.code,
     'Save may have occurred but could not be confirmed. Reload before retrying. Reference: '+outcome.code)})
   }else{
    setDraftFeedback({state:'rejected',text:t(
     'Supabase no guardó el borrador. Comprueba tu sesión. Referencia: '+outcome.code,
     'Supabase did not save the draft. Check your session. Reference: '+outcome.code)})
   }
  }catch{
   setDraftFeedback({state:'rejected',text:t(
    'No se pudo completar la operación. Comprueba tu sesión y tu conexión.',
    'Could not complete the operation. Check your session and connection.')})
  }finally{setBusy(false)}
 }
 const saveCredentials=async()=>{
  // The legacy Vault is NOT the F16 Edge secrets store. Block the LIVE path
  // even when invoked by a stale UI, not only by the visible disabled control.
  if(env==='live'){
   setClientId('');setClientSecret('')
   setError(t('Live usa aprovisionamiento privado; Vault está deshabilitado para claves Live.',
    'Live uses private provisioning; Vault is disabled for Live keys.'))
   return
  }
  if(!/^[A-Za-z0-9_-]{20,256}$/.test(clientId.trim())||
     !/^[A-Za-z0-9_-]{20,512}$/.test(clientSecret.trim())){
   setError(t('Introduce ambas credenciales completas de PayPal.','Enter both complete PayPal credentials.'));return
  }
  setBusy(true);setError('');setNotice('')
  try{
   const {data,error:dbError}=await supabase.rpc('pazo_admin_paypal_save_credentials',{
    p_environment:env,p_client_id:clientId.trim(),p_client_secret:clientSecret.trim()
   })
   if(dbError||data!==true)throw Error('could not store')
   setClientId('');setClientSecret('')
   setNotice(t('Credenciales cifradas y guardadas. Comprueba la conexión.','Encrypted credentials stored. Verify the connection.'))
   await load()
  }catch{setError(safeError())}finally{setBusy(false)}
 }
 const inspectExistingSandbox=async()=>{
  setLegacyHealth('checking');setError('');setNotice('')
  try{
   const {data,error:fnError}=await supabase.functions.invoke('pazo-admin-paypal-validate',{
    body:{environment:'sandbox',action:'inspect_active_sandbox'}
   })
   if(fnError||data?.ok!==true||data?.code!=='legacy_gateway_oauth_valid'||
      data?.source!=='edge_legacy'||data?.environment!=='sandbox'||
      data?.changes_checkout!==false||data?.live_checkout_enabled!==false)
    throw Error('legacy unavailable')
   setLegacyHealth('verified')
  }catch{setLegacyHealth('unavailable')}
 }
 const inspectLiveResources=async()=>{
  if(!LIVE_RESOURCE_INSPECTION_RELEASED||env!=='live')return
  setLiveResourceHealth('checking')
  try{
   const {data,error:fnError}=await supabase.functions.invoke('pazo-admin-paypal-validate',{
    body:{environment:'live',action:'inspect_live_resources'}
   })
   if(fnError||data?.ok!==true||data?.code!=='live_resources_read_verified'||
    data?.mayCharge!==false||data?.mayActivate!==false||
    data?.live_checkout_enabled!==false||data?.changes_checkout!==false)
    throw Error('resources not yet verified')
   setLiveResourceHealth('verified')
  }catch{setLiveResourceHealth('unavailable')}
 }
 const validateCredentials=async()=>{
  if(env==='live'){
   setError(t('La verificación Live se realizará en el nuevo canal privado.',
    'Live verification will run through the new private channel.'))
   return
  }
  setBusy(true);setError('');setNotice('')
  try{
   const {data,error:fnError}=await supabase.functions.invoke('pazo-admin-paypal-validate',{
    body:{environment:env}
   })
   if(fnError||!data?.ok)throw Error('validation failed')
   setNotice(t('Conexión OAuth verificada. No se inició ningún pago.','OAuth connection verified. No payment was started.'))
   await load()
  }catch{setError(t('No fue posible verificar las credenciales. Comprueba el entorno y las claves.','Could not verify credentials. Check the environment and keys.'))}
  finally{setBusy(false)}
 }
 const liveContent = <div data-pazo-paypal-admin="true" className="mx-auto max-w-[780px] space-y-3 pb-8">
  <nav aria-label={t('Entorno PayPal','PayPal environment')}
   className="flex gap-1 rounded-[18px] bg-[#F2F6EE] p-1">
   <button type="button" onClick={()=>{setEnv('sandbox');setRecentAdminMfa(false)}}
    className="min-h-11 flex-1 rounded-[14px] px-4 text-[13px] font-bold text-[#6F8479]">Sandbox</button>
   <button type="button" aria-current="page"
    className="min-h-11 flex-1 rounded-[14px] bg-white px-4 text-[13px] font-black text-[#204E4A] shadow-sm">
    PayPal Live</button>
  </nav>
  <AdminPaypalLiveConsole lang={lang} config={liveConfig??null} loading={loading}
   error={error} credentialsStored={liveCredentialsStored===true}
   credentialsChecked={liveCredentialsStored!==null} mfaRecentlyVerified={recentAdminMfa}
   onVerifyMfa={()=>setRecentAdminMfa(true)}
   onStored={()=>{setLiveCredentialsStored(true);setLiveReadinessRevision(n=>n+1);void load(false)}}
   onChanged={()=>{setLiveReadinessRevision(n=>n+1);void load(false)}}
   history={history.filter(a=>a.environment==='live')}/>
 </div>
 const sandboxContent = <div className="space-y-4 pb-8" data-pazo-paypal-admin="true">
  <div className={cardClass}>
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h3 className="text-[20px] font-black tracking-tight">{t('Pasarela PayPal','PayPal gateway')}</h3>
     <p className="mt-1 text-[13px] font-medium text-[#6E8379]">{t('Configuración privada de pruebas y producción.','Private test and production settings.')}</p>
    </div>
    <span className="rounded-full bg-[#E7F2DB] px-3 py-2 text-[12px] font-black text-[#25684A]">{settings?.active_environment==='live'&&settings.live_checkout_enabled?t('Live activo','Live active'):t('Sandbox activo','Sandbox active')}</span>
   </div>
   <div className="mt-5 grid grid-cols-2 gap-2 rounded-[16px] bg-[#F2F6EE] p-1.5" role="group" aria-label={t('Entorno','Environment')}>
    {(['sandbox','live'] as const).map(value=><button type="button" key={value} aria-pressed={env===value}
      disabled={busy} onClick={()=>{setEnv(value);setClientId('');setClientSecret('');setRecentAdminMfa(false);setDraftFeedback(null)}} className={'min-h-12 rounded-[13px] px-3 text-[14px] font-black '+(env===value?'bg-white text-[#204E4A] shadow-sm':'text-[#73877D]')}>
      {value==='sandbox'?'Sandbox': 'Live · '+(settings?.active_environment==='live'&&settings.live_checkout_enabled?t('activo','active'):t('preparación','staging'))}
    </button>)}
   </div>
   <p className="mt-3 text-[12px] leading-relaxed text-[#74877D]">
    {env==='sandbox'
      ?t('Estamos desarrollando y probando en Sandbox. La app puede permanecer en localhost; los webhooks llegan a Supabase por HTTPS. Los datos nuevos del panel aún no cambian el checkout.', 'We are developing and testing in Sandbox. The app can remain on localhost; webhooks reach Supabase through HTTPS. New panel settings do not yet change checkout.')
      :t('La integración Live debe quedar completamente implementada antes de la beta. Cuando este panel habilite la operación, podrás guardar y activar credenciales antes o después del lanzamiento, únicamente tras verificar HTTPS público, comercio, plan, webhook y cobros.', 'Live integration must be fully implemented before the beta. Once this panel releases the operation, you can save and activate credentials before or after launch, only after public HTTPS, merchant, plan, webhook and payments are verified.')}
   </p>
  </div>
  {loading?<div role="status" className={cardClass}>{t('Leyendo configuración privada…','Loading private configuration…')}</div>:
   <>
    {error&&<p role="alert" className="rounded-[16px] bg-[#FAEDE7] px-4 py-3 text-[13px] font-semibold text-[#8B4737]">{error}</p>}
    {notice&&<p role="status" className="rounded-[16px] bg-[#EAF4E4] px-4 py-3 text-[13px] font-semibold text-[#296F50]">{notice}</p>}
    <section className={cardClass} aria-label={t('Etapas del lanzamiento de PayPal','PayPal launch stages')}>
      <h4 className="text-[17px] font-black">{t('Desarrollo local y lanzamiento','Local development and launch')}</h4>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-[15px] bg-[#EFF5E5] px-4 py-3">
          <p className="text-[13px] font-extrabold">{t('1. Desarrollo', '1. Development')}</p>
          <p className="mt-1 text-[12px] text-[#5D756A]">{localDevelopment
            ?t('Localhost · Sandbox activo','Localhost · Sandbox active')
            :t('Sandbox · entorno de pruebas','Sandbox · testing environment')}</p>
        </div>
        <div className="rounded-[15px] bg-[#F4F6EC] px-4 py-3">
          <p className="text-[13px] font-extrabold">{t('2. Preparar Live','2. Prepare Live')}</p>
          <p className="mt-1 text-[12px] text-[#5D756A]">{t('Guardar y comprobar credenciales, plan y webhook sin cobrar.', 'Stage and verify credentials, plan and webhook without charging.')}</p>
        </div>
        <div className="rounded-[15px] bg-[#F7F6EF] px-4 py-3">
          <p className="text-[13px] font-extrabold">{t('3. Verificar y activar','3. Verify and activate')}</p>
          <p className="mt-1 text-[12px] text-[#5D756A]">{t('Verificar HTTPS, recursos PayPal y activar con autorización; sin depender de fecha de beta.', 'Verify HTTPS and PayPal resources, then explicitly activate; independent of beta date.')}</p>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-[#6B8077]">
       {t('No necesitas un dominio propio ahora. Localhost es solo la interfaz de desarrollo, no un endpoint público de webhooks. La URL HTTPS del retorno de las pruebas sigue administrada por el checkout Sandbox existente hasta su migración segura.',
          'No custom domain is needed now. Localhost is only the development interface, not a public webhook endpoint. The existing Sandbox checkout continues to manage the HTTPS return URL until a safe migration.')}
      </p>
    </section>
    {env==='live'&&
     <AdminPaypalMfaStepUp lang={lang} onVerified={()=>{setRecentAdminMfa(true);setNotice(t(
       'Código MFA comprobado. El servidor validará nuevamente la sesión para autorizar credenciales.',
       'MFA checked. The server will independently validate the session before allowing credentials.'))}}/>}
    {env==='live'&&<details className={cardClass} onToggle={event=>setAdvancedLive(event.currentTarget.open)}>
     <summary className="min-h-11 cursor-pointer rounded-[14px] px-2 py-3 text-[13px] font-black outline-none focus-visible:bg-[#EFF5DC]">
      {t('Configuración inicial y diagnóstico','Initial setup and diagnostics')}</summary>
     <p className="mt-2 text-[12px] text-[#627970]">{t('Plan, webhook y generación ya preparados no necesitan repetirse para guardar las claves.',
      'An already prepared plan, webhook and generation do not need to be repeated to store keys.')}</p>
     {advancedLive&&<div className="mt-3 space-y-3">
    {env==='live'&&LIVE_MERCHANT_BOOTSTRAP_RELEASED&&
     <AdminPaypalMerchantBootstrap lang={lang} mfaRecentlyVerified={recentAdminMfa}/>}
    {env==='live'&&<AdminPaypalLiveResourceCheck lang={lang}
     mfaRecentlyVerified={recentAdminMfa} onVerified={()=>load(false)}/>}
     </div>}
    </details>}
    {env==='live'&&LIVE_VAULT_SETUP_RELEASED&&<AdminPaypalLiveVaultSetup
     lang={lang} mfaRecentlyVerified={recentAdminMfa}
     credentialsStored={liveCredentialsStored===true} credentialsChecked={liveCredentialsStored!==null}
     onStored={()=>{setLiveCredentialsStored(true);setLiveReadinessRevision(n=>n+1);void load(false)}}/>}
    {env==='live'&&<AdminLiveReadiness lang={lang}
     revision={String(liveConfig?.updated_at??'')+':'+liveReadinessRevision}
     onCredentialsObserved={onLiveCredentialsObserved}/>}

    {env==='live'&&<section className="rounded-[18px] bg-[#F2F7E9] p-4 text-[#204E4A]"
     data-pazo-merchant-balance-check="not-required">
      <h4 className="text-[15px] font-black">{t(
       'Identidad comercial y cobros Live','Live merchant identity and payments')}</h4>
      <p className="mt-2 text-[12px] leading-relaxed">{t(
       'La lectura de saldos de PayPal no es un requisito para cobrar suscripciones. No vuelvas a ingresar las claves para esa prueba. La preparación y la activación se consultan en los controles seguros de este panel. Guardar claves no autoriza cobros.',
       'PayPal balance read permission is not required to charge subscriptions. Do not re-enter credentials for that check. Preparation and activation are reported by the secure controls in this panel. Saving keys does not authorize payments.')}</p>
     </section>}
    {env==='live'&&LIVE_RESOURCE_INSPECTION_RELEASED&&<section className={cardClass}>
      <h4 className="text-[17px] font-black">{t('Lectura de recursos PayPal Live','Read Live PayPal resources')}</h4>
      <p className="mt-2 text-[12px] text-[#6B8077]">
       {t('Solo lee plan y webhook en PayPal. No prueba entrega real, no crea compras ni activa Live.',
        'Only reads PayPal plan and webhook. Does not prove delivery, create purchases or activate Live.')}
      </p>
      <button type="button" className={'mt-3 '+actionClass}
       disabled={busy||liveResourceHealth==='checking'||!liveOAuthReady||!livePlanStaged||!liveWebhookStaged}
       onClick={()=>void inspectLiveResources()}>
       {t('Comprobar recursos Live','Check Live resources')}
      </button>
      <p role="status" className="mt-2 text-[12px] font-semibold">
       {liveResourceHealth==='verified'?
        t('Plan y webhook verificados por lectura. Cobros Live apagados.','Plan and webhook read. Live charges OFF.'):
        liveResourceHealth==='unavailable'?
        t('No se verificaron los recursos Live.','Live resources could not be verified.'):
        t('Este control no habilita cobros.','This control never enables charges.')}
      </p>
    </section>}
    {env==='sandbox'&&<section className={cardClass} aria-label={t('Pasarela Sandbox actual','Current Sandbox gateway')}>
     <h4 className="text-[17px] font-black">{t('Pasarela Sandbox en uso','Current Sandbox gateway')}</h4>
     <p className="mt-2 text-[13px] leading-relaxed text-[#667E71]">
      {t('Los cobros de prueba existentes utilizan secretos privados de Supabase Edge Functions. No necesitas copiarlos a Vault ni volver a ingresarlos. Los campos inferiores preparan una configuración nueva y todavía no sustituyen el checkout.',
        'Existing test payments use private Supabase Edge Function secrets. You do not need to copy them to Vault or enter them again. The fields below stage a new configuration and do not yet replace checkout.')}
     </p>
     <div className="mt-3 flex flex-wrap items-center gap-3">
      <button type="button" onClick={()=>void inspectExistingSandbox()}
        disabled={legacyHealth==='checking'}
        className={actionClass}>{legacyHealth==='checking'?t('Comprobando…','Checking…'):t('Comprobar Sandbox en uso','Check active Sandbox')}</button>
      <p role="status" className="text-[13px] font-semibold text-[#527067]">
       {legacyHealth==='verified'?t('OAuth del Sandbox existente: verificado. No se realizaron cobros.','Existing Sandbox OAuth: verified. No payment was made.'):
        legacyHealth==='unavailable'?t('No se pudo verificar la conexión actual. El checkout existente no se modificó.','Unable to verify the current connection. Existing checkout was not changed.'):
        t('Comprobación de solo lectura, sin cambiar credenciales ni suscripciones.','Read-only check; no changes to credentials or subscriptions.')}
      </p>
     </div>
    </section>}
    {env==='sandbox'&&<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
     <section className={cardClass}>
      <div className="flex items-center gap-3"><span className="rounded-full bg-[#E7F4E2] p-3"><AdminGlyph name="money" size={23}/></span>
       <div><h4 className="text-[17px] font-black">{t('Oferta y dominio','Offer and domain')}</h4>
        <p className="text-[12px] text-[#768980]">{t('Preparar el siguiente plan sin cambiar el actual','Prepare the next plan without changing the current one')}</p></div>
      </div>
      <div className="mt-5 grid gap-4">
       <label className="block text-[13px] font-bold">{t('Precio mensual (USD)','Monthly price (USD)')}
        <input type="number" min="0.99" max="1000" step="0.01" value={price} onChange={e=>{setPrice(e.target.value);setDraftFeedback(null)}} className={'mt-2 '+fieldClass}/></label>
       <label className="block text-[13px] font-bold">{t('ID del plan en PayPal','PayPal plan ID')}
        <input value={plan} onChange={e=>{setPlan(e.target.value);setDraftFeedback(null)}} placeholder="P-..." className={'mt-2 '+fieldClass} autoComplete="off"/></label>
       <label className="block text-[13px] font-bold">{t('Dominio oficial de la beta (se puede dejar vacío)', 'Official beta domain (can be left blank)')}
        <input type="url" value={origin} onChange={e=>{setOrigin(e.target.value);setDraftFeedback(null)}} placeholder="https://..." className={'mt-2 '+fieldClass} autoComplete="off"/>
        <span className="mt-1 block text-[11px] font-medium text-[#86978F]">{t('No escribas localhost aquí. Este campo acepta únicamente una URL HTTPS pública, incluso antes de publicar la beta; las rutas de retorno las genera el servidor.', 'Do not enter localhost here. This field accepts only a public HTTPS origin, even before beta is published; the server generates return paths.')}</span></label>
       <label className="block text-[13px] font-bold">{t('ID del webhook PayPal','PayPal webhook ID')}
        <input value={webhook} onChange={e=>{setWebhook(e.target.value);setDraftFeedback(null)}} placeholder="..." className={'mt-2 '+fieldClass} autoComplete="off"/></label>
      </div>
      <button type="button" className={'mt-5 w-full '+actionClass} onClick={()=>void saveDraft()} disabled={busy}>{busy?t('Guardando…','Saving…'):t('Guardar borrador','Save draft')}</button>
      {draftFeedback&&<p data-pazo-draft-result role={draftFeedback.state==='verified'?'status':'alert'} aria-live="polite"
       className={'mt-3 rounded-[14px] px-4 py-3 text-[13px] font-semibold '+(draftFeedback.state==='verified'?'bg-[#EAF4E4] text-[#296F50]':'bg-[#FAEDE7] text-[#8B4737]')}>
       {draftFeedback.text}
      </p>}
     </section>
     <section className={cardClass}>
      <div className="flex items-center gap-3"><span className="rounded-full bg-[#FFF1D8] p-3"><AdminGlyph name="settings" size={23}/></span>
       <div><h4 className="text-[17px] font-black">{t('Credenciales privadas','Private credentials')}</h4>
        <p className="text-[12px] text-[#768980]">{t('Cifradas en Supabase Vault','Encrypted in Supabase Vault')}</p></div>
      </div>
      {env==='sandbox'?      <div className="mt-5 space-y-3">
       <p className="rounded-[14px] bg-[#F0F5E9] px-4 py-3 text-[12px] font-semibold text-[#466C5B]">
        {config?.client_id_stored&&config.client_secret_stored?
         t('Se guardaron credenciales para este entorno. Nunca se muestran de nuevo.','Credentials are stored for this environment. They are never displayed again.'):
         t('Este módulo todavía no tiene credenciales guardadas en Vault. Las del Sandbox actual siguen en Edge Functions.','No credentials are stored in this module’s Vault yet. Current Sandbox credentials remain in Edge Functions.')}
       </p>
       <label className="block text-[13px] font-bold">Client ID
        <input value={clientId} onChange={e=>setClientId(e.target.value)} type="password" autoComplete="off" spellCheck={false} className={'mt-2 '+fieldClass} placeholder={t('Pega el Client ID','Paste Client ID')}/></label>
       <label className="block text-[13px] font-bold">Client Secret
        <input value={clientSecret} onChange={e=>setClientSecret(e.target.value)} type="password" autoComplete="new-password" spellCheck={false} className={'mt-2 '+fieldClass} placeholder={t('Pega el Client Secret','Paste Client Secret')}/></label>
       <button type="button" onClick={()=>void saveCredentials()} disabled={busy||!clientId||!clientSecret}
        className={'w-full '+actionClass}>{t('Guardar nuevas credenciales en Vault','Store new credentials in Vault')}</button>
       <button type="button" onClick={()=>void validateCredentials()} disabled={busy||!config?.client_id_stored||!config.client_secret_stored}
        className="min-h-11 w-full rounded-[15px] bg-[#E9F1E5] px-4 py-3 text-[13px] font-black hover:bg-[#DFEACC] disabled:opacity-50">
        {t('Comprobar conexión PayPal','Verify PayPal connection')}
       </button>
       <div className="rounded-[14px] bg-[#F8F9F4] p-3 text-[12px] font-semibold text-[#61786F]">
        {t('Validación OAuth: ','OAuth verification: ')}
        {config?.validation_status==='valid'?t('Verificada','Verified'):
         config?.validation_status==='invalid'?t('Rechazada','Rejected'):
         t('Pendiente','Pending')}
        {config?.validated_at&&<span className="mt-1 block text-[11px]">{new Date(config.validated_at).toLocaleString()}</span>}
       </div>
      </div>:<div className="mt-5 rounded-[14px] bg-[#F0F5E9] px-4 py-4 text-[13px] font-semibold text-[#466C5B]" data-pazo-live-vault-locked="true">
       {t('Las credenciales Live se guardan cifradas mediante el formulario privado de abajo, después de comprobar MFA. El checkout sigue apagado hasta superar la validación financiera.',
         'Use the private form below to store encrypted PayPal Live credentials after fresh MFA. Checkout remains OFF pending financial release.')}
      </div>}
     </section>
    </div>}
    <section className={cardClass}>
     <h4 className="text-[17px] font-black">{t('Historial de configuración','Configuration history')}</h4>
     <p className="mt-1 text-[12px] text-[#74877D]">{t('Últimos 30 cambios, sin mostrar credenciales ni secretos.','Last 30 changes, without displaying secrets or credentials.')}</p>
     <div className="mt-4 space-y-2">
      {history.length===0?<p className="text-[13px] text-[#7A8C83]">{t('Todavía no hay cambios registrados.','No changes recorded yet.')}</p>:
       history.map((item,i)=><div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-[#F5F8F1] p-3 text-[12px]">
        <div><strong className="capitalize text-[#204E4A]">{item.environment} · {item.kind==='draft'?t('Borrador','Draft'):item.kind==='credentials'?t('Credenciales','Credentials'):t('Validación','Validation')}</strong>
         <p className="mt-1 text-[#7A8A7F]">{t('Administrador ','Administrator ')}{item.actor}</p></div>
        <span className="font-semibold text-[#688078]">{new Date(item.recorded_at).toLocaleString(lang==='es'?'es-US':'en-US')}</span>
       </div>)}
     </div>
    </section>
    {env==='live'&&<AdminLiveReleaseControl lang={lang} mfaRecentlyVerified={recentAdminMfa}
     revision={liveConfig?.updated_at} onChanged={()=>void load(false)}/>}
   </>}
 </div>
 return env==='live'?liveContent:sandboxContent
}
