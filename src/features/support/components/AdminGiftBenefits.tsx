import {useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
type Recipient={owner_id:string;email:string|null;pets:string[];gift_level:number|null;gift_expires_at:string|null;gift_active:boolean}
const LEVELS=[0,1,3,6,12] as const
const DURATIONS=[30,90,365,0] as const

export function AdminGiftBenefits({lang}:{lang:'es'|'en'}){
 const [term,setTerm]=useState('')
 const [results,setResults]=useState<Recipient[]>([])
 const [loading,setLoading]=useState(false)
 const [state,setState]=useState<'initial'|'ready'|'error'>('initial')
 const [busy,setBusy]=useState(false)
 const [target,setTarget]=useState<Recipient|null>(null)
 const [level,setLevel]=useState<number>(0)
 const [days,setDays]=useState<number>(30)
 const [reason,setReason]=useState('Cortesía PAZO')
 const [message,setMessage]=useState('')
 const l=(es:string,en:string)=>lang==='es'?es:en
 const search=async()=>{
  if(term.trim().length<3||loading||busy)return
  setLoading(true);setMessage('')
  try{
   const {data,error}=await supabase.rpc('pazo_admin_find_benefit_recipients',{p_query:term.trim()})
   if(error||!Array.isArray(data))throw Error('read')
   setResults(data as Recipient[]);setState('ready')
  }catch{setState('error')}finally{setLoading(false)}
 }
 const change=async(action:'grant'|'revoke')=>{
  if(!target||busy||reason.trim().length<3)return
  const label=action==='grant'?l('Otorgar','Grant'):l('Revocar','Revoke')
  if(!window.confirm(label+' · '+(target.email||target.owner_id)+'?'))return
  setBusy(true);setMessage('')
  try{
   const {data,error}=await supabase.rpc('pazo_admin_set_gift_benefits',{
    p_owner:target.owner_id,p_action:action,p_level:level,p_days:days,p_reason:reason.trim()
   })
   if(error||data!==true)throw Error('unverified')
   setMessage(l('Cambio registrado. Los beneficios de cortesía no cuentan como ingresos.',
     'Change recorded. Complimentary benefits do not count as revenue.'))
   // Refresh explicitly: search() is guarded by busy and must not silently
   // skip the post-write readback while this mutation is in progress.
   setTarget(null)
   const refreshed=await supabase.rpc('pazo_admin_find_benefit_recipients',{p_query:term.trim()})
   if(refreshed.error||!Array.isArray(refreshed.data)){
    setState('error')
    setMessage(l('Cambio registrado, pero no se pudo actualizar la lista. Pulsa Buscar para verificar.',
      'Change recorded, but the list could not refresh. Search again to verify.'))
   }else{
    setResults(refreshed.data as Recipient[])
    setState('ready')
   }
  }catch{setMessage(l('Resultado sin confirmar. Consulta la cuenta antes de volver a guardar.',
   'Result not verified. Search the account before resubmitting.'))}
  finally{setBusy(false)}
 }
 return <section aria-label={l('Beneficios de cortesía','Complimentary benefits')}
  className="space-y-4 rounded-[22px] bg-white p-5 shadow-sm">
  <h3 className="text-lg font-black">{l('Otorgar beneficios sin cobro','Grant benefits without payment')}</h3>
  <p className="text-xs leading-relaxed text-[#5C7470]">{l(
   'Busca por correo o nombre de mascota. Las cortesías son independientes de PayPal y quedan auditadas.',
   'Search by email or pet name. Complimentary access is independent of PayPal and is audited.')}</p>
  <form onSubmit={e=>{e.preventDefault();void search()}} className="flex flex-wrap gap-2">
   <label className="min-w-[200px] flex-1 text-xs font-bold">{l('Cuenta o mascota','Account or pet')}
    <input value={term} onChange={e=>setTerm(e.target.value)} maxLength={80} minLength={3}
     placeholder={l('Correo o nombre de mascota','Email or pet name')}
     className="mt-2 min-h-11 w-full rounded-xl bg-[#F0F4E9] px-3 py-2 text-sm"/>
   </label>
   <button type="submit" disabled={loading||busy||term.trim().length<3}
    className="self-end min-h-11 rounded-xl bg-[#E1E53F] px-5 text-xs font-black disabled:opacity-50">
    {loading?l('Buscando…','Searching…'):l('Buscar','Search')}</button>
  </form>
  {state==='error'&&<p role="alert">{l('No se pudo realizar la búsqueda.','Search unavailable.')}</p>}
  {state==='ready'&&results.length===0&&<p role="status">{l('No hay cuentas coincidentes.','No matching accounts.')}</p>}
  <div className="grid gap-2 sm:grid-cols-2">
   {results.map(user=><button type="button" key={user.owner_id}
    aria-pressed={target?.owner_id===user.owner_id}
    onClick={()=>{setTarget(user);setLevel(user.gift_level??0);setMessage('')}}
    className={'min-h-16 min-w-0 rounded-2xl p-3 text-left hover:bg-[#E1E53F]/30 focus-visible:bg-[#E1E53F]/50 '+(target?.owner_id===user.owner_id?'bg-[#E1E53F]/40':'bg-[#F0F4E9]')}>
    <strong className="block break-all text-xs">{user.email||user.owner_id}</strong>
    <span className="block text-[11px] text-[#5C7470]">{user.pets?.join(', ')||l('Sin mascotas','No pets')}</span>
    <span className="block text-[11px] text-[#5C7470]">{user.gift_active?l('Cortesía activa','Gift active'):l('Sin cortesía activa','No active gift')}</span>
   </button>)}
  </div>
  {target&&<div className="space-y-3 rounded-[20px] bg-[#F4F8EB] p-4">
   <p className="break-all text-xs font-black">{target.email||target.owner_id}</p>
   <label className="block text-xs font-bold">{l('Nivel de insignia','Badge milestone')}
    <select value={level} onChange={e=>setLevel(Number(e.target.value))}
     className="mt-2 min-h-11 w-full rounded-xl bg-white px-3">
     {LEVELS.map(x=><option key={x} value={x}>{x===0?l('Beneficios básicos','Basic benefits'):x+' '+l('meses','months')}</option>)}
    </select>
   </label>
   <label className="block text-xs font-bold">{l('Duración de cortesía','Gift duration')}
    <select value={days} onChange={e=>setDays(Number(e.target.value))}
     className="mt-2 min-h-11 w-full rounded-xl bg-white px-3">
     {DURATIONS.map(x=><option key={x} value={x}>{x===0?l('Sin vencimiento','No expiry'):x+' '+l('días','days')}</option>)}
    </select>
   </label>
   <label className="block text-xs font-bold">{l('Motivo interno','Internal reason')}
    <input value={reason} onChange={e=>setReason(e.target.value)} maxLength={200}
     className="mt-2 min-h-11 w-full rounded-xl bg-white px-3 py-2"/>
   </label>
   <div className="flex flex-wrap gap-2">
    <button onClick={()=>void change('grant')} disabled={busy||reason.trim().length<3}
     className="min-h-11 flex-1 rounded-xl bg-[#E1E53F] px-4 py-2 text-xs font-black disabled:opacity-50">{l('Dar beneficios','Grant access')}</button>
    {target.gift_active&&<button onClick={()=>void change('revoke')} disabled={busy}
     className="min-h-11 rounded-xl bg-[#F8E6DC] px-4 py-2 text-xs font-bold disabled:opacity-50">{l('Revocar','Revoke')}</button>}
   </div>
  </div>}
  {message&&<p role="status" className="rounded-xl bg-[#EFF4E9] p-3 text-xs">{message}</p>}
 </section>
}
