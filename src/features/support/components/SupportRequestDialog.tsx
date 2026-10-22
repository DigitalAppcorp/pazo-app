import {useCallback,useEffect,useRef,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {useAccountRequestScope} from '../../auth/useAccountRequestScope'
type Category='problem'|'question'|'feature'|'other'
type PastTicket={id:string;category:Category;message:string;status:'open'|'reviewing'|'resolved';admin_reply:string|null;created_at:string}
const CATEGORIES:{id:Category;es:string;en:string}[]=[
 {id:'problem',es:'Reportar un problema',en:'Report a problem'},
 {id:'question',es:'Hacer una consulta',en:'Ask a question'},
 {id:'feature',es:'Proponer una función',en:'Suggest a feature'},
 {id:'other',es:'Otro',en:'Other'}
]
export function SupportRequestDialog({lang,onClose}:{lang:'es'|'en';onClose:()=>void}){
 const [category,setCategory]=useState<Category>('problem')
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 const [sent,setSent]=useState(false)
 const [uncertain,setUncertain]=useState(false)
 const requestId=useRef<string|null>(null)
 const panelRef=useRef<HTMLElement>(null)
 const [error,setError]=useState('')
 const [history,setHistory]=useState<PastTicket[]>([])
 const [historyLoading,setHistoryLoading]=useState(true)
 const [historyError,setHistoryError]=useState(false)
 const scope=useAccountRequestScope(()=>{setHistory([]);setMessage('');requestId.current=null;onClose()})
 const closeRef=useRef<HTMLButtonElement>(null)
 const l=(es:string,en:string)=>lang==='es'?es:en
 const reloadHistory=useCallback(()=>{
  const request=scope.capture()
  return Promise.resolve(supabase.rpc('pazo_my_support_tickets').abortSignal(request.signal)).then(result=>{
  if(!request.isCurrent())return
  if(result.error||!Array.isArray(result.data))setHistoryError(true)
  else{setHistory(result.data as PastTicket[]);setHistoryError(false)}
  setHistoryLoading(false)
 }).catch(()=>{if(request.isCurrent()){setHistoryError(true);setHistoryLoading(false)}})
 },[scope])
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null
  closeRef.current?.focus();void reloadHistory()
  return ()=>previous?.focus()
 },[reloadHistory])
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onClose()}}
  document.addEventListener('keydown',escape)
  return ()=>document.removeEventListener('keydown',escape)
 },[onClose])
 useEffect(()=>{if(sent)closeRef.current?.focus()},[sent])
 const onDialogKey=(e:React.KeyboardEvent)=>{
  if(e.key!=='Tab')return
  const controls=Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
   'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')??[])
  const first=controls[0],last=controls.at(-1)
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
 }
 const checkPending=async()=>{
  if(busy||!requestId.current)return
  setBusy(true)
  const request=scope.capture()
  try{
   const result=await supabase.rpc('pazo_my_support_tickets').abortSignal(request.signal)
   if(!request.isCurrent())return
   if(result.error||!Array.isArray(result.data))throw Error('unverified')
   setHistory(result.data as PastTicket[]);setHistoryLoading(false);setHistoryError(false)
   if(result.data.some((ticket:PastTicket)=>ticket.id===requestId.current)){
    setSent(true);setUncertain(false);setMessage('');setError('')
   }else setError(l('Aún no aparece en el historial. Puedes reenviar la misma solicitud sin crear un duplicado.',
    'Not in history yet. You can resend this same request without creating a duplicate.'))
  }catch{if(!request.isCurrent())return;setError(l('No se pudo confirmar el envío. Consulta de nuevo antes de reintentar.',
   'Delivery could not be confirmed. Check again before retrying.'))}
  finally{if(request.isCurrent())setBusy(false)}
 }
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault()
  if(busy||sent||message.trim().length<10||message.trim().length>2000)return
  setBusy(true);setError('')
  const request=scope.capture()
  try{
   requestId.current??=crypto.randomUUID()
   const {error:issue,data}=await supabase.rpc('pazo_submit_support_ticket',{
    p_request_id:requestId.current,p_category:category,p_message:message.trim()
   }).abortSignal(request.signal)
   if(!request.isCurrent())return
   if(issue||data!==true)throw Error('submission_unverified')
   setMessage('');setSent(true);setUncertain(false)
   void reloadHistory()
  }catch{
   if(!request.isCurrent())return
   setUncertain(true)
   setError(l('Envío sin confirmar. Consulta Mis solicitudes antes de reintentar; máximo tres solicitudes por hora.',
     'Delivery unconfirmed. Check My support requests before retrying; limit three requests per hour.'))
  }finally{if(request.isCurrent())setBusy(false)}
 }
 return <div className="fixed inset-0 z-[210] flex items-end justify-center bg-[#204E4A]/35 px-2 pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-5"
  role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
   <section ref={panelRef} onKeyDown={onDialogKey} role="dialog" aria-modal="true" aria-labelledby="pazo-support-title"
    className="max-h-[92dvh] w-full max-w-[470px] overflow-y-auto rounded-t-[28px] bg-[#FFFCF6] p-5 shadow-xl sm:rounded-[28px]">
    <div className="flex items-center justify-between gap-3">
     <h2 id="pazo-support-title" className="text-lg font-black text-[#204E4A]">
      {l('Escribir a PAZO','Contact PAZO')}</h2>
     <button ref={closeRef} type="button" onClick={onClose} aria-label={l('Cerrar','Close')}
      className="min-h-11 min-w-11 rounded-full bg-[#EEF2E9] text-[#204E4A] hover:bg-[#E1E53F]/40">✕</button>
    </div>
    <p className="my-3 text-xs leading-relaxed text-[#5C7470]">
      {l('Tu mensaje será visible solo para ti y el equipo administrador. No incluyas contraseñas ni datos de pago.',
        'Only you and the administration team can read your message. Do not include passwords or payment details.')}
    </p>
    <p className="mb-3 text-xs text-[#5C7470]">{l(
     'Eliminamos el caso y sus notas 90 días después de resolverlo.',
     'Cases and notes are deleted 90 days after resolution.')}</p>
    {sent?<div role="status" className="space-y-3 py-5 text-sm font-bold text-[#204E4A]">
     <p>{l('Recibimos tu mensaje. Gracias por ayudarnos a mejorar PAZO.',
       'We received your message. Thank you for helping us improve PAZO.')}</p>
     <button type="button" onClick={onClose} className="min-h-11 w-full rounded-2xl bg-[#E1E53F] px-4 py-3">
       {l('Cerrar','Close')}</button>
    </div>:<form onSubmit={e=>void submit(e)} className="space-y-4">
     <label className="block text-xs font-bold text-[#204E4A]">{l('¿Sobre qué necesitas ayuda?','What can we help with?')}
      <select disabled={busy||uncertain} value={category} onChange={e=>setCategory(e.target.value as Category)}
       className="mt-2 min-h-12 w-full rounded-2xl bg-[#F0F4E9] px-4 py-3 text-sm">
       {CATEGORIES.map(x=><option key={x.id} value={x.id}>{lang==='es'?x.es:x.en}</option>)}
      </select>
     </label>
     <label className="block text-xs font-bold text-[#204E4A]">{l('Tu mensaje','Your message')}
      <textarea disabled={busy||uncertain} value={message} maxLength={2000} rows={5} required
       onChange={e=>setMessage(e.target.value)}
       placeholder={l('Cuéntanos qué sucede o qué función te gustaría ver…',
        'Tell us what happened or what feature you would like…')}
       className="mt-2 w-full rounded-2xl bg-[#F0F4E9] px-4 py-3 text-sm text-[#204E4A]"/>
     </label>
     <p className="text-right text-[11px] text-[#5C7470]">{message.length}/2000</p>
     {error&&<p role="alert" className="text-xs text-[#A04535]">{error}</p>}
     {uncertain&&<button type="button" onClick={()=>void checkPending()} disabled={busy}
       className="min-h-11 w-full rounded-2xl bg-[#EFF4E9] px-4 text-sm font-bold disabled:opacity-50">
       {l('Consultar envío','Check delivery')}</button>}
     <button type="submit" disabled={busy||message.trim().length<10}
       className="min-h-12 w-full rounded-2xl bg-[#E1E53F] px-4 py-3 text-sm font-black text-[#204E4A] disabled:opacity-50">
       {busy?l('Consultando…','Checking…'):uncertain?l('Reenviar la misma solicitud','Resend the same request'):l('Enviar a soporte','Send to support')}
     </button>
    </form>}
    <div className="mt-5 space-y-3 rounded-2xl bg-[#EFF4E9] p-3">
     <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-black text-[#204E4A]">{l('Mis solicitudes','My support requests')}</h3>
      <button type="button" onClick={()=>{setHistoryLoading(true);void reloadHistory()}} disabled={historyLoading}
       className="min-h-11 rounded-xl px-3 text-xs font-bold text-[#204E4A] hover:bg-[#E1E53F]/35 disabled:opacity-50">
       {l('Actualizar','Refresh')}
      </button>
     </div>
     {historyLoading&&<p role="status" className="text-xs text-[#5C7470]">{l('Consultando mensajes…','Loading messages…')}</p>}
     {historyError&&<p role="alert" className="text-xs text-[#A04535]">{l(
      'Todavía no pudimos consultar el historial. Puedes enviar tu mensaje.',
      'Could not load your history yet. You can still send a message.')}</p>}
     {!historyLoading&&!historyError&&history.length===0&&
      <p className="text-xs text-[#5C7470]">{l('Aún no tienes solicitudes.','No requests yet.')}</p>}
     {history.map(ticket=><article key={ticket.id} className="space-y-2 rounded-xl bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
       <span className="text-xs font-black text-[#204E4A]">{CATEGORIES.find(x=>x.id===ticket.category)?.[lang]??ticket.category}</span>
       <span className="text-[11px] font-bold text-[#5C7470]">{ticket.status==='resolved'
        ?l('Resuelto','Resolved'):ticket.status==='reviewing'?l('En revisión','Reviewing'):l('Recibido','Received')}</span>
      </div>
      <p className="break-words whitespace-pre-wrap text-xs text-[#5C7470]">{ticket.message}</p>
      {ticket.admin_reply&&<div className="rounded-xl bg-[#F4F8EB] p-3">
       <p className="text-xs font-black text-[#204E4A]">{l('Respuesta de PAZO','PAZO reply')}</p>
       <p className="mt-1 break-words whitespace-pre-wrap text-xs text-[#204E4A]">{ticket.admin_reply}</p>
      </div>}
     </article>)}
    </div>
   </section>
 </div>
}
