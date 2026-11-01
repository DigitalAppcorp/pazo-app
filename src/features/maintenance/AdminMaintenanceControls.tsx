import {useEffect,useState} from 'react'
import {supabase} from '../../services/supabaseClient'
import {InfoTip} from '../admin/components/AdminClarity'
type Status={revision:number;enabled:boolean;message_es:string;message_en:string;updated_at:string}
export function AdminMaintenanceControls({lang}:{lang:'es'|'en'}){
 const [status,setStatus]=useState<Status|null>(null)
 const [loading,setLoading]=useState(true)
 const [working,setWorking]=useState(false)
 const [es,setEs]=useState('PAZO está en mantenimiento. Volveremos pronto.')
 const [en,setEn]=useState('PAZO is under maintenance. We will be back soon.')
 const [message,setMessage]=useState('')
 const l=(a:string,b:string)=>lang==='es'?a:b
 const reload=()=>Promise.resolve(supabase.rpc('pazo_public_maintenance_status')).then(({data,error})=>{
  if(!error&&data&&typeof data==='object'&&typeof data.enabled==='boolean'&&Number.isSafeInteger(data.revision)){
   setStatus(data as Status);setEs((data as Status).message_es);setEn((data as Status).message_en)
  }else setStatus(null)
  setLoading(false)
 }).catch(()=>{setStatus(null);setLoading(false)})
 useEffect(()=>{void reload()},[])
 const change=async(next:boolean)=>{
  if(working||!status)return
  const confirmText=next?l(
   '¿Activar mantenimiento para usuarios? Primero debes detener las nuevas compras Live en los controles de PayPal.',
   'Enable maintenance for users? First stop new Live purchases in PayPal controls.') :
   l('¿Volver a permitir acceso a PAZO? Esta operación no reactivará PayPal automáticamente.',
   'Restore access to PAZO? This does not re-enable PayPal automatically.')
  if(!window.confirm(confirmText))return
  setWorking(true);setMessage('')
  try{
   const r=await supabase.rpc('pazo_admin_set_maintenance',{
    p_enabled:next,p_message_es:es.trim(),p_message_en:en.trim(),
    p_expected_revision:status.revision,p_request_id:crypto.randomUUID()
   })
   if(r.error||r.data!==true)throw Error('switch unverified')
   await reload()
   setMessage(l('Estado actualizado y registrado en la auditoría.','State updated and audited.'))
  }catch{
   setMessage(l('No se confirmó el cambio. Lee el estado antes de reintentar. Comprueba que PayPal esté apagado.',
    'Change not confirmed. Refresh state before retrying. Ensure PayPal checkout is off.'))
   await reload()
  }finally{setWorking(false)}
 }
 return <section aria-label={l('Mantenimiento de PAZO','PAZO maintenance')} className="space-y-4 rounded-[22px] bg-white p-5 shadow-sm">
  {loading?<p role="status">{l('Consultando estado…','Reading status…')}</p>:
   status?<div className="ac-state" data-active={status.enabled}>
    <span aria-hidden="true"/>
    <p role="status">{status.enabled?l('Mantenimiento activo','Maintenance active'):l('Aplicación disponible','Application available')}</p>
    <InfoTip label={l('Qué hace el mantenimiento','What maintenance does')}>{l(
     'Bloquea la interfaz de usuarios y la API de datos; el administrador conserva acceso. Se deben detener las nuevas compras PayPal antes de activarlo. Las renovaciones y servicios externos se gestionan por separado.',
     'Blocks the user interface and Data API; admin access remains. Stop new PayPal checkout before enabling. Renewals and external services need separate handling.')}</InfoTip>
   </div>:<p role="alert" className="text-xs text-[#A04535]">{l('Estado no disponible. No intentes activar a ciegas.','State unavailable. Do not toggle without verified status.')}</p>}
  <div className="flex flex-wrap items-center gap-2">
   {status&&<button type="button" onClick={()=>void change(!status.enabled)}
    disabled={working||es.trim().length<12||en.trim().length<12}
    className={'min-h-11 rounded-xl px-4 text-xs font-black disabled:opacity-50 '+(status.enabled?'bg-[#E1E53F]':'bg-[#F8E6DC]')}>
    {status.enabled?l('Restaurar acceso','Restore access'):l('Activar mantenimiento','Enable maintenance')}</button>}
   <button type="button" onClick={()=>{setLoading(true);void reload()}} disabled={loading||working} aria-label={l('Consultar estado','Refresh status')} className="ac-refresh"><span aria-hidden="true">↻</span></button>
  </div>
  {message&&<p role="status" className="text-xs text-[#5C7470]">{message}</p>}
  <details className="ac-quiet ac-quiet-inset"><summary>{l('Mensaje que ven los usuarios','Message users see')}<span aria-hidden="true">＋</span></summary><div className="space-y-3">
   <label className="block text-xs font-bold">{l('Mensaje en español','Spanish message')}
    <textarea rows={2} maxLength={300} value={es} onChange={e=>setEs(e.target.value)}
     className="mt-2 min-h-20 w-full rounded-xl bg-[#F0F4E9] p-3 text-sm"/>
   </label>
   <label className="block text-xs font-bold">{l('Mensaje en inglés','English message')}
    <textarea rows={2} maxLength={300} value={en} onChange={e=>setEn(e.target.value)}
     className="mt-2 min-h-20 w-full rounded-xl bg-[#F0F4E9] p-3 text-sm"/>
   </label>
  </div></details>
  <a href="/maintenance-admin.html" className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-bold underline focus-visible:bg-[#E1E53F]/40">{l('Acceso administrativo de recuperación','Administrator recovery access')}</a>
 </section>
}
