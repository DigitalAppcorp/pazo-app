import { useEffect, useRef, useState } from 'react'
import type { Pet } from '../../../types/pazo'
import { IconHeart, IconPaw } from '../../../components/icons/PazoIcons'

interface GratitudeParticipationPreviewProps {
  pets: Pet[]
  lang: 'es' | 'en'
  onClose: () => void
}

// Preview state is ephemeral and must NEVER be interpreted as saved consent.
export const GratitudeParticipationPreview = ({ pets, lang, onClose }: GratitudeParticipationPreviewProps) => {
  const [selected, setSelected] = useState<string[]>([])
  const [reviewPetId, setReviewPetId] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    if (typeof window === 'undefined') return
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', dismiss)
    return () => window.removeEventListener('keydown', dismiss)
  }, [onClose])

  const simulateAuthorization = (id: string) => {
    setSelected(current => current.includes(id) ? current : [...current, id])
    setReviewPetId(null)
  }
  const simulateWithdrawal = (id: string) => {
    setSelected(current => current.filter(value => value !== id))
    setReviewPetId(null)
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="gratitude-participation-title"
      className="fixed inset-0 z-[110] overflow-y-auto bg-[#FAF8F5] font-sans text-[#204E4A]">
      <div className="sticky top-0 z-20 bg-[#FAF8F5]/95 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
          <div>
            <h2 id="gratitude-participation-title" className="text-[20px] font-black">
              {lang === 'es' ? 'Participar en el muro' : 'Join the gratitude wall'}
            </h2>
            <p className="text-[12px] font-medium text-[#5C7470]">
              {lang === 'es' ? 'Amigo de PAZO · Vista previa' : 'PAZO Friend · Preview'}
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose}
            className="min-h-11 shrink-0 rounded-full bg-white px-4 py-2.5 text-[13px] font-bold text-[#204E4A] shadow-[0_3px_12px_rgba(32,78,74,0.08)] hover:bg-[#E1E53F]/30 focus-visible:bg-[#E1E53F]/30">
            {lang === 'es' ? 'Cerrar vista previa' : 'Close preview'}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-10 pt-3">
        <div className="rounded-[28px] bg-[#FCE5D8] px-5 py-5 shadow-sm">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-[#DF6C78]">
            <IconHeart size={24}/>
          </div>
          <h3 className="text-[21px] font-black leading-snug">
            {lang === 'es' ? 'Tus mascotas, tu decisión' : 'Your pets, your choice'}
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-[#476862]">
            {lang === 'es'
              ? '«Gracias, Amigos de PAZO» reconoce a las mascotas de quienes apoyan voluntariamente la aplicación. Apoyar a PAZO no incluye automáticamente a tus mascotas en el muro.'
              : '“Thank you, PAZO Friends” celebrates pets whose families voluntarily support the app. Supporting PAZO never adds your pets to the wall automatically.'}
          </p>
        </div>

        <div className="rounded-[23px] bg-[#E9F1E9] px-4 py-4 text-[13px] leading-relaxed text-[#476862]">
          {lang === 'es'
            ? 'Antes de autorizar, te explicaremos qué información podría ver cualquier persona, incluso sin iniciar sesión. Cada mascota necesita su propio permiso.'
            : 'Before authorizing, we explain what anyone could see, including visitors who are not signed in. Each pet requires separate permission.'}
        </div>

        <section aria-label={lang === 'es' ? 'Selección de mascotas' : 'Pet selection'} className="space-y-3">
          <h3 className="text-[16px] font-black">
            {lang === 'es' ? 'Elegir mascotas' : 'Choose pets'}
          </h3>
          {pets.length === 0 ? (
            <p role="status" className="rounded-[24px] bg-white px-4 py-6 text-center text-[13px] font-medium text-[#5C7470]">
              {lang === 'es' ? 'Agrega una mascota para poder elegir si participará.' : 'Add a pet before choosing whether they will participate.'}
            </p>
          ) : pets.map(pet => {
            const chosen = selected.includes(pet.id)
            const reviewing = reviewPetId === pet.id
            return (
              <div key={pet.id} className="space-y-2">
              <button type="button"
                aria-expanded={reviewing} aria-controls={`gratitude-consent-${pet.id}`}
                onClick={() => setReviewPetId(current => current === pet.id ? null : pet.id)}
                className={'flex min-h-20 w-full items-center gap-3 rounded-[24px] p-3 text-left shadow-[0_4px_15px_rgba(32,78,74,0.05)] transition-colors focus-visible:bg-[#E1E53F]/30 ' +
                  (chosen ? 'bg-[#E7F1E6]' : 'bg-white hover:bg-[#F6F7EF]')}>
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#EEF0E7]">
                  {pet.photoUrl
                    ? <img src={pet.photoUrl} alt="" className="h-full w-full object-cover" />
                    : <IconPaw size={27} className="text-[#204E4A]/40"/>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-black">{pet.name}</span>
                  <span className="block text-[12px] font-medium text-[#5C7470]">
                    {chosen
                      ? (lang === 'es' ? 'Seleccionada solo en esta simulación' : 'Selected in this preview only')
                      : (lang === 'es' ? 'No participa · Vista previa' : 'Not participating · Preview')}
                  </span>
                </span>
                <span aria-hidden="true"
                  className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[17px] font-extrabold ' +
                    (chosen ? 'bg-[#204E4A] text-white' : 'bg-[#EDEFE9] text-[#8CA19A]')}>
                  {reviewing ? '−' : chosen ? '✓' : '＋'}
                </span>
              </button>
              {reviewing && (
                <div id={`gratitude-consent-${pet.id}`} role="group"
                  aria-label={lang === 'es' ? `Permiso de ${pet.name} · Simulación` : `${pet.name} permission · Preview`}
                  className="space-y-3 rounded-[24px] bg-white px-4 py-5 shadow-[0_4px_15px_rgba(32,78,74,0.04)]">
                  {chosen ? (
                    <>
                      <p className="text-[13px] leading-relaxed text-[#476862]">
                        {lang === 'es'
                          ? `${pet.name} está seleccionada solo en esta simulación. No se guardó ningún permiso y no aparece en el muro.`
                          : `${pet.name} is selected in this preview only. No permission was saved and your pet is not shown on the wall.`}
                      </p>
                      <button type="button" onClick={() => simulateWithdrawal(pet.id)}
                        className="min-h-11 w-full rounded-full bg-[#E9F1E9] px-4 py-2.5 text-[13px] font-bold text-[#204E4A] hover:bg-[#DCEBDD] focus-visible:bg-[#DCEBDD]">
                        {lang === 'es' ? 'Quitar del muro · Simulación' : 'Remove from the wall · Preview'}
                      </button>
                    </>
                  ) : (
                    <>
                      <h4 className="text-[15px] font-black">
                        {lang === 'es' ? `Autorizar a ${pet.name}` : `Allow ${pet.name} on the wall`}
                      </h4>
                      <p className="text-[13px] leading-relaxed text-[#476862]">
                        {lang === 'es'
                          ? `Si autorizas a ${pet.name}, su nombre, fotografía pública e insignia «Amigo de PAZO» podrán aparecer en el muro «Gracias, Amigos de PAZO». Cualquier persona podrá ver el muro, incluso sin iniciar sesión. No mostraremos tu nombre personal, correo electrónico ni datos de pago. Puedes retirar este permiso cuando quieras desde «Mi mascota → Amigo de PAZO». Retiraremos a tu mascota de los resultados de PAZO al confirmar el cambio, aunque no podemos eliminar capturas o copias realizadas por terceros.`
                          : `If you authorize ${pet.name}, their name, public photo, and “PAZO Friend” badge may appear on the “Thank you, PAZO Friends” wall. Anyone can view this wall, including visitors who are not signed in. We will not show your personal name, email address, or payment details. You can withdraw this permission at any time from “My pet → PAZO Friend.” We will remove your pet from PAZO’s wall results once the change is confirmed, but we cannot remove screenshots or copies made by other people.`}
                      </p>
                      <p className="rounded-2xl bg-[#FFF5EA] px-3 py-3 text-[12px] font-semibold text-[#775A45]">
                        {lang === 'es'
                          ? 'Solo es una demostración: la autorización no se guardará y la mascota no se publicará.'
                          : 'This is a demo only: permission will not be saved and the pet will not be published.'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => simulateAuthorization(pet.id)}
                          className="min-h-11 flex-1 rounded-full bg-[#E1E53F] px-4 py-2.5 text-[13px] font-bold text-[#204E4A] hover:bg-[#D6DD35] focus-visible:bg-[#D6DD35]">
                          {lang === 'es' ? `Autorizar a ${pet.name} · Simulación` : `Allow ${pet.name} · Preview`}
                        </button>
                        <button type="button" onClick={() => setReviewPetId(null)}
                          className="min-h-11 rounded-full bg-[#EFF1EA] px-4 py-2.5 text-[13px] font-bold text-[#204E4A] hover:bg-[#E3E8DC] focus-visible:bg-[#E3E8DC]">
                          {lang === 'es' ? 'Ahora no' : 'Not now'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              </div>
            )
          })}
        </section>

        <div role="status" className="rounded-[22px] bg-white px-4 py-4 text-center shadow-sm">
          <p className="text-[13px] font-extrabold text-[#204E4A]">
            {lang === 'es' ? 'Simulación · Sin guardar cambios' : 'Preview · Changes are not saved'}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#5C7470]">
            {lang === 'es'
              ? 'Puedes probar la autorización y volver a quitarla. No es un consentimiento real y ninguna mascota aparecerá en el muro.'
              : 'You can try authorizing and removing a pet. This is not real consent, and no pets will appear on the wall.'}
          </p>
        </div>
      </div>
    </div>
  )
}
