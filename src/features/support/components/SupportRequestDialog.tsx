import {useCallback,useEffect,useRef,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
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
 const [error,setError]=useState('')
 const [history,setHistory]=useState<PastTicket[]>([])
 const [historyLoading,setHistoryLoading]=useState(true)
 const [historyError,setHistoryError]=useState(false)
 const closeRef=useRef<HTMLButtonElement>(null)
 const l=(es:string,en:string)=>lang==='es'?es:en
 const reloadHistory=useCallback(async()=>{
  setHistoryLoading(true);setHistoryError(false)
  const result=await supabase.rpc('pazo_my_support_tickets')
  if(result.error||!Array.isArray(result.data))setHistoryError(true)
  else setHistory(result.data as PastTicket[])
  setHistoryLoading(false)
 },[])
 useEffect(()=>{closeRef.current?.focus();void reloadHistory()},[reloadHistory])
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault()
  if(busy||sent||message.trim().length<10||message.trim().length>2000)return
  setBusy(true);setError('')
  try{
   const {error:issue}=await supabase.from('pazo_support_tickets')
    .insert({category,message:message.trim()})
   if(issue)throw issue
   setMessage('');setSent(true)
   void reloadHistory()
  }catch{
   setError(l('No pudimos enviar tu mensaje. Comprueba la conexión e inténtalo nuevamente. Máximo tres mensajes por hora.',
     'Could not submit your message. Check your connection and retry. Limit: three messages per hour.'))
  }finally{setBusy(false)}
 }
 return <div className="fixed inset-0 z-[210] flex items-end justify-center bg-[#204E4A]/35 px-2 pb-[env(safe-area-inset-bottom)] sm:items-center sm:p-5"
  role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
   <section role="dialog" aria-modal="true" aria-labelledby="pazo-support-title"
    className="max-h-[92dvh] w-full max-w-[470px] overflow-y-auto rounded-t-[28px] bg-[#FFFCF6] p-5 shadow-xl sm:rounded-[28px]">
    <div className="flex items-center justify-between gap-3">
     <h2 id="pazo-support-title" className="text-lg font-black text-[#204E4A]">
      {l('Escribir a PAZO','Contact PAZO')}</h2>
     <button ref={closeRef} type="button" onClick={onClose} aria-label={l('Cerrar','Close')}
      className="min-h-11 min-w-11 rounded-full bg-[#EEF2E9] text-[#204E4A] hover:bg-[#E1E53F]/40">✕</button>
    </div>
    <p className="my-3 text-xs leading-relaxed text-[#5C7470]">
      {l('Tu mensaje será visible únicamente para el equipo administrador. No incluyas contraseñas ni datos de pago.',
        'Only the administration team can read your message. Do not include passwords or payment details.')}
    </p>
    {sent?<div role="status" className="space-y-3 py-5 text-sm font-bold text-[#204E4A]">
     <p>{l('Recibimos tu mensaje. Gracias por ayudarnos a mejorar PAZO.',
       'We received your message. Thank you for helping us improve PAZO.')}</p>
     <button type="button" onClick={onClose} className="min-h-11 w-full rounded-2xl bg-[#E1E53F] px-4 py-3">
       {l('Cerrar','Close')}</button>
    </div>:<form onSubmit={e=>void submit(e)} className="space-y-4">
     <label className="block text-xs font-bold text-[#204E4A]">{l('¿Sobre qué necesitas ayuda?','What can we help with?')}
      <select value={category} onChange={e=>setCategory(e.target.value as Category)}
       className="mt-2 min-h-12 w-full rounded-2xl bg-[#F0F4E9] px-4 py-3 text-sm">
       {CATEGORIES.map(x=><option key={x.id} value={x.id}>{lang==='es'?x.es:x.en}</option>)}
      </select>
     </label>
     <label className="block text-xs font-bold text-[#204E4A]">{l('Tu mensaje','Your message')}
      <textarea value={message} maxLength={2000} rows={5} required
       onChange={e=>setMessage(e.target.value)}
       placeholder={l('Cuéntanos qué sucede o qué función te gustaría ver…',
        'Tell us what happened or what feature you would like…')}
       className="mt-2 w-full rounded-2xl bg-[#F0F4E9] px-4 py-3 text-sm text-[#204E4A]"/>
     </label>
     <p className="text-right text-[11px] text-[#5C7470]">{message.length}/2000</p>
     {error&&<p role="alert" className="text-xs text-[#A04535]">{error}</p>}
     <button type="submit" disabled={busy||message.trim().length<10}
       className="min-h-12 w-full rounded-2xl bg-[#E1E53F] px-4 py-3 text-sm font-black text-[#204E4A] disabled:opacity-50">
       {busy?l('Enviando…','Sending…'):l('Enviar a soporte','Send to support')}
     </button>
    </form>}
    <div className="mt-5 space-y-3 rounded-2xl bg-[#EFF4E9] p-3">
     <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-black text-[#204E4A]">{l('Mis solicitudes','My support requests')}</h3>
      <button type="button" onClick={()=>void reloadHistory()} disabled={historyLoading}
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
