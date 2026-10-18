import {useEffect,useRef,useState} from 'react'
import type {Pet} from '../../../types/pazo'
import {IconPaw} from '../../../components/icons/PazoIcons'
import {SupporterThemeSaveControl} from './SupporterThemeSaveControl'
import {supporterBenefitsUiEnabled} from '../supporterUiRelease'
import {
 SupporterProfileBackdrop,
 SupporterThemePreviewPicker,
 type SupporterProfileThemeSelection,
} from './SupporterProfileThemes'

interface SupporterThemePreviewPanelProps {
 pet:Pet
 lang:'es'|'en'
 onClose:()=>void
}
// UI previews are not paid proof. Saving remains an owner/server-authorized RPC.
const liveBenefitsUI = supporterBenefitsUiEnabled

export const SupporterThemePreviewPanel=({pet,lang,onClose}:SupporterThemePreviewPanelProps)=>{
 const [theme,setTheme]=useState<SupporterProfileThemeSelection>(null)
 const closeRef=useRef<HTMLButtonElement>(null)
 const t=(es:string,en:string)=>lang==='es'?es:en
 useEffect(()=>{
  closeRef.current?.focus()
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()}
  window.addEventListener('keydown',escape)
  return ()=>window.removeEventListener('keydown',escape)
 },[onClose])

 return (
 <div role="dialog" aria-modal="true" aria-labelledby="supporter-theme-preview-title"
  className="fixed inset-0 z-[110] overflow-y-auto overscroll-contain bg-[#FAF8F5] font-sans text-[#204E4A]">
  <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 px-4 py-3 backdrop-blur-xl">
   <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
    <div className="min-w-0">
     <h2 id="supporter-theme-preview-title" className="text-[19px] font-black">
      {t('Personalizar perfil','Customize profile')}
     </h2>
     <p className="mt-1 text-[12px] text-[#5C7470]">
      {t('Fondos exclusivos de Amigo de PAZO','Exclusive PAZO Friend backgrounds')}
     </p>
    </div>
    <button ref={closeRef} type="button" onClick={onClose}
     className="min-h-11 shrink-0 rounded-full bg-white px-4 py-2.5 text-[12px] font-bold text-[#204E4A] shadow-[0_3px_12px_rgba(32,78,74,0.05)] hover:bg-[#E6EDDB] focus-visible:bg-[#E1E53F]/45">
     {t('Volver a beneficios','Back to benefits')}
    </button>
   </div>
  </header>
  <main className="mx-auto w-full max-w-xl space-y-4 px-4 pb-12 pt-3">
   <section aria-label={t('Así se verá el perfil de tu mascota','How your pet profile will look')}
    className="overflow-hidden rounded-[30px] bg-white p-3 shadow-[0_6px_24px_rgba(32,78,74,0.045)]">
    <div className={'relative isolate min-h-[375px] overflow-hidden rounded-[26px] px-6 pb-9 pt-6 transition-colors duration-300 '+
      (theme==='stars'?'bg-[#1B2D5C]':'bg-[#F8F5EC]')}>
     {theme&&<SupporterProfileBackdrop theme={theme}/>}
     {theme==='stars'&&<div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-[150px] bg-gradient-to-b from-[#17264A]/5 via-[#17264A]/45 to-[#17264A]/65"/>}
     <div className="relative z-10">
      <div className="mb-6 flex items-center justify-between">
       <span className={'rounded-full px-3 py-1.5 text-[10px] font-black '+(theme==='stars'?'bg-white/20 text-white':'bg-white/80 text-[#204E4A]')}>
        {t('Perfil de PAZO','PAZO profile')}
       </span>
       <span className={'text-[10px] font-extrabold '+(theme==='stars'?'text-white':'text-[#204E4A]')}>
        {t('Amigo de PAZO','PAZO Friend')}
       </span>
      </div>
      <div className="flex h-[112px] w-[112px] items-center justify-center overflow-hidden rounded-full bg-[#E9EFE6] shadow-[0_8px_24px_rgba(32,78,74,0.10)]">
       {pet.photoUrl
        ?<img src={pet.photoUrl} alt={pet.name} className="h-full w-full object-cover"/>
        :<IconPaw size={52} className="text-[#204E4A]/40"/>}
      </div>
      <h3 className={'mt-5 break-words text-[clamp(31px,9vw,42px)] font-black leading-tight tracking-[-0.035em] '+(theme==='stars'?'text-[#FCFAF2]':'text-[#204E4A]')}>
       {pet.name}
      </h3>
      <span className="mt-3 inline-flex rounded-full bg-[#E1E53F]/85 px-3 py-1.5 text-[11px] font-extrabold uppercase text-[#204E4A]">
       {pet.species}
      </span>
      {pet.breed&&<p className={'mt-2 text-[13px] font-semibold '+(theme==='stars'?'text-[#F0F4EB]':'text-[#315B55]')}>{pet.breed}</p>}
      {Boolean(pet.bio?.trim())&&<p className={'mt-2 max-w-[40ch] whitespace-pre-wrap break-words text-[14px] font-medium '+(theme==='stars'?'text-[#F0F4EB]':'text-[#315B55]')}>
       {pet.bio}
      </p>}
     </div>
    </div>
   </section>
   <section className="rounded-[28px] bg-white p-4 shadow-[0_6px_24px_rgba(32,78,74,0.045)]">
    <h3 className="mb-1 text-[16px] font-black">{t('Elige tu fondo','Choose your background')}</h3>
    <p className="mb-4 text-[12px] leading-relaxed text-[#5C7470]">
     {liveBenefitsUI?t('Toca un diseño para verlo en tu perfil.','Tap a design to see it on your profile.'):
      t('Explora los diseños. Aún no puedes guardarlos.','Explore the designs. Saving is not yet available.')}
    </p>
    <SupporterThemePreviewPicker value={theme} onChange={setTheme} lang={lang} enabled={liveBenefitsUI}/>
    {liveBenefitsUI&&<SupporterThemeSaveControl petId={pet.id} selectedTheme={theme} lang={lang} onLoaded={setTheme}/>}
    {!liveBenefitsUI&&<p role="status" className="mt-3 text-center text-[12px] text-[#5C7470]">
      {t('Solo vista previa. Tu perfil público no ha cambiado.','Preview only. Your public profile is unchanged.')}
    </p>}
    {liveBenefitsUI&&<button type="button" disabled={theme===null} onClick={()=>setTheme(null)}
     className="mt-3 min-h-11 w-full rounded-full px-4 py-2 text-[12px] font-bold text-[#476862] underline decoration-[#9AAEA6] underline-offset-4 hover:bg-[#F0F3ED] focus-visible:bg-[#E1E53F]/30 disabled:opacity-45">
     {t('Elegir fondo original','Choose original background')}
    </button>}
   </section>
   <p role="status" className="px-3 text-center text-[11px] leading-relaxed text-[#617670]">
    {t('Tu perfil público solo cambiará cuando PAZO confirme que se guardó el fondo.',
       'Your public profile changes only after PAZO confirms your background was saved.')}
   </p>
  </main>
 </div>
 )
}
