import {useCallback,useEffect,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {useAccountRequestScope} from '../../auth/useAccountRequestScope'

type Ticket={id:string;owner_id:string;category:'problem'|'question'|'feature'|'other';message:string;status:'open'|'reviewing'|'resolved';admin_note:string|null;admin_reply:string|null;created_at:string}
const names={problem:['Problema','Problem'],question:['Consulta','Question'],feature:['Nueva función','Feature idea'],other:['Otro','Other']} as const
const states={open:['Pendiente','Open'],reviewing:['En revisión','Reviewing'],resolved:['Resuelto','Resolved']} as const

export function AdminSupportInbox({lang}:{lang:'es'|'en'}){
 const [items,setItems]=useState<Ticket[]>([])
 const [state,setState]=useState<'loading'|'ready'|'error'>('loading')
 const [filter,setFilter]=useState('all')
 const [busyId,setBusyId]=useState<string|null>(null)
 const [notes,setNotes]=useState<Record<string,string>>({})
 const [replies,setReplies]=useState<Record<string,string>>({})
 const [error,setError]=useState('')
 const scope=useAccountRequestScope(()=>{setItems([]);setNotes({});setReplies({});setBusyId(null);setState('error')})
 const l=(es:string,en:string)=>lang==='es'?es:en
 const refresh=useCallback(()=>{
  const request=scope.capture()
  return Promise.resolve(supabase.from('pazo_support_tickets')
   .select('id,owner_id,category,message,status,admin_note,admin_reply,created_at')
   .order('created_at',{ascending:false}).limit(100).abortSignal(request.signal)).then(r=>{
   if(!request.isCurrent())return
   if(r.error){setItems([]);setState('error');return}
   setItems((r.data??[]) as Ticket[]);setState('ready')
  }).catch(()=>{if(request.isCurrent()){setItems([]);setState('error')}})
 },[scope])
 useEffect(()=>{void refresh()},[refresh])
 const setTicket=async(row:Ticket,status:Ticket['status'])=>{
  if(busyId)return
  setBusyId(row.id);setError('')
  const request=scope.capture()
  try{
   const {data,error:issue}=await supabase.rpc('pazo_admin_update_support_ticket',{
    p_id:row.id,p_status:status,p_admin_note:notes[row.id]??row.admin_note??null,
    p_admin_reply:replies[row.id]??row.admin_reply??null
   }).abortSignal(request.signal)
   if(!request.isCurrent())return
   if(issue||data!==true)throw Error('update')
   await refresh()
  }catch{if(!request.isCurrent())return;setError(l('No pudimos actualizar el caso; consulta el estado antes de reintentar.',
   'Could not update case; check status before retrying.'))}
  finally{if(request.isCurrent())setBusyId(null)}
 }
 const shown=items.filter(t=>filter==='all'||filter===t.status)
 return <section aria-label={l('Bandeja de soporte','Support inbox')} className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="text-lg font-black">{l('Soporte de usuarios','User support')}</h2>
    <p className="text-xs text-[#5C7470]">{l('Mensajes privados, consultas y nuevas ideas. Últimos 100 casos.',
     'Private messages, questions and feature ideas. Latest 100 tickets.')}</p></div>
   <button onClick={()=>{setState('loading');void refresh()}} disabled={state==='loading'} className="min-h-11 rounded-2xl bg-[#E1E53F] px-4 py-2 text-xs font-black disabled:opacity-50">{l('Actualizar','Refresh')}</button>
  </div>
  <label className="block max-w-xs text-xs font-bold">{l('Estado','Status')}
   <select value={filter} onChange={e=>setFilter(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-white px-3 py-2 text-xs">
    <option value="all">{l('Todos','All')}</option>
    {Object.entries(states).map(([key,n])=><option key={key} value={key}>{n[lang==='es'?0:1]}</option>)}
   </select>
  </label>
  {state==='loading'&&<p role="status">{l('Consultando soporte…','Loading support…')}</p>}
  {state==='error'&&<p role="alert">{l('No se pudo leer la bandeja.','Could not load the inbox.')}</p>}
  {error&&<p role="alert" className="text-xs text-[#A04535]">{error}</p>}
  {state==='ready'&&!shown.length&&<p className="rounded-2xl bg-white p-5 text-sm">{l('No hay solicitudes para este filtro.','No requests match this filter.')}</p>}
  <div className="grid gap-3 lg:grid-cols-2">
   {shown.map(t=><article key={t.id} className="min-w-0 space-y-3 rounded-[22px] bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <strong className="text-xs text-[#204E4A]">{names[t.category][lang==='es'?0:1]}</strong>
     <span className="rounded-full bg-[#EFF4E9] px-3 py-1 text-xs">{states[t.status][lang==='es'?0:1]}</span>
    </div>
    <p className="break-words whitespace-pre-wrap text-sm leading-relaxed text-[#204E4A]">{t.message}</p>
    <p className="break-all text-[11px] text-[#5C7470]">{l('Cuenta','Account')}: {t.owner_id} · {new Date(t.created_at).toLocaleDateString(lang)}</p>
    <label className="block text-xs font-bold">{l('Nota interna (solo administradores)','Private admin note')}
     <textarea rows={2} maxLength={1000} value={notes[t.id]??t.admin_note??''}
      onChange={e=>setNotes(prev=>({...prev,[t.id]:e.target.value}))}
      className="mt-2 w-full rounded-xl bg-[#F5F8F1] px-3 py-2 text-xs" />
    </label>
    <label className="block text-xs font-bold">{l('Respuesta visible para el usuario','Reply visible to the user')}
     <textarea rows={3} maxLength={2000} value={replies[t.id]??t.admin_reply??''}
      onChange={e=>setReplies(prev=>({...prev,[t.id]:e.target.value}))}
      placeholder={l('El usuario podrá leer esta respuesta en Ayuda y soporte.',
       'The user can read this reply in Help and Support.')}
      className="mt-2 w-full rounded-xl bg-[#EFF4E9] px-3 py-2 text-xs" />
    </label>
    <button type="button" onClick={()=>void setTicket(t,t.status)} disabled={busyId!==null}
     className="min-h-11 w-full rounded-xl bg-[#204E4A] px-3 py-2 text-xs font-black text-white disabled:opacity-50">
     {l('Guardar nota y respuesta','Save note and reply')}
    </button>
    <div className="flex flex-wrap gap-2">
     {(['open','reviewing','resolved'] as const).map(status=><button key={status} type="button"
      onClick={()=>void setTicket(t,status)} disabled={busyId!==null}
      className={'min-h-11 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 '+(status===t.status?'bg-[#E1E53F]':'bg-[#EFF4E9]')}>
      {states[status][lang==='es'?0:1]}</button>)}
    </div>
   </article>)}
  </div>
 </section>
}
