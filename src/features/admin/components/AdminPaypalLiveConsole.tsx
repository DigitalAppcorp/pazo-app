import {AdminGradualLive} from './AdminGradualLive'
import {useEffect,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {AdminPaypalMfaStepUp} from './AdminPaypalMfaStepUp'
import {AdminPaypalLiveVaultSetup} from './AdminPaypalLiveVaultSetup'
import {AdminPaypalMerchantBootstrap} from './AdminPaypalMerchantBootstrap'
import {AdminPaypalLiveResourceCheck} from './AdminPaypalLiveResourceCheck'
import {AdminLiveReadiness} from './AdminLiveReadiness'
import {AdminLiveReleaseControl} from './AdminLiveReleaseControl'

type Locale='es'|'en'
type Config={price_minor:number;return_origin:string;validation_status:string;
 client_id_stored:boolean;client_secret_stored:boolean;webhook_id:string;
 plan_id:string;updated_at:string}
type Mode='off'|'canary'|'limited'|'public'|'unknown'
const PUBLIC_ORIGIN='https://pazo-app.vercel.app'
const WEBHOOK='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-webhook'
const surface='rounded-[26px] bg-white p-5 shadow-[0_8px_24px_rgba(32,78,74,0.045)]'
const primary='min-h-11 rounded-[16px] bg-[#E1E53F] px-5 py-3 text-[13px] font-extrabold text-[#204E4A] disabled:opacity-50'
const small='text-[12px] leading-[1.6] text-[#647D75]'

export function AdminPaypalLiveConsole({lang,config,loading,error,credentialsStored,credentialsChecked,
 mfaRecentlyVerified,onVerifyMfa,onStored,onChanged,history}:
 {lang:Locale;config:Config|null;loading:boolean;error:string;credentialsStored:boolean;
 credentialsChecked:boolean;mfaRecentlyVerified:boolean;onVerifyMfa:()=>void;
 onStored:()=>void;onChanged:()=>void;history:{kind:string;recorded_at:string}[]}){
 const t=(es:string,en:string)=>lang==='es'?es:en
 const [advanced,setAdvanced]=useState(false)
 const [mode,setMode]=useState<Mode>('unknown')
 const [refresh,setRefresh]=useState(0)
 useEffect(()=>{
  let mounted=true
  void (async()=>{
   try{
    const {data,error}=await supabase.rpc('pazo_admin_live_release_status')
    if(mounted)setMode(!error&&['off','canary','limited','public'].includes(data?.mode)?data.mode:'unknown')
   }catch{if(mounted)setMode('unknown')}
  })()
  return ()=>{mounted=false}
 },[config?.updated_at,refresh])
 const connected=config?.validation_status==='valid'&&credentialsStored
 const originMatches=config?.return_origin===PUBLIC_ORIGIN
 const liveCanary=mode==='canary'
 return <div data-pazo-live-console="focused" className="space-y-4 pb-8 text-[#204E4A]">
  <AdminGradualLive lang={lang} mfaRecentlyVerified={mfaRecentlyVerified} onChanged={()=>{setRefresh(v=>v+1);onChanged()}}/>
  <header className={surface}>
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
     <p className="text-[11px] font-black uppercase tracking-[0.13em] text-[#759087]">PayPal · Live</p>
     <h3 className="mt-2 text-[23px] font-black tracking-tight">{t('Cobros y configuración','Payments and settings')}</h3>
     <p className={'mt-1 '+small}>{t('Un panel claro para preparar y controlar los cobros reales.','A clear place to prepare and control real payments.')}</p>
    </div>
    <span role="status" className="rounded-full bg-[#F0F4E8] px-4 py-2 text-[12px] font-extrabold">
     {mode==='canary'?t('Prueba controlada','Controlled test'):
      mode==='limited'?t('Apertura gradual limitada','Limited gradual rollout'):
      mode==='public'?t('Abierto al público','Open to public'):
      mode==='off'?t('Cobros detenidos','Payments paused'):
       t('Estado sin verificar','Status unavailable')}
    </span>
   </div>
   {error&&<p role="alert" className="mt-4 rounded-2xl bg-[#FBE9DF] p-3 text-[12px] font-semibold">{error}</p>}
  </header>
  {loading?<p role="status" className={surface}>{t('Consultando configuración Live…','Loading Live settings…')}</p>:
   <>
    <section className={surface} aria-label={t('Configuración vigente','Current configuration')}>
     <h4 className="text-[16px] font-black">{t('Configuración vigente','Current configuration')}</h4>
     <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-[19px] bg-[#F2F6EC] px-4 py-4">
       <p className="text-[11px] font-bold text-[#62786D]">{t('Membresía mensual','Monthly membership')}</p>
       <p className="mt-1 text-[25px] font-black">
        {config?.price_minor===299?'$2.99':config?'$'+(config.price_minor/100).toFixed(2):'—'}
        <span className="ml-1 text-[11px] font-bold">USD</span>
       </p>
      </div>
      <div className="rounded-[19px] bg-[#F2F6EC] px-4 py-4">
       <p className="text-[11px] font-bold text-[#62786D]">{t('Credenciales PayPal','PayPal credentials')}</p>
       <p className="mt-2 text-[13px] font-black">{!credentialsChecked?t('Comprobando…','Checking…'):
         connected?t('Guardadas y verificadas','Stored and verified'):
         t('Requieren revisión','Need verification')}</p>
      </div>
     </div>
     <p className={'mt-3 '+small}>
      {t('El precio vigente pertenece al plan de PayPal. Cambiarlo exige preparar y verificar un plan y términos nuevos; no se modifica un cobro activo cambiando solo una cifra.',
       'The current price belongs to the PayPal plan. A new price requires a reviewed plan and new terms; editing a number cannot alter an active subscription.')}
     </p>
    </section>
    <section className={surface} aria-label={t('Dominio y regreso desde PayPal','Domain and PayPal return')}>
     <h4 className="text-[16px] font-black">{t('Dominio y regreso del cliente','Customer return domain')}</h4>
     <p className={'mt-1 '+small}>{t('Esta es la dirección que usará PayPal para devolver al usuario tras aprobar o cancelar. No es el webhook.',
      'This is where PayPal returns the customer after approval or cancellation. It is not the webhook.')}</p>
     <div className="mt-4 space-y-3">
      <div>
       <p className="text-[11px] font-black">{t('Configurado en el servidor','Configured on server')}</p>
       <p className="mt-1 break-all rounded-[15px] bg-[#F5F7F1] p-3 text-[13px] font-semibold">{config?.return_origin||'—'}</p>
      </div>
      <div>
       <p className="text-[11px] font-black">{t('Dominio oficial de PAZO','Official PAZO domain')}</p>
       <p className="mt-1 break-all rounded-[15px] bg-[#F5F7F1] p-3 text-[13px] font-semibold">{PUBLIC_ORIGIN}</p>
      </div>
      {!originMatches&&<p role="alert" className="rounded-[17px] bg-[#FFF0DB] p-4 text-[12px] font-semibold leading-relaxed">
       {t('Atención: el regreso de PayPal continúa certificado para el dominio anterior. Antes de permitir nuevos cobros desde el nuevo dominio hay que actualizar y volver a certificar la ruta Live; no cambies las claves para resolverlo.',
        'PayPal still returns to a previously certified domain. The Live route must be updated and recertified before new checkouts use this origin. Do not rotate credentials to fix this.')}
      </p>}
      <div className="rounded-[17px] bg-[#F2F6EC] p-4">
       <p className="text-[12px] font-black">{t('Direcciones de regreso previstas','Expected return addresses')}</p>
       <p className="mt-2 break-all text-[12px]">{PUBLIC_ORIGIN}/paypal/return</p>
       <p className="mt-1 break-all text-[12px]">{PUBLIC_ORIGIN}/paypal/cancel</p>
       <p className={'mt-2 '+small}>{t('Se generan en el checkout del servidor. No introduzcas rutas completas como dominio.', 
        'These are generated by the server checkout. Enter the origin only, not full paths.')}</p>
      </div>
     </div>
    </section>
    <section className={surface} aria-label={t('Webhook PayPal','PayPal webhook')}>
     <h4 className="text-[16px] font-black">{t('Webhook de PayPal','PayPal webhook')}</h4>
     <p className={'mt-1 '+small}>{t('El webhook es un endpoint de Supabase, no una página de Vercel. No cambia al cambiar el dominio de PAZO.', 
      'The webhook is a Supabase endpoint, not a Vercel page. Changing the PAZO domain does not change it.')}</p>
     <div className="mt-3 break-all rounded-[16px] bg-[#F2F6EC] p-4 text-[12px] font-bold">{WEBHOOK}</div>
     <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className={primary} onClick={()=>void navigator.clipboard?.writeText(WEBHOOK)}>
       {t('Copiar URL del webhook','Copy webhook URL')}</button>
      <a className="inline-flex min-h-11 items-center rounded-[16px] bg-[#F3F5EF] px-4 text-[12px] font-extrabold"
       href="https://developer.paypal.com/dashboard/applications/live" target="_blank" rel="noopener noreferrer">
       {t('Abrir PayPal Developer','Open PayPal Developer')}</a>
     </div>
     <p className={'mt-3 '+small}>{t('El ID del webhook se usa para verificar firmas. Cambiar su URL o reemplazarlo exige verificar el recurso en PayPal antes de tocar los cobros.',
      'The webhook ID verifies signatures. Changing its URL or replacing it requires provider verification before payments are changed.')}</p>
    </section>
    <section className={surface} aria-label={t('Controles de lanzamiento Live','Live release controls')}>
     <h4 className="text-[16px] font-black">{t('Control de cobros','Payments control')}</h4>
     <p className={'mt-1 '+small}>
      {liveCanary?t('El modo de prueba controlada no autoriza a todas las cuentas normales a pagar.',
       'Controlled testing does not authorize every ordinary account to pay.'):
       t('Cada cambio requiere verificación del servidor y autorización administrativa.',
        'Every change requires server verification and administrator approval.')}
     </p>
     <div className="mt-4">
      <AdminPaypalMfaStepUp lang={lang} onVerified={onVerifyMfa}/>
      <div className="mt-4">
       {mode!=='limited'&&<AdminLiveReleaseControl lang={lang} mfaRecentlyVerified={mfaRecentlyVerified}
         revision={String(config?.updated_at||'')+':'+refresh} onChanged={()=>{setRefresh(x=>x+1);onChanged()}}/>}
      </div>
     </div>
    </section>
    {!connected&&credentialsChecked&&<section className={surface}>
     <h4 className="text-[16px] font-black">{t('Credenciales pendientes de verificación','Credentials need verification')}</h4>
     <p className={'mt-1 '+small}>{t('Usa este formulario solo si el servidor confirma que todavía no están guardadas. No vuelvas a introducir claves por un problema de dominio.',
      'Use this only if the server confirms keys are missing. Never re-enter credentials to fix a domain problem.')}</p>
     <div className="mt-3"><AdminPaypalLiveVaultSetup lang={lang}
      mfaRecentlyVerified={mfaRecentlyVerified} credentialsStored={credentialsStored}
      credentialsChecked={credentialsChecked} onStored={onStored}/></div>
    </section>}
    <details className={surface} open={advanced} onToggle={e=>setAdvanced(e.currentTarget.open)}>
     <summary className="cursor-pointer py-1 text-[13px] font-black">
      {t('Herramientas avanzadas y diagnóstico','Advanced tools and diagnostics')}
     </summary>
     {advanced&&<div className="mt-4 space-y-3">
      <AdminLiveReadiness lang={lang} revision={config?.updated_at} />
      <AdminPaypalLiveResourceCheck lang={lang} mfaRecentlyVerified={mfaRecentlyVerified}
        onVerified={async()=>{onChanged()}}/>
      <AdminPaypalMerchantBootstrap lang={lang} mfaRecentlyVerified={mfaRecentlyVerified}/>
      <div className="rounded-[18px] bg-[#F2F6EC] p-4">
       <p className="text-[13px] font-black">{t('Historial de configuración','Configuration history')}</p>
       <p className={'mt-2 '+small}>{t('Últimas operaciones registradas: ', 'Recorded operations: ')}{history.length}</p>
      </div>
     </div>}
    </details>
   </>}
 </div>
}
