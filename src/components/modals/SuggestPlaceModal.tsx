import { useEffect, useState } from 'react'
import type { PlaceCategory } from '../../types/pazo'
import { submitPlaceSuggestion } from '../../services/placeService'
import { IconClose, IconPin } from '../icons/PazoIcons'

interface SuggestPlaceModalProps {
  isOpen: boolean
  onClose: () => void
  lang: 'es' | 'en'
  onSubmitted?: () => void
}

const categories: Array<{
  value: PlaceCategory
  es: string
  en: string
}> = [
  { value: 'park', es: 'Parque', en: 'Park' },
  { value: 'trail', es: 'Sendero', en: 'Trail' },
  { value: 'food', es: 'Café / restaurante', en: 'Cafe / restaurant' },
  { value: 'veterinary', es: 'Veterinaria', en: 'Veterinary' },
  { value: 'grooming', es: 'Grooming', en: 'Grooming' },
  { value: 'pet_store', es: 'Tienda de mascotas', en: 'Pet store' },
]

export const SuggestPlaceModal = ({
  isOpen,
  onClose,
  lang,
  onSubmitted,
}: SuggestPlaceModalProps) => {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<PlaceCategory>('park')
  const [address, setAddress] = useState('')
  const [zone, setZone] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) return
    setName('')
    setCategory('park')
    setAddress('')
    setZone('')
    setNote('')
    setIsSubmitting(false)
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await submitPlaceSuggestion({
        name,
        category,
        address,
        zone,
        note,
      })

      onSubmitted?.()
      onClose()
      alert(
        lang === 'es'
          ? 'Gracias. Revisaremos el lugar antes de publicarlo en PAZO.'
          : 'Thanks. We will review the place before publishing it in PAZO.'
      )
    } catch (error: any) {
      console.error('Error submitting place suggestion:', error)
      alert(
        lang === 'es'
          ? `No se pudo enviar la sugerencia: ${error?.message || 'error inesperado'}`
          : `Could not submit the suggestion: ${error?.message || 'unexpected error'}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#204E4A]/80 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2.8rem] bg-[#FAF8F5] p-6 shadow-2xl sm:max-w-lg sm:rounded-[2.8rem]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#204E4A]/10 pb-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5C7470]">
              {lang === 'es' ? 'Sugerir un lugar' : 'Suggest a place'}
            </p>
            <h3 className="mt-1 text-lg font-black text-[#204E4A]">
              {lang === 'es'
                ? 'Ayúdanos a ampliar el mapa'
                : 'Help us expand the map'}
            </h3>
            <p className="mt-1 max-w-sm text-[10px] leading-relaxed text-[#5C7470]">
              {lang === 'es'
                ? 'La sugerencia no se publica automáticamente. PAZO revisará el lugar y sus datos antes de mostrarlo.'
                : 'Suggestions are not published automatically. PAZO reviews each place before it appears.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#204E4A] shadow-xs"
            aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
          >
            <IconClose size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#204E4A]">
              {lang === 'es' ? 'Nombre del lugar' : 'Place name'} *
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={120}
              required
              className="w-full rounded-2xl bg-white px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-[#204E4A]/10 focus:ring-[#204E4A]/25"
              placeholder={
                lang === 'es'
                  ? 'Ej. Parque para perros de Whittier'
                  : 'E.g. Whittier dog park'
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#204E4A]">
              {lang === 'es' ? 'Categoría' : 'Category'} *
            </label>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as PlaceCategory)
              }
              className="w-full rounded-2xl bg-white px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-[#204E4A]/10 focus:ring-[#204E4A]/25"
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {lang === 'es' ? item.es : item.en}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#204E4A]">
              {lang === 'es' ? 'Dirección' : 'Address'} *
            </label>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              minLength={3}
              maxLength={300}
              required
              className="w-full rounded-2xl bg-white px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-[#204E4A]/10 focus:ring-[#204E4A]/25"
              placeholder={
                lang === 'es'
                  ? 'Escribe la dirección que conoces'
                  : 'Enter the address you know'
              }
            />
            <p className="text-[9px] leading-relaxed text-[#5C7470]">
              {lang === 'es'
                ? 'No necesitas colocar un pin exacto. PAZO verificará la ubicación antes de publicarla.'
                : 'You do not need to place an exact pin. PAZO will verify the location before publishing it.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#204E4A]">
              {lang === 'es' ? 'Zona' : 'Area'}{' '}
              <span className="font-medium text-[#5C7470]">
                {lang === 'es' ? '(opcional)' : '(optional)'}
              </span>
            </label>
            <input
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              maxLength={120}
              className="w-full rounded-2xl bg-white px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-[#204E4A]/10 focus:ring-[#204E4A]/25"
              placeholder={lang === 'es' ? 'Ej. Los Feliz' : 'E.g. Los Feliz'}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#204E4A]">
              {lang === 'es'
                ? '¿Por qué es pet-friendly?'
                : 'Why is it pet-friendly?'}{' '}
              <span className="font-medium text-[#5C7470]">
                {lang === 'es' ? '(opcional)' : '(optional)'}
              </span>
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full rounded-2xl bg-white px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-[#204E4A]/10 focus:ring-[#204E4A]/25"
              placeholder={
                lang === 'es'
                  ? 'Ej. Tiene patio, agua y permiten perros con correa.'
                  : 'E.g. It has a patio, water, and allows leashed dogs.'
              }
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#E1E53F] py-3.5 text-xs font-black text-[#204E4A] shadow-md disabled:opacity-50"
          >
            <IconPin size={15} />
            {isSubmitting
              ? lang === 'es'
                ? 'Enviando...'
                : 'Sending...'
              : lang === 'es'
                ? 'Enviar sugerencia'
                : 'Send suggestion'}
          </button>
        </form>
      </div>
    </div>
  )
}
