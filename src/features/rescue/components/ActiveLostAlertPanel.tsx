import type { Pet } from '../../../types/pazo'
import { IconAlert, IconPin, IconPaw, IconClose } from '../../../components/icons/PazoIcons'

interface Props {
  pet: Pet
  lastSeen: string
  details: string
  lang: 'es' | 'en'
  isSaving: boolean
  publicUrl: string
  isLinkLoading: boolean
  linkError: string
  shareFeedback: string
  isLocalLink: boolean
  onCopy: () => void
  onWhatsApp: () => void
  onInstagram: () => void
  onMore: () => void
  onRetryLink: () => void
  onResolve: () => void
  onClose: () => void
}

// The already active alert is shared via its existing, read-only public QR passport.
export const ActiveLostAlertPanel = (props: Props) => {
  const {pet,lastSeen,details,lang,isSaving,publicUrl,isLinkLoading,linkError,
    shareFeedback,isLocalLink,onCopy,onWhatsApp,onInstagram,onMore,
    onRetryLink,onResolve,onClose}=props
  const es=lang==='es'
  const ready=Boolean(publicUrl)&&!isLinkLoading
  return (
    <section aria-label={es?'Alerta activa':'Active alert'} className="space-y-3">
      <header className="relative text-center">
        <button type="button" onClick={onClose} aria-label={es?'Cerrar ventana':'Close window'}
          className="absolute right-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-[#204E4A] hover:bg-[#E1E53F]/40 focus-visible:bg-[#E1E53F]/40">
          <IconClose size={16}/>
        </button>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-2 h-24 rounded-full bg-[#E1E53F]/25 blur-xl"/>
        <div className="relative mx-auto w-fit pt-1">
          {pet.photoUrl
            ? <img src={pet.photoUrl} alt={pet.name} className="h-28 w-28 rounded-[2rem] object-cover shadow-[0_5px_20px_rgba(32,78,74,0.13)]"/>
            : <span aria-hidden="true" className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-[#EAF1E5] text-[#204E4A]"><IconPaw size={30}/></span>}
          <span aria-hidden="true" className="absolute -bottom-2 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#E1E53F] text-[#204E4A] shadow-sm"><IconAlert size={18}/></span>
        </div>
        <h3 className="mt-5 text-2xl font-black text-[#204E4A]">{es?'Alerta activa':'Active alert'}</h3>
        <p className="mx-auto mt-1 max-w-[280px] text-xs leading-relaxed text-[#5C7470]">
          {es?`El pasaporte QR de ${pet.name} muestra ahora la información de búsqueda.`:`${pet.name}'s QR passport now displays the search information.`}
        </p>
      </header>

      <div className="flex items-start gap-2.5 rounded-2xl bg-[#FFF2EE] p-3.5 text-left">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#EC7357]"><IconPin size={18}/></span>
        <div className="min-w-0">
          <p className="break-words text-xs font-extrabold text-[#204E4A]">{lastSeen}</p>
          {details.trim() && <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-[11px] text-[#5C7470]">{details}</p>}
        </div>
      </div>

      <section aria-label={es?'Compartir búsqueda':'Share search'} className="rounded-[1.6rem] bg-[#EDF3E6] p-3.5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#204E4A]">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="2.5"/><circle cx="5" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m7 11 9-5M7 13l9 5"/></svg>
          </span>
          <div className="min-w-0">
            <h4 className="text-[13px] font-black text-[#204E4A]">{es?'Compartir búsqueda':'Share search'}</h4>
            <p className="text-[10px] leading-relaxed text-[#5C7470]">
              {es?`Comparte el pasaporte público de ${pet.name} para que otros vean su alerta.`:`Share ${pet.name}'s public passport so others can see the alert.`}
            </p>
          </div>
        </div>
        {isLinkLoading ? <p role="status" className="mt-3 text-center text-xs text-[#5C7470]">{es?'Preparando enlace…':'Preparing link…'}</p>
          : linkError ? <div className="mt-3 text-center">
              <p role="alert" className="text-xs font-semibold text-[#C35042]">{linkError}</p>
              <button type="button" onClick={onRetryLink} className="mt-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#204E4A] focus-visible:bg-[#E1E53F]">{es?'Reintentar':'Retry'}</button>
            </div>
          : <div role="group" aria-label={es?'Opciones para compartir':'Sharing options'} className="mt-3 grid grid-cols-4 gap-1">
              <button type="button" onClick={onCopy} disabled={!ready} className="flex min-h-[66px] flex-col items-center gap-1 rounded-2xl p-1 text-[#204E4A] focus-visible:bg-white/90 disabled:opacity-50">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#204E4A] text-white">
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l2-2"/></svg>
                </span><span className="text-[10px] font-bold">{es?'Copiar link':'Copy link'}</span>
              </button>
              <button type="button" onClick={onWhatsApp} disabled={!ready||isLocalLink} className="flex min-h-[66px] flex-col items-center gap-1 rounded-2xl p-1 text-[#204E4A] focus-visible:bg-white/90 disabled:opacity-50">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#35B865] text-white">
                  <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.4 11.7a8.4 8.4 0 0 1-12.5 7.3L3 20l1.2-4.5a8.4 8.4 0 1 1 16.2-3.8z"/><path d="M9 8.5c.3 2.7 2 4.5 4.9 5.7l1.5-1.2 1.3 1.3c-.6 1.3-1.9 2-3.3 1.5-3.1-1.1-5.5-3.5-6.1-.3-1.1.3-2.4 1.7-2.8z"/></svg>
                </span><span className="text-[10px] font-bold">WhatsApp</span>
              </button>
              <button type="button" onClick={onInstagram} disabled={!ready||isLocalLink} className="flex min-h-[66px] flex-col items-center gap-1 rounded-2xl p-1 text-[#204E4A] focus-visible:bg-white/90 disabled:opacity-50">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#F8A33A] via-[#DD347E] to-[#7844C9] text-white">
                  <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.8" r=".9" fill="currentColor" stroke="none"/></svg>
                </span><span className="text-[10px] font-bold">Instagram</span>
              </button>
              <button type="button" onClick={onMore} disabled={!ready||isLocalLink} className="flex min-h-[66px] flex-col items-center gap-1 rounded-2xl p-1 text-[#204E4A] focus-visible:bg-white/90 disabled:opacity-50">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#204E4A]">
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V3m-4 4 4-4 4 4"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>
                </span><span className="text-[10px] font-bold">{es?'Más':'More'}</span>
              </button>
            </div>}
        {ready&&isLocalLink&&<p role="note" className="mt-2 text-center text-[10px] leading-relaxed text-[#915A49]">
          {es?'El enlace de localhost solo funciona en este dispositivo. Comparte cuando PAZO esté en un dominio público.':'A localhost link only works on this device. Share from a public PAZO domain.'}
        </p>}
        {shareFeedback&&<p role="status" className="mt-2 break-words rounded-xl bg-white/85 p-2 text-center text-[11px] font-semibold text-[#204E4A]">{shareFeedback}</p>}
      </section>
      <button type="button" onClick={onResolve} disabled={isSaving}
        className="min-h-12 w-full rounded-full bg-[#204E4A] px-3 py-3 text-xs font-extrabold text-[#E1E53F] hover:bg-[#32655E] focus-visible:bg-[#32655E] disabled:opacity-50">
        {isSaving?(es?'Finalizando…':'Finishing…'):(es?'¡Ya está en casa! Finalizar alerta':'Safe at home — resolve alert')}
      </button>
      <button type="button" onClick={onClose}
        className="min-h-10 w-full rounded-full px-3 py-2 text-xs font-bold text-[#5C7470] focus-visible:bg-[#E1E53F]/35">
        {es?'Cerrar ventana':'Close'}
      </button>
    </section>
  )
}
