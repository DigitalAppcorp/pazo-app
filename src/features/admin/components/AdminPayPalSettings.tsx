import {useCallback,useEffect,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {AdminGlyph} from './AdminVisuals'

type Env='sandbox'|'live'
type Config={
 environment:Env;plan_id:string;price_minor:number;currency:'USD';
 interval_unit:'MONTH';product_name:string;return_origin:string;webhook_id:string;
 client_id_stored:boolean;client_secret_stored:boolean;
 validation_status:'not_configured'|'not_verified'|'valid'|'invalid';
 validated_at:string|null;updated_at:string
}
type Settings={
 active_environment:'sandbox';live_checkout_enabled:false;
 checkout_source:string;environments:Config[]
}
type Audit={environment:Env;kind:'draft'|'credentials'|'validation';recorded_at:string;actor:string;details:Record<string,unknown>}
type Props={lang:'es'|'en'}
const fieldClass='min-h-12 w-full rounded-[14px] bg-[#F5F8F1] px-4 py-3 text-[14px] font-semibold text-[#204E4A] placeholder:text-[#9BAD9D] focus-visible:bg-[#EFF5DC]'
const actionClass='min-h-11 rounded-[15px] bg-[#E1E53F] px-4 py-3 text-[13px] font-black text-[#204E4A] hover:bg-[#E9EF6A] disabled:opacity-50 disabled:cursor-not-allowed'
const cardClass='min-w-0 rounded-[22px] bg-white p-4 shadow-[0_7px_29px_rgba(32,78,74,.055)] sm:p-6'
function safeError(){return 'No fue posible completar la operación. Verifica tu sesión y vuelve a intentarlo.'}
export function AdminPayPalSettings({lang}:Props){
 const t=(es:string,en:string)=>lang==='es'?es:en
 const [env,setEnv]=useState<Env>('sandbox')
 const [settings,setSettings]=useState<Settings|null>(null)
 const [history,setHistory]=useState<Audit[]>([])
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [price,setPrice]=useState('2.99')
 const [plan,setPlan]=useState('')
 const [origin,setOrigin]=useState('')
 const [webhook,setWebhook]=useState('')
 const [clientId,setClientId]=useState('')
 const [clientSecret,setClientSecret]=useState('')
 const config=settings?.environments.find(x=>x.environment===env)
 const load=useCallback(async()=>{
  setLoading(true);setError('')
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
  finally{setLoading(false)}
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
  const cents=Math.round(Number(price)*100)
  if(!Number.isFinite(cents)||cents<99||cents>100000){
   setError(t('Precio inválido.','Invalid price.'));return
  }
  if(plan.trim()&&!/^P-[A-Za-z0-9]{10,75}$/.test(plan.trim())){
   setError(t('El identificador del plan no es válido.','The plan ID is invalid.'));return
  }
  if(origin.trim()&&!/^https:\/\/[a-z0-9][a-z0-9.-]{1,240}(:443)?$/.test(origin.trim().toLowerCase())){
   setError(t('Escribe solo el dominio HTTPS, sin rutas ni parámetros.','Enter only an HTTPS origin, without paths or query parameters.'));return
  }
  setBusy(true);setError('');setNotice('')
  try{
   const {data,error:dbError}=await supabase.rpc('pazo_admin_paypal_save_draft',{
    p_environment:env,p_plan_id:plan.trim(),p_price_minor:cents,
    p_return_origin:origin.trim().toLowerCase(),p_webhook_id:webhook.trim()
   })
   if(dbError||data!==true)throw Error('could not save')
   setNotice(t('Borrador guardado. No modifica cobros actuales.','Draft saved. Current checkout is unchanged.'))
   await load()
  }catch{setError(safeError())}finally{setBusy(false)}
 }
 const saveCredentials=async()=>{
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
 const validateCredentials=async()=>{
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
 return <div className="space-y-4 pb-8" data-pazo-paypal-admin="true">
  <div className={cardClass}>
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h3 className="text-[20px] font-black tracking-tight">{t('Pasarela PayPal','PayPal gateway')}</h3>
     <p className="mt-1 text-[13px] font-medium text-[#6E8379]">{t('Configuración privada de pruebas y producción.','Private test and production settings.')}</p>
    </div>
    <span className="rounded-full bg-[#E7F2DB] px-3 py-2 text-[12px] font-black text-[#25684A]">{t('Sandbox activo','Sandbox active')}</span>
   </div>
   <div className="mt-5 grid grid-cols-2 gap-2 rounded-[16px] bg-[#F2F6EE] p-1.5" role="group" aria-label={t('Entorno','Environment')}>
    {(['sandbox','live'] as const).map(value=><button type="button" key={value} aria-pressed={env===value}
      onClick={()=>setEnv(value)} className={'min-h-12 rounded-[13px] px-3 text-[14px] font-black '+(env===value?'bg-white text-[#204E4A] shadow-sm':'text-[#73877D]')}>
      {value==='sandbox'?'Sandbox': 'Live · '+t('preparación','staging')}
    </button>)}
   </div>
   <p className="mt-3 text-[12px] leading-relaxed text-[#74877D]">
    {env==='sandbox'
      ?t('Las pruebas actuales siguen usando la pasarela Sandbox ya instalada. Los cambios de este panel son borradores hasta conectar el nuevo gestor de cobros.','Current tests still use the existing Sandbox gateway. These settings are staged until the new checkout runtime is connected.')
      :t('Puedes preparar Live y validar las credenciales. Activar cobros reales está bloqueado hasta comprobar los planes, webhooks, retorno y conciliación.','You can stage Live and verify credentials. Live charging stays disabled until plans, webhooks, redirects and reconciliation pass the release gate.')}
   </p>
  </div>
  {loading?<div role="status" className={cardClass}>{t('Leyendo configuración privada…','Loading private configuration…')}</div>:
   <>
    {error&&<p role="alert" className="rounded-[16px] bg-[#FAEDE7] px-4 py-3 text-[13px] font-semibold text-[#8B4737]">{error}</p>}
    {notice&&<p role="status" className="rounded-[16px] bg-[#EAF4E4] px-4 py-3 text-[13px] font-semibold text-[#296F50]">{notice}</p>}
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
     <section className={cardClass}>
      <div className="flex items-center gap-3"><span className="rounded-full bg-[#E7F4E2] p-3"><AdminGlyph name="money" size={23}/></span>
       <div><h4 className="text-[17px] font-black">{t('Oferta y dominio','Offer and domain')}</h4>
        <p className="text-[12px] text-[#768980]">{t('Preparar el siguiente plan sin cambiar el actual','Prepare the next plan without changing the current one')}</p></div>
      </div>
      <div className="mt-5 grid gap-4">
       <label className="block text-[13px] font-bold">{t('Precio mensual (USD)','Monthly price (USD)')}
        <input type="number" min="0.99" max="1000" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} className={'mt-2 '+fieldClass}/></label>
       <label className="block text-[13px] font-bold">{t('ID del plan en PayPal','PayPal plan ID')}
        <input value={plan} onChange={e=>setPlan(e.target.value)} placeholder="P-..." className={'mt-2 '+fieldClass} autoComplete="off"/></label>
       <label className="block text-[13px] font-bold">{t('Dominio oficial de la app','Official app origin')}
        <input type="url" value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="https://..." className={'mt-2 '+fieldClass} autoComplete="off"/>
        <span className="mt-1 block text-[11px] font-medium text-[#86978F]">{t('Solo dominio HTTPS; las rutas de retorno se generan en el servidor.','HTTPS origin only; callback paths are generated server-side.')}</span></label>
       <label className="block text-[13px] font-bold">{t('ID del webhook PayPal','PayPal webhook ID')}
        <input value={webhook} onChange={e=>setWebhook(e.target.value)} placeholder="..." className={'mt-2 '+fieldClass} autoComplete="off"/></label>
      </div>
      <button type="button" className={'mt-5 w-full '+actionClass} onClick={()=>void saveDraft()} disabled={busy}>{t('Guardar borrador','Save draft')}</button>
     </section>
     <section className={cardClass}>
      <div className="flex items-center gap-3"><span className="rounded-full bg-[#FFF1D8] p-3"><AdminGlyph name="settings" size={23}/></span>
       <div><h4 className="text-[17px] font-black">{t('Credenciales privadas','Private credentials')}</h4>
        <p className="text-[12px] text-[#768980]">{t('Cifradas en Supabase Vault','Encrypted in Supabase Vault')}</p></div>
      </div>
      <div className="mt-5 space-y-3">
       <p className="rounded-[14px] bg-[#F0F5E9] px-4 py-3 text-[12px] font-semibold text-[#466C5B]">
        {config?.client_id_stored&&config.client_secret_stored?
         t('Se guardaron credenciales para este entorno. Nunca se muestran de nuevo.','Credentials are stored for this environment. They are never displayed again.'):
         t('Todavía no hay un par de credenciales guardado.','No credential pair has been stored yet.')}
       </p>
       <label className="block text-[13px] font-bold">Client ID
        <input value={clientId} onChange={e=>setClientId(e.target.value)} type="password" autoComplete="off" spellCheck={false} className={'mt-2 '+fieldClass} placeholder={t('Pega el Client ID','Paste Client ID')}/></label>
       <label className="block text-[13px] font-bold">Client Secret
        <input value={clientSecret} onChange={e=>setClientSecret(e.target.value)} type="password" autoComplete="new-password" spellCheck={false} className={'mt-2 '+fieldClass} placeholder={t('Pega el Client Secret','Paste Client Secret')}/></label>
       <button type="button" onClick={()=>void saveCredentials()} disabled={busy||!clientId||!clientSecret}
        className={'w-full '+actionClass}>{t('Guardar credenciales cifradas','Store encrypted credentials')}</button>
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
      </div>
     </section>
    </div>
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
    <section className={cardClass}>
     <h4 className="text-[17px] font-black">{t('Activación de producción','Production activation')}</h4>
     <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-[690px] text-[13px] leading-relaxed text-[#667E71]">
       {t('Live está desactivado. Guardar credenciales o cambiar el precio NO activa cobros reales. Antes se deben verificar el plan Live, webhook, dominio público, cancelación, renovación y conciliación contable.',
         'Live is disabled. Storing credentials or editing prices DOES NOT enable real charges. The Live plan, webhook, public origin, cancellation, renewal and reconciliation must pass verification first.')}
      </p>
      <button type="button" disabled aria-disabled="true" className="min-h-11 shrink-0 rounded-[15px] bg-[#E7ECE4] px-4 text-[13px] font-black text-[#8FA096]">
       {t('Activar Live · bloqueado','Activate Live · locked')}
      </button>
     </div>
    </section>
   </>}
 </div>
}
