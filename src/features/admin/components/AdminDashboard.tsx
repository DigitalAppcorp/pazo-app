import { useCallback,useEffect,useRef,useState } from 'react'
import { createPortal } from 'react-dom'
import { AdminPayPalSettings } from './AdminPayPalSettings'
import { AdminMarketingPanel } from './AdminMarketingPanel'
import {BehaviorPanel} from '../../marketing/BehaviorPanel'
import {AdminSupportInbox} from '../../support/components/AdminSupportInbox'
import {AdminGiftBenefits} from '../../support/components/AdminGiftBenefits'
import {AdminMaintenanceControls} from '../../maintenance/AdminMaintenanceControls'
import {AdminLiveFinanceSummary} from './AdminLiveFinanceSummary'
import { AdminGlyph,AdminDonut,AdminCohortColumns,AdminModuleRings,type AdminGlyphName } from './AdminVisuals'
import {
 adminOverview,adminUsers,adminExperiments,adminVoters,adminAudience,
 type AdminOverview,type AdminUser,type AdminExperiment,type AdminVoter,type AdminAudience,
} from '../adminDashboardService'

type Section='summary'|'users'|'pets'|'finance'|'activity'|'marketing'|'behavior'|'content'|'ideas'|'places'|'infra'|'reports'|'paypal'|'support'|'gifts'|'maintenance'
const sections:{key:Section;es:string;en:string;icon:AdminGlyphName}[]=[
 {key:'summary',es:'Resumen',en:'Overview',icon:'chart'},
 {key:'users',es:'Usuarios',en:'Users',icon:'users'},
 {key:'pets',es:'Mascotas',en:'Pets',icon:'paw'},
 {key:'finance',es:'Membresías',en:'Memberships',icon:'crown'},
 {key:'activity',es:'Actividad',en:'Activity',icon:'activity'},
 {key:'marketing',es:'Campañas',en:'Campaigns',icon:'chart'},
 {key:'behavior',es:'Comportamiento',en:'Behavior',icon:'activity'},
 {key:'content',es:'Contenido',en:'Content',icon:'layers'},
 {key:'ideas',es:'Fake Doors',en:'Fake Doors',icon:'compass'},
 {key:'places',es:'Lugares',en:'Places',icon:'pin'},
 {key:'reports',es:'Denuncias',en:'Reports',icon:'alert'},
 {key:'support',es:'Soporte',en:'Support',icon:'alert'},
 {key:'gifts',es:'Beneficios de cortesía',en:'Complimentary benefits',icon:'crown'},
 {key:'maintenance',es:'Mantenimiento',en:'Maintenance',icon:'settings'},
 {key:'infra',es:'Supabase',en:'Supabase',icon:'database'},
 {key:'paypal',es:'Configuración · PayPal',en:'Settings · PayPal',icon:'settings'},
]
const n=(number:number)=>number.toLocaleString('es-US')
const money=(minor:number)=>(minor/100).toLocaleString('es-US',{style:'currency',currency:'USD'})
const bytes=(value:number)=>value<1048576?Math.round(value/1024)+' KB':(value/1048576).toFixed(1)+' MB'
const age=(raw:string)=>new Date(raw).toLocaleDateString('es-US',{year:'numeric',month:'short',day:'numeric'})
const moduleNames:Record<string,string>={feed:'Feed',explore:'Explorar',places:'Lugares',
 communities:'Comunidades',profile:'Perfil',care:'Cuidados',documents:'Documentos',
 notifications:'Avisos',supporter:'Amigo de PAZO'}
const optionLabels:Record<string,string>={use:'Usarlo',create:'Crear u organizar',
 explore:'Explorar lo que otros comparten',share:'Compartir',other:'Otro'}
function Stat({label,value,note,accent,icon}:{label:string;value:string|number;note?:string;accent?:boolean;icon?:AdminGlyphName}){
 return <div className="pazo-admin-kpi flex min-h-[136px] min-w-0 items-center gap-3.5 rounded-[21px] bg-white px-4 py-5 shadow-[0_8px_30px_rgba(32,78,74,0.065)] xl:px-5">
  {icon&&<span aria-hidden="true" className={'flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full '+
   (accent?'bg-[#E4F9DC] text-[#17823E]':icon==='crown'?'bg-[#FFF0D6] text-[#E0982C]':'bg-[#E2F8E8] text-[#166D54]')}>
   <AdminGlyph name={icon} size={26}/>
  </span>}
  <div className="min-w-0 flex-1">
   <p className="text-[13px] font-semibold leading-snug text-[#354D47] lg:text-[14px]">{label}</p>
   <p className={"mt-1.5 break-words text-[26px] font-black leading-tight tracking-tight lg:text-[29px] "+(accent?"text-[#137946]":"text-[#142D29]")}>{value}</p>
   {note&&<p className="mt-1.5 text-[12px] font-semibold leading-snug text-[#698079]">{note}</p>}
  </div>
 </div>
}

