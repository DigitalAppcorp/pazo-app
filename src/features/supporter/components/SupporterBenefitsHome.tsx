import {GradualCampaignPanel} from '../gradual/GradualCampaignPanel'
import {useEffect, useRef, useState} from 'react'
import type {Pet} from '../../../types/pazo'
import {SupporterBadge, type SupporterMilestone} from './SupporterBadge'
import {SupporterThemePreviewPanel} from './SupporterThemePreviewPanel'
import {SupporterWallConsentSettings} from './SupporterWallConsentSettings'
import {SandboxV2AccountPanel} from './SandboxV2AccountPanel'
import {SupporterSandboxBenefitsStatus} from './SupporterSandboxBenefitsStatus'
import {SupporterScreenPortal} from './SupporterScreenPortal'

type Props = {
 lang:'es'|'en'
 onClose:()=>void
 pet?:Pet
 milestone:SupporterMilestone
 qa:boolean
 onManageSubscription?:()=>void
}
type IconName='paw'|'palette'|'heart'|'medal'|'card'
const BenefitIcon=({name}: {name:IconName})=>{
 const paths:Record<IconName,string>={
  paw:'M8 9.5c-.8 0-1.5-.9-1.5-2s.7-2 1.5-2 1.5.9 1.5 2-.7 2-1.5 2Zm8 0c-.8 0-1.5-.9-1.5-2s.7-2 1.5-2 1.5.9 1.5 2-.7 2-1.5 2ZM5 14c-.9 0-1.5-.8-1.5-1.8s.6-1.7 1.5-1.7 1.5.7 1.5 1.7S5.9 14 5 14Zm14 0c-.9 0-1.5-.8-1.5-1.8s.6-1.7 1.5-1.7 1.5.7 1.5 1.7S19.9 14 19 14Zm-7 6c-2.1 0-3-1-4.6-.8-1.7.2-3-1.1-2.2-2.8 1-2 2.6-3.9 4.5-4.7.9-.4 1.5-.5 2.3-.5s1.4.1 2.3.5c1.9.8 3.5 2.7 4.5 4.7.8 1.7-.5 3-2.2 2.8-1.6-.2-2.5.8-4.6.8Z',
  palette:'M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 1-4 1 1 0 0 1 1-2h2a4 4 0 0 0 3-4 9 9 0 0 0-9-8ZM7 11h.01M11 7h.01M16 8h.01',
  heart:'M12 21s-9-5.5-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-9 11-9 11Z',
  medal:'m12 14 4 2.5-1 5.5-3-2-3 2-1-5.5 4-2.5ZM7 3h10l2 5-7 6-7-6 2-5Zm2 0 3 7 3-7',
  card:'M3 5h18v14H3V5Zm0 5h18',
 }
 return <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <path d={paths[name]}/>
 </svg>
}
export function SupporterBenefitsHome({lang,onClose,pet,milestone,qa,onManageSubscription}:Props) {
 const [showThemes,setShowThemes]=useState(false)
 const [showWall,setShowWall]=useState(false)
 const [showMembership,setShowMembership]=useState(false)
 const [showDetails,setShowDetails]=useState(false)
 const [showMilestones,setShowMilestones]=useState(false)
 const [showSandboxTools,setShowSandboxTools]=useState(false)
 const closeRef=useRef<HTMLButtonElement>(null)
 const t=(es:string,en:string)=>lang==='es'?es:en
 // Only deliberate localhost QA can see raw troubleshooting tools.
 const showQaDiagnostics=qa&&import.meta.env.DEV&&
  typeof window!=='undefined'&&
  ['localhost','127.0.0.1'].includes(window.location.hostname)&&
  new URLSearchParams(window.location.search).get('supporter_debug')==='1'
 useEffect(()=>{
  closeRef.current?.focus()
 },[])
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||showThemes)return
   if(showWall){setShowWall(false);return}
   if(showMembership){setShowMembership(false);return}
   onClose()
  }
  window.addEventListener('keydown',escape)
  return ()=>window.removeEventListener('keydown',escape)
 },[onClose,showThemes,showWall,showMembership])

 const row='flex min-h-[78px] w-full items-center gap-3 rounded-[23px] px-3 py-3 text-left transition-colors hover:bg-[#F1F4EB] focus-visible:bg-[#E1E53F]/35 disabled:opacity-55'
 const iconBox='flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#ECF0D7] text-[#204E4A]'
 const caption='text-[14px] leading-relaxed text-[#5C7470]'
 const item=(title:string,subtitle:string) => <span className="min-w-0 flex-1">
   <span className="block text-[16px] font-black text-[#204E4A]">{title}</span>
   <span className={'mt-1 block '+caption}>{subtitle}</span>
  </span>
 const feature=(name:IconName,title:string,description:string,action:()=>void,disabled=false,expanded?:boolean)=>
  <button type="button" className={row} onClick={action} disabled={disabled} aria-expanded={expanded}>
   <span className={iconBox}><BenefitIcon name={name}/></span>
   {item(title,description)}
   <span className="px-1 text-2xl font-light text-[#47726B]" aria-hidden="true">›</span>
  </button>
 return <SupporterScreenPortal>
 <div role="dialog" aria-modal="true" aria-labelledby="friend-benefits-title"
  className="h-full w-full min-h-0 overflow-y-auto overscroll-contain bg-[#FAF8F5] text-[#204E4A]">
  <header className="sticky top-0 z-20 bg-[#FAF8F5]/95 px-4 py-3 backdrop-blur-xl">
   <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
    <h2 className="text-[19px] font-black" id="friend-benefits-title">{showWall?t('Muro de agradecimiento','Thank-you wall'):t('Amigo de PAZO','Friend of PAZO')}</h2>
    <button type="button" ref={closeRef} onClick={()=>showWall?setShowWall(false):onClose()}
     className="min-h-11 rounded-full bg-white px-4 py-2.5 text-[14px] font-bold shadow-[0_3px_15px_rgba(32,78,74,0.05)] hover:bg-[#E6EDDB] focus-visible:bg-[#E1E53F]/50">
     {showWall?t('Volver a beneficios','Back to benefits'):t('Volver a PAZO','Back to PAZO')}
    </button>
   </div>
  </header>
  <main className="mx-auto w-full min-w-0 max-w-xl space-y-4 px-4 pb-10 pt-3">
  {showWall ? <SupporterWallConsentSettings lang={lang}/> : <>
   <section aria-label={t('Acceso a beneficios','Benefit access')}
    className="flex flex-col items-center gap-2 rounded-[32px] bg-[#E8EEDD] px-6 py-7 text-center">
    <SupporterBadge active milestone={milestone} lang={lang} size="large"/>
    <h3 className="mt-2 text-[22px] font-black leading-tight">{t('Ya eres Amigo de PAZO','You are a PAZO Friend')}</h3>
    <p className="max-w-[31ch] text-[14px] leading-relaxed text-[#476862]">
     {t('Gracias por ayudar a que PAZO siga siendo gratis para todos.','Thanks for helping keep PAZO free for everyone.')}
    </p>
    <p role="status" className="mt-2 rounded-full bg-white/80 px-4 py-2 text-[14px] font-black text-[#204E4A]">
     {t('Beneficios activos y verificados','Verified active benefits')}
    </p>
    <p className="text-[13px] text-[#5C7470]">
     {t('Las cortesías no generan cobros ni renovaciones. Si tienes una suscripción, puedes gestionarla en Mi membresía.', 'Complimentary access creates no charges or renewals. Manage any subscription under My membership.')}
    </p>
   </section>
   {!qa&&<GradualCampaignPanel lang={lang} reviewOnly/>}
   <h3 className="px-1 pt-1 text-[19px] font-black">{t('Tus beneficios','Your benefits')}</h3>
   <section aria-label={t('Beneficios de Amigo de PAZO','PAZO Friend benefits')}
    className="rounded-[28px] bg-white p-2 shadow-[0_6px_23px_rgba(32,78,74,0.035)]">
    {feature('paw',t('Tu insignia','Your badge'),
      milestone>0?t(`Reconocimiento de ${milestone} meses completados.`,`Recognition for ${milestone} completed months.`):
       t('Visible en perfil y publicaciones.','Shown on profiles and posts.'),
      ()=>setShowDetails(value=>!value),false,showDetails)}
    {showDetails&&<div className="mx-3 mb-3 rounded-[20px] bg-[#F4F5EE] p-4">
     <div className="flex items-center gap-3"><SupporterBadge active milestone={milestone} lang={lang}/>
      <p className={caption}>{t('La insignia depende de los pagos verificados de tu cuenta.','Your badge is based on verified paid periods.')}</p>
     </div>
    </div>}
    {feature('palette',t('Personalizar perfil','Customize profile'),
      pet?t('Elige y guarda uno de cinco fondos.','Choose and save one of five backgrounds.'):
       t('Abre desde Mi mascota para seleccionar un perfil.','Open from My Pet to choose a profile.'),
      ()=>setShowThemes(true),!pet)}
    {feature('heart',t('Muro de agradecimiento','Thank-you wall'),
      t('Tú eliges qué mascotas aparecen.','Choose which pets appear.'),
      ()=>setShowWall(true))}
    {feature('medal',t('Medallas de antigüedad','Milestone badges'),
      t('Reconocimientos de 3, 6 y 12 meses.','Recognition at 3, 6 and 12 months.'),
      ()=>setShowMilestones(value=>!value),false,showMilestones)}
    {showMilestones&&<div className="mx-3 mb-3 space-y-3 rounded-[22px] bg-[#F4F5EE] px-4 py-4">
     <p className="text-[16px] font-black leading-snug text-[#204E4A]">
      {t('Tu apoyo merece reconocimiento','Your support deserves recognition')}
     </p>
     <p className="text-[14px] leading-relaxed text-[#476862]">
      {t('PAZO agradece el tiempo que llevas apoyando nuestra comunidad. Con el paso del tiempo, tu mascota recibe nuevos reconocimientos que reflejan ese apoyo.',
        'PAZO is grateful for the time you have spent supporting our community. As time goes by, your pet earns new badges that reflect your support.')}
     </p>
     <div aria-label={t('Hitos de agradecimiento','Recognition milestones')} className="grid grid-cols-3 gap-2 pt-1">
      {([3,6,12] as const).map(months=><div key={months} className={'rounded-[18px] px-2 py-3 text-center '+(milestone>=months?'bg-[#DCE9C8]':'bg-white')}>
       <p className="text-[20px] font-black leading-none text-[#204E4A]">{months}</p>
       <p className="mt-1 text-[12px] font-semibold text-[#52716A]">{t('meses','months')}</p>
       {milestone>=months&&<p className="mt-2 text-[12px] font-black text-[#204E4A]">{t('Reconocido','Earned')}</p>}
      </div>)}
     </div>
    </div>}
   </section>
   <section className="rounded-[26px] bg-white p-2 shadow-[0_6px_23px_rgba(32,78,74,0.035)]">
    {feature('card',t('Mi membresía','My membership'),
      t('Pago, renovación y cancelación.','Payment, renewal and cancellation.'),
      ()=>setShowMembership(v=>!v),false,showMembership)}
    {showMembership && <div className="space-y-3 px-3 pb-4">
      <p className={caption}>{t('Los detalles de tu suscripción se consultan directamente en PayPal.','Your subscription details come directly from PayPal.')}</p>
      {qa ? <>
        <SandboxV2AccountPanel lang={lang} consumer/>
        {showQaDiagnostics&&<details open={showSandboxTools}
          onToggle={event=>setShowSandboxTools(event.currentTarget.open)}
          className="rounded-[20px] bg-[#EFF3E8] p-3">
          <summary className="min-h-11 cursor-pointer py-3 text-[14px] font-bold focus-visible:bg-[#E1E53F]/40">
           {t('Herramientas de prueba Sandbox','Sandbox test tools')}
          </summary>
          <SandboxV2AccountPanel lang={lang}/>
        </details>}
      </> : <button type="button" onClick={onManageSubscription}
        disabled={!onManageSubscription}
        className="min-h-11 rounded-full bg-[#E1E53F] px-4 py-3 text-[14px] font-bold disabled:opacity-50">
        {t('Administrar mi suscripción','Manage my subscription')}
      </button>}
    </div>}
   </section>
   {showQaDiagnostics&&<details className="rounded-[24px] bg-[#F0F3ED] px-4 py-2">
    <summary className="min-h-11 cursor-pointer py-3 text-[14px] font-bold focus-visible:bg-[#E1E53F]/35">
     {t('Diagnóstico de beneficios · Solo QA','Benefit diagnostics · QA only')}
    </summary>
    <SupporterSandboxBenefitsStatus lang={lang}/>
   </details>}
  </>}
  </main>
  {showThemes&&pet&&<SupporterThemePreviewPanel pet={pet} lang={lang} onClose={()=>setShowThemes(false)}/>}
 </div>
 </SupporterScreenPortal>
}
