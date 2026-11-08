import { useCallback,useEffect,useRef,useState } from 'react'
import { createPortal } from 'react-dom'
import { AdminPayPalSettings } from './AdminPayPalSettings'
import { AdminMarketingPanel } from './AdminMarketingPanel'
import {ExecutiveAnalytics} from '../../marketing/ExecutiveAnalytics'
import {AdminSupportInbox} from '../../support/components/AdminSupportInbox'
import {AdminGiftBenefits} from '../../support/components/AdminGiftBenefits'
import {AdminMaintenanceControls} from '../../maintenance/AdminMaintenanceControls'
import {AdminLiveFinanceSummary} from './AdminLiveFinanceSummary'
import {AdminVigilanteInbox} from '../../vigilante/admin/AdminVigilanteInbox'
import { AdminGlyph,AdminDonut,AdminCohortColumns,AdminModuleRings,type AdminGlyphName } from './AdminVisuals'
import { InfoTip,PulseTile,RankBars } from './AdminClarity'
import {AdminSignupReadout} from './AdminSignupReadout'
import {AdminPwaInstallationCounts} from './AdminPwaInstallationCounts'
import {
 adminOverview,adminUsers,adminExperiments,adminVoters,adminAudience,
 type AdminOverview,type AdminUser,type AdminExperiment,type AdminVoter,type AdminAudience,
} from '../adminDashboardService'

type Section='summary'|'users'|'pets'|'finance'|'activity'|'marketing'|'behavior'|'content'|'ideas'|'places'|'infra'|'reports'|'paypal'|'support'|'gifts'|'maintenance'|'vigilante'
type NavGroup='home'|'people'|'growth'|'money'|'ops'
const navGroups:{key:NavGroup;es:string;en:string}[]=[
 {key:'home',es:'',en:''},
 {key:'people',es:'Comunidad',en:'Community'},
 {key:'growth',es:'Crecimiento',en:'Growth'},
 {key:'money',es:'Dinero',en:'Money'},
 {key:'ops',es:'Operación',en:'Operations'},
]
const sections:{key:Section;es:string;en:string;icon:AdminGlyphName;group:NavGroup;navEs?:string;navEn?:string}[]=[
 {key:'summary',es:'Resumen',en:'Overview',icon:'chart',group:'home'},
 {key:'users',es:'Usuarios',en:'Users',icon:'users',group:'people'},
 {key:'pets',es:'Mascotas',en:'Pets',icon:'paw',group:'people'},
 {key:'activity',es:'Actividad',en:'Activity',icon:'calendar',group:'people'},
 {key:'content',es:'Contenido',en:'Content',icon:'layers',group:'people'},
 {key:'marketing',es:'Campañas',en:'Campaigns',icon:'flame',group:'growth'},
 {key:'behavior',es:'Comportamiento',en:'Behavior',icon:'activity',group:'growth'},
 {key:'ideas',es:'Fake Doors',en:'Fake Doors',icon:'compass',group:'growth'},
 {key:'places',es:'Lugares',en:'Places',icon:'pin',group:'growth'},
 {key:'finance',es:'Membresías',en:'Memberships',icon:'crown',group:'money'},
 {key:'gifts',es:'Beneficios de cortesía',en:'Complimentary benefits',icon:'heart',group:'money',navEs:'Cortesías',navEn:'Complimentary'},
 {key:'vigilante',es:'Vigilante',en:'Vigilante',icon:'search',group:'ops'},
 {key:'reports',es:'Denuncias',en:'Reports',icon:'alert',group:'ops'},
 {key:'support',es:'Soporte',en:'Support',icon:'search',group:'ops'},
 {key:'maintenance',es:'Mantenimiento',en:'Maintenance',icon:'clock',group:'ops'},
 {key:'infra',es:'Supabase',en:'Supabase',icon:'database',group:'ops'},
 {key:'paypal',es:'Configuración · PayPal',en:'Settings · PayPal',icon:'settings',group:'ops',navEs:'PayPal',navEn:'PayPal'},
]
const overviewSections:Section[]=['users','pets','finance','activity','content','ideas','places','infra']
const periodSections:Section[]=['activity','marketing']
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
 return <div className="pazo-admin-kpi flex min-h-[136px] min-w-0 items-center gap-3 rounded-[18px] bg-white px-4 py-4 shadow-[0_8px_30px_rgba(32,78,74,0.065)]">
  {icon&&<span aria-hidden="true" className={'hidden h-11 w-11 shrink-0 items-center justify-center rounded-full sm:flex '+
   (accent?'bg-[#E4F9DC] text-[#17823E]':icon==='crown'?'bg-[#FFF0D6] text-[#E0982C]':'bg-[#E2F8E8] text-[#166D54]')}>
   <AdminGlyph name={icon} size={22}/>
  </span>}
  <div className="min-w-0 flex-1">
   <p className="text-[13px] font-semibold leading-snug text-[#354D47]">{label}</p>
   <p className={"mt-1 break-words text-[26px] font-bold leading-tight tracking-tight lg:text-[29px] "+(accent?"text-[#137946]":"text-[#142D29]")}>{value}</p>
   {note&&<p className="mt-1 text-[12px] font-semibold leading-snug text-[#698079]">{note}</p>}
  </div>
 </div>
}

