type Props = {
  lang:'es'|'en'
  onExplore:()=>void
  onDismiss:()=>void
  previewOnly?:boolean
}

/**
 * Non-blocking pitch presentation only. Do not mount until an approved
 * server-derived eligibility signal and persisted 30-day dismissal exist.
 * Never mounts in onboarding, rescue or an uncertain supporter state.
 */
export function SupporterInvitationPrompt({lang,onExplore,onDismiss,previewOnly=false}:Props) {
 const t=(es:string,en:string)=>lang==='es'?es:en
 return <aside aria-labelledby="pazo-supporter-prompt-title"
   className="fixed inset-x-4 bottom-20 z-[80] mx-auto max-w-[380px] rounded-[28px] bg-[#E6EDDB] p-5 text-[#204E4A] shadow-[0_12px_40px_rgba(32,78,74,0.16)]">
   {previewOnly && <p className="mb-2 text-[11px] font-bold text-[#52716A]">
     {t('Vista previa QA: este aviso todavía no se muestra automáticamente.',
        'QA preview: this invitation is not shown automatically yet.')}
   </p>}
   <p className="text-xs font-extrabold uppercase tracking-widest text-[#52716A]">
     {t('Un pequeño gracias por estar aquí','A little thank-you for being here')}
   </p>
   <h2 id="pazo-supporter-prompt-title" className="mt-2 text-[21px] font-black leading-tight">
     {t('¿Te gustaría ayudar a PAZO a crecer?','Would you like to help PAZO grow?')}
   </h2>
   <p className="mt-2 text-[13px] leading-relaxed text-[#476862]">
     {t('PAZO seguirá siendo gratis. Si quieres colaborar por US$2.99 al mes, conocerás cuatro beneficios especiales.',
       'PAZO will remain free. If you choose to support us for US$2.99 per month, you can enjoy four special benefits.')}
   </p>
   <div className="mt-4 flex flex-col gap-2">
     <button type="button" onClick={onExplore}
       className="min-h-11 rounded-full bg-[#204E4A] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#31635C] focus-visible:bg-[#31635C]">
       {t('Conocer Amigo de PAZO','Explore Friend of PAZO')}
     </button>
     <button type="button" onClick={onDismiss}
       className="min-h-11 rounded-full bg-white/70 px-5 py-3 text-sm font-bold text-[#204E4A] hover:bg-white focus-visible:bg-white">
       {t('Ahora no','Not now')}
     </button>
   </div>
 </aside>
}
