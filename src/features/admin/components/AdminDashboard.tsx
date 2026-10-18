import { useCallback,useEffect,useState } from 'react'
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
function Stat({label,value,note}:{label:string;value:string|number;note?:string}){
 return <div className="min-w-0 rounded-[22px] bg-white px-3 py-4 shadow-[0_5px_18px_rgba(32,78,74,0.04)]">
  <p className="text-[12px] font-bold text-[#5C7470]">{label}</p>
  <p className="mt-1 text-[25px] font-black leading-tight text-[#204E4A]">{value}</p>
  {note&&<p className="mt-1 text-[11px] leading-snug text-[#5C7470]">{note}</p>}
 </div>
}
function Note({children}:{children:React.ReactNode}){
 return <p className="rounded-[18px] bg-[#EEF2DF] px-3 py-3 text-[12px] leading-relaxed text-[#4A6E67]">{children}</p>
}
export function AdminDashboard({lang,onClose}:{lang:'es'|'en';onClose:()=>void}){
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
 return <div role="dialog" aria-modal="true" aria-label={l('Panel de administración','Admin dashboard')}
    className="fixed inset-0 z-[130] flex flex-col overflow-hidden bg-[#FAF8F5] text-[#204E4A]">
  <header className="shrink-0 bg-[#FAF8F5] px-4 pb-3 pt-5 shadow-[0_5px_18px_rgba(32,78,74,0.035)]">
   <div className="mx-auto flex w-full max-w-[1000px] items-center justify-between gap-3">
    <div><p className="text-[11px] font-extrabold tracking-wide text-[#739087]">PAZO · ADMIN</p>
      <h2 className="text-[23px] font-black">{l('Centro de control','Control center')}</h2></div>
    <button type="button" onClick={onClose} className="rounded-full bg-[#EDF1E4] px-4 py-2.5 text-[13px] font-bold hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F]">{l('Cerrar','Close')}</button>
   </div>
   <nav aria-label={l('Secciones del panel','Dashboard sections')} className="mx-auto mt-3 flex max-w-[1000px] gap-2 overflow-x-auto pb-1">
    {sections.map(item=><button key={item.key} type="button" aria-current={section===item.key?'page':undefined}
      onClick={()=>setSection(item.key)}
      className={'shrink-0 rounded-full px-4 py-2 text-[12px] font-bold transition-colors focus-visible:bg-[#E1E53F] '+
       (section===item.key?'bg-[#204E4A] text-white':'bg-white text-[#204E4A] hover:bg-[#E5EDCE]')}>
      {lang==='es'?item.es:item.en}
    </button>)}
   </nav>
  </header>
  <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-16 pt-5">
   <div className="mx-auto max-w-[1000px] space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <span className="text-[12px] font-bold text-[#5C7470]">
      {overview?l('Actualizado: ','Updated: ')+new Date(overview.as_of).toLocaleString(lang==='es'?'es-US':'en-US'):'—'}
     </span>
     <div className="flex items-center gap-2">
      {section!=='users'&&<select aria-label={l('Período','Period')} value={period} onChange={e=>setPeriod(Number(e.target.value) as 7|30|90)}
         className="rounded-full bg-white px-3 py-2 text-[12px] font-bold text-[#204E4A]">
       <option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option>
      </select>}
      <button type="button" onClick={()=>void refresh()} disabled={loading} className="rounded-full bg-[#E1E53F] px-4 py-2 text-[12px] font-black disabled:opacity-50">{l('Actualizar','Refresh')}</button>
     </div>
    </div>
    {loading&&<p role="status" className="rounded-2xl bg-white p-5 text-[13px]">{l('Consultando datos autorizados…','Loading authorized data…')}</p>}
    {error&&<div role="alert" className="rounded-[20px] bg-[#F9E7DE] p-4 text-[13px] text-[#823E2D]">
      {l('No fue posible actualizar todos los datos.','Could not refresh all metrics.')} {error}
     </div>}
    {overview&&<div className={loading?'pointer-events-none opacity-50':'space-y-5'}>
     {section==='summary'&&<>
      <Note>{l('Datos de PAZO en pruebas. Los importes de PayPal Sandbox NO son recaudación real. Actividad medida solo desde que se instaló el registro diario.','Staging data. PayPal Sandbox payments are NOT real revenue. Activity is measured only since daily tracking started.')}</Note>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
       <Stat label={l('Cuentas','Accounts')} value={n(overview.people.registered)}/>
       <Stat label={l('Mascotas','Pets')} value={n(overview.people.pets)}/>
       <Stat label={l('Nuevas cuentas · 30d','New accounts · 30d')} value={n(overview.people.new_30d)}/>
       <Stat label={l('Sin mascota','Without pet')} value={n(overview.people.without_pet)}/>
       <Stat label={l('Usuarios observados · hoy','Tracked today')} value={n(overview.activity.today)}/>
       <Stat label={l('Usuarios observados · 7d','Tracked · 7d')} value={n(overview.activity.last_7d)}/>
       <Stat label={l('Usuarios observados · 30d','Tracked · 30d')} value={n(overview.activity.last_30d)}/>
       <Stat label={l('Posts + comentarios','Posts + comments')} value={n(overview.people.posts+overview.people.comments)}/>
      </div>
      <h3 className="text-[17px] font-black">{l('Uso por sección','Usage by section')}</h3>
      <div className="space-y-2 rounded-[24px] bg-white p-4">
       {Object.entries(overview.activity.module_counts).sort((a,b)=>b[1]-a[1]).map(([key,count])=>
        <div key={key} className="flex items-center gap-3"><span className="w-24 shrink-0 text-[12px] font-bold">{moduleNames[key]||key}</span>
         <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-[#EEF3E8]">
          <div className="h-full rounded-full bg-[#204E4A]" style={{width:Math.min(100,100*count/Math.max(1,overview.activity.active_period))+'%'}}/>
         </div><span className="w-9 text-right text-[12px] font-black">{count}</span>
        </div>)}
       {Object.keys(overview.activity.module_counts).length===0&&<p className="text-[12px] text-[#5C7470]">{l('Todavía no hay sesiones medidas con este nuevo registro.','No activity measured with the new daily tracker yet.')}</p>}
      </div>
     </>}
     {section==='users'&&<>
      <Note>{l('Cuentas autenticadas y mascotas asociadas. Solo administradores pueden consultar esta lista. Los días activos no son sesiones: son días diferentes con uso de módulos medido.','Authenticated accounts and their pets. Only administrators can view this list. Active days are distinct days with tracked usage.')}</Note>
      <div className="grid grid-cols-2 gap-3"><Stat label={l('Con mascota','With pets')} value={overview.people.with_pet}/><Stat label={l('Sin mascota','Without pet')} value={overview.people.without_pet}/></div>
      <h3 className="text-[17px] font-black">{l('Cuentas y sus mascotas','Accounts and pets')}</h3>
      <div className="space-y-2">{users.map(u=><article key={u.user_id} className="rounded-[22px] bg-white p-4 shadow-[0_4px_15px_rgba(32,78,74,0.035)]">
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
      <div className="grid grid-cols-2 gap-3">
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
      <div className="space-y-2">{experiments.map((item,index)=><article key={item.key} className="rounded-[22px] bg-white px-4 py-3">
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
      <div className="grid grid-cols-2 gap-3">
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
}