function DashboardPanel({title,info,infoLabel,children,action}:{
 title:string;info?:string;infoLabel?:string;children:React.ReactNode;action?:()=>void
}){
 return <section className="pazo-admin-panel min-w-0 rounded-[18px] bg-white p-5 shadow-[0_7px_29px_rgba(32,78,74,0.06)]">
  <div className="flex items-center justify-between gap-3">
   <div className="flex min-w-0 items-center gap-2"><h3 className="text-[16px] font-bold tracking-tight text-[#1D322D]">{title}</h3>
    {info&&<InfoTip label={infoLabel??title}>{info}</InfoTip>}</div>
   {action&&<button type="button" onClick={action} aria-label={title} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#204E4A] hover:bg-[#E9F1E3] focus-visible:bg-[#E1E53F]"><AdminGlyph name="chevron" size={19}/></button>}
  </div>
  <div className="mt-4">{children}</div>
 </section>
}

function PageTools({lang,show,showRefresh,loading,overview,onRefresh,children}:{lang:'es'|'en';show:boolean;showRefresh:boolean;loading:boolean;overview:AdminOverview|null;onRefresh:()=>void;children:React.ReactNode}){
 if(!show&&!showRefresh)return null
 const l=(es:string,en:string)=>lang==='es'?es:en
 return <div className="ac-tools">
  {showRefresh&&overview&&<small>{l('Actualizado ','Updated ')}{new Date(overview.as_of).toLocaleString(lang==='es'?'es-US':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small>}
  {show&&children}
  {showRefresh&&<button type="button" onClick={onRefresh} disabled={loading} aria-label={l('Actualizar','Refresh')} className="ac-refresh"><span aria-hidden="true">↻</span></button>}
 </div>
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
  <aside className="pazo-admin-sidebar hidden min-h-0 flex-col bg-white px-4 pb-4 pt-5 shadow-[5px_0_30px_rgba(32,78,74,0.025)] lg:flex">
   <p className="pazo-admin-wordmark px-3 text-[32px] font-black tracking-[-0.07em] text-[#204E4A]">pazo<span className="text-[#E1E53F]">.</span></p>
   <nav aria-label={l('Secciones del panel','Dashboard sections')} className="pazo-admin-navigation mt-2 flex flex-1 flex-col overflow-y-auto">
    {navGroups.map(group=><div key={group.key}>
     {group.es&&<p className="ac-nav-group">{lang==='es'?group.es:group.en}</p>}
     {visibleSections.map(item=>item.group!==group.key?null:<button key={item.key} type="button" aria-current={section===item.key?'page':undefined}
      onClick={()=>selectSection(item.key)} className="ac-nav-item">
      <AdminGlyph name={item.icon} size={18}/><span>{lang==='es'?item.navEs??item.es:item.navEn??item.en}</span>
     </button>)}
    </div>)}
   </nav>
   <div className="pazo-admin-sidebar-message mt-2 flex items-center gap-2 overflow-hidden rounded-[14px] bg-[#F5F9EE] px-2 py-1">
    <img src="/supporter/gratitude-empty-pets.svg" alt="" className="h-[48px] w-[44px] shrink-0 object-contain" aria-hidden="true"/>
    <p className="min-w-0 text-[11px] font-bold leading-snug text-[#204E4A]">{l('PAZO seguirá siendo gratis para todos','PAZO will remain free for everyone')}</p>
   </div>
   <button type="button" onClick={onClose} className="mt-2 min-h-11 rounded-full bg-[#F5F6F1] px-4 text-[13px] font-bold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F]">
    {l('Volver a PAZO','Back to PAZO')}
   </button>
  </aside>
  <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
   <header className="pazo-admin-header z-10 shrink-0 bg-[#F8F9F6]/95 px-4 pb-3 pt-4 backdrop-blur-md sm:px-6 lg:px-7 lg:pb-3 lg:pt-5">
    <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3">
     <div className="min-w-0">
      <p className="text-[11px] font-black tracking-wide text-[#739087] lg:hidden">pazo. · ADMIN</p>
      <h2 className="sr-only lg:not-sr-only lg:text-[27px] lg:font-black lg:tracking-tight lg:text-[#162B29]">
       {lang==='es'?sections.find(item=>item.key===section)?.es:sections.find(item=>item.key===section)?.en}
      </h2>
     </div>
     <div className="flex shrink-0 items-center gap-2">
      <div className="hidden lg:block"><PageTools lang={lang} show={periodSections.includes(section)} showRefresh={overviewSections.includes(section)} loading={loading} overview={overview} onRefresh={()=>void refresh()}>{periodSelector}</PageTools></div>
      <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white px-4 py-2 text-[12px] font-extrabold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F] lg:hidden">
       {l('Volver','Back')}
      </button>
     </div>
    </div>
    <nav aria-label={l('Secciones del panel','Dashboard sections')} className="mx-auto mt-3 max-w-[1600px] lg:hidden">
     <label htmlFor="pazo-admin-section" className="sr-only">{l('Sección del panel','Dashboard section')}</label>
     <select id="pazo-admin-section" aria-label={l('Secciones del panel','Dashboard sections')} value={section} onChange={e=>selectSection(e.target.value as Section)}
       className="min-h-11 w-full rounded-[14px] bg-white px-4 text-[13px] font-bold text-[#204E4A] focus-visible:bg-[#E1E53F]">
      {navGroups.map(group=>{
       const options=visibleSections.map(item=>item.group===group.key?<option key={item.key} value={item.key}>{lang==='es'?item.es:item.en}</option>:null)
       return group.es?<optgroup key={group.key} label={lang==='es'?group.es:group.en}>{options}</optgroup>:options
      })}
     </select>
    </nav>
   </header>
   <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 lg:px-7 lg:pt-1">
    <div className="mx-auto max-w-[1600px] space-y-4 lg:space-y-4">
     <div className="lg:hidden"><PageTools lang={lang} show={periodSections.includes(section)} showRefresh={overviewSections.includes(section)} loading={loading} overview={overview} onRefresh={()=>void refresh()}>{periodSelector}</PageTools></div>
     {section==='paypal'&&<AdminPayPalSettings lang={lang}/>}
     {section==='support'&&<AdminSupportInbox lang={lang}/>}
     {section==='gifts'&&<AdminGiftBenefits lang={lang}/>}
     {section==='maintenance'&&<AdminMaintenanceControls lang={lang}/>}
     {section==='vigilante'&&<AdminVigilanteInbox lang={lang}/>}
     {section==='marketing'&&<AdminMarketingPanel lang={lang} period={period}/>}
     {section==='summary'&&error&&!overview&&<div role="alert" className="flex items-center justify-between gap-3 rounded-[16px] bg-[#F9E7DE] px-4 py-2 text-[13px] text-[#823E2D]">
       {l('No fue posible cargar las cifras generales.','General figures could not be loaded.')}
       <button type="button" onClick={()=>void refresh()} className="min-h-11 shrink-0 rounded-[12px] bg-white px-4 text-[12px] font-bold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F]">{l('Reintentar general','Retry general')}</button>
      </div>}
     {section==='summary'&&<div className="ac-pulse-row">
      <PulseTile icon="users" label={l('Usuarios','Users')} value={overview?n(overview.people.registered):'—'} hint={overview&&overview.people.new_7d>0?'+'+n(overview.people.new_7d)+l(' en 7 días',' in 7 days'):undefined} onOpen={()=>selectSection('users')}/>
      <PulseTile icon="paw" label={l('Mascotas','Pets')} value={overview?n(overview.people.pets):'—'} onOpen={()=>selectSection('pets')}/>
      <PulseTile icon="calendar" label={l('Activos hoy','Active today')} value={overview?n(overview.activity.today):'—'} onOpen={()=>selectSection('activity')}/>
      <PulseTile icon="layers" label={l('Publicaciones','Posts')} value={overview?n(overview.people.posts):'—'} onOpen={()=>selectSection('content')}/>
     </div>}
     {section==='summary'&&<AdminPwaInstallationCounts lang={lang}/>}
     {(section==='summary'||section==='behavior')&&<ExecutiveAnalytics key={section} lang={lang} view={section==='summary'?'overview':'full'} onOpenMarketing={()=>selectSection('marketing')} onOpenBehavior={()=>selectSection('behavior')}/>}
     {section!=='paypal'&&section!=='marketing'&&section!=='behavior'&&section!=='summary'&&loading&&overviewSections.includes(section)&&<p role="status" className="rounded-2xl bg-white p-5 text-[13px]">{l('Consultando datos…','Loading data…')}</p>}
     {section!=='paypal'&&section!=='marketing'&&section!=='behavior'&&section!=='summary'&&error&&overviewSections.includes(section)&&<div role="alert" className="rounded-[20px] bg-[#F9E7DE] p-4 text-[13px] text-[#823E2D]">
       {l('No fue posible actualizar todos los datos.','Could not refresh all metrics.')} {error}
      </div>}
    {overview&&section!=='paypal'&&section!=='marketing'&&section!=='behavior'&&<div className={loading?'pointer-events-none opacity-50':'space-y-4'}>

     {section==='summary'&&<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-4">
       <DashboardPanel title={l('Módulos más usados','Most used modules')} action={()=>selectSection('activity')}
        info={l('Cuentas únicas por módulo en los últimos 30 días. No representa sesiones ni tiempo conectado.','Unique accounts per module over the last 30 days. Not sessions or time spent.')}>
        <RankBars empty={l('Sin actividad registrada.','No recorded activity.')} rows={Object.entries(overview.activity.module_counts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([key,count])=>({key,label:moduleNames[key]||key,value:count,display:n(count)}))}/>
       </DashboardPanel>
      </div>
      <div className="min-w-0 xl:col-span-4">
       <DashboardPanel title={l('Ideas con más interés','Ideas with most interest')} action={()=>selectSection('ideas')}
        info={l('Con menos de 30 vistas, la muestra es insuficiente.','Fewer than 30 views is an insufficient sample.')}>
        <RankBars empty={l('Sin ideas registradas.','No recorded ideas.')} rows={[...experiments].sort((a,b)=>b.interested-a.interested).slice(0,5).map(item=>({key:item.key,label:item.name,value:item.interested,display:n(item.interested),meta:item.viewers+l(' vistas',' views')}))}/>
       </DashboardPanel>
      </div>
      <div className="min-w-0 md:col-span-2 xl:col-span-4">
       <DashboardPanel title={l('Cuentas con mascota','Accounts with pets')} action={()=>selectSection('pets')}>
        <AdminDonut total={overview.people.registered} centerLabel={l('cuentas','accounts')}
         parts={[
          {label:l('Con mascota','With pets'),count:overview.people.with_pet,color:'#227D58'},
          {label:l('Sin mascota','Without pets'),count:overview.people.without_pet,color:'#B8E3BA'}
         ]}/>
       </DashboardPanel>
      </div>
     </div>}

     {section==='pets'&&<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <Stat icon="paw" label={l('Mascotas','Pets')} value={overview.people.pets}/>
       <Stat icon="users" label={l('Con mascota','With pets')} value={overview.people.with_pet}/>
       <Stat icon="users" label={l('Sin mascota','Without pets')} value={overview.people.without_pet}/>
       <Stat icon="layers" label={l('Cuentas','Accounts')} value={overview.people.registered}/>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
       <DashboardPanel title={l('Cuentas con mascota','Accounts with pets')}>
        <AdminDonut total={overview.people.registered} centerLabel={l('cuentas','accounts')}
         parts={[
          {label:l('Con mascota','With pets'),count:overview.people.with_pet,color:'#227D58'},
          {label:l('Sin mascota','Without pets'),count:overview.people.without_pet,color:'#B8E3BA'}
         ]}/>
       </DashboardPanel>
       <DashboardPanel title={l('Mascotas','Pets')} info={l('Solo las cuentas de la página cargada; usa Usuarios para avanzar entre registros.','Only accounts on the loaded page; use Users to browse further.')}>
        <ul className="ac-rows">
         {users.flatMap(u=>u.pets.map(p=>({owner:u.email,id:p.id,name:p.name,species:p.species}))).map(p=>
          <li key={p.id} className="flex items-center gap-3 rounded-[12px] px-1 py-2">
           <span className="ac-avatar" aria-hidden="true"><AdminGlyph name="paw" size={19}/></span>
           <div className="ac-row-main">
            <p>{p.name}</p>
            <small className="truncate">{p.species} · {p.owner||l('Sin correo','No email')}</small>
           </div>
          </li>)}
        </ul>
        {users.every(u=>u.pets.length===0)&&<p className="ac-empty">{l('No hay mascotas en esta página.','No pets on this page.')}</p>}
        <button type="button" onClick={()=>selectSection('users')} className="mt-3 min-h-11 rounded-full bg-[#E1E53F] px-4 text-[13px] font-bold">{l('Ver cuentas','View accounts')}</button>
       </DashboardPanel>
      </div>
     </>}
     {section==='activity'&&<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <Stat icon="activity" label={l('Hoy','Today')} value={overview.activity.today}/>
       <Stat icon="calendar" label={l('7 días','7 days')} value={overview.activity.last_7d}/>
       <Stat icon="calendar" label={l('30 días','30 days')} value={overview.activity.last_30d}/>
       <Stat icon="users" label={l('En el período','In period')} value={overview.activity.active_period}/>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
       <DashboardPanel title={l('Los tres módulos principales','Top three modules')}
        info={l('Cuentas únicas del período por módulo; una cuenta puede usar varios. No representa sesiones ni tiempo conectado.','Unique accounts per module; one account can use several. Not sessions or time spent.')}>
        {Object.keys(overview.activity.module_counts).length>0?
         <AdminModuleRings
          items={Object.entries(overview.activity.module_counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([key,count],i)=>({
           name:moduleNames[key]||key,value:count,color:['#156A50','#8DCE67','#EFB764'][i]
          }))}
          base={overview.activity.active_period}
          centerLabel={l('activos','active')}/>
         :<p className="ac-empty">{l('Sin actividad en este período.','No activity in this period.')}</p>}
       </DashboardPanel>
       <DashboardPanel title={l('Todos los módulos','All modules')}
        info={l('La actividad se mide por días y secciones, no por sesiones ni duración. Desde: ','Activity is measured by days and sections, not session count or duration. Since: ')+overview.activity.tracking_since}>
        <RankBars empty={l('Sin actividad en este período.','No activity in this period.')} rows={Object.entries(overview.activity.module_counts).sort((a,b)=>b[1]-a[1]).map(([key,count])=>({key,label:moduleNames[key]||key,value:count,display:n(count)}))}/>
       </DashboardPanel>
      </div>
     </>}
     {section==='content'&&<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <Stat icon="layers" label={l('Publicaciones','Posts')} value={overview.people.posts}/>
       <Stat icon="heart" label={l('Comentarios','Comments')} value={overview.people.comments}/>
       <Stat icon="users" label={l('Comunidades','Communities')} value={overview.people.communities}/>
       <Stat icon="chart" label={l('Total','Total')} value={overview.people.posts+overview.people.comments+overview.people.communities}/>
      </div>
      <DashboardPanel title={l('Reparto del contenido','Content mix')} info={l('Desglose por registros existentes. Los tipos de publicación todavía no tienen una fuente analítica autorizada.','Breakdown of existing records. Post categories do not have an analytics source yet.')}>
       <div className="max-w-[520px]"><AdminDonut total={overview.people.posts+overview.people.comments+overview.people.communities}
        centerLabel={l('registros','records')}
        parts={[
         {label:l('Publicaciones','Posts'),count:overview.people.posts,color:'#188B63'},
         {label:l('Comentarios','Comments'),count:overview.people.comments,color:'#6D90EB'},
         {label:l('Comunidades','Communities'),count:overview.people.communities,color:'#F4BA77'}
        ]}/></div>
       {onOpenReports&&<button type="button" onClick={onOpenReports}
        className="mt-4 min-h-11 rounded-[15px] bg-[#F1F5EF] px-4 text-[13px] font-bold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F]">
        {l('Ver denuncias','Open reports')}
       </button>}
      </DashboardPanel>
     </>}
     {section==='places'&&<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <Stat icon="pin" label={l('Eventos','Events')} value={overview.experiments.place_events}/>
       <Stat icon="search" label={l('Búsquedas','Searches')} value={overview.experiments.search_events}/>
       <Stat icon="compass" label={l('Ideas','Ideas')} value={experiments.filter(x=>x.key.startsWith('places_')).length}/>
       <Stat icon="heart" label={l('Interés','Interest')} value={experiments.filter(x=>x.key.startsWith('places_')).reduce((sum,x)=>sum+x.interested,0)}/>
      </div>
      <DashboardPanel title={l('Ideas de Lugares','Places ideas')} action={()=>selectSection('ideas')}
       info={l('Los eventos son conteos de interacciones, no visitas únicas ni posiciones GPS. El interés se suma por idea y puede repetir personas.','Events are interaction counts, not unique visits or GPS positions. Interest adds up per idea and people may overlap.')}>
       <RankBars empty={l('Sin ideas registradas.','No recorded ideas.')} rows={experiments.filter(x=>x.key.startsWith('places_')).map(x=>({key:x.key,label:x.name,value:x.interested,display:n(x.interested),meta:x.viewers+l(' vistas',' views')}))}/>
      </DashboardPanel>
     </>}
     {section==='users'&&<>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
       <Stat icon="users" label={l('Usuarios','Users')} value={n(overview.people.registered)}/>
       <Stat icon="calendar" label={l('Nuevos en 7 días','New in 7 days')} value={n(overview.people.new_7d)}/>
       <Stat icon="paw" label={l('Con mascota','With pets')} value={overview.people.with_pet}/>
       <Stat icon="layers" label={l('Sin mascota','Without pet')} value={overview.people.without_pet}/>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><DashboardPanel title={l('Antigüedad de las cuentas','Account age')} info={l('Cuentas existentes agrupadas por fecha de alta. No es una serie histórica.','Existing accounts grouped by signup date. This is not a historical time series.')}>
       <AdminCohortColumns
        prior={Math.max(0,overview.people.registered-overview.people.new_30d)}
        older={Math.max(0,overview.people.new_30d-overview.people.new_7d)}
        recent={overview.people.new_7d}
        labels={lang==='es'?['Hace más de 30 días','Entre 8 y 30 días','Últimos 7 días']:['Over 30 days ago','8–30 days ago','Last 7 days']}/>
      </DashboardPanel>
      <DashboardPanel title={l('Cuentas con mascota','Accounts with pets')} action={()=>selectSection('pets')}>
       <AdminDonut total={overview.people.registered} centerLabel={l('cuentas','accounts')}
        parts={[
         {label:l('Con mascota','With pets'),count:overview.people.with_pet,color:'#227D58'},
         {label:l('Sin mascota','Without pets'),count:overview.people.without_pet,color:'#B8E3BA'}
        ]}/>
      </DashboardPanel></div>
      <AdminSignupReadout lang={lang} users={users}>{accounts=><>
      <DashboardPanel title={l('Cuentas','Accounts')} info={l('Solo administradores pueden consultar esta lista. Los días activos no son sesiones: son días diferentes con uso medido en los últimos 30.','Only administrators can view this list. Active days are not sessions: they are distinct days with tracked usage in the last 30.')}>
       <ul className="ac-rows !gap-3">{users.map(u=>{
        const registration=accounts[u.user_id]
        return <li key={u.user_id} className="min-w-0 space-y-3 rounded-[16px] bg-[#F6F8F2] p-3 sm:p-4">
         <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-1 basis-44 items-center gap-2.5">
           <span className="ac-avatar shrink-0" aria-hidden="true">{(u.email||'?').slice(0,1).toUpperCase()}</span>
           <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-[#253E35] [overflow-wrap:anywhere]">{u.email||l('Sin correo visible','No visible email')}</p>
            <small className="text-[11px] text-[#536E64]">{age(u.created_at)}
             <span className="sm:hidden"> · {u.active_days_30} {u.active_days_30===1?l('día activo','active day'):l('días activos','active days')}</span>
            </small>
           </div>
          </div>
          <div className="hidden min-w-20 sm:block"><div className="ac-days"><span>{u.active_days_30} {u.active_days_30===1?l('día activo','active day'):l('días activos','active days')}</span><i aria-hidden="true"><b style={{width:Math.min(100,100*u.active_days_30/30)+'%'}}/></i></div></div>
         </div>
         {registration&&<dl className="grid grid-cols-3 gap-2 rounded-[12px] bg-white px-2.5 py-2 sm:px-3">
          <div>
           <dt className="text-[11px] font-semibold text-[#536E64]">{l('Registro','Sign-up')}</dt>
           <dd className="m-0 text-xs font-bold">{registration.method==='google'?'Google':registration.method==='email'?l('Correo','Email'):l('Otro método','Other method')}</dd>
          </div>
          <div>
           <dt className="text-[11px] font-semibold text-[#536E64]">{l('Confirmación','Confirmation')}</dt>
           <dd className={'m-0 text-xs font-bold '+(registration.confirmed?'text-[#166D54]':'text-[#805417]')}>{registration.confirmed?l('Confirmada','Verified'):l('Pendiente','Pending')}</dd>
           {registration.method==='email'&&registration.email_sent&&<dd className="m-0 text-[11px] leading-tight text-[#536E64]">{l('Envío registrado','Send recorded')}</dd>}
          </div>
          <div>
           <dt className="text-[11px] font-semibold text-[#536E64]">{l('Acceso','Sign-in')}</dt>
           <dd className="m-0 text-xs font-bold">{registration.signed_in?l('Inició sesión','Signed in'):l('Sin registro','No record')}</dd>
          </div>
         </dl>}
         {u.pets.length>0?<details className="group rounded-[12px] bg-[#EAF2E5]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[12px] px-3 text-xs font-bold outline-none focus-visible:bg-[#E1E53F] [&::-webkit-details-marker]:hidden">
           <AdminGlyph name="paw" size={16}/>
           <span className="flex-1">{l('Mascotas','Pets')}</span>
           <span>{u.pets.length}</span>
           <span className="group-open:rotate-90" aria-hidden="true"><AdminGlyph name="chevron" size={15}/></span>
          </summary>
          <ul className="m-0 grid grid-cols-2 list-disc gap-x-6 gap-y-1 pb-3 pl-8 pr-3 text-xs text-[#253E35] xl:grid-cols-3">
           {u.pets.map(p=><li key={p.id} className="min-w-0 [overflow-wrap:anywhere]">{p.name}</li>)}
          </ul>
         </details>:<p className="!m-0 flex items-center gap-2 rounded-[12px] bg-[#EAF2E5] px-3 py-2.5 text-xs font-semibold">
          <AdminGlyph name="paw" size={16}/><span>{l('Mascotas','Pets')}</span><span className="ml-auto text-[#536E64]">{l('Ninguna','None')}</span>
         </p>}
         {(u.has_verified_sandbox_coverage||u.unverified_checkout_attempts>0)&&<div className="ac-chips">
          {u.has_verified_sandbox_coverage&&<span className="ac-chip ac-chip-good">Sandbox</span>}
          {u.unverified_checkout_attempts>0&&<span className="ac-chip ac-chip-warn">{u.unverified_checkout_attempts} {l('sin verificar','unverified')}</span>}
         </div>}
        </li>
       })}</ul>
       <div className="mt-3 flex items-center justify-between">
        <button type="button" disabled={userOffset===0||loading} onClick={()=>setUserOffset(Math.max(0,userOffset-30))}
         className="min-h-11 rounded-full bg-[#F5F6F1] px-4 text-[12px] font-bold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F] disabled:opacity-40">{l('Anterior','Previous')}</button>
        <span className="text-[12px] text-[#5C7470]">{userOffset+1}–{userOffset+users.length}</span>
        <button type="button" disabled={users.length<30||loading} onClick={()=>setUserOffset(userOffset+30)}
         className="min-h-11 rounded-full bg-[#F5F6F1] px-4 text-[12px] font-bold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F] disabled:opacity-40">{l('Siguiente','Next')}</button>
       </div>
      </DashboardPanel>
      </>}</AdminSignupReadout>
     </>}
     {section==='finance'&&<>
      <AdminLiveFinanceSummary lang={lang}/>
      <details className="ac-quiet"><summary>{l('Datos de prueba · Sandbox','Test data · Sandbox')}<span aria-hidden="true">＋</span></summary><div className="space-y-4">
       <p className="text-[12px] leading-relaxed text-[#536E64]">{l('Los importes de PayPal Sandbox NO son recaudación real. Una solicitud sin período verificado no prueba abandono ni cobro.','PayPal Sandbox amounts are NOT real revenue. An unverified request does not prove abandonment or payment.')}</p>
       <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="money" label={l('Recaudado','Collected')} value={money(overview.support.sandbox_gross_minor)} note={l('Pago ficticio, no ingresos reales','Test money, not live revenue')} accent/>
        <Stat icon="crown" label={l('Cobertura vigente','Current coverage')} value={n(overview.support.sandbox_covered_accounts)}/>
        <Stat icon="users" label={l('Cuentas con período','Accounts with period')} value={overview.support.sandbox_paid_accounts}/>
        <Stat icon="check" label={l('Períodos verificados','Verified periods')} value={overview.support.sandbox_verified_periods}/>
        <Stat icon="activity" label={l('Intentos','Attempts')} value={overview.support.checkout_attempts}/>
        <Stat icon="alert" label={l('Sin verificar','Unverified')} value={overview.support.attempts_without_verified_period}/>
        <Stat icon="clock" label={l('Retenidos','Held')} value={overview.support.sandbox_held_periods}/>
       </div>
       <ul className="ac-rows">{users.filter(u=>u.ever_sandbox_paid||u.unverified_checkout_attempts>0).map(u=><li key={u.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] px-1 py-2">
        <p className="min-w-0 break-words text-[13px] font-black">{u.email||u.user_id}</p>
        <div className="ac-chips">{u.has_verified_sandbox_coverage&&<span className="ac-chip ac-chip-good">{l('Período verificado','Verified period')}</span>}{u.unverified_checkout_attempts>0&&<span className="ac-chip ac-chip-warn">{u.unverified_checkout_attempts} {l('sin verificar','unverified')}</span>}</div>
       </li>)}</ul>
      </div></details>
     </>}
     {section==='ideas'&&<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <Stat icon="search" label={l('Vistas','Views')} value={n(overview.experiments.tracked_views)}/>
       <Stat icon="users" label={l('Interesados únicos','Unique interested')} value={n(overview.experiments.interested_accounts)}/>
       <Stat icon="check" label={l('Votos','Votes')} value={n(overview.experiments.intent_votes)}/>
       <Stat icon="compass" label={l('Ideas','Ideas')} value={experiments.length}/>
      </div>
      <DashboardPanel title={l('Ranking de ideas','Idea ranking')} info={l('Prioridad orientativa: primero interés por usuario único y conversión. Con menos de 30 visitantes únicos la muestra es insuficiente; no decidir desarrollo solo con toques repetidos. Toca una idea para ver quién mostró interés.','Directional priority: unique interested users and conversion. Fewer than 30 unique viewers is an insufficient sample. Tap an idea to see who showed interest.')}>
       <div>{experiments.map((item,index)=><article key={item.key} className="ac-door" data-open={voterKey===item.key}>
        <button type="button" onClick={()=>void selectDoor(item.key)} aria-expanded={voterKey===item.key} className="ac-door-head">
         <span>{index+1}</span>
         <span className="ac-door-name"><strong>{item.name}</strong><small>{item.key.startsWith('places_')?l('Lugares','Places'):l('Comunidades','Communities')}</small></span>
         <span className="ac-door-bar" aria-hidden="true"><b style={{width:(item.interest_rate??0)+'%'}}/></span>
         <span className={'ac-chip '+(item.confidence==='insufficient'?'ac-chip-warn':'')}>{item.confidence==='insufficient'?l('Muestra insuficiente','Insufficient sample'):item.confidence==='reasonable'?l('Muestra razonable','Reasonable sample'):l('Orientativo','Directional')}</span>
         <span className="ac-door-score">{item.interest_rate===null?'—':item.interest_rate+'%'}<small>{item.interested} / {item.viewers}</small></span>
        </button>
        {voterKey===item.key&&<div className="mt-2 space-y-2 px-2 pb-1">
         {item.choices.length>0&&<div className="ac-chips">{item.choices.map(c=><span key={c.option} className="ac-chip">{(optionLabels[c.option]||c.option)+': '+c.votes}</span>)}</div>}
         {voterBusy&&<p className="text-[12px]">{l('Cargando participación…','Loading participation…')}</p>}
         {voters?.length===0&&<p className="text-[12px] text-[#5C7470]">{l('Sin votos registrados.','No recorded votes.')}</p>}
         {voters?.length? <div className="space-y-1">
          <p className="text-[12px] font-black">{l('Votaron','Voted')}</p>
          {voters.map((v,i)=><p key={v.user_id+'-'+i} className="break-words text-[12px]">
           <span className="font-bold">{v.email||v.user_id}</span>
           <span className="ml-2 text-[#5C7470]">{v.choice?optionLabels[v.choice]||v.choice:l('Interés general','General interest')}</span>
          </p>)}
         </div>:null}
         {audience?.length? <div className="space-y-1 pt-2">
          <p className="text-[12px] font-black">{l('Vieron la función','Saw the feature')}</p>
          {audience.map((v,i)=><p key={v.user_id+'-'+i} className="break-words text-[12px]">
           <span className="font-bold">{v.email||v.user_id}</span>
           <span className="ml-2 text-[#5C7470]">{v.interested?l('Votó','Voted'):l('Solo la vio','Viewed only')}</span>
          </p>)}
         </div>:null}
        </div>}
       </article>)}</div>
      </DashboardPanel>
     </>}
     {section==='infra'&&<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
       <Stat icon="database" label={l('Base de datos','Database')} value={bytes(overview.resources.database_bytes)}/>
       <Stat icon="layers" label={l('Tamaño de Storage','Storage size')} value={bytes(overview.resources.storage_estimated_bytes)} note={l('Estimado','Estimated')}/>
       <Stat icon="search" label={l('Objetos en Storage','Storage objects')} value={n(overview.resources.stored_objects)}/>
      </div>
      <DashboardPanel title={l('Fuera de este panel','Outside this panel')} info={l('Supabase no expone aquí facturación, ancho de banda ni cuotas; consulta su Dashboard para datos oficiales. Las cifras de arriba son parciales, no una factura. Egreso y disponibilidad: Sin fuente en PAZO.','Supabase does not expose billing, bandwidth or quotas here; check its Dashboard for official data. The figures above are partial, not a bill.')}>
       <div className="ac-unavailable">
        {[l('Consumo facturable','Billable usage'),l('Egreso','Egress'),l('Costo mensual','Monthly cost')].map(name=><span key={name} className="ac-chip">{name}: {l('No disponible','Unavailable')}</span>)}
       </div>
      </DashboardPanel>
     </>}
    </div>}
    </div>
   </main>
  </div>
 </div>,document.body)
}
