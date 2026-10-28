import type { FirstUseIntent } from './firstUse'

export function FirstUsePrompt({petName,intent,lang,onQr,onCare,onExplore}:{
  petName:string;intent:FirstUseIntent;lang:'es'|'en';onQr:()=>void;onCare:()=>void;onExplore:()=>void
}) {
  const l=(es:string,en:string)=>lang==='es'?es:en
  return <section aria-label={l('Para empezar','To get started')} className="mb-4 rounded-[2rem] bg-[#E8F2E6] p-4 text-[#204E4A] shadow-sm">
    <h2 className="text-[17px] font-black leading-snug">{intent==='qr'
      ?l(`Abre el pasaporte de ${petName}`,`Open ${petName}’s passport`)
      :l(`Un primer paso para ${petName}`,`A first step for ${petName}`)}</h2>
    <p className="mt-2 text-[14px] leading-relaxed">{intent==='qr'
      ?l('Comparte su ficha pública o descarga su QR para una placa o collar. El QR no rastrea por GPS.','Share their public profile or download their QR for a tag or collar. The QR does not track GPS.')
      :l('Usa su pasaporte QR o guarda su próximo cuidado. Puedes explorar PAZO a tu ritmo.','Use their QR passport or save their next care item. You can explore PAZO at your own pace.')}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={onQr} className="min-h-11 rounded-full bg-[#204E4A] px-4 py-2 text-[14px] font-bold text-white hover:bg-[#183D3A] focus-visible:underline">{l('Ver pasaporte QR','View QR passport')}</button>
      <button type="button" onClick={onCare} className="min-h-11 rounded-full bg-[#E1E53F] px-4 py-2 text-[14px] font-bold hover:bg-[#EDF150] focus-visible:underline">{l('Abrir Agenda','Open care agenda')}</button>
      <button type="button" onClick={onExplore} className="min-h-11 rounded-full px-3 py-2 text-[14px] font-bold underline underline-offset-4 hover:bg-white focus-visible:bg-white">{l('Explorar PAZO','Explore PAZO')}</button>
    </div>
  </section>
}
