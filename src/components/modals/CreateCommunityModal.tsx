import { useEffect, useState } from 'react'
import type { CommunityCreateInput, Pet, Species } from '../../types/pazo'
import { createCommunity } from '../../services/communityService'
import { IconCamera, IconClose, IconPlus } from '../icons/PazoIcons'

interface CreateCommunityModalProps {
  isOpen: boolean
  onClose: () => void
  currentPet: Pet | null
  onCreated: (communityId: string) => void
  lang: 'es' | 'en'
}

const CATEGORY_OPTIONS = [
  { value: 'local', es: 'Local / zona', en: 'Local / area' },
  { value: 'species_breed', es: 'Especie o raza', en: 'Species or breed' },
  { value: 'activity', es: 'Actividad', en: 'Activity' },
  { value: 'advice', es: 'Consejos y apoyo', en: 'Advice and support' },
  { value: 'interest', es: 'Interés', en: 'Interest' },
  { value: 'other', es: 'Otro', en: 'Other' },
]

export const CreateCommunityModal = ({
  isOpen,
  onClose,
  currentPet,
  onCreated,
  lang,
}: CreateCommunityModalProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('local')
  const [species, setSpecies] = useState<Species | ''>('')
  const [zone, setZone] = useState('')
  const [rules, setRules] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) return

    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    setName('')
    setDescription('')
    setCategory('local')
    setSpecies('')
    setZone('')
    setRules('')
    setImageFile(null)
    setPreview('')
    setIsSubmitting(false)
  }, [isOpen, preview])

  if (!isOpen) return null

  const handleImage = (file?: File) => {
    if (!file) return
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!currentPet?.id) {
      alert(
        lang === 'es'
          ? 'Selecciona una mascota activa antes de crear una comunidad.'
          : 'Select an active pet before creating a community.'
      )
      return
    }

    const input: CommunityCreateInput = {
      name,
      description,
      category,
      species: species || undefined,
      zone,
      rules,
      imageFile,
    }

    setIsSubmitting(true)

    try {
      const communityId = await createCommunity(input, currentPet.id)
      onCreated(communityId)
    } catch (error: any) {
      console.error('Error creating community:', error)
      alert(
        lang === 'es'
          ? `No se pudo crear la comunidad: ${error?.message || 'error inesperado'}`
          : `Could not create the community: ${error?.message || 'unexpected error'}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#204E4A]/80 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2.8rem] bg-[#FAF8F5] p-6 shadow-2xl sm:max-w-lg sm:rounded-[2.8rem]">
        <div className="mb-5 flex items-center justify-between border-b border-[#204E4A]/10 pb-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5C7470]">
              {lang === 'es' ? 'Nueva comunidad' : 'New community'}
            </p>
            <h3 className="text-lg font-black text-[#204E4A]">
              {lang === 'es' ? 'Crea un lugar para los tuyos' : 'Create a place for your crowd'}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#204E4A] shadow-xs"
            aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
          >
            <IconClose size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#204E4A]">
              {lang === 'es' ? 'Nombre' : 'Name'}
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={3}
              maxLength={80}
              required
              className="w-full rounded-2xl bg-white px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-[#204E4A]/10 focus:ring-[#204E4A]/30"
              placeholder={lang === 'es' ? 'Ej. Perros Senderistas LA' : 'E.g. LA Hiking Dogs'}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#204E4A]">
              {lang === 'es' ? 'Descripción' : 'Description'}
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={1000}
              required
              className="w-full rounded-2xl bg-white px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-[#204E4A]/10 focus:ring-[#204E4A]/30"
              placeholder={
                lang === 'es'
                  ? 'Explica qué une a las personas y mascotas de esta comunidad.'
                  : 'Explain what brings the people and pets in this community together.'
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#204E4A]">
                {lang === 'es' ? 'Categoría' : 'Category'}
              </label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-2xl bg-white px-3 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-[#204E4A]/10"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {lang === 'es' ? option.es : option.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#204E4A]">
                {lang === 'es' ? 'Especie' : 'Species'}
              </label>
              <select
                value={species}
                onChange={(event) => setSpecies(event.target.value as Species | '')}
                className="w-full rounded-2xl bg-white px-3 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-[#204E4A]/10"
              >
                <option value="">{lang === 'es' ? 'Todas' : 'All'}</option>
                <option value="perro">{lang === 'es' ? 'Perro' : 'Dog'}</option>
                <option value="gato">{lang === 'es' ? 'Gato' : 'Cat'}</option>
                <option value="conejo">{lang === 'es' ? 'Conejo' : 'Rabbit'}</option>
                <option value="ave">{lang === 'es' ? 'Ave' : 'Bird'}</option>
                <option value="otro">{lang === 'es' ? 'Otro' : 'Other'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#204E4A]">
              {lang === 'es' ? 'Zona (opcional)' : 'Area (optional)'}
            </label>
            <input
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              maxLength={100}
              className="w-full rounded-2xl bg-white px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-[#204E4A]/10"
              placeholder={lang === 'es' ? 'Ej. Whittier / Los Ángeles' : 'E.g. Whittier / Los Angeles'}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#204E4A]">
              {lang === 'es' ? 'Reglas básicas (opcional)' : 'Basic rules (optional)'}
            </label>
            <textarea
              value={rules}
              onChange={(event) => setRules(event.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-2xl bg-white px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-[#204E4A]/10"
              placeholder={
                lang === 'es'
                  ? 'Respeto, contenido permitido y propósito del grupo.'
                  : 'Respect, allowed content, and the purpose of the group.'
              }
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#204E4A]">
              {lang === 'es' ? 'Imagen (opcional)' : 'Image (optional)'}
            </label>

            {preview ? (
              <div className="relative overflow-hidden rounded-[1.8rem] bg-white">
                <img src={preview} alt="" className="h-44 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
                    setPreview('')
                    setImageFile(null)
                  }}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#204E4A] shadow-md"
                  aria-label={lang === 'es' ? 'Quitar imagen' : 'Remove image'}
                >
                  <IconClose size={15} />
                </button>
              </div>
            ) : (
              <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-[1.8rem] border-2 border-dashed border-[#204E4A]/15 bg-white text-[#204E4A]">
                <IconCamera size={22} />
                <span className="text-xs font-bold">
                  {lang === 'es' ? 'Seleccionar imagen' : 'Choose image'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => handleImage(event.target.files?.[0])}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="rounded-2xl bg-white p-3 text-[10px] leading-relaxed text-[#5C7470]">
            {lang === 'es'
              ? `La comunidad se creará como pública. ${currentPet?.name || 'Tu mascota'} será la identidad visible inicial de tu membership.`
              : `The community will be public. ${currentPet?.name || 'Your pet'} will be the initial visible identity for your membership.`}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#E1E53F] py-3.5 text-xs font-black text-[#204E4A] shadow-md disabled:opacity-50"
          >
            <IconPlus size={15} />
            {isSubmitting
              ? lang === 'es'
                ? 'Creando...'
                : 'Creating...'
              : lang === 'es'
                ? 'Crear comunidad'
                : 'Create community'}
          </button>
        </form>
      </div>
    </div>
  )
}
