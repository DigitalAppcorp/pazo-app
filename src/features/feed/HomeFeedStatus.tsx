import {PazoStateIllustration} from '../illustrations/PazoStateIllustration'

/** Feed page states. These belong to main; never render them in the notice layer. */
export function HomeFeedStatus({status,lang,onRetry,onOpenPetTools}:{
  status:'loading'|'error';lang:'es'|'en';onRetry?:()=>void;onOpenPetTools:()=>void
}) {
  const l=(es:string,en:string)=>lang==='es'?es:en
  return <section data-pazo-feed-state={status} className="text-[#204E4A]">
    <h2 className="flex min-h-[42px] items-center px-1 text-[clamp(16px,4vw,20px)] font-black leading-tight tracking-tight max-[360px]:min-h-0">{l('Su pequeño mundo.','Their little world.')}</h2>
    <div className="flex min-h-[440px] flex-col items-center justify-center px-3 py-8 text-center [@media(max-height:650px)]:min-h-0 [@media(max-height:650px)]:py-4">
      <PazoStateIllustration kind={status} className="mb-4 h-36 w-44 shrink-0 [@media(max-height:650px)]:h-24"/>
      <div role={status==='error'?'alert':'status'} aria-atomic="true" className="max-w-[280px]">
        <h3 className="text-[21px] font-black leading-tight tracking-tight">{status==='loading'?l('Buscando historias','Gathering stories'):l('Volvamos a conectar','Let’s reconnect')}</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-[#5C7470]">{status==='loading'?l('Las publicaciones están en camino. Puedes seguir explorando mientras llegan.','Posts are on their way. You can keep exploring while they arrive.'):l('No pudimos cargar las publicaciones. Revisa tu conexión y vuelve a intentarlo.','Could not load posts. Check your connection and try again.')}</p>
      </div>
      <div className={'mt-5 grid w-full max-w-[280px] gap-2 '+(status==='error'?'grid-cols-2':'grid-cols-1')}>
        {status==='error'&&<button type="button" onClick={onRetry} className="min-h-12 rounded-2xl bg-[#204E4A] px-3 py-3 text-[13px] font-extrabold text-white hover:bg-[#183D3A] focus-visible:outline-2 focus-visible:outline-offset-2">{l('Reintentar','Try again')}</button>}
        <button type="button" onClick={onOpenPetTools} aria-label={l('Ver herramientas de mi mascota','View my pet’s tools')} className="min-h-12 rounded-2xl border border-[#204E4A]/15 bg-[#ECF2E8] px-3 py-3 text-[13px] font-extrabold hover:bg-[#E1EAD9] focus-visible:outline-2 focus-visible:outline-offset-2">{l('Ir a Mi mascota','Go to My Pet')}</button>
      </div>
    </div>
  </section>
}