function AdminNavIcon({section}:{section:Section}){
 const glyph=sections.find(item=>item.key===section)?.icon||'chart'
 return <AdminGlyph name={glyph} size={20}/>
}
function DashboardPanel({title,description,children,action}:{
 title:string;description?:string;children:React.ReactNode;action?:()=>void
}){
 return <section className="pazo-admin-panel min-w-0 rounded-[20px] bg-white p-5 shadow-[0_7px_29px_rgba(32,78,74,0.06)] lg:p-6">
  <div className="flex items-start justify-between gap-3">
   <div className="min-w-0"><h3 className="text-[17px] font-black tracking-tight text-[#1D322D] lg:text-[19px]">{title}</h3>
    {description&&<p className="mt-1 text-[13px] text-[#71857F]">{description}</p>}</div>
   {action&&<button type="button" onClick={action} aria-label={title} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#204E4A] hover:bg-[#E9F1E3] focus-visible:bg-[#E1E53F]"><AdminGlyph name="chevron" size={19}/></button>}
  </div>
  <div className="mt-5">{children}</div>
 </section>
}

function Note({children}:{children:React.ReactNode}){
 return <p className="rounded-[16px] bg-[#EAF1E2] px-4 py-2.5 text-[12px] leading-relaxed text-[#536E64]">{children}</p>
}
export function AdminDashboard({lang,onClose,onOpenReports}:{lang:'es'|'en';onClose:()=>void;onOpenReports?:()=>void}){
 const visibleSections=sections.filter(item=>item.key!=='reports'||Boolean(onOpenReports))
 const [section,setSection]=useState<Section>('summary')
 const [period,setPeriod]=useState<7|30|90>(30)
 const [overview,setOverview]=useState<AdminOverview|null>(null)
 const [users,setUsers]=useState<AdminUser[]>([])
 const [experiments,setExperiments]=useState<AdminExperiment[]>([])
 const [userOffset,setUserOffset]=useState(0)
 const [voterKey,setVoterKey]=useState('')
 const [voters,setVoters]=useState<AdminVoter[]|null>(null)
 const [audience,setAudience]=useState<AdminAudience[]|null>(null)
 const [voterBusy,setVoterBusy]=useState(false)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const dialogRef=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  const dialog=dialogRef.current
  if(!dialog)return
  const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null
  dialog.focus()
  const handleKeydown=(event:KeyboardEvent)=>{
   if(event.defaultPrevented)return
   if(event.key==='Escape'){
    event.preventDefault()
    onClose()
    return
   }
   if(event.key!=='Tab')return
   const focusable=Array.from(dialog.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
   )).filter(element=>element.getClientRects().length>0)
   if(!focusable.length){
    event.preventDefault()
    dialog.focus()
    return
   }
   const first=focusable[0]
   const last=focusable[focusable.length-1]
   const current=document.activeElement
   if(event.shiftKey&&(current===first||current===dialog)){
    event.preventDefault()
    last.focus()
   }else if(!event.shiftKey&&(current===last||!dialog.contains(current))){
    event.preventDefault()
    first.focus()
   }
  }
  document.addEventListener('keydown',handleKeydown)
  return ()=>{
   document.removeEventListener('keydown',handleKeydown)
   if(previousFocus?.isConnected)previousFocus.focus()
  }
 },[onClose])
 const l=(es:string,en:string)=>lang==='es'?es:en
 const refresh=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const [metrics,people,doors]=await Promise.all([
    adminOverview(period),adminUsers(userOffset),adminExperiments(),
   ])
   setOverview(metrics);setUsers(people);setExperiments(doors)
  }catch(err){
   setError(err instanceof Error?err.message:l('No pudimos consultar las estadísticas.','Statistics could not be loaded.'))
  }finally{setLoading(false)}
 },[period,userOffset,lang])
 useEffect(()=>{void refresh()},[refresh])
 const selectSection=(next:Section)=>{if(next==='reports'){onOpenReports?.();return}setSection(next)}
 const selectDoor=async(key:string)=>{
  if(voterKey===key){setVoterKey('');setVoters(null);setAudience(null);return}
  setVoterKey(key);setVoters(null);setAudience(null);setVoterBusy(true)
  try{
   const [votes,visitors]=await Promise.all([adminVoters(key),adminAudience(key)])
   setVoters(votes);setAudience(visitors)
  }catch(err){setError(err instanceof Error?err.message:'Error al consultar votos')}
  finally{setVoterBusy(false)}
 }

 const periodSelector=<select aria-label={l('Período','Period')} value={period} onChange={e=>setPeriod(Number(e.target.value) as 7|30|90)}
  className="min-h-11 max-w-full rounded-[16px] bg-white px-3 py-2 text-[12px] font-bold text-[#204E4A] shadow-[0_4px_15px_rgba(32,78,74,0.045)] focus-visible:bg-[#E1E53F]">
  <option value="7">{l('Últimos 7 días','Last 7 days')}</option>
  <option value="30">{l('Últimos 30 días','Last 30 days')}</option>
  <option value="90">{l('Últimos 90 días','Last 90 days')}</option>
 </select>
 return createPortal(<div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={l('Panel de administración','Admin dashboard')}
    data-pazo-admin-responsive="true"
    className="pazo-admin fixed inset-0 z-[200] flex h-[100dvh] w-full overflow-hidden bg-[#F8F9F6] font-sans text-[#204E4A] lg:grid lg:grid-cols-[265px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
  {/* Portal escapes the 430px mobile app shell on desktop; the rest of PAZO stays mobile-only. */}
  <aside className="pazo-admin-sidebar hidden min-h-0 flex-col bg-white px-5 pb-5 pt-6 shadow-[5px_0_30px_rgba(32,78,74,0.025)] lg:flex">
   <p className="pazo-admin-wordmark px-3 text-[40px] font-black tracking-[-0.07em] text-[#204E4A]">pazo<span className="text-[#E1E53F]">.</span></p>
   <div className="mt-6 flex items-center gap-3 rounded-[18px] bg-[#F9FAF7] px-3 py-4">
    <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E1E53F] text-[#204E4A]"><AdminGlyph name="crown" size={25}/></span>
    <div><p className="text-[13px] font-black">{l('Centro de control','Control center')}</p><p className="text-[11px] font-medium text-[#71857F]">{l('Administrador','Administrator')}</p></div>
   </div>
   <nav aria-label={l('Secciones del panel','Dashboard sections')} className="pazo-admin-navigation mt-5 flex flex-1 flex-col gap-1 overflow-y-auto">
    {visibleSections.map(item=><button key={item.key} type="button" aria-current={section===item.key?'page':undefined}
     onClick={()=>selectSection(item.key)}
     className={'flex min-h-[47px] w-full items-center gap-4 rounded-[14px] px-4 text-left text-[15px] font-bold transition-colors focus-visible:bg-[#E1E53F] '+
      (section===item.key?'bg-[#E5F0D8] text-[#204E4A]':'text-[#506864] hover:bg-[#F1F6E9]')}>
     <AdminNavIcon section={item.key}/><span>{lang==='es'?item.es:item.en}</span>
    </button>)}
   </nav>
   <div className="pazo-admin-sidebar-message flex min-h-[134px] items-center gap-2 overflow-hidden rounded-[20px] bg-[#F5F9EE] px-2 py-3">
    <img src="/supporter/gratitude-empty-pets.svg" alt="" className="h-[108px] w-[99px] shrink-0 object-contain" aria-hidden="true"/>
    <div className="min-w-0 pr-2">
     <p className="text-[12px] font-black leading-snug text-[#204E4A]">{l('PAZO seguirá siendo gratis para todos','PAZO will remain free for everyone')}</p>
     <p className="mt-2 text-[11px] font-medium leading-snug text-[#698278]">{l('Administración privada y protegida','Private, protected administration')}</p>
    </div>
   </div>
   <button type="button" onClick={onClose} className="mt-4 min-h-11 rounded-full bg-[#F5F6F1] px-4 text-[13px] font-bold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F]">
    {l('Volver a PAZO','Back to PAZO')}
   </button>
  </aside>
  <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
   <header className="pazo-admin-header z-10 shrink-0 bg-[#F8F9F6]/95 px-4 pb-3 pt-4 backdrop-blur-md sm:px-6 lg:px-8 lg:pb-4 lg:pt-6">
    <div className="mx-auto flex w-full max-w-[1600px] items-start justify-between gap-3">
     <div className="min-w-0">
      <p className="text-[11px] font-black tracking-wide text-[#739087] lg:hidden">pazo. · ADMIN</p>
      <h2 className="text-[26px] font-black tracking-tight text-[#162B29] lg:text-[31px]">
       {section==='summary'?l('Resumen general','General overview'):lang==='es'?sections.find(item=>item.key===section)?.es:sections.find(item=>item.key===section)?.en}
      </h2>
      <p className="mt-1 text-[13px] text-[#647C75] lg:text-[15px]">
       {section==='summary'?l('Así va PAZO, con los datos disponibles','PAZO at a glance, using available data'):l('Centro de administración de PAZO','PAZO administration center')}
      </p>
      {section!=='marketing'&&section!=='behavior'&&overview&&<p className="mt-2 hidden text-[12px] font-semibold text-[#82938B] lg:block">{l('Actualizado: ','Updated: ')}{new Date(overview.as_of).toLocaleString(lang==='es'?'es-US':'en-US')}</p>}
     </div>
     <div className="flex shrink-0 items-center gap-2">
      <div className="hidden items-center gap-2 lg:flex">
       {periodSelector}
       {section!=='marketing'&&section!=='behavior'&&<><button type="button" onClick={()=>void refresh()} disabled={loading}
        className="flex min-h-11 items-center gap-2 rounded-[15px] bg-white px-4 text-[13px] font-extrabold text-[#204E4A] shadow-sm hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F] disabled:opacity-60">
        <AdminGlyph name="activity" size={17}/>{l('Actualizar','Refresh')}
       </button>
       <span className="flex min-h-11 items-center gap-2 rounded-[15px] bg-white px-4 text-[12px] font-bold text-[#476862] shadow-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-[#26B957]"/>{l('Datos de prueba','Test data')}
       </span></>}
      </div>
      <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white px-4 py-2 text-[12px] font-extrabold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F] lg:hidden">
       {l('Volver','Back')}
      </button>
     </div>
    </div>
    <nav aria-label={l('Secciones del panel','Dashboard sections')}
      className="mx-auto mt-4 flex max-w-[1600px] gap-2 overflow-x-auto pb-1 lg:hidden">
     {visibleSections.map(item=><button key={item.key} type="button" aria-current={section===item.key?'page':undefined}
       onClick={()=>selectSection(item.key)}
       className={'flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[12px] font-bold transition-colors focus-visible:bg-[#E1E53F] '+
        (section===item.key?'bg-[#204E4A] text-white':'bg-white text-[#204E4A] hover:bg-[#E5EDCE]')}>
       <AdminNavIcon section={item.key}/>{lang==='es'?item.es:item.en}
      </button>)}
    </nav>
   </header>
   <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 lg:px-7 lg:pt-1">
    <div className="mx-auto max-w-[1600px] space-y-4 lg:space-y-4">
     <div className="flex flex-wrap items-center justify-between gap-3 lg:hidden">
      {section!=='marketing'&&section!=='behavior'&&<p className="text-[12px] font-semibold text-[#6A8079]">
       {overview?l('Actualizado: ','Updated: ')+new Date(overview.as_of).toLocaleString(lang==='es'?'es-US':'en-US'):'—'}
      </p>}
      <div className="flex items-center gap-2">{periodSelector}
       {section!=='marketing'&&section!=='behavior'&&<button type="button" onClick={()=>void refresh()} disabled={loading}
        className="min-h-11 rounded-[15px] bg-[#E1E53F] px-4 py-2 text-[12px] font-extrabold disabled:opacity-50 hover:bg-[#EAF079] focus-visible:bg-[#EAF079]">
        {l('Actualizar','Refresh')}
       </button>}
      </div>
     </div>
     {section==='paypal'&&<AdminPayPalSettings lang={lang}/>}
     {section==='support'&&<AdminSupportInbox lang={lang}/>}
     {section==='gifts'&&<AdminGiftBenefits lang={lang}/>}
     {section==='maintenance'&&<AdminMaintenanceControls lang={lang}/>}
     {section==='marketing'&&<AdminMarketingPanel lang={lang} period={period}/>}
     {section==='behavior'&&<BehaviorPanel lang={lang} period={period}/>}
     {section!=='paypal'&&section!=='marketing'&&section!=='behavior'&&loading&&<p role="status" className="rounded-2xl bg-white p-5 text-[13px]">{l('Consultando datos autorizados…','Loading authorized data…')}</p>}
     {section!=='paypal'&&section!=='marketing'&&section!=='behavior'&&error&&<div role="alert" className="rounded-[20px] bg-[#F9E7DE] p-4 text-[13px] text-[#823E2D]">
       {l('No fue posible actualizar todos los datos.','Could not refresh all metrics.')} {error}
      </div>}
    {overview&&section!=='paypal'&&section!=='marketing'&&section!=='behavior'&&<div className={loading?'pointer-events-none opacity-50':'space-y-5'}>


     {section==='summary'&&<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
       <Stat icon="users" label={l('Usuarios registrados','Registered users')} value={n(overview.people.registered)}
        note={l('Nuevos últimos 30 días: ','New in last 30 days: ')+n(overview.people.new_30d)}/>
       <Stat icon="paw" label={l('Mascotas','Pets')} value={n(overview.people.pets)}
        note={l('Cuentas con mascotas: ','Accounts with pets: ')+n(overview.people.with_pet)}/>
       <Stat icon="crown" label={l('Membresías · Sandbox','Memberships · Sandbox')} value={n(overview.support.sandbox_covered_accounts)}
        note={l('Cobertura verificada en pruebas','Verified test coverage')}/>
       <Stat icon="money" label={l('Recaudado · Sandbox','Collected · Sandbox')} value={money(overview.support.sandbox_gross_minor)}
        note={l('Pago ficticio, no ingresos reales','Test money, not live revenue')} accent/>
      </div>
      <div className="pazo-admin-analytics-row grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
       <div className="min-w-0 xl:col-span-5">
        <DashboardPanel title={l('Crecimiento de usuarios','User growth')} action={()=>selectSection('users')}>
         <div className="mb-1 flex flex-wrap gap-4 text-[12px] font-semibold text-[#5B736C]">
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#176C52]"/> {l('Antiguas','Older')}</span>
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#8DCE67]"/> {l('Nuevas','New')}</span>
         </div>
         <AdminCohortColumns
          prior={Math.max(0,overview.people.registered-overview.people.new_30d)}
          older={Math.max(0,overview.people.new_30d-overview.people.new_7d)}
          recent={overview.people.new_7d}
          labels={lang==='es'?['Hace más de 30 días','Entre 8 y 30 días','Últimos 7 días']:['Over 30 days ago','8–30 days ago','Last 7 days']}/>
         <p className="text-[12px] leading-snug text-[#70857E]">{l('Cuentas existentes agrupadas por fecha de alta. No es una serie histórica.','Existing accounts grouped by signup date. This is not a historical time series.')}</p>
        </DashboardPanel>
       </div>
       <div className="min-w-0 xl:col-span-4">
        <DashboardPanel title={l('Actividad de la app','App activity')} action={()=>selectSection('activity')}>
         <div className="mb-4 flex flex-wrap gap-3 text-[12px] font-semibold text-[#6A8277]">
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#196D55]"/> {l('Usuarios únicos','Unique users')}</span>
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#91CC66]"/> {l('Por módulo','Per module')}</span>
         </div>
         {Object.keys(overview.activity.module_counts).length>0?
          <AdminModuleRings
           items={Object.entries(overview.activity.module_counts).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([key,count],i)=>({
            name:moduleNames[key]||key,value:count,color:['#156A50','#8DCE67','#EFB764','#788CD9'][i]
           }))}
           base={overview.activity.active_period}
           centerLabel={l('activos','active')}/>
          :<div className="flex min-h-[205px] flex-col items-center justify-center gap-3 text-center">
           <span className="rounded-full bg-[#EDF5E9] p-4 text-[#4F9773]"><AdminGlyph name="activity" size={30}/></span>
           <p className="max-w-[290px] text-[14px] font-semibold text-[#72877E]">{l('Aún no hay actividad registrada en este período.','No activity has been recorded for this period yet.')}</p>
          </div>}
         <p className="mt-3 text-[12px] leading-snug text-[#71857F]">{l('Días con acceso registrado por módulo. No representa sesiones ni tiempo conectado.','Tracked unique users by module, not sessions or time spent.')}</p>
        </DashboardPanel>
       </div>
       <div className="min-w-0 md:col-span-2 xl:col-span-3">
        <DashboardPanel title={l('Estado del sistema','System status')} action={()=>selectSection('infra')}>
         <div className="space-y-1">
          {[
           {key:'database' as const,name:'Supabase DB',info:bytes(overview.resources.database_bytes),good:true},
           {key:'layers' as const,name:'Storage',info:bytes(overview.resources.storage_estimated_bytes),good:true},
           {key:'chart' as const,name:l('Egreso','Egress'),info:l('Sin fuente','Unknown'),good:false},
           {key:'activity' as const,name:l('Disponibilidad','Uptime'),info:l('Sin fuente','Unknown'),good:false}
          ].map(item=><div key={item.name} className="flex min-h-[48px] items-center justify-between gap-2 border-0 py-1">
            <span className="flex items-center gap-2.5 text-[12px] font-semibold text-[#4E6E63]"><AdminGlyph name={item.key} size={18}/>{item.name}</span>
            <strong className={'text-[11px] '+(item.good?'text-[#138A53]':'text-[#8E9A94]')}>{item.info}</strong>
           </div>)}
         </div>
         <p className="mt-3 text-[11px] leading-snug text-[#8A9890]">{l('Medidas parciales; no confirma operatividad ni cuota.','Partial measurements; no uptime or quota claim.')}</p>
        </DashboardPanel>
       </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
       <DashboardPanel title={l('Membresías','Memberships')} action={()=>selectSection('finance')}>
        <div className="grid grid-cols-2 gap-3">
         <div className="rounded-[17px] bg-[#F7FAF4] p-3">
          <p className="text-[26px] font-black text-[#204E4A]">{n(overview.support.sandbox_covered_accounts)}</p>
          <p className="text-[12px] text-[#617C73]">{l('Cobertura Sandbox','Sandbox coverage')}</p>
         </div>
         <div className="rounded-[17px] bg-[#F7FAF4] p-3">
          <p className="text-[25px] font-black text-[#204E4A]">{money(overview.support.sandbox_gross_minor)}</p>
          <p className="text-[12px] text-[#617C73]">{l('Acreditado en pruebas','Verified test total')}</p>
         </div>
        </div>
        <div className="pazo-admin-finance-breakdown mt-5 grid grid-cols-[minmax(0,1fr)_minmax(125px,0.85fr)] items-center gap-4">
         <div className="flex min-h-[145px] items-end justify-around gap-3 rounded-[16px] bg-[#FAFCF7] px-4 pb-3 pt-4">
          {[
           {name:l('Períodos','Periods'),value:overview.support.sandbox_verified_periods,color:'#2F9668'},
           {name:l('Intentos','Attempts'),value:overview.support.checkout_attempts,color:'#90CE6E'},
           {name:l('Sin verificar','Unverified'),value:overview.support.attempts_without_verified_period,color:'#E4AD4C'}
          ].map(item=><div key={item.name} className="flex h-[123px] min-w-0 flex-1 flex-col items-center justify-end gap-2">
           <strong className="text-[15px] font-black text-[#294E45]">{item.value}</strong>
           <div className="w-full max-w-[62px] rounded-t-[8px]" style={{backgroundColor:item.color,height:(item.value?Math.max(12,item.value/Math.max(1,overview.support.checkout_attempts,overview.support.sandbox_verified_periods)*76):3)+'px',opacity:item.value?1:.2}}/>
          </div>)}
         </div>
         <div className="space-y-4">
          {[
           {name:l('Períodos','Periods'),value:overview.support.sandbox_verified_periods,color:'#2F9668'},
           {name:l('Intentos','Attempts'),value:overview.support.checkout_attempts,color:'#90CE6E'},
           {name:l('Sin verificar','Unverified'),value:overview.support.attempts_without_verified_period,color:'#E4AD4C'}
          ].map(item=><div key={item.name} className="flex items-center gap-2 text-[12px]">
           <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:item.color}}/>
           <span className="min-w-0 flex-1 text-[#526F63]">{item.name}</span>
           <strong className="text-[14px] text-[#294E45]">{item.value}</strong>
          </div>)}
         </div>
        </div>
        <p className="mt-3 text-[11px] text-[#72887B]">{l('Sandbox: dinero ficticio. No incluye ingresos Live.','Sandbox test money; Live revenue unavailable.')}</p>
       </DashboardPanel>
       <DashboardPanel title={l('Usuarios más frecuentes','Most frequent users')} action={()=>selectSection('users')}>
        <div className="space-y-2">
         {[...users].sort((a,b)=>b.active_days_30-a.active_days_30).slice(0,5).map((u,i)=>
          <div key={u.user_id} className="flex min-h-[46px] items-center gap-3">
           <span className={'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full font-black '+(i===0?'bg-[#DCF4DE] text-[#25824F]':'bg-[#EAF0E7] text-[#567266]')}>
            {u.pets[0]?.name?.slice(0,1)?.toUpperCase()||i+1}
           </span>
           <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-black text-[#253E35]">{u.pets[0]?.name||l('Cuenta sin mascota','Account without pets')}</p>
            <p className="truncate text-[11px] text-[#7B8E85]">{l('Actividad registrada','Recorded activity')}</p>
           </div>
           <span className="text-[12px] font-bold text-[#467F5F]">{u.active_days_30} {l('días','days')}</span>
          </div>)}
         {users.length===0&&<p className="text-[13px] text-[#71857F]">{l('Sin cuentas para mostrar.','No accounts to show.')}</p>}
        </div>
        <p className="mt-3 text-[11px] text-[#748981]">{l('Entre las cuentas de la página cargada; no es un ranking global.','From loaded accounts, not a global ranking.')}</p>
       </DashboardPanel>
       <DashboardPanel title={l('Fake Doors · interés','Fake Doors · interest')} action={()=>selectSection('ideas')}>
        <div className="space-y-2.5">{experiments.slice(0,5).map((item,i)=>
         <div key={item.key} className="flex min-h-[45px] items-center gap-2.5">
          <span className="w-5 shrink-0 text-[13px] font-black">{i+1}</span>
          <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full '+(i%3===0?'bg-[#DDF4D4] text-[#267F45]':i%3===1?'bg-[#E8EBFF] text-[#435DCA]':'bg-[#FFF0DB] text-[#C28034]')}>
           <AdminGlyph name="compass" size={17}/>
          </span>
          <div className="min-w-0 flex-1">
           <p className="truncate text-[13px] font-bold text-[#253D36]">{item.name}</p>
           <p className="text-[11px] text-[#799084]">{item.viewers} {l('vistas','views')}</p>
          </div>
          <div className="h-2.5 w-[21%] shrink-0 overflow-hidden rounded-full bg-[#EDF1EC]">
           <div className="h-full rounded-full bg-[#51B277]" style={{width:100*item.interested/Math.max(1,...experiments.map(v=>v.interested))+'%'}}/>
          </div>
          <strong className="w-7 shrink-0 text-right text-[12px]">{item.interested}</strong>
         </div>)}</div>
        <p className="mt-4 text-[12px] text-[#758A82]">{l('Con menos de 30 vistas, la muestra es insuficiente.','Fewer than 30 views is an insufficient sample.')}</p>
       </DashboardPanel>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
       <DashboardPanel title={l('Cuentas y mascotas','Accounts and pets')} action={()=>selectSection('pets')}>
        <AdminDonut total={overview.people.registered} centerLabel={l('cuentas','accounts')}
         parts={[
          {label:l('Con mascota','With pets'),count:overview.people.with_pet,color:'#227D58'},
          {label:l('Sin mascota','Without pets'),count:overview.people.without_pet,color:'#B8E3BA'}
         ]}/>
        <p className="mt-4 text-[12px] text-[#6E8479]">{l('Distribución por registro de mascotas, no por ubicación privada.','By pet ownership; no private geolocation displayed.')}</p>
       </DashboardPanel>
       <DashboardPanel title={l('Contenido de la app','App content')} action={()=>selectSection('content')}>
        <AdminDonut total={overview.people.posts+overview.people.comments+overview.people.communities}
         centerLabel={l('registros','records')}
         parts={[
          {label:l('Publicaciones','Posts'),count:overview.people.posts,color:'#188B63'},
          {label:l('Comentarios','Comments'),count:overview.people.comments,color:'#6D90EB'},
          {label:l('Comunidades','Communities'),count:overview.people.communities,color:'#F4BA77'}
         ]}/>
        <p className="mt-4 text-[12px] text-[#74877E]">{l('No es un gráfico de tipos de publicaciones.','This is not a post-type breakdown.')}</p>
       </DashboardPanel>
       <DashboardPanel title={l('Contenido y moderación','Content and moderation')} action={()=>selectSection('content')}>
        <div className="grid grid-cols-3 gap-2 text-center">
         {[
          {label:l('Posts','Posts'),value:overview.people.posts,icon:'layers' as const,bg:'bg-[#EDF6EB] text-[#3B9A66]'},
          {label:l('Comentarios','Comments'),value:overview.people.comments,icon:'heart' as const,bg:'bg-[#FFF2DD] text-[#D49341]'},
          {label:l('Denuncias','Reports'),value:null,icon:'alert' as const,bg:'bg-[#FCEAE9] text-[#CF696A]'}
         ].map(v=><div key={v.label} className="flex flex-col items-center gap-2 py-3">
          <span className={'flex h-11 w-11 items-center justify-center rounded-full '+v.bg}><AdminGlyph name={v.icon} size={20}/></span>
          <strong className="text-[21px] text-[#233B34]">{v.value===null?'—':n(v.value)}</strong>
          <span className="text-[11px] text-[#75847D]">{v.label}</span>
         </div>)}
        </div>
        <p className="mt-2 text-[12px] text-[#7B8981]">{l('Denuncias: consultar en el panel de Moderación.','Reports: see the moderation queue.')}</p>
        {onOpenReports&&<button type="button" onClick={onOpenReports}
         className="mt-4 min-h-11 w-full rounded-[15px] bg-[#F1F5EF] px-4 text-[13px] font-bold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F]">
         {l('Ver panel de denuncias','Open reports panel')}
        </button>}
       </DashboardPanel>
      </div>
      <Note>{l('Datos de PAZO en pruebas. Los importes de PayPal Sandbox NO son recaudación real. Actividad medida solo desde que se instaló el registro diario.','Staging data. PayPal Sandbox payments are NOT real revenue. Activity is measured only since daily tracking started.')} {l('Medición desde','Tracking since')}: {overview.activity.tracking_since}.</Note>
     </>}

     {section==='pets'&&<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <Stat icon="paw" label={l('Mascotas registradas','Registered pets')} value={overview.people.pets}/>
       <Stat icon="users" label={l('Cuentas con mascota','Accounts with pets')} value={overview.people.with_pet}/>
       <Stat icon="users" label={l('Cuentas sin mascota','Accounts without pets')} value={overview.people.without_pet}/>
       <Stat icon="layers" label={l('Cuentas registradas','Registered accounts')} value={overview.people.registered}/>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
       <DashboardPanel title={l('Distribución de mascotas','Pet ownership')}>
        <AdminDonut total={overview.people.registered} centerLabel={l('cuentas','accounts')}
         parts={[
          {label:l('Con mascota','With pets'),count:overview.people.with_pet,color:'#227D58'},
          {label:l('Sin mascota','Without pets'),count:overview.people.without_pet,color:'#B8E3BA'}
         ]}/>
       </DashboardPanel>
       <DashboardPanel title={l('Mascotas de las cuentas consultadas','Pets linked to listed accounts')}>
        <div className="space-y-2">
         {users.flatMap(u=>u.pets.map(p=>({owner:u.email,id:p.id,name:p.name,species:p.species}))).map(p=>
          <div key={p.id} className="flex items-center gap-3 rounded-[14px] bg-[#F6F9F4] p-3">
           <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E0F1DE] text-[#238154]">
            <AdminGlyph name="paw"/>
           </span>
           <div className="min-w-0">
            <p className="truncate text-[14px] font-black">{p.name}</p>
            <p className="truncate text-[12px] text-[#71847C]">{p.species} · {p.owner||l('Sin correo','No email')}</p>
           </div>
          </div>)}
         {users.every(u=>u.pets.length===0)&&<p className="text-[14px] text-[#71847C]">{l('No hay mascotas en esta página de cuentas.','No pets on this page of accounts.')}</p>}
        </div>
        <p className="mt-4 text-[12px] text-[#75877E]">{l('Listado paginado; usa Cuentas para avanzar entre registros.','Paginated list; use Users to browse further.')}</p>
        <button type="button" onClick={()=>selectSection('users')} className="mt-3 min-h-11 rounded-full bg-[#E1E53F] px-4 text-[13px] font-bold">{l('Ver cuentas','View accounts')}</button>
       </DashboardPanel>
      </div>
     </>}
     {section==='activity'&&<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <Stat icon="activity" label={l('Usuarios de hoy','Today’s users')} value={overview.activity.today}/>
       <Stat icon="calendar" label={l('Últimos 7 días','Last 7 days')} value={overview.activity.last_7d}/>
       <Stat icon="calendar" label={l('Últimos 30 días','Last 30 days')} value={overview.activity.last_30d}/>
       <Stat icon="users" label={l('Usuarios del período','Period users')} value={overview.activity.active_period}/>
      </div>
      <DashboardPanel title={l('Actividad registrada por módulo','Tracked activity per module')} description={l('Cuentas únicas observadas por sección','Unique accounts per section')}>
       <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Object.entries(overview.activity.module_counts).sort((a,b)=>b[1]-a[1]).map(([key,count])=>
         <div key={key} className="rounded-[15px] bg-[#F7F9F4] px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
           <span className="text-[14px] font-bold">{moduleNames[key]||key}</span><strong className="text-[16px]">{count}</strong>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#E5EDE0]">
           <div className="h-full rounded-full bg-[#3DA26F]" style={{width:100*count/Math.max(1,overview.activity.active_period)+'%'}}/>
          </div>
         </div>)}
        {Object.keys(overview.activity.module_counts).length===0&&<p className="p-4 text-[14px] text-[#71857F]">{l('Sin datos registrados para este período.','No tracked activity for this period.')}</p>}
       </div>
       <p className="mt-4 text-[13px] text-[#71857F]">{l('La actividad se mide por días y secciones, no por sesiones ni duración.','Activity is measured by days and sections, not session count or duration.')} {l('Desde','Since')}: {overview.activity.tracking_since}</p>
      </DashboardPanel>
     </>}
     {section==='content'&&<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <Stat icon="layers" label={l('Publicaciones','Posts')} value={overview.people.posts}/>
       <Stat icon="heart" label={l('Comentarios','Comments')} value={overview.people.comments}/>
       <Stat icon="users" label={l('Comunidades','Communities')} value={overview.people.communities}/>
       <Stat icon="chart" label={l('Total de registros','Total records')} value={overview.people.posts+overview.people.comments+overview.people.communities}/>
      </div>
      <DashboardPanel title={l('Contenido registrado en PAZO','Recorded PAZO content')}>
       <AdminDonut total={overview.people.posts+overview.people.comments+overview.people.communities}
        centerLabel={l('registros','records')}
        parts={[
         {label:l('Publicaciones','Posts'),count:overview.people.posts,color:'#188B63'},
         {label:l('Comentarios','Comments'),count:overview.people.comments,color:'#6D90EB'},
         {label:l('Comunidades','Communities'),count:overview.people.communities,color:'#F4BA77'}
        ]}/>
       <p className="mt-4 text-[13px] text-[#71857F]">{l('Desglose por registros existentes. Los tipos de publicación todavía no tienen una fuente analítica autorizada.','Breakdown of existing records. Post categories do not have an analytics source yet.')}</p>
      </DashboardPanel>
     </>}
     {section==='places'&&<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <Stat icon="pin" label={l('Eventos de Lugares','Places events')} value={overview.experiments.place_events}/>
       <Stat icon="search" label={l('Eventos de búsqueda','Search events')} value={overview.experiments.search_events}/>
       <Stat icon="compass" label={l('Experimentos de Lugares','Places experiments')} value={experiments.filter(x=>x.key.startsWith('places_')).length}/>
       <Stat icon="heart" label={l('Interés en Lugares','Places interest')} value={experiments.filter(x=>x.key.startsWith('places_')).reduce((sum,x)=>sum+x.interested,0)}
        note={l('Suma por experimento; puede repetir personas','Sum per experiment; people may overlap')}/>
      </div>
      <DashboardPanel title={l('Ideas de Lugares','Places ideas')}>
       <div className="space-y-3">{experiments.filter(x=>x.key.startsWith('places_')).map((x,i)=>
        <button key={x.key} type="button" onClick={()=>{setSection('ideas');void selectDoor(x.key)}}
         className="flex min-h-[60px] w-full items-center gap-3 rounded-[15px] bg-[#F7F9F4] px-4 text-left hover:bg-[#EAF1E4] focus-visible:bg-[#E1E53F]">
         <span className="text-[14px] font-black">{i+1}</span>
         <span className="min-w-0 flex-1">
          <strong className="block truncate text-[15px]">{x.name}</strong>
          <small className="text-[12px] text-[#71857F]">{x.viewers} {l('vieron','viewed')} · {x.interested} {l('mostraron interés','interested')}</small>
         </span>
         <AdminGlyph name="chart" size={19}/>
        </button>)}</div>
       <p className="mt-4 text-[13px] text-[#71857F]">{l('Estos eventos son conteos de interacciones, no visitas únicas ni posiciones GPS.','Events are interaction counts, not unique visits or GPS positions.')}</p>
      </DashboardPanel>
     </>}
     {section==='users'&&<>
      <Note>{l('Cuentas autenticadas y mascotas asociadas. Solo administradores pueden consultar esta lista. Los días activos no son sesiones: son días diferentes con uso de módulos medido.','Authenticated accounts and their pets. Only administrators can view this list. Active days are distinct days with tracked usage.')}</Note>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label={l('Con mascota','With pets')} value={overview.people.with_pet}/><Stat label={l('Sin mascota','Without pet')} value={overview.people.without_pet}/></div>
      <h3 className="text-[17px] font-black">{l('Cuentas y sus mascotas','Accounts and pets')}</h3>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{users.map(u=><article key={u.user_id} className="rounded-[22px] bg-white p-4 shadow-[0_4px_15px_rgba(32,78,74,0.035)]">
       <p className="break-words text-[14px] font-black">{u.email||l('Cuenta sin correo visible','Account without visible email')}</p>
       <p className="mt-1 text-[11px] text-[#5C7470]">{l('Registro','Joined')}: {age(u.created_at)} · {l('Días activos últimos 30','Active days last 30')}: {u.active_days_30}</p>
       <div className="mt-2 flex flex-wrap gap-1.5">{u.pets.length?u.pets.map(p=>
        <span key={p.id} className="rounded-full bg-[#E9EFDE] px-3 py-1 text-[12px] font-bold">{p.name} · {p.species}</span>)
        :<span className="text-[12px] text-[#5C7470]">{l('Sin mascotas','No pets')}</span>}
       </div>
       <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
        {u.has_verified_sandbox_coverage&&<span className="rounded-full bg-[#E1E53F] px-2 py-1">{l('Cobertura Sandbox','Sandbox coverage')}</span>}
        {u.unverified_checkout_attempts>0&&<span className="rounded-full bg-[#FFF1D5] px-2 py-1">{u.unverified_checkout_attempts} {l('intentos sin pago verificado','unverified attempts')}</span>}
       </div>
      </article>)}</div>
      <div className="flex items-center justify-between">
       <button type="button" disabled={userOffset===0||loading} onClick={()=>setUserOffset(Math.max(0,userOffset-30))}
        className="rounded-full bg-white px-4 py-2 text-[12px] font-bold disabled:opacity-40">{l('Anterior','Previous')}</button>
       <span className="text-[12px] text-[#5C7470]">{userOffset+1}–{userOffset+users.length}</span>
       <button type="button" disabled={users.length<30||loading} onClick={()=>setUserOffset(userOffset+30)}
        className="rounded-full bg-white px-4 py-2 text-[12px] font-bold disabled:opacity-40">{l('Siguiente','Next')}</button>
      </div>
     </>}
     {section==='finance'&&<>
      <AdminLiveFinanceSummary lang={lang}/>
      <Note>{l('Sandbox es dinero ficticio. Una solicitud sin período verificado no prueba abandono ni cobro. Las cifras Sandbox se muestran separadas del registro Live.','Sandbox is fictional money. An unverified request does not prove abandonment or payment. Sandbox figures are separate from the Live ledger.')}</Note>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <Stat label={l('Sandbox · bruto verificado','Sandbox · verified gross')} value={money(overview.support.sandbox_gross_minor)}/>
       <Stat label={l('Personas con período Sandbox','Accounts with Sandbox period')} value={overview.support.sandbox_paid_accounts}/>
       <Stat label={l('Cobertura Sandbox vigente','Current Sandbox coverage')} value={overview.support.sandbox_covered_accounts}/>
       <Stat label={l('Intentos de checkout','Checkout attempts')} value={overview.support.checkout_attempts}/>
       <Stat label={l('Intentos sin período verificado','Attempts without verified period')} value={overview.support.attempts_without_verified_period}/>
       <Stat label={l('Períodos retenidos','Held periods')} value={overview.support.sandbox_held_periods}/>
       <Stat label={l('Períodos verificados','Verified paid periods')} value={overview.support.sandbox_verified_periods}/>
      </div>
      <h3 className="text-[16px] font-black">{l('Seguimiento de cuentas','Account follow-up')}</h3>
      <div className="space-y-2">{users.filter(u=>u.ever_sandbox_paid||u.unverified_checkout_attempts>0).map(u=><div key={u.user_id} className="rounded-[20px] bg-white p-4">
       <p className="break-words text-[13px] font-black">{u.email||u.user_id}</p>
       <p className="mt-1 text-[12px] text-[#5C7470]">{u.has_verified_sandbox_coverage?l('Período Sandbox verificado','Verified Sandbox period'):l('Sin cobertura Sandbox actual','No current Sandbox coverage')} · {u.unverified_checkout_attempts} {l('intentos sin acreditación','unverified attempts')}</p>
      </div>)}
      {!users.some(u=>u.ever_sandbox_paid||u.unverified_checkout_attempts>0)&&<p className="text-[12px] text-[#5C7470]">{l('No hay cuentas con señales financieras en esta página.','No payment signals on this page of accounts.')}</p>}</div>
     </>}
     {section==='ideas'&&<>
      <Note>{l('Prioridad orientativa: primero interés por usuario único y conversión; menos de 30 visitantes únicos = muestra insuficiente. No decidir desarrollo solo con toques repetidos.','Directional priority: unique interested users and conversion; fewer than 30 unique viewers is insufficient sample.')}</Note>
      <div className="grid grid-cols-2 gap-3">
       <Stat label={l('Vistas registradas','Tracked views')} value={overview.experiments.tracked_views}/>
       <Stat label={l('Interesados únicos','Unique interested users')} value={overview.experiments.interested_accounts}/>
       <Stat label={l('Opciones votadas','Intent votes')} value={overview.experiments.intent_votes}/>
       <Stat label={l('Experimentos','Experiments')} value={experiments.length}/>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{experiments.map((item,index)=><article key={item.key} className="rounded-[22px] bg-white px-4 py-3">
       <div className="flex items-start justify-between gap-3"><div className="min-w-0">
        <p className="text-[11px] font-extrabold text-[#7B908A]">{index+1}. {item.key.startsWith('places_')?'LUGARES':'COMUNIDADES'}</p>
        <h4 className="text-[15px] font-black">{item.name}</h4>
       </div><span className="shrink-0 rounded-full bg-[#EEF2DF] px-2 py-1 text-[11px] font-extrabold">{item.interested} {l('votos','votes')}</span></div>
       <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-[#5C7470]">
        <span>{item.viewers} {l('vieron','viewers')}</span><span>{item.interest_rate===null?'—':item.interest_rate+'%'}</span>
        <span>{item.confidence==='insufficient'?l('Muestra insuficiente','Insufficient sample'):item.confidence==='reasonable'?l('Muestra razonable','Reasonable sample'):l('Orientativo','Directional')}</span>
       </div>
       {item.choices.length>0&&<p className="mt-2 text-[12px] text-[#476862]">
        {item.choices.map(c=>(optionLabels[c.option]||c.option)+': '+c.votes).join(' · ')}
       </p>}
       <button type="button" onClick={()=>void selectDoor(item.key)}
        className="mt-3 rounded-full bg-[#E1E53F] px-4 py-2 text-[12px] font-bold focus-visible:bg-[#EBF27A]">
        {voterKey===item.key?l('Ocultar votantes','Hide voters'):l('Ver quién mostró interés','View interested users')}
       </button>
       {voterKey===item.key&&<div className="mt-3 space-y-2 rounded-2xl bg-[#F4F6EE] p-3">
        {voterBusy&&<p className="text-[12px]">{l('Cargando participación…','Loading participation…')}</p>}
        {voters?.length===0&&<p className="text-[12px] text-[#5C7470]">{l('Sin votos registrados.','No recorded votes.')}</p>}
        {voters?.length? <div className="space-y-1">
         <p className="text-[12px] font-black">{l('Personas que votaron','Interested voters')}</p>
         {voters.map((v,i)=><p key={v.user_id+'-'+i} className="break-words text-[12px]">
          <span className="font-bold">{v.email||v.user_id}</span>
          <span className="ml-2 text-[#5C7470]">{v.choice?optionLabels[v.choice]||v.choice:l('Interés general','General interest')}</span>
         </p>)}
        </div>:null}
        {audience?.length? <div className="space-y-1 pt-2">
         <p className="text-[12px] font-black">{l('Personas que vieron la función','People who saw the feature')}</p>
         {audience.map((v,i)=><p key={v.user_id+'-'+i} className="break-words text-[12px]">
          <span className="font-bold">{v.email||v.user_id}</span>
          <span className="ml-2 text-[#5C7470]">{v.interested?l('Votó','Voted'):l('Solo la vio','Viewed only')}</span>
         </p>)}
        </div>:null}
       </div>}
      </article>)}</div>
     </>}
     {section==='infra'&&<>
      <Note>{l('Supabase no expone aquí toda la facturación, ancho de banda ni cuotas. Base de datos y objetos son medidas parciales; consulta el Dashboard del proveedor para facturación y egreso oficiales.','Provider billing, bandwidth and quotas are not available through this database RPC. Values below are partial.')}</Note>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
       <Stat label={l('Base PostgreSQL','PostgreSQL database')} value={bytes(overview.resources.database_bytes)}/>
       <Stat label={l('Objetos en Storage','Storage objects')} value={overview.resources.stored_objects}/>
       <Stat label={l('Storage · tamaño estimado','Estimated Storage size')} value={bytes(overview.resources.storage_estimated_bytes)}/>
       <Stat label={l('Consumo facturable total','Total billable usage')} value={l('No disponible','Unavailable')}/>
       <Stat label={l('Egreso / ancho de banda','Egress / bandwidth')} value={l('No disponible','Unavailable')}/>
       <Stat label={l('Costo mensual Supabase','Supabase monthly cost')} value={l('No disponible','Unavailable')}/>
      </div>
      <p className="text-[12px] leading-relaxed text-[#5C7470]">{l('Estas cifras no representan una factura ni las cuotas contratadas. No se crean recursos nuevos o de pago.','These figures are not a billing statement or contracted quotas. No new billable infrastructure is provisioned.')}</p>
     </>}
    </div>}
    </div>
   </main>
  </div>
 </div>,document.body)
}
