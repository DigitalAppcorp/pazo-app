import { useState } from 'react'
import type { Pet, Post, Species } from '../../types/pazo'
import { IconClose, IconPaw } from '../icons/PazoIcons'
import { supabase } from '../../services/supabaseClient'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  currentPet: Pet
  onPostCreated: (newPost: Post) => void
  lang: 'es' | 'en'
}

const AVAILABLE_TAGS = [
  'Comunidades de gatos',
  'Lugares aptos para mascotas',
  'Actividades y encuentros',
  'Nutrición y alimentación natural',
]

export const CreatePostModal = ({
  isOpen,
  onClose,
  currentPet,
  onPostCreated,
  lang,
}: CreatePostModalProps) => {
  const [text, setText] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  // Manejador para cargar imagen desde archivo local
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !photoUrl) {
      alert(lang === 'es' ? 'Agrega una foto y un texto para publicar' : 'Please add a photo and caption')
      return
    }

    setIsSubmitting(true)
    const currentTime = new Date().toISOString()

    // Estructura de inserción directa en Supabase
    const { data: userSession } = await supabase.auth.getUser()
    const ownerId = userSession.user?.id

    const postPayload = {
      pet_id: currentPet.id,
      owner_id: ownerId,
      pet_name: currentPet.name,
      pet_species: currentPet.species,
      pet_avatar: currentPet.photoUrl,
      location: currentPet.lastSeenLocation || 'Los Ángeles, CA',
      photo_url: photoUrl,
      text: text.trim(),
      tags: selectedTags,
      likes_count: 0,
      created_at: currentTime,
    }

    const { data, error } = await supabase
      .from('posts')
      .insert(postPayload)
      .select()
      .single()

    setIsSubmitting(false)

    if (error) {
      // Fallback local en caso de entorno de prueba sin tabla remota configurada
      const fallbackPost: Post = {
        id: `post-${Date.now()}`,
        petId: currentPet.id,
        petName: currentPet.name,
        petSpecies: currentPet.species as Species,
        petAvatar: currentPet.photoUrl,
        location: 'Los Ángeles, CA',
        timeAgo: lang === 'es' ? 'Hace un momento' : 'Just now',
        createdAt: currentTime,
        isRecommended: false,
        text: text.trim(),
        photoUrl: photoUrl,
        likes: 0,
        isLiked: false,
        isSaved: false,
        comments: [],
      }
      onPostCreated(fallbackPost)
      onClose()
      return
    }

    if (data) {
      const newPost: Post = {
        id: data.id,
        petId: data.pet_id,
        petName: data.pet_name,
        petSpecies: data.pet_species as Species,
        petAvatar: data.pet_avatar,
        location: data.location,
        timeAgo: lang === 'es' ? 'Hace un momento' : 'Just now',
        createdAt: data.created_at,
        isRecommended: false,
        text: data.text,
        photoUrl: data.photo_url,
        likes: data.likes_count || 0,
        isLiked: false,
        isSaved: false,
        comments: [],
      }
      onPostCreated(newPost)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-[#204E4A]/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
      <div className="bg-[#FAF8F5] w-full sm:max-w-md rounded-t-[2.8rem] sm:rounded-[2.8rem] p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">

        {/* Cabecera */}
        <div className="flex justify-between items-center pb-2 border-b border-[#204E4A]/10">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#E1E53F] flex items-center justify-center text-[#204E4A]">
              <IconPaw size={16} />
            </span>
            <h3 className="text-lg font-black text-[#204E4A]">
              {lang === 'es' ? `Nueva publicación de ${currentPet.name}` : `New post by ${currentPet.name}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white text-[#5C7470] hover:text-[#204E4A] flex items-center justify-center font-bold cursor-pointer shadow-xs"
          >
            <IconClose size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          {/* Carga de Imagen */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#204E4A]">
              {lang === 'es' ? 'Fotografía del momento' : 'Moment photo'}
            </label>
            {photoUrl ? (
              <div className="relative w-full h-48 rounded-2xl overflow-hidden shadow-xs border border-[#204E4A]/10">
                <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-2 right-2 bg-white/90 text-[#204E4A] p-1.5 rounded-full font-bold shadow-md cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="w-full h-36 flex flex-col items-center justify-center border-2 border-dashed border-[#204E4A]/20 rounded-2xl bg-white hover:bg-[#204E4A]/5 cursor-pointer transition-colors text-[#5C7470]">
                <span className="text-2xl mb-1">📷</span>
                <span className="font-bold text-[#204E4A]">
                  {lang === 'es' ? 'Seleccionar imagen de galería' : 'Choose image from gallery'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Texto / Descripción */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#204E4A]">
              {lang === 'es' ? '¿Qué están haciendo?' : "What are you up to?"}
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={lang === 'es' ? 'Escribe algo sobre este momento...' : 'Write something about this moment...'}
              className="w-full bg-white rounded-2xl p-3 text-[#204E4A] border border-[#204E4A]/10 focus:outline-none focus:border-[#204E4A]"
              required
            />
          </div>

          {/* Selector de Intereses / Tags para el Algoritmo */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[#204E4A]">
              {lang === 'es' ? 'Categoría o Interés (Para sugerencias en el feed)' : 'Category or Interest (For feed suggestions)'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${isSelected
                        ? 'bg-[#204E4A] text-[#E1E53F] shadow-xs'
                        : 'bg-white text-[#5C7470] border border-[#204E4A]/10 hover:border-[#204E4A]'
                      }`}
                  >
                    {tag} {isSelected ? '✓' : '+'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Botón de Enviar */}
          <button
            type="submit"
            disabled={isSubmitting || !text.trim() || !photoUrl}
            className="w-full bg-[#E1E53F] hover:bg-[#d8dc35] disabled:opacity-50 text-[#204E4A] font-extrabold py-3.5 rounded-full shadow-md transition-all cursor-pointer mt-2"
          >
            {isSubmitting
              ? (lang === 'es' ? 'Publicando...' : 'Publishing...')
              : (lang === 'es' ? 'Publicar historia' : 'Publish story')}
          </button>
        </form>

      </div>
    </div>
  )
}