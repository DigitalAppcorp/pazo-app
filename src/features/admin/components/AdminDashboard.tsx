import { useCallback,useEffect,useState } from 'react'
import { createPortal } from 'react-dom'
import {
 adminOverview,adminUsers,adminExperiments,adminVoters,adminAudience,
 type AdminOverview,type AdminUser,type AdminExperiment,type AdminVoter,type AdminAudience,
} from '../adminDashboardService'

type Section='summary'|'users'|'finance'|'ideas'|'infra'
const sections:{key:Section;es:string;en:string}[]=[
 {key:'summary',es:'Resumen',en:'Overview'},
 {key:'users',es:'Cuentas',en:'Accounts'},
 {key:'finance',es:'Apoyo',en:'Support'},
 {key:'ideas',es:'Interés',en:'Interest'},
 {key:'infra',es:'Supabase',en:'Supabase'},
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
function Stat({label,value,note,accent}:{label:string;value:string|number;note?:string;accent?:boolean}){
 return <div className="min-w-0 rounded-[22px] bg-white px-4 py-4 shadow-[0_5px_24px_rgba(32,78,74,0.045)] lg:px-5 lg:py-5">
  <p className="text-[12px] font-bold text-[#5C7470] lg:text-[13px]">{label}</p>
  <p className={"mt-2 break-words text-[24px] font-black leading-tight tracking-tight lg:text-[30px] "+(accent?"text-[#168049]":"text-[#204E4A]")}>{value}</p>
  {note&&<p className="mt-1 text-[11px] leading-snug text-[#5C7470]">{note}</p>}
 </div>
}

function AdminNavIcon({section}:{section:Section}){
 return <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
  {section==='summary'&&<><path d="M3 11.2 12 4l9 7.2V20H3z"/><path d="M9 20v-6h6v6"/></>}
  {section==='users'&&<><circle cx="9" cy="8" r="3.2"/><path d="M3 20v-2.4a6 6 0 0 1 12 0V20M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 4.5V20"/></>}
  {section==='finance'&&<><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 15h3"/></>}
  {section==='ideas'&&<><path d="m12 2 2.5 7.2L22 12l-7.5 2.8L12 22l-2.5-7.2L2 12l7.5-2.8z"/></>}
  {section==='infra'&&<><ellipse cx="12" cy="5" rx="8.5" ry="3"/><path d="M3.5 5v7c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3V5M3.5 12v7c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3v-7"/></>}
 </svg>
}
function DashboardPanel({title,description,children,action}:{
 title:string;description?:string;children:React.ReactNode;action?:()=>void
}){
 return <section className="min-w-0 rounded-[24px] bg-white p-4 shadow-[0_4px_20px_rgba(32,78,74,0.045)] lg:p-5">
  <div className="flex items-start justify-between gap-3">
   <div className="min-w-0"><h3 className="text-[16px] font-black tracking-tight text-[#204E4A] lg:text-[17px]">{title}</h3>
    {description&&<p className="mt-1 text-[12px] text-[#71857F]">{description}</p>}</div>
   {action&&<button type="button" onClick={action} aria-label={title} className="rounded-full bg-[#F2F5EC] px-3 py-1.5 text-[13px] font-bold text-[#204E4A] hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F]">{action?"Ver":"Ver"}</button>}
  </div>
  <div className="mt-4">{children}</div>
 </section>
}

function Note({children}:{children:React.ReactNode}){
 return <p className="rounded-[18px] bg-[#EEF2DF] px-3 py-3 text-[12px] leading-relaxed text-[#4A6E67]">{children}</p>
}
export function AdminDashboard({lang,onClose,onOpenReports}:{lang:'es'|'en';onClose:()=>void;onOpenReports?:()=>void}){
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
 return createPortal(<div role="dialog" aria-modal="true" aria-label={l('Panel de administración','Admin dashboard')}
    data-pazo-admin-responsive="true"
    className="fixed inset-0 z-[200] flex h-[100dvh] w-full overflow-hidden bg-[#F5F6F1] font-sans text-[#204E4A] lg:grid lg:grid-cols-[235px_minmax(0,1fr)] xl:grid-cols-[255px_minmax(0,1fr)]">
  {/* Portal escapes the 430px mobile app shell on desktop; the rest of PAZO stays mobile-only. */}
  <aside className="hidden min-h-0 flex-col bg-white px-4 pb-6 pt-6 shadow-[5px_0_30px_rgba(32,78,74,0.025)] lg:flex">
   <p className="px-3 text-[36px] font-black tracking-[-0.07em] text-[#204E4A]">pazo<span className="text-[#E1E53F]">.</span></p>
   <div className="mt-8 flex items-center gap-3 rounded-[20px] bg-[#F7F9F2] px-3 py-4">
    <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1E53F] text-[22px] font-black">P</span>
    <div><p className="text-[13px] font-black">{l('Centro de control','Control center')}</p><p className="text-[11px] font-medium text-[#71857F]">{l('Administrador','Administrator')}</p></div>
   </div>
   <nav aria-label={l('Secciones del panel','Dashboard sections')} className="mt-5 flex flex-1 flex-col gap-1 overflow-y-auto">
    {sections.map(item=><button key={item.key} type="button" aria-current={section===item.key?'page':undefined}
     onClick={()=>setSection(item.key)}
     className={'flex min-h-12 w-full items-center gap-3 rounded-[16px] px-4 text-left text-[14px] font-bold transition-colors focus-visible:bg-[#E1E53F] '+
      (section===item.key?'bg-[#E5F0D8] text-[#204E4A]':'text-[#506864] hover:bg-[#F1F6E9]')}>
     <AdminNavIcon section={item.key}/><span>{lang==='es'?item.es:item.en}</span>
    </button>)}
   </nav>
   <div className="rounded-[20px] bg-[#F2F6E9] p-4 text-[12px] font-medium leading-relaxed text-[#476862]">
    <p className="font-black">{l('PAZO para todos','PAZO for everyone')}</p>
    <p className="mt-1">{l('Este panel solo es visible para administradores autorizados.','This panel is only visible to authorized administrators.')}</p>
   </div>
   <button type="button" onClick={onClose} className="mt-4 min-h-11 rounded-full bg-[#F5F6F1] px-4 text-[13px] font-bold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F]">
    {l('Volver a PAZO','Back to PAZO')}
   </button>
  </aside>
  <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
   <header className="z-10 shrink-0 bg-[#F5F6F1]/95 px-4 pb-3 pt-4 backdrop-blur-md sm:px-6 lg:px-8 lg:pb-5 lg:pt-7">
    <div className="mx-auto flex w-full max-w-[1500px] items-start justify-between gap-3">
     <div className="min-w-0">
      <p className="text-[11px] font-black tracking-wide text-[#739087] lg:hidden">pazo. · ADMIN</p>
      <h2 className="text-[24px] font-black tracking-tight text-[#173E39] lg:text-[30px]">
       {section==='summary'?l('Resumen general','General overview'):lang==='es'?sections.find(item=>item.key===section)?.es:sections.find(item=>item.key===section)?.en}
      </h2>
      <p className="mt-0.5 text-[12px] text-[#647C75] lg:text-[14px]">
       {section==='summary'?l('Así va PAZO, con los datos disponibles','PAZO at a glance, using available data'):l('Centro de administración de PAZO','PAZO administration center')}
      </p>
     </div>
     <div className="flex shrink-0 items-center gap-2">
      <span className="hidden items-center gap-2 rounded-full bg-white px-3 py-2 text-[12px] font-bold text-[#476862] shadow-sm sm:flex">
       <span className="h-2 w-2 rounded-full bg-[#38B66B]"/> {l('Datos de prueba','Test data')}
      </span>
      <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white px-4 py-2 text-[12px] font-extrabold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F] lg:hidden">
       {l('Volver','Back')}
      </button>
     </div>
    </div>
    <nav aria-label={l('Secciones del panel','Dashboard sections')}
      className="mx-auto mt-4 flex max-w-[1500px] gap-2 overflow-x-auto pb-1 lg:hidden">
     {sections.map(item=><button key={item.key} type="button" aria-current={section===item.key?'page':undefined}
       onClick={()=>setSection(item.key)}
       className={'flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[12px] font-bold transition-colors focus-visible:bg-[#E1E53F] '+
        (section===item.key?'bg-[#204E4A] text-white':'bg-white text-[#204E4A] hover:bg-[#E5EDCE]')}>
       <AdminNavIcon section={item.key}/>{lang==='es'?item.es:item.en}
      </button>)}
    </nav>
   </header>
   <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:px-8 lg:pt-4">
    <div className="mx-auto max-w-[1500px] space-y-5 lg:space-y-6">
     <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[12px] font-semibold text-[#6A8079]">
       {overview?l('Actualizado: ','Updated: ')+new Date(overview.as_of).toLocaleString(lang==='es'?'es-US':'en-US'):'—'}
      </p>
      <div className="flex items-center gap-2">{periodSelector}
       <button type="button" onClick={()=>void refresh()} disabled={loading}
        className="min-h-11 rounded-[15px] bg-[#E1E53F] px-4 py-2 text-[12px] font-extrabold disabled:opacity-50 hover:bg-[#EAF079] focus-visible:bg-[#EAF079]">
        {l('Actualizar','Refresh')}
       </button>
      </div>
     </div>
     {loading&&<p role="status" className="rounded-2xl bg-white p-5 text-[13px]">{l('Consultando datos autorizados…','Loading authorized data…')}</p>}
     {error&&<div role="alert" className="rounded-[20px] bg-[#F9E7DE] p-4 text-[13px] text-[#823E2D]">
       {l('No fue posible actualizar todos los datos.','Could not refresh all metrics.')} {error}
      </div>}
    {overview&&<div className={loading?'pointer-events-none opacity-50':'space-y-5'}>

     {section==='summary'&&<>
      <Note>{l('Datos de PAZO en pruebas. Los importes de PayPal Sandbox NO son recaudación real. Actividad medida solo desde que se instaló el registro diario.','Staging data. PayPal Sandbox payments are NOT real revenue. Activity is measured only since daily tracking started.')} {l('Medición desde','Tracking since')}: {overview.activity.tracking_since}.</Note>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
       <Stat label={l('Usuarios registrados','Registered users')} value={n(overview.people.registered)}
         note={l('Altas en los últimos 30 días: ','New in last 30 days: ')+n(overview.people.new_30d)}/>
       <Stat label={l('Mascotas','Pets')} value={n(overview.people.pets)}
         note={l('Cuentas con mascota: ','Accounts with pets: ')+n(overview.people.with_pet)}/>
       <Stat label={l('Amigos de PAZO · Sandbox','PAZO friends · Sandbox')} value={n(overview.support.sandbox_covered_accounts)}
         note={l('Cobertura de prueba verificada','Verified test coverage')}/>
       <Stat label={l('Total acreditado · Sandbox','Verified total · Sandbox')} value={money(overview.support.sandbox_gross_minor)}
         note={l('Dinero ficticio, no ingresos reales','Fictional funds, not real revenue')} accent/>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
       <div className="min-w-0 xl:col-span-5">
        <DashboardPanel title={l('Crecimiento de usuarios','User growth')} description={l('Altas verificadas, no proyecciones','Verified signups, not projections')} action={()=>setSection('users')}>
         <div className="space-y-5 py-2">
          {[
           {label:l('Nuevas cuentas · 7 días','New accounts · 7 days'),value:overview.people.new_7d},
           {label:l('Nuevas cuentas · 30 días','New accounts · 30 days'),value:overview.people.new_30d},
           {label:l('Cuentas con mascota','Accounts with pets'),value:overview.people.with_pet},
          ].map((m,i)=><div key={m.label}>
           <div className="mb-2 flex items-center justify-between gap-3 text-[12px]">
            <span className="font-semibold text-[#5C7470]">{m.label}</span><strong className="text-[14px] text-[#204E4A]">{n(m.value)}</strong>
           </div>
           <div className="h-[15px] overflow-hidden rounded-full bg-[#EFF4E9]">
            <div className={'h-full rounded-full '+(i===1?'bg-[#85C961]':'bg-[#204E4A]')}
             style={{width:(m.value===0?0:Math.max(2,100*m.value/Math.max(1,overview.people.registered)))+'%'}}/>
           </div>
          </div>)}
         </div>
         <p className="mt-4 text-[11px] text-[#71857F]">{l('Porcentaje calculado sobre el total de cuentas actuales. No es una serie histórica.','Percentages use total existing accounts, not a historical series.')}</p>
        </DashboardPanel>
       </div>
       <div className="min-w-0 xl:col-span-5">
        <DashboardPanel title={l('Actividad de la app','App activity')} description={l('Usuarios únicos por sección en el período','Unique users per section in selected period')}>
         <div className="space-y-3">
          {Object.entries(overview.activity.module_counts).sort((a,b)=>b[1]-a[1]).map(([key,count])=>
           <div key={key} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-[12px] font-bold text-[#506E66]">{moduleNames[key]||key}</span>
            <div className="h-[11px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#EDF2E8]">
             <div className="h-full rounded-full bg-[#4EA76D]"
              style={{width:(100*count/Math.max(1,overview.activity.active_period))+'%'}}/>
            </div>
            <span className="w-8 text-right text-[12px] font-extrabold">{n(count)}</span>
           </div>)}
          {Object.keys(overview.activity.module_counts).length===0&&
           <p className="py-8 text-center text-[13px] text-[#7C908A]">{l('Aún no hay actividad medida para este período.','No tracked activity for this period yet.')}</p>}
         </div>
         <p className="mt-4 text-[11px] text-[#71857F]">{l('No representa sesiones ni tiempo conectado.','Not sessions or time spent.')}</p>
        </DashboardPanel>
       </div>
       <div className="min-w-0 xl:col-span-2">
        <DashboardPanel title={l('Estado del sistema','System status')} action={()=>setSection('infra')}>
         <div className="space-y-3 text-[12px]">
          <div className="flex items-center justify-between gap-2"><span>PostgreSQL</span><strong>{bytes(overview.resources.database_bytes)}</strong></div>
          <div className="h-px bg-[#F0F3EB]"/>
          <div className="flex items-center justify-between gap-2"><span>Storage</span><strong>{bytes(overview.resources.storage_estimated_bytes)}</strong></div>
          <div className="h-px bg-[#F0F3EB]"/>
          <div className="flex items-center justify-between gap-2"><span>{l('Objetos','Objects')}</span><strong>{n(overview.resources.stored_objects)}</strong></div>
          <div className="h-px bg-[#F0F3EB]"/>
          <div className="flex items-center justify-between gap-2"><span>{l('Egreso','Egress')}</span><strong>{l('Sin fuente','Unknown')}</strong></div>
         </div>
         <p className="mt-5 text-[11px] leading-relaxed text-[#71857F]">{l('Consumo parcial; no hay monitor de disponibilidad ni cuotas oficiales.','Partial usage; no uptime or official quota feed.')}</p>
        </DashboardPanel>
       </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
       <DashboardPanel title={l('Amigo de PAZO','PAZO Friend')} description={l('Información financiera de prueba','Sandbox financial information')} action={()=>setSection('finance')}>
        <div className="grid grid-cols-2 gap-3">
         <div className="rounded-[17px] bg-[#F5F8EE] p-3">
          <p className="text-[24px] font-black">{overview.support.sandbox_covered_accounts}</p>
          <p className="text-[11px] text-[#647C75]">{l('Cobertura vigente','Current coverage')}</p>
         </div>
         <div className="rounded-[17px] bg-[#F5F8EE] p-3">
          <p className="text-[22px] font-black">{money(overview.support.sandbox_gross_minor)}</p>
          <p className="text-[11px] text-[#647C75]">{l('Pruebas acreditadas','Verified tests')}</p>
         </div>
        </div>
        <div className="mt-4 space-y-2 text-[12px]">
         <p className="flex justify-between"><span>{l('Intentos de pago','Checkout attempts')}</span><strong>{overview.support.checkout_attempts}</strong></p>
         <p className="flex justify-between"><span>{l('Intentos sin acreditar','Unverified attempts')}</span><strong>{overview.support.attempts_without_verified_period}</strong></p>
         <p className="flex justify-between"><span>{l('Ingresos Live','Live revenue')}</span><strong>{l('No disponible','Unavailable')}</strong></p>
        </div>
       </DashboardPanel>
       <DashboardPanel title={l('Usuarios más frecuentes','Most frequent users')} description={l('Días distintos de actividad medida en 30 días','Distinct active days in 30 days')} action={()=>setSection('users')}>
        <div className="space-y-3">
         {[...users].sort((a,b)=>b.active_days_30-a.active_days_30).slice(0,5).map((u,i)=>
          <div key={u.user_id} className="flex items-center gap-3">
           <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7F2E2] text-[12px] font-black">{i+1}</span>
           <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-extrabold">{u.pets[0]?.name||l('Cuenta sin mascota','Account without pets')}</p>
            <p className="truncate text-[11px] text-[#71857F]">{u.email||l('Sin correo','No email')}</p></div>
           <strong className="text-[12px]">{u.active_days_30} {l('días','days')}</strong>
          </div>)}
         {users.length===0&&<p className="py-4 text-[12px] text-[#71857F]">{l('Todavía no hay cuentas para mostrar.','No accounts to show yet.')}</p>}
        </div>
        <p className="mt-3 text-[11px] text-[#7C908A]">{l('Listado orientativo: primera página de cuentas.','Indicative: first page of accounts.')}</p>
       </DashboardPanel>
       <DashboardPanel title={l('Fake Doors · interés','Fake Doors · interest')} description={l('Votos confirmados, ordenados por interés','Verified votes, ranked by interest')} action={()=>setSection('ideas')}>
        <div className="space-y-3">{experiments.slice(0,5).map((item,i)=>
         <div key={item.key} className="flex items-center gap-3">
          <span className="w-5 text-[13px] font-black text-[#739087]">{i+1}</span>
          <div className="min-w-0 flex-1">
           <p className="truncate text-[12px] font-bold">{item.name}</p>
           <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EFF3E8]">
            <div className="h-full rounded-full bg-[#4FA96B]" style={{width:(100*item.interested/Math.max(1,...experiments.map(x=>x.interested)))+'%'}}/>
           </div>
          </div>
          <span className="w-8 text-right text-[12px] font-black">{item.interested}</span>
         </div>)}</div>
        <p className="mt-3 text-[11px] text-[#71857F]">{l('Con menos de 30 vistas, la muestra es insuficiente.','Fewer than 30 views is an insufficient sample.')}</p>
       </DashboardPanel>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
       <DashboardPanel title={l('Actividad social','Social activity')}>
        <div className="grid grid-cols-3 gap-2 text-center">
         {[
          [l('Publicaciones','Posts'),overview.people.posts],
          [l('Comentarios','Comments'),overview.people.comments],
          [l('Comunidades','Communities'),overview.people.communities],
         ].map(([label,value])=><div key={String(label)} className="rounded-[17px] bg-[#F6F8F2] px-1 py-4">
          <p className="text-[23px] font-black">{value}</p><p className="text-[11px] text-[#637B73]">{label}</p></div>)}
        </div>
       </DashboardPanel>
       <DashboardPanel title={l('Lugares y búsqueda','Places and search')}>
        <div className="grid grid-cols-2 gap-3">
         <div className="rounded-[18px] bg-[#F5F8EE] p-4 text-center">
          <p className="text-[25px] font-black">{n(overview.experiments.place_events)}</p>
          <p className="text-[11px] text-[#637B73]">{l('Eventos de Lugares','Places events')}</p>
         </div>
         <div className="rounded-[18px] bg-[#F5F8EE] p-4 text-center">
          <p className="text-[25px] font-black">{n(overview.experiments.search_events)}</p>
          <p className="text-[11px] text-[#637B73]">{l('Eventos de búsqueda','Search events')}</p>
         </div>
        </div>
        <p className="mt-3 text-[11px] text-[#71857F]">{l('Eventos registrados, no usuarios únicos.','Recorded events, not unique users.')}</p>
       </DashboardPanel>
       <DashboardPanel title={l('Contenido y moderación','Content and moderation')}>
        <p className="text-[13px] text-[#617B73]">{l('Las denuncias se gestionan en el panel de Moderación existente.','Reports are managed in the existing moderation panel.')}</p>
        {onOpenReports&&<button type="button" onClick={onOpenReports}
         className="mt-5 min-h-11 w-full rounded-[16px] bg-[#F1F5E9] px-4 text-[12px] font-extrabold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F]">
          {l('Abrir denuncias','Open reports')}
         </button>}
       </DashboardPanel>
      </div>
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
      <Note>{l('Sandbox es dinero ficticio. Una solicitud de pago sin período verificado NO prueba abandono ni cobro. PayPal Live no está integrado como libro contable en este panel.','Sandbox is fictional money. An unverified attempt does NOT prove abandonment or payment. PayPal Live is not reconciled in this view.')}</Note>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
       <Stat label={l('Recaudación real confirmada','Confirmed real revenue')} value={l('Sin fuente Live','No Live source')} note={l('No inventar US$0 como total externo','Not a merchant statement')}/>
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
