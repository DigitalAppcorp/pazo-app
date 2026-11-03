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
 const [initialSection,setInitialSection]=useState<'summary'|'vigilante'>('summary')
 // A Vigilante notice opens the panel straight on its inbox.
 useEffect(()=>{
  if(typeof window==='undefined')return
  const open=()=>{
   if(window.location.hash!=='#/admin/vigilante'||!adminAllowed)return
   history.replaceState(null,'',window.location.pathname+window.location.search)
   setInitialSection('vigilante');setScreen('dashboard')
  }
  open()
  window.addEventListener('hashchange',open)
  return ()=>window.removeEventListener('hashchange',open)
 },[adminAllowed])
 useEffect(()=>{
  let live=true
  if(!enabled){setAllowed(false);setAdminAllowed(false);setScreen(null);return}
  // Analytics deployment must never break the existing moderation queue.
  void isModerator().then(moderation=>{if(live)setAllowed(moderation)})
   .catch(()=>{if(live)setAllowed(false)})
  void checkAdmin().then(admin=>{if(live)setAdminAllowed(admin)})
   .catch(()=>{if(live)setAdminAllowed(false)})
  return ()=>{live=false}
 },[enabled])
 if(!enabled||(!allowed&&!adminAllowed))return null
 return <section className="space-y-3 rounded-[2rem] bg-white p-4 shadow-[0_4px_16px_rgba(32,78,74,0.05)]">
  <h3 className="text-[14px] font-black text-[#204E4A]">
   {adminAllowed&&allowed
     ?(lang==='es'?'Administración y moderación':'Administration and moderation')
     :adminAllowed
       ?(lang==='es'?'Administración':'Administration')
       :(lang==='es'?'Moderación':'Moderation')}
  </h3>
  <div className="flex flex-wrap gap-2">
   {adminAllowed&&<button type="button" onClick={()=>setScreen('dashboard')}
     className="rounded-full bg-[#E1E53F] px-4 py-3 text-[12px] font-extrabold text-[#204E4A] hover:bg-[#EDF150] focus-visible:bg-[#EDF150]">
     {lang==='es'?'Centro de control':'Control center'}
    </button>}
   {allowed&&<button type="button" onClick={()=>setScreen('reports')} className="rounded-full bg-[#204E4A] px-4 py-3 text-[12px] font-bold text-white">
    {lang==='es'?'Denuncias':'Reports'}
   </button>}
   {allowed&&<button type="button" onClick={()=>setScreen('media')} className="rounded-full bg-[#FAF8F5] px-4 py-3 text-[12px] font-bold text-[#204E4A]">
    {lang==='es'?'Medios pendientes':'Pending media'}
   </button>}
  </div>
  {allowed&&screen==='reports'&&<ModeratorQueue lang={lang} onClose={()=>setScreen(null)}/>}
  {allowed&&screen==='media'&&<ModerationMediaQueue lang={lang} onClose={()=>setScreen(null)}/>}
  {adminAllowed&&screen==='dashboard'&&<AdminDashboard key={initialSection} lang={lang} initialSection={initialSection} onClose={()=>{setScreen(null);setInitialSection('summary')}} onOpenReports={allowed?()=>setScreen('reports'):undefined}/>}
 </section>
}
