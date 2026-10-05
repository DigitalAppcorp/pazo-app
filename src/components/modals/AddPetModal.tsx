import { useState } from 'react'
import { createPetProfile } from '../../services/petService'
import type { Pet, Species } from '../../types/pazo'

interface AddPetModalProps {
  isOpen: boolean
  onClose: () => void
  onPetCreated: (pet: Pet) => void
  lang: 'es' | 'en'
}

const INTEREST_OPTIONS = [
  'Comunidades de gatos',
  'Lugares aptos para mascotas',
  'Actividades y encuentros',
  'Nutrición y alimentación natural',
]

export const AddPetModal = ({ isOpen, onClose, onPetCreated, lang }: AddPetModalProps) => {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<Species>('perro')
  const [age, setAge] = useState('')
  const [breed, setBreed] = useState('')
  const [gender, setGender] = useState<'macho' | 'hembra' | ''>('')
  const [bio, setBio] = useState('')
  const [zone, setZone] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const resetForm = () => {
    if (photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview)
    }

    setName('')
    setSpecies('perro')
    setAge('')
    setBreed('')
    setGender('')
    setBio('')
    setZone('')
    setInterests([])
    setPhotoFile(null)
    setPhotoPreview('')
  }

  const handleClose = () => {
    if (isSubmitting) return
    resetForm()
    onClose()
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert(lang === 'es' ? 'La imagen debe ser menor a 5MB.' : 'Image must be less than 5MB.')
      event.target.value = ''
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert(lang === 'es' ? 'Usa una imagen JPG, PNG o WEBP.' : 'Use a JPG, PNG, or WEBP image.')
      event.target.value = ''
      return
    }

    if (photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview)
    }

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const toggleInterest = (interest: string) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return

    const normalizedName = name.trim()
    if (!normalizedName) {
      alert(lang === 'es' ? 'Escribe el nombre de tu mascota.' : 'Enter your pet\'s name.')
      return
    }

    setIsSubmitting(true)

    try {
      const createdPet = await createPetProfile({
        name: normalizedName,
        species,
        age,
        photoFile,
        zone,
        interests,
        bio,
        breed,
        gender: gender || undefined,
      })

      if (photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview)
      }

      onPetCreated(createdPet)
      resetForm()
      onClose()
    } catch (error: any) {
      alert(
        lang === 'es'
          ? `No se pudo añadir la mascota: ${error.message}`
          : `Could not add pet: ${error.message}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="absolute inset-0 z-[160] bg-[#204E4A]/35 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-5">
      <div className="w-full max-w-md max-h-[92%] overflow-y-auto bg-[#FDFBF7] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-3 py-1 rounded-full">
              {lang === 'es' ? 'Nueva mascota' : 'New pet'}
            </span>
            <h2 className="text-2xl font-black text-[#204E4A] mt-2">
              {lang === 'es' ? 'Añadir a tu familia' : 'Add to your family'}
            </h2>
            <p className="text-xs text-[#5C7470] mt-1">
              {lang === 'es'
                ? 'Cada mascota tendrá su propio Feed, seguidores e interacciones.'
                : 'Each pet gets its own feed, follows, and interactions.'}
            </p>
          </div>

          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-9 h-9 rounded-full bg-white text-[#204E4A] shadow-xs font-black cursor-pointer disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="w-20 h-20 rounded-[1.8rem] overflow-hidden bg-white shadow-xs cursor-pointer shrink-0 flex items-center justify-center">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-[#5C7470] text-center px-2">
                  {lang === 'es' ? 'Añadir foto' : 'Add photo'}
                </span>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>

            <div className="flex-1 space-y-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={50}
                placeholder={lang === 'es' ? 'Nombre' : 'Name'}
                className="w-full bg-white rounded-2xl px-4 py-3 text-xs text-[#204E4A] shadow-xs focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={species}
                  onChange={(event) => setSpecies(event.target.value as Species)}
                  className="bg-white rounded-2xl px-3 py-2.5 text-xs text-[#204E4A] shadow-xs"
                >
                  <option value="perro">{lang === 'es' ? 'Perro' : 'Dog'}</option>
                  <option value="gato">{lang === 'es' ? 'Gato' : 'Cat'}</option>
                  <option value="conejo">{lang === 'es' ? 'Conejo' : 'Rabbit'}</option>
                  <option value="ave">{lang === 'es' ? 'Ave' : 'Bird'}</option>
                  <option value="otro">{lang === 'es' ? 'Otro' : 'Other'}</option>
                </select>

                <input
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  placeholder={lang === 'es' ? 'Edad' : 'Age'}
                  className="bg-white rounded-2xl px-3 py-2.5 text-xs text-[#204E4A] shadow-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              value={breed}
              onChange={(event) => setBreed(event.target.value)}
              placeholder={lang === 'es' ? 'Raza · opcional' : 'Breed · optional'}
              className="bg-white rounded-2xl px-4 py-3 text-xs text-[#204E4A] shadow-xs"
            />
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value as 'macho' | 'hembra' | '')}
              className="bg-white rounded-2xl px-3 py-3 text-xs text-[#204E4A] shadow-xs"
            >
              <option value="">{lang === 'es' ? 'Género · opcional' : 'Gender · optional'}</option>
              <option value="macho">{lang === 'es' ? 'Macho' : 'Male'}</option>
              <option value="hembra">{lang === 'es' ? 'Hembra' : 'Female'}</option>
            </select>
          </div>

          <input
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder={lang === 'es' ? 'Biografía corta · opcional' : 'Short bio · optional'}
            className="w-full bg-white rounded-2xl px-4 py-3 text-xs text-[#204E4A] shadow-xs"
          />

          <input
            value={zone}
            onChange={(event) => setZone(event.target.value)}
            placeholder={lang === 'es' ? 'Zona aproximada · privada' : 'Approximate area · private'}
            className="w-full bg-white rounded-2xl px-4 py-3 text-xs text-[#204E4A] shadow-xs"
          />

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5C7470]">
              {lang === 'es' ? 'Intereses privados' : 'Private interests'}
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {INTEREST_OPTIONS.map((interest) => {
                const selected = interests.includes(interest)

                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`text-[9px] font-bold px-3 py-2 rounded-full cursor-pointer transition-colors ${selected
                      ? 'bg-[#204E4A] text-[#E1E53F]'
                      : 'bg-white text-[#5C7470]'
                    }`}
                  >
                    {interest}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#204E4A] text-[#E1E53F] disabled:opacity-60 rounded-full py-3.5 text-sm font-extrabold cursor-pointer"
          >
            {isSubmitting
              ? (lang === 'es' ? 'Guardando...' : 'Saving...')
              : (lang === 'es' ? 'Añadir mascota' : 'Add pet')}
          </button>
        </form>
      </div>
    </div>
  )
}
