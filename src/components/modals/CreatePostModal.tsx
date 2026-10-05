import { useState } from 'react'
import type { Pet, Post } from '../../types/pazo'
import { IconClose, IconPaw } from '../icons/PazoIcons'
import { supabase } from '../../services/supabaseClient'
import { generateSmartTags } from '../../utils/smartFilter'

interface CreatePostModalProps {
    isOpen: boolean
    onClose: () => void
    currentPet: Pet | null
    onPostCreated: (newPost: Post) => void
    lang: 'es' | 'en'
}

export const CreatePostModal = ({
    isOpen,
    onClose,
    currentPet,
    onPostCreated,
    lang,
}: CreatePostModalProps) => {
    const [text, setText] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isOpen) return null

    const petName = currentPet?.name || (lang === 'es' ? 'Mascota' : 'Pet')

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            alert(lang === 'es' ? 'La imagen debe ser menor a 5MB.' : 'Image must be less than 5MB.')
            e.target.value = ''
            return
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert(lang === 'es' ? 'Usa una imagen JPG, PNG o WEBP.' : 'Use a JPG, PNG, or WEBP image.')
            e.target.value = ''
            return
        }

        if (photoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(photoPreview)
        }

        setImageFile(file)
        setPhotoPreview(URL.createObjectURL(file))
    }

    // Analizador de texto universal: Extrae palabras clave limpias de cualquier frase escrita
    const generateUniversalTags = (caption: string): string[] => {
        const stopWords = new Set([
            'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero', 'si', 'no',
            'a', 'ante', 'bajo', 'con', 'contra', 'de', 'desde', 'durante', 'en', 'entre',
            'hacia', 'hasta', 'para', 'por', 'sin', 'sobre', 'tras', 'que', 'tu', 'tus',
            'mi', 'mis', 'su', 'sus', 'me', 'te', 'se', 'nos', 'es', 'son', 'fue', 'lo',
            'como', 'ya', 'cuando', 'este', 'esta', 'estos', 'estas', 'muy', 'mas', 'todo',
            'todos', 'toda', 'todas', 'estoy', 'estamos', 'aqui', 'hay', 'algo'
        ])

        const cleanText = caption
            .toLowerCase()
            .replace(/[.,\/#$%\^&\*;:{}=\-_`~()?"'¡¿]/g, '')
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")

        const words = cleanText.split(/\s+/)
        const meaningfulWords = words.filter(word => word.length > 3 && !stopWords.has(word))
        const formattedTags = meaningfulWords.map(word => word.charAt(0).toUpperCase() + word.slice(1))

        if (formattedTags.length === 0) {
            return ['Momento']
        }

        return Array.from(new Set(formattedTags)).slice(0, 5)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!currentPet?.id) {
            alert(lang === 'es' ? 'Por favor, selecciona una mascota válida primero.' : 'Please select a valid pet first.')
            return
        }

        if (!text.trim() && !imageFile) return
        setIsSubmitting(true)

        let uploadedPath: string | null = null

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser()

            if (userError) throw userError
            if (!user) throw new Error(lang === 'es' ? 'No hay una sesión activa.' : 'No active session.')

            let finalPhotoUrl: string | null = null

            if (imageFile) {
                const extension =
                    imageFile.type === 'image/png'
                        ? 'png'
                        : imageFile.type === 'image/webp'
                            ? 'webp'
                            : 'jpg'

                uploadedPath = `${user.id}/${currentPet.id}/${crypto.randomUUID()}.${extension}`

                const { error: uploadError } = await supabase.storage
                    .from('post-photos')
                    .upload(uploadedPath, imageFile, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: imageFile.type,
                    })

                if (uploadError) throw uploadError

                const { data: publicUrlData } = supabase.storage
                    .from('post-photos')
                    .getPublicUrl(uploadedPath)

                finalPhotoUrl = publicUrlData.publicUrl
            }

            const smartTags = typeof generateSmartTags === 'function' ? generateSmartTags(text) : []
            const universalTags = typeof generateUniversalTags === 'function' ? generateUniversalTags(text) : []
            const combinedTags = Array.from(new Set([...smartTags, ...universalTags]))

            // El backend normaliza user_id, nombre/especie/avatar de la mascota
            // y fuerza contadores de interacción a cero.
            const postPayload = {
                pet_id: currentPet.id,
                location: 'Los Ángeles, CA',
                text: text.trim(),
                photo_url: finalPhotoUrl,
                tags: combinedTags,
            }

            const { data: newPostData, error } = await supabase
                .from('posts')
                .insert(postPayload)
                .select()
                .single()

            if (error) throw error

            const newPost: Post = {
                id: newPostData.id,
                petId: newPostData.pet_id,
                petName: newPostData.pet_name,
                petSpecies: newPostData.pet_species,
                petAvatar: newPostData.pet_avatar,
                location: newPostData.location,
                timeAgo: lang === 'es' ? 'justo ahora' : 'just now',
                createdAt: newPostData.created_at,
                isRecommended: false,
                tags: newPostData.tags || [],
                text: newPostData.text,
                photoUrl: newPostData.photo_url,
                likes: newPostData.likes || 0,
                isLiked: false,
                isSaved: false,
                comments: [],
                commentsCount: newPostData.comments_count || 0,
                commentsLoaded: false,
            }

            onPostCreated(newPost)

            if (photoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(photoPreview)
            }

            setText('')
            setImageFile(null)
            setPhotoPreview('')
        } catch (err: any) {
            if (uploadedPath) {
                const { error: cleanupError } = await supabase.storage
                    .from('post-photos')
                    .remove([uploadedPath])

                if (cleanupError) {
                    console.error('Error cleaning failed post upload:', cleanupError)
                }
            }

            console.error('Error creating post:', err)
            alert(
                lang === 'es'
                    ? `No se pudo publicar: ${err.message || 'error inesperado'}`
                    : `Could not publish: ${err.message || 'unexpected error'}`
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-[#204E4A]/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
            <div className="bg-[#FAF8F5] w-full sm:max-w-md rounded-t-[2.8rem] sm:rounded-[2.8rem] p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">

                <div className="flex justify-between items-center pb-2 border-b border-[#204E4A]/10">
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-[#E1E53F] flex items-center justify-center text-[#204E4A]">
                            <IconPaw size={16} />
                        </span>
                        <h3 className="text-lg font-black text-[#204E4A]">
                            {lang === 'es' ? `Nueva publicación de ${petName}` : `New post by ${petName}`}
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

                    <div className="space-y-1.5">
                        <label className="block font-bold text-[#204E4A]">
                            {lang === 'es' ? 'Fotografía del momento' : 'Moment photo'}
                        </label>
                        {photoPreview ? (
                            <div className="relative w-full h-48 rounded-2xl overflow-hidden shadow-xs border border-[#204E4A]/10">
                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (photoPreview.startsWith('blob:')) {
                                            URL.revokeObjectURL(photoPreview)
                                        }
                                        setPhotoPreview('')
                                        setImageFile(null)
                                    }}
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
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

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
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
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