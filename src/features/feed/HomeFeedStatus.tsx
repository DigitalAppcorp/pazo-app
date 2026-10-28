/** Keep waiting/error in the feed's reading flow; identity/tools stay usable. */
export function HomeFeedStatus({status,lang,onRetry,onOpenPetTools}:{
  status:'loading'|'error';lang:'es'|'en';onRetry?:()=>void;onOpenPetTools:()=>void
}) {
  const l=(es:string,en:string)=>lang==='es'?es:en
  return <section className="px-1 text-[#204E4A]">
    <div className="flex min-h-[42px] items-center max-[360px]:min-h-0">
      <h2 className="text-[clamp(16px,4vw,20px)] font-black leading-tight tracking-tight">{l('Su pequeño mundo.','Their little world.')}</h2>
    </div>
    <div role={status==='loading'?'status':'alert'} className="mt-5 space-y-2">
      <h3 className="flex items-center gap-2 text-[15px] font-bold">
        {status==='loading'&&<span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border-2 border-[#204E4A]/20 border-t-[#204E4A] motion-safe:animate-spin"/>}
        {status==='loading'?l('Sincronizando feed...','Syncing feed...'):l('No pudimos cargar las publicaciones','Could not load posts')}
      </h3>
      <p className="max-w-sm text-[14px] leading-relaxed text-[#5C7470]">{status==='loading'
        ?l('Mientras llegan las publicaciones, puedes usar las herramientas de tu mascota.','While posts load, you can use your pet’s tools.')
        :l('Revisa tu conexión e inténtalo de nuevo. Tus publicaciones no se han borrado.','Check your connection and try again. Your posts were not deleted.')}</p>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      {status==='error'&&<button type="button" onClick={onRetry} className="min-h-11 rounded-full bg-[#204E4A] px-5 py-2 text-[14px] font-bold text-white focus-visible:bg-[#183D3A]">{l('Reintentar','Try again')}</button>}
      <button type="button" onClick={onOpenPetTools} className="min-h-11 py-2 text-left text-[14px] font-bold underline underline-offset-4 focus-visible:bg-[#E1E53F]">{l('Ver herramientas de mi mascota','View my pet’s tools')}</button>
    </div>
  </section>
}
