import type { FirstUseIntent } from './firstUse'

export function FirstUsePrompt({petName,intent,lang,onExplore}:{
  petName:string;intent:FirstUseIntent;lang:'es'|'en';onExplore:()=>void
}) {
  const l=(es:string,en:string)=>lang==='es'?es:en
  return <section aria-label={l('Para empezar','To get started')} className="px-1 text-[#204E4A]">
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <h3 className="min-w-0 break-words text-sm font-extrabold">{l(`Todo sobre ${petName}`,`All about ${petName}`)}</h3>
      <button type="button" onClick={onExplore} className="min-h-11 py-2 text-[14px] font-bold underline underline-offset-4 hover:text-[#183D3A] focus-visible:bg-[#E1E53F]">{l('Explorar PAZO','Explore PAZO')} <span aria-hidden="true">→</span></button>
    </div>
    {intent==='qr'&&<p className="text-[14px] leading-relaxed">{l('Abre su pasaporte para ver y compartir el QR.','Open their passport to view and share the QR.')}</p>}
  </section>
}
