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

  const togglePet = (id: string) =>
    setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])

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
              ? 'Cuando la función esté disponible, podrás autorizar individualmente cuáles de tus mascotas aparecerán en Gracias, Amigos de PAZO.'
              : 'Once available, you will be able to choose individually which pets appear on the PAZO gratitude wall.'}
          </p>
        </div>

        <div className="rounded-[23px] bg-[#E9F1E9] px-4 py-4 text-[13px] leading-relaxed text-[#476862]">
          {lang === 'es'
            ? 'Antes de dar permiso, te indicaremos que el nombre, la foto pública y la insignia de cada mascota seleccionada serán visibles para toda la comunidad. Podrás retirar ese permiso. No se publica nada sin tu autorización.'
            : 'Before you opt in, we will explain that each selected pet’s name, public photo and badge will be visible to the community. You can withdraw permission. Nothing is published without your approval.'}
        </div>

        <section aria-label={lang === 'es' ? 'Selección de mascotas' : 'Pet selection'} className="space-y-3">
          <h3 className="text-[16px] font-black">
            {lang === 'es' ? 'Elegir mascotas' : 'Choose pets'}
          </h3>
          {pets.length === 0 ? (
            <p role="status" className="rounded-[24px] bg-white px-4 py-6 text-center text-[13px] font-medium text-[#5C7470]">
              {lang === 'es' ? 'Todavía no tienes mascotas disponibles.' : 'You have no available pets yet.'}
            </p>
          ) : pets.map(pet => {
            const chosen = selected.includes(pet.id)
            return (
              <button type="button" key={pet.id}
                aria-pressed={chosen} onClick={() => togglePet(pet.id)}
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
                      ? (lang === 'es' ? 'Seleccionada en esta simulación' : 'Selected in this preview')
                      : (lang === 'es' ? 'No seleccionada' : 'Not selected')}
                  </span>
                </span>
                <span aria-hidden="true"
                  className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[17px] font-extrabold ' +
                    (chosen ? 'bg-[#204E4A] text-white' : 'bg-[#EDEFE9] text-[#8CA19A]')}>
                  {chosen ? '✓' : '＋'}
                </span>
              </button>
            )
          })}
        </section>

        <div role="status" className="rounded-[22px] bg-white px-4 py-4 text-center shadow-sm">
          <p className="text-[13px] font-extrabold text-[#204E4A]">
            {lang === 'es' ? 'Simulación · Sin guardar cambios' : 'Preview · Changes are not saved'}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#5C7470]">
            {lang === 'es'
              ? 'Puedes probar la selección y volver a quitarla. No es un consentimiento real y tu mascota no aparecerá en el muro.'
              : 'You can try selecting and removing pets. This is not real consent and your pets will not appear on the wall.'}
          </p>
        </div>
      </div>
    </div>
  )
}
