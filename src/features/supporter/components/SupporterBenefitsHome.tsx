import {useEffect, useRef, useState} from 'react'
import type {Pet} from '../../../types/pazo'
import {SupporterBadge, type SupporterMilestone} from './SupporterBadge'
import {SupporterThemePreviewPanel} from './SupporterThemePreviewPanel'
import {SupporterWallConsentSettings} from './SupporterWallConsentSettings'
import {SandboxV2AccountPanel} from './SandboxV2AccountPanel'
import {SupporterSandboxBenefitsStatus} from './SupporterSandboxBenefitsStatus'

type Props = {
 lang:'es'|'en'
 onClose:()=>void
 pet?:Pet
 milestone:SupporterMilestone
 qa:boolean
}

export function SupporterBenefitsHome({lang,onClose,pet,milestone,qa}:Props) {
 const [showThemes,setShowThemes]=useState(false)
 const [showWall,setShowWall]=useState(false)
 const [showMembership,setShowMembership]=useState(false)
 const [showDetails,setShowDetails]=useState(false)
 const closeRef=useRef<HTMLButtonElement>(null)
 const t=(es:string,en:string)=>lang==='es'?es:en
 useEffect(()=>{
   closeRef.current?.focus()
   const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!showThemes)onClose()}
   window.addEventListener('keydown',escape)
   return ()=>window.removeEventListener('keydown',escape)
 },[onClose,showThemes])
 const row='flex min-h-20 w-full items-center justify-between gap-3 rounded-[24px] bg-white p-4 text-left shadow-[0_4px_16px_rgba(32,78,74,0.04)] transition-colors hover:bg-[#F2F5EA] focus-visible:bg-[#E1E53F]/30'
 const iconBox='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E1E53F]/35 font-black text-[#204E4A]'
 const item=(title:string,subtitle:string) => <span className="min-w-0 flex-1">
   <span className="block text-[15px] font-extrabold text-[#204E4A]">{title}</span>
   <span className="mt-1 block text-xs leading-relaxed text-[#5C7470]">{subtitle}</span>
 </span>
 return <div role="dialog" aria-modal="true" aria-labelledby="friend-benefits-title"
   className="fixed inset-0 z-[115] overflow-y-auto bg-[#FAF8F5] text-[#204E4A]">
   <header className="sticky top-0 z-20 bg-[#FAF8F5]/95 px-4 py-3 backdrop-blur-xl">
     <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
       <h2 className="text-[20px] font-black" id="friend-benefits-title">{t('Amigo de PAZO','Friend of PAZO')}</h2>
       <button type="button" ref={closeRef} onClick={onClose}
         className="min-h-11 rounded-full bg-white px-4 py-2.5 text-sm font-extrabold shadow-sm hover:bg-[#E1E53F]/30 focus-visible:bg-[#E1E53F]/40">
         {t('Volver a PAZO','Back to PAZO')}
       </button>
     </div>
   </header>
   <main className="mx-auto max-w-xl space-y-4 px-4 pb-12 pt-4">
     <section className="flex items-center gap-4 rounded-[30px] bg-[#E6EDDB] p-5">
       <SupporterBadge active milestone={milestone} lang={lang} size="large"/>
       <div className="min-w-0">
         <p className="text-xs font-bold text-[#52716A]">{t('¡Gracias por colaborar!','Thank you for supporting!')}</p>
         <h3 className="mt-1 text-xl font-black">{t('Tus beneficios están disponibles','Your benefits are available')}</h3>
         <p className="mt-1 text-xs text-[#476862]">
           {milestone>0?t(`Insignia de ${milestone} meses completados.`,`Badge for ${milestone} completed months.`):
             t('Insignia de Amigo de PAZO activa.','Your PAZO Friend badge is active.')}
         </p>
       </div>
     </section>
     <h3 className="px-1 text-lg font-black">{t('Mis beneficios','My benefits')}</h3>
     <button type="button" className={row} onClick={()=>setShowThemes(true)}
       disabled={!pet} aria-label={t('Personalizar perfil','Customize profile')}>
       <span aria-hidden="true" className={iconBox}><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 1-4 1 1 0 0 1 1-2h2a4 4 0 0 0 3-4 9 9 0 0 0-9-8Z"/><circle cx="7" cy="11" r="1"/><circle cx="11" cy="7" r="1"/><circle cx="16" cy="8" r="1"/></svg></span>
       {item(t('Personalizar perfil','Customize profile'),pet
         ?t('Elige y guarda uno de los cinco fondos.','Choose and save one of five backgrounds.')
         :t('Abre Mi mascota para elegir el perfil que personalizarás.','Open My Pet to select the profile to customize.'))}
       <span aria-hidden="true" className="text-xl font-bold">›</span>
     </button>
     <button type="button" className={row} onClick={()=>setShowWall(value=>!value)} aria-expanded={showWall}>
       <span aria-hidden="true" className={iconBox}><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 21s-9-5.5-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-9 11-9 11Z"/></svg></span>
       {item(t('Muro de agradecimiento','Thank-you wall'),t('Autoriza o retira cada mascota por separado.','Opt in or withdraw each pet separately.'))}
       <span aria-hidden="true" className="text-xl font-bold">›</span>
     </button>
     {showWall&&<SupporterWallConsentSettings lang={lang}/>}
     <section className="rounded-[24px] bg-white p-4 shadow-[0_4px_16px_rgba(32,78,74,0.04)]">
       <div className="flex items-center gap-3">
         <span className={iconBox}><SupporterBadge active milestone={milestone} lang={lang}/></span>
         {item(t('Mis insignias','My badges'),t('La insignia actual refleja únicamente períodos verificados.','Your current badge reflects only verified paid periods.'))}
       </div>
       <p className="mt-3 text-xs leading-relaxed text-[#5C7470]">
         {t('Los reconocimientos de 3, 6 y 12 meses aparecen cuando se cumplen los períodos pagados. No es necesario comprarlos por separado.',
           'Milestone badges appear after 3, 6 and 12 completed paid months. No separate purchase is needed.')}
       </p>
     </section>
     <button type="button" className={row} onClick={()=>setShowMembership(v=>!v)} aria-expanded={showMembership}>
       <span aria-hidden="true" className={iconBox}><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/></svg></span>
       {item(t('Mi membresía','My membership'),t('Consulta tu suscripción, condiciones y cancelación.','View subscription details, terms and cancellation.'))}
       <span aria-hidden="true" className="text-xl font-bold">›</span>
     </button>
     {showMembership && (qa
       ? <SandboxV2AccountPanel lang={lang}/>
       : <p role="status" className="rounded-2xl bg-white p-4 text-sm text-[#476862]">
           {t('La administración de cobros reales sigue desactivada hasta el lanzamiento.',
             'Live billing management remains unavailable until launch.')}
         </p>)}
     {qa&&<details open={showDetails} onToggle={event=>setShowDetails(event.currentTarget.open)}
       className="rounded-3xl bg-[#F0F3ED] p-4">
       <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold focus-visible:bg-[#E1E53F]/35">
         {t('Diagnóstico de beneficios · Solo QA','Benefit diagnostics · QA only')}
       </summary>
       <SupporterSandboxBenefitsStatus lang={lang}/>
     </details>}
   </main>
   {showThemes&&pet&&<SupporterThemePreviewPanel pet={pet} lang={lang} onClose={()=>setShowThemes(false)}/>}
 </div>
}
