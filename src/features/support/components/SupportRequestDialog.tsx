import {useEffect,useRef,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
type Category='problem'|'question'|'feature'|'other'
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
 const closeRef=useRef<HTMLButtonElement>(null)
 const l=(es:string,en:string)=>lang==='es'?es:en
 useEffect(()=>{closeRef.current?.focus()},[])
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault()
  if(busy||sent||message.trim().length<10||message.trim().length>2000)return
  setBusy(true);setError('')
  try{
   const {error:issue}=await supabase.from('pazo_support_tickets')
    .insert({category,message:message.trim()})
   if(issue)throw issue
   setMessage('');setSent(true)
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
   </section>
 </div>
}
