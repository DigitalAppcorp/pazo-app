import { useState } from 'react'
import type { Species } from '../../types/pazo'
import {
  IconCamera,
  IconCalendar,
  IconPin,
  IconAlert,
  IconPaw,
  IconClose,
} from '../icons/PazoIcons'

interface CreateModalProps {
  isOpen: boolean
  onClose: () => void
  activePetName?: string
  activePetSpecies?: Species
  onCreatePost?: (text: string, photoUrl?: string) => void
  onOpenCheckIn?: () => void
  onOpenAlert?: () => void
  onSelectOption?: (type: 'post' | 'lugar' | 'comunidad' | 'alerta') => void
  lang: 'es' | 'en'
}

export const CreateModal = ({
  isOpen,
  onClose,
  activePetName = 'Mascota',
  activePetSpecies = 'perro',
  onCreatePost,
  onOpenCheckIn,
  onOpenAlert,
  onSelectOption,
  lang,
}: CreateModalProps) => {
  const [mode, setMode] = useState<'menu' | 'post' | 'event'>('menu')
  const [postText, setPostText] = useState('')
  const [audience, setAudience] = useState<'public' | 'community'>('public')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  if (!isOpen) return null

  // Manejar la selección de la foto desde la galería del dispositivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedFile(reader.result as string) // Convierte la imagen a Base64
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePublish = () => {
    if (!postText.trim() && !selectedFile) return
    if (onCreatePost) {
      onCreatePost(
        postText.trim(),
        selectedFile || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=800&auto=format&fit=crop'
      )
    }
    setPostText('')
    setSelectedFile(null)
    setMode('menu')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-slide-up">
      <div className="w-full sm:max-w-sm bg-white rounded-t-[2.8rem] sm:rounded-[2.8rem] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {mode === 'menu' ? (
          <>
            {/* Header del menú de acciones */}
            <div className="flex justify-between items-center pb-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full inline-block">
                  Pazo Action
                </span>
                <h3 className="text-xl font-black text-[#204E4A] mt-1">
                  {lang === 'es' ? 'Crear y Compartir' : 'Create & Share'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#5C7470] hover:text-[#204E4A] flex items-center justify-center font-bold text-sm cursor-pointer shadow-xs"
              >
                <IconClose size={15} />
              </button>
            </div>

            {/* Las 4 acciones principales de la especificación de Pazo */}
            <div className="space-y-2.5 pt-1">
              {/* 1. Publicación */}
              <button
                onClick={() => {
                  if (onSelectOption) onSelectOption('post')
                  else setMode('post')
                }}
                className="w-full p-4 bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 rounded-[1.8rem] flex items-center gap-3.5 transition-all cursor-pointer text-left group shadow-xs"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#E1E53F] text-[#204E4A] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <IconCamera size={22} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#204E4A]">
                    {lang === 'es' ? 'Nueva Publicación' : 'New Post'}
                  </h4>
                  <p className="text-xs text-[#5C7470]">
                    {lang === 'es'
                      ? `Compartir una foto o momento de ${activePetName}`
                      : `Share a photo or story of ${activePetName}`}
                  </p>
                </div>
              </button>

              {/* 2. Evento / Encuentro */}
              <button
                onClick={() => {
                  if (onSelectOption) onSelectOption('comunidad')
                  else setMode('event')
                }}
                className="w-full p-4 bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 rounded-[1.8rem] flex items-center gap-3.5 transition-all cursor-pointer text-left group shadow-xs"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#204E4A] text-[#E1E53F] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <IconCalendar size={22} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#204E4A]">
                    {lang === 'es' ? 'Crear Encuentro' : 'Create Meetup'}
                  </h4>
                  <p className="text-xs text-[#5C7470]">
                    {lang === 'es'
                      ? 'Paseo grupal o actividad en un lugar público'
                      : 'Group walk or meetup at a local spot'}
                  </p>
                </div>
              </button>

              {/* 3. Sugerir lugar para revisión */}
              <button
                onClick={() => {
                  if (onSelectOption) onSelectOption('lugar')
                  else if (onOpenCheckIn) {
                    onClose()
                    onOpenCheckIn()
                  }
                }}
                className="w-full p-4 bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 rounded-[1.8rem] flex items-center gap-3.5 transition-all cursor-pointer text-left group shadow-xs"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <IconPin size={22} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#204E4A]">
                    {lang === 'es' ? 'Sugerir un lugar' : 'Suggest a place'}
                  </h4>
                  <p className="text-xs text-[#5C7470]">
                    {lang === 'es'
                      ? 'Enviar un lugar pet-friendly para que PAZO lo revise'
                      : 'Send a pet-friendly place for PAZO to review'}
                  </p>
                </div>
              </button>

              {/* 4. Alerta de Mascota */}
              <button
                onClick={() => {
                  if (onSelectOption) onSelectOption('alerta')
                  else if (onOpenAlert) {
                    onClose()
                    onOpenAlert()
                  }
                }}
                className="w-full p-4 bg-[#EC7357]/10 hover:bg-[#EC7357]/15 rounded-[1.8rem] flex items-center gap-3.5 transition-all cursor-pointer text-left group shadow-xs"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#EC7357] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <IconAlert size={22} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#EC7357]">
                    {lang === 'es' ? 'Alerta de Pérdida o Hallazgo' : 'Lost or Found Alert'}
                  </h4>
                  <p className="text-xs text-[#5C7470]">
                    {lang === 'es'
                      ? 'Activar red de búsqueda comunitaria protegida'
                      : 'Broadcast a protected community search alert'}
                  </p>
                </div>
              </button>
            </div>
          </>
        ) : mode === 'post' ? (
          /* Subflujo: Crear Publicación con Galería */
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2">
              <button
                onClick={() => setMode('menu')}
                className="text-xs font-bold text-[#5C7470] hover:text-[#204E4A] cursor-pointer"
              >
                ← {lang === 'es' ? 'Volver' : 'Back'}
              </button>
              <h3 className="font-extrabold text-sm text-[#204E4A]">
                {lang === 'es' ? `Publicar como ${activePetName}` : `Post as ${activePetName}`}
              </h3>
              <button onClick={onClose} className="text-sm font-bold text-[#5C7470] cursor-pointer">
                <IconClose size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#FAF8F5] rounded-2xl flex items-center gap-2 shadow-xs">
                <IconPaw size={16} className="text-[#204E4A]" />
                <span className="text-xs font-bold text-[#204E4A]">
                  {activePetName} ({activePetSpecies})
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5C7470] mb-1">
                  {lang === 'es' ? '¿Qué compartieron hoy?' : 'What did you share today?'}
                </label>
                <textarea
                  rows={3}
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder={
                    lang === 'es'
                      ? 'Escribe sobre la caminata, el juego o un momento especial...'
                      : 'Write about a walk, playtime or a sweet moment...'
                  }
                  className="w-full text-xs bg-[#FAF8F5] rounded-2xl p-3.5 text-[#204E4A] placeholder-[#5C7470]/60 shadow-xs focus:outline-none"
                />
              </div>

              {/* Selector de galería y previsualización de imagen */}
              <div className="space-y-2">
                <label className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-[#204E4A]/20 rounded-2xl bg-[#FAF8F5] text-xs font-bold text-[#204E4A] hover:bg-[#204E4A]/5 cursor-pointer transition-colors">
                  <IconCamera size={16} />
                  <span>{lang === 'es' ? 'Elegir foto de la galería' : 'Choose photo from gallery'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {selectedFile && (
                  <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-[#204E4A]/15 shadow-sm">
                    <img src={selectedFile} alt="Vista previa" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Selector de audiencia */}
              <div className="p-3 bg-[#FAF8F5] rounded-2xl flex justify-between items-center text-xs shadow-xs">
                <span className="font-bold text-[#204E4A]">
                  {lang === 'es' ? 'Audiencia' : 'Audience'}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAudience('public')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shadow-xs ${audience === 'public'
                      ? 'bg-[#204E4A] text-[#E1E53F]'
                      : 'bg-white text-[#5C7470]'
                      }`}
                  >
                    {lang === 'es' ? 'Público' : 'Public'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudience('community')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shadow-xs ${audience === 'community'
                      ? 'bg-[#204E4A] text-[#E1E53F]'
                      : 'bg-white text-[#5C7470]'
                      }`}
                  >
                    {lang === 'es' ? 'Comunidad' : 'Community'}
                  </button>
                </div>
              </div>

              <button
                onClick={handlePublish}
                disabled={!postText.trim() && !selectedFile}
                className="w-full bg-[#E1E53F] hover:bg-[#d8dc35] disabled:opacity-50 text-[#204E4A] font-extrabold py-3.5 rounded-full text-sm shadow-md transition-all cursor-pointer"
              >
                {lang === 'es' ? 'Publicar ahora' : 'Publish now'}
              </button>
            </div>
          </div>
        ) : (
          /* Subflujo: Crear Encuentro */
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2">
              <button
                onClick={() => setMode('menu')}
                className="text-xs font-bold text-[#5C7470] hover:text-[#204E4A] cursor-pointer"
              >
                ← {lang === 'es' ? 'Volver' : 'Back'}
              </button>
              <h3 className="font-extrabold text-sm text-[#204E4A]">
                {lang === 'es' ? 'Un plan para compartir' : 'Plan a Meetup'}
              </h3>
              <button onClick={onClose} className="text-sm font-bold text-[#5C7470] cursor-pointer">
                <IconClose size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-2xl shadow-xs">
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Nombre de la actividad' : 'Activity Name'}
                </label>
                <input
                  type="text"
                  placeholder="Ej: Caminata matutina en Silver Lake"
                  className="w-full bg-white rounded-xl px-3 py-2 text-xs shadow-xs focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-2xl shadow-xs">
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Lugar público & Hora' : 'Public Place & Time'}
                </label>
                <input
                  type="text"
                  placeholder="Ej: Sábado 10:00 AM • Parque Silver Lake"
                  className="w-full bg-white rounded-xl px-3 py-2 text-xs shadow-xs focus:outline-none"
                />
              </div>

              <button
                onClick={() => {
                  alert(lang === 'es' ? '¡Encuentro publicado en tu comunidad!' : 'Meetup published!')
                  onClose()
                }}
                className="w-full bg-[#204E4A] hover:bg-[#183d3a] text-[#E1E53F] font-extrabold py-3.5 rounded-full text-sm shadow-md transition-all cursor-pointer"
              >
                {lang === 'es' ? 'Guardar y Publicar Encuentro' : 'Publish Meetup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}