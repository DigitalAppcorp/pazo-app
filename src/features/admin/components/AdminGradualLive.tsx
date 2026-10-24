import {useEffect,useRef,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {useAuth} from '../../../context/AuthContext'
type Action='start'|'pause'|'resume'|'stop'|'resolve'|'public'
type Snapshot={qaExcludedAccounts?:number;realEligibleAccounts?:number;source:'gradual_admin_v1';stage:string;state:string;revision:number;capacity:number;hostedGateVerified:boolean;healthy:boolean;admitted:number;reserved:number;waiting:number;paying:number;verified:number;abandoned:number;feedbackOk:number;feedbackIssues:number;notificationsPending:number;notificationsDelivered:number;legacyOpen:number;realRevenueMinor:number;courtesyIsRevenue:false;workerHealthy:boolean;incidents:string[];audit:{action:string;from_revision:number;to_revision:number;happened_at:string}[]}
const confirmations:Record<Action,string>={start:'AUTORIZO INICIAR LIVE LIMITADO',pause:'PAUSAR NUEVAS COMPRAS',resume:'REANUDAR LIVE LIMITADO',stop:'DETENER NUEVAS COMPRAS',resolve:'CONFIRMO REVISAR INCIDENCIAS',public:'AUTORIZO PUBLICAR CHECKOUT LIVE'}
const button='min-h-11 rounded-full bg-[#E1E53F] px-4 py-2 text-[13px] font-bold text-[#204E4A] focus-visible:bg-[#EAF0DD] disabled:opacity-50'
function Controls({snapshot,lang,mfaRecentlyVerified,refresh}:{snapshot:Snapshot;lang:'es'|'en';mfaRecentlyVerified:boolean;refresh:()=>void}){
 const [action,setAction]=useState<Action>(snapshot.state==='inactive'?'start':'pause')
 const [confirmed,setConfirmed]=useState(false);const [phase,setPhase]=useState<'idle'|'busy'|'unknown'>('idle')
 const [message,setMessage]=useState('');const pending=useRef(false);const nonce=useRef(crypto.randomUUID())
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 const t=(es:string,en:string)=>lang==='es'?es:en
 const submit=async()=>{
  if(pending.current||phase==='unknown'||!confirmed||!mfaRecentlyVerified)return
  pending.current=true;setPhase('busy');setMessage('')
  try{
   const response=await supabase.functions.invoke('pazo-admin-gradual-live',{body:{action,confirmation:confirmations[action],expectedRevision:snapshot.revision,requestId:nonce.current}})
   if(!alive.current)return
   if(response.error||!['updated','already_recorded'].includes(response.data?.code)||response.data?.mayCharge!==false){setPhase('unknown');setMessage(t('Resultado sin confirmar. Consulta el estado; no repitas la operación.','Outcome unconfirmed. Read status; do not repeat the operation.'));return}
   setPhase('idle');setConfirmed(false);refresh()
  }catch{if(alive.current){setPhase('unknown');setMessage(t('No se pudo confirmar. Consulta el estado antes de otra acción.','Could not confirm. Read status before another action.'))}}finally{pending.current=false}
 }
 const labels:Record<Action,[string,string]>={start:['Autorizar inicio limitado','Authorize limited start'],pause:['Pausar nuevas compras','Pause new purchases'],resume:['Reanudar después de revisión','Resume after review'],stop:['Detener nuevas compras','Stop new purchases'],resolve:['Registrar revisión de incidencias','Record incident review'],public:['Autorizar apertura pública sin cuota','Authorize public release without quota']}
 const canActivate=snapshot.hostedGateVerified&&snapshot.healthy&&snapshot.legacyOpen===0
 return <div className="space-y-3">
  <label className="block text-[13px] font-bold">{t('Operación de campaña','Campaign operation')}
   <select value={action} disabled={phase!=='idle'} className="mt-1 min-h-11 w-full rounded-xl bg-[#F4F6EF] px-3" onChange={e=>{setAction(e.target.value as Action);setConfirmed(false);nonce.current=crypto.randomUUID()}}>
    {(Object.keys(labels) as Action[]).filter(item=>item!=='public'||snapshot.stage==='LIMITED_COMPLETE').map(item=><option key={item} value={item} disabled={['start','resume','public'].includes(item)&&!canActivate}>{labels[item][lang==='es'?0:1]}</option>)}
   </select>
  </label>
  {!mfaRecentlyVerified&&<p className="text-[13px]">{t('Verifica un código MFA nuevo para modificar la campaña.','Verify a fresh MFA code to change the campaign.')}</p>}
  {!snapshot.hostedGateVerified&&<p role="status" className="text-[13px]">{t('Gate hospedado pendiente: los controles de inicio permanecen apagados.','Hosted gate pending: start controls remain off.')}</p>}
  {!!snapshot.legacyOpen&&<p role="alert" className="text-[13px]">{t('Existe una solicitud Live anterior. Hay que conciliarla usando su gestión original; no se borrará ni se duplicará.','A preexisting Live request needs reconciliation through its original management. It will not be deleted or duplicated.')}</p>}
  <label className="flex min-h-11 items-start gap-2 text-[13px]"><input type="checkbox" checked={confirmed} disabled={!mfaRecentlyVerified||phase!=='idle'} className="mt-1 h-5 w-5 shrink-0 appearance-none rounded-md bg-[#EAF0DD] checked:bg-[#204E4A] focus-visible:bg-[#E1E53F]" onChange={e=>setConfirmed(e.target.checked)}/><span>{labels[action][lang==='es'?0:1]}. {t('Confirmo esta operación. Cada comprador debe aceptar su propia suscripción en PayPal.','I confirm this operation. Each buyer must accept their own subscription in PayPal.')}</span></label>
  <button type="button" className={button} onClick={()=>void submit()} disabled={!mfaRecentlyVerified||!confirmed||phase!=='idle'||(['start','resume','public'].includes(action)&&!canActivate)}>{phase==='busy'?t('Comprobando…','Checking…'):t('Confirmar operación','Confirm operation')}</button>
  {message&&<p role="alert" className="text-[13px]">{message}</p>}
  <button type="button" className={button} onClick={refresh} disabled={phase==='busy'}>{t('Consultar estado autoritativo','Read authoritative state')}</button>
 </div>
}
export function AdminGradualLive({lang,mfaRecentlyVerified,onChanged}:{lang:'es'|'en';mfaRecentlyVerified:boolean;onChanged?:()=>void}){
 const {user}=useAuth();const owner=user?.id??null;const [refreshId,setRefreshId]=useState(0)
 const [result,setResult]=useState<{owner:string;value:Snapshot|null}|null>(null)
 const value=result?.owner===owner?result.value:null;const t=(es:string,en:string)=>lang==='es'?es:en
 useEffect(()=>{let current=true;if(!owner)return
  void(async()=>{try{const r=await supabase.rpc('pazo_admin_gradual_status');const v=r.data as Snapshot|null
   const valid=!r.error&&v?.source==='gradual_admin_v1'&&Number.isSafeInteger(v.revision)&&v.revision>=0&&[1,5,20,50].includes(v.capacity)&&
    ['L1_FIRST_REAL','L2_SMALL','L3_BETA','L4_EXTENDED','LIMITED_COMPLETE'].includes(v.stage)&&['inactive','active','paused_admin','paused_automatic'].includes(v.state)&&
    ['hostedGateVerified','healthy','workerHealthy'].every(k=>typeof v[k as keyof Snapshot]==='boolean')&&v.courtesyIsRevenue===false&&
    ['admitted','reserved','waiting','paying','verified','abandoned','feedbackOk','feedbackIssues','notificationsPending','notificationsDelivered','legacyOpen','realRevenueMinor'].every(k=>Number.isSafeInteger(v[k as keyof Snapshot])&&Number(v[k as keyof Snapshot])>=0)&&
    ['qaExcludedAccounts','realEligibleAccounts'].every(k=>v[k as keyof Snapshot]===undefined||(Number.isSafeInteger(v[k as keyof Snapshot])&&Number(v[k as keyof Snapshot])>=0))&&
    Array.isArray(v.incidents)&&v.incidents.every(i=>typeof i==='string')&&Array.isArray(v.audit)&&v.audit.every(a=>typeof a?.action==='string'&&Number.isSafeInteger(a.from_revision)&&Number.isSafeInteger(a.to_revision)&&Number.isFinite(Date.parse(a.happened_at)))
   if(current)setResult({owner,value:valid?v:null})
  }catch{if(current)setResult({owner,value:null})}})()
  return()=>{current=false}
 },[owner,refreshId])
 const refresh=()=>{setRefreshId(v=>v+1);onChanged?.()}
 return <section className="space-y-4 rounded-[26px] bg-white p-4 text-[#204E4A] sm:p-6" aria-label={t('Apertura gradual Live','Gradual Live rollout')}>
  <h3 className="text-[19px] font-black">{t('Apertura gradual Live','Gradual Live rollout')}</h3>
  {!value?<><p role="status" className="text-[13px]">{t('No hay un estado verificado de la campaña. No se puede autorizar una apertura.','Campaign state is not verified. Release cannot be authorized.')}</p><button type="button" className={button} onClick={refresh}>{t('Consultar de nuevo','Read again')}</button></>:<>
   <p role="status" className="text-[13px] font-bold">{value.stage} · {value.state}</p>
   <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
    {[[t('Capacidad acumulada','Cumulative capacity'),value.capacity],[t('Admitidos históricos','Historical admissions'),value.admitted],[t('En reserva','Reserved'),value.reserved],[t('Esperando','Waiting'),value.waiting],[t('Pago/verificación pendiente','Payment/verification pending'),value.paying],[t('Pago y beneficio verificados','Verified payment and benefits'),value.verified],[t('Interés retirado','Interest withdrawn'),value.abandoned],[t('Opiniones positivas','Positive feedback'),value.feedbackOk],[t('Problemas privados','Private issues'),value.feedbackIssues],[t('Avisos pendientes','Pending notices'),value.notificationsPending],[t('Avisos entregados','Delivered notices'),value.notificationsDelivered],...(value.qaExcludedAccounts===undefined?[]:[[t('Cuentas QA excluidas','Excluded QA accounts'),value.qaExcludedAccounts]]),...(value.realEligibleAccounts===undefined?[]:[[t('Cuentas reales elegibles','Eligible real accounts'),value.realEligibleAccounts]])].map(([label,count])=><div key={label} className="rounded-xl bg-[#F4F6EF] p-3"><dt>{label}</dt><dd className="mt-1 font-black">{count}</dd></div>)}
   </dl>
   <p className="text-[13px]">{t('Ingresos del ledger Live verificado, sin períodos retenidos: ','Verified Live ledger revenue, excluding held periods: ')}{new Intl.NumberFormat(lang,{style:'currency',currency:'USD'}).format(value.realRevenueMinor/100)}</p>
   {value.qaExcludedAccounts!==undefined&&<p className="text-[12px]">{t('Las cuentas prebeta y QA quedan fuera de invitaciones, compras nuevas, ingresos y promoción automática.','Prebeta and QA accounts are excluded from invitations, new purchases, revenue and automatic promotion.')}</p>}
   <p className="text-[12px]">{t('Las cortesías son no financieras y no cuentan como compradores ni ingresos.','Complimentary benefits are not financial and count as neither buyers nor revenue.')}</p>
   <p className="text-[13px]">{t('Worker: ','Worker: ')}{value.workerHealthy?t('salud reciente','recently healthy'):t('requiere revisión','needs review')}</p>
   {value.incidents.length>0&&<div role="alert" className="rounded-xl bg-[#FCE5D8] p-3 text-[13px]">{t('Incidencias financieras: ','Financial incidents: ')}{value.incidents.join(', ')}</div>}
   <Controls key={JSON.stringify([owner,value.revision,mfaRecentlyVerified,refreshId])} snapshot={value} lang={lang} mfaRecentlyVerified={mfaRecentlyVerified} refresh={refresh}/>
   <details><summary className="min-h-11 cursor-pointer py-3 text-[13px] font-bold">{t('Auditoría reciente','Recent audit')}</summary><ol className="space-y-2 text-[12px]">{value.audit.map((a,index)=><li key={index}>{a.action} · {a.from_revision} → {a.to_revision} · {new Date(a.happened_at).toLocaleString(lang)}</li>)}</ol></details>
   <p className="text-[12px]">{t('Pausar nuevas compras conserva cancelaciones, renovaciones, conciliación y PAZO gratis. No hay promoción automática a público.','Pausing new purchases preserves cancellation, renewal, reconciliation and free PAZO. Public release is never automatic.')}</p>
  </>}
 </section>
}
