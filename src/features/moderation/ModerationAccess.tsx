import { useEffect, useState } from 'react'
import { isModerator } from './reportingService'
import { checkAdmin } from '../admin/adminDashboardService'
import { AdminDashboard } from '../admin/components/AdminDashboard'
import { ModeratorQueue } from './ModeratorQueue'
import { ModerationMediaQueue } from './ModerationMediaQueue'

export function ModerationAccess({enabled,lang}:{enabled:boolean;lang:'es'|'en'}){
 const [allowed,setAllowed]=useState(false)
 const [adminAllowed,setAdminAllowed]=useState(false)
 const [screen,setScreen]=useState<'reports'|'media'|'dashboard'|null>(null)
 useEffect(()=>{
  let live=true
  if(!enabled){setAllowed(false);setAdminAllowed(false);setScreen(null);return}
  void Promise.all([isModerator(),checkAdmin()])
   .then(([moderation,admin])=>{
     if(!live)return
     setAllowed(moderation)
     setAdminAllowed(admin)
   })
   .catch(()=>{if(live){setAllowed(false);setAdminAllowed(false)}})
  return ()=>{live=false}
 },[enabled])
 if(!enabled||!allowed)return null
 return <section className="space-y-3 rounded-[2rem] bg-white p-4 shadow-[0_4px_16px_rgba(32,78,74,0.05)]">
  <h3 className="text-[14px] font-black text-[#204E4A]">
   {lang==='es'?'Administración y moderación':'Administration and moderation'}
  </h3>
  <div className="flex flex-wrap gap-2">
   {adminAllowed&&<button type="button" onClick={()=>setScreen('dashboard')}
     className="rounded-full bg-[#E1E53F] px-4 py-3 text-[12px] font-extrabold text-[#204E4A] hover:bg-[#EDF150] focus-visible:bg-[#EDF150]">
     {lang==='es'?'Centro de control':'Control center'}
    </button>}
   <button type="button" onClick={()=>setScreen('reports')} className="rounded-full bg-[#204E4A] px-4 py-3 text-[12px] font-bold text-white">
    {lang==='es'?'Denuncias':'Reports'}
   </button>
   <button type="button" onClick={()=>setScreen('media')} className="rounded-full bg-[#FAF8F5] px-4 py-3 text-[12px] font-bold text-[#204E4A]">
    {lang==='es'?'Medios pendientes':'Pending media'}
   </button>
  </div>
  {screen==='reports'&&<ModeratorQueue lang={lang} onClose={()=>setScreen(null)}/>}
  {screen==='media'&&<ModerationMediaQueue lang={lang} onClose={()=>setScreen(null)}/>}
  {adminAllowed&&screen==='dashboard'&&<AdminDashboard lang={lang} onClose={()=>setScreen(null)}/>}
 </section>
}
