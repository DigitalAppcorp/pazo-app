import {useCallback,useEffect,useState,type ReactNode} from 'react'
import {supabase} from '../../services/supabaseClient'
type Status={enabled:boolean;message_es:string;message_en:string;updated_at:string}
const valid=(v:unknown):v is Status=>!!v&&typeof v==='object'&&
 typeof (v as Status).enabled==='boolean'&&
 typeof (v as Status).message_es==='string'&&typeof (v as Status).message_en==='string'
export function MaintenanceGate({children}:{children:ReactNode}){
 const [status,setStatus]=useState<Status|null>(null)
 const [admin,setAdmin]=useState(false)
 const [allowAdminSignIn,setAllowAdminSignIn]=useState(false)
 const [checked,setChecked]=useState(false)
 const refresh=useCallback(async()=>{
  const r=await supabase.rpc('pazo_public_maintenance_status')
  // Until SQL migration is installed, preserve the existing app rather than
  // introducing a false outage from a missing RPC.
  if(r.error||!valid(r.data)){setChecked(true);return}
  setStatus(r.data)
  if(!r.data.enabled){setChecked(true);setAllowAdminSignIn(false);return}
  try{
   const {data}=await supabase.auth.getUser()
   if(!data?.user?.id){setAdmin(false);setChecked(true);return}
   const a=await supabase.rpc('pazo_is_admin')
   setAdmin(!a.error&&a.data===true)
  }catch{setAdmin(false)}
  finally{setChecked(true)}
 },[])
 useEffect(()=>{
  let alive=true
  void refresh().catch(()=>{if(alive)setChecked(true)})
  const onAuth= supabase.auth.onAuthStateChange(()=>{
   // Don't make auth network calls synchronously from the callback.
   queueMicrotask(()=>{if(alive)void refresh().catch(()=>{})})
  })
  const onFocus=()=>{if(alive)void refresh().catch(()=>{})}
  const interval=window.setInterval(onFocus,60000)
  window.addEventListener('focus',onFocus)
  return ()=>{alive=false;onAuth.data.subscription.unsubscribe();window.clearInterval(interval);window.removeEventListener('focus',onFocus)}
 },[refresh])
 if(!checked)return <div role="status" className="flex min-h-[100dvh] items-center justify-center bg-[#FAF8F5] p-6 text-center text-sm font-bold text-[#204E4A]">PAZO</div>
 if(!status?.enabled||admin||allowAdminSignIn)return <>{children}</>
 const es=!navigator.language.startsWith('en')
 return <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-[#FAF8F5] px-6 text-center text-[#204E4A]">
  <h1 className="text-4xl font-black tracking-tight">pazo<span className="text-[#E1E53F]">.</span></h1>
  <h2 className="text-xl font-extrabold">{es?'Estamos mejorando PAZO':'PAZO is being improved'}</h2>
  <p role="status" className="max-w-sm text-sm leading-relaxed text-[#5C7470]">
   {es?status.message_es:status.message_en}</p>
  <button type="button" onClick={()=>setAllowAdminSignIn(true)}
   className="mt-4 min-h-11 rounded-xl px-4 py-2 text-xs font-bold underline hover:bg-[#EFF4E8] focus-visible:bg-[#E1E53F]/35">
   {es?'Acceso para administradores':'Administrator access'}
  </button>
 </main>
}
