import { useEffect, useRef } from 'react'
import type { Pet } from '../../types/pazo'
import { recordReturnProfileShare } from '../push/pushService'
import { sharedPetUrl } from './sharedPetRoute'
import { usePetProfileShare } from './usePetProfileShare'

export function PetShareDialog({ pet, lang, onClose }: { pet: Pet; lang: 'es' | 'en'; onClose: () => void }) {
  const es = lang === 'es'
  const dialog = useRef<HTMLDialogElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const { shareProfile, shareFeedback, copyProfile } = usePetProfileShare()
  const share = useRef(shareProfile)
  share.current = shareProfile

  useEffect(() => {
    const node = dialog.current
    const previous = document.activeElement
    node?.showModal()
    primary.current?.focus()
    // A notification tap does not reliably activate the destination window.
    // Open the native sheet automatically only when the browser allows it.
    if (navigator.userActivation?.isActive && typeof navigator.share === 'function') void share.current(pet, true)
    return () => {
      if (node?.open) node.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [pet])

  const url = sharedPetUrl(window.location.origin, pet.id)
  return <dialog ref={dialog} aria-labelledby="pet-share-title" onCancel={(event) => { event.preventDefault(); onClose() }}
    className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[calc(100dvh_-_1rem)] w-full max-w-none rounded-t-[28px] bg-[#FAF8F5] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 text-[#204E4A] shadow-xl backdrop:bg-[#172C2A]/55 sm:inset-0 sm:m-auto sm:w-[calc(100%_-_2rem)] sm:max-w-[430px] sm:rounded-[28px]">
    <header className="flex items-center justify-between gap-3">
      <h2 id="pet-share-title" className="text-lg font-black">{es ? 'Compartir perfil' : 'Share profile'}</h2>
      <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white px-4 text-xs font-bold focus-visible:bg-[#E1E53F]">
        {es ? 'Cerrar' : 'Close'}
      </button>
    </header>
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3">
      <img src={pet.photoUrl || '/pwa-icon-192.png'} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0">
        <p className="break-words font-extrabold">{pet.name}</p>
        <p className="text-xs font-medium text-[#5C7470]">{es ? 'Perfil social en PAZO' : 'Social profile on PAZO'}</p>
      </div>
    </div>
    <input aria-label={es ? 'Enlace al perfil social' : 'Social profile link'} readOnly value={url}
      onFocus={(event) => event.currentTarget.select()} onCopy={() => recordReturnProfileShare(pet.id)}
      className="mt-3 min-h-11 w-full rounded-xl bg-[#EAF2E5] px-3 text-sm focus:bg-[#F5F4D0] focus:outline-none" />
    {shareFeedback && <p role="status" className="mt-2 text-xs font-semibold">
      {shareFeedback.copied ? (es ? 'Enlace copiado.' : 'Link copied.') : (es ? 'Selecciona el enlace para copiarlo.' : 'Select the link to copy it.')}
    </p>}
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button type="button" ref={primary} onClick={() => { void shareProfile(pet) }}
        className="min-h-12 rounded-2xl bg-[#204E4A] px-3 text-sm font-extrabold text-white focus-visible:bg-[#E1E53F] focus-visible:text-[#204E4A]">
        {es ? 'Compartir vínculo' : 'Share link'}
      </button>
      <button type="button" onClick={() => { void copyProfile(pet) }}
        className="min-h-12 rounded-2xl bg-white px-3 text-sm font-extrabold focus-visible:bg-[#E1E53F]">
        {es ? 'Copiar enlace' : 'Copy link'}
      </button>
    </div>
  </dialog>
}
