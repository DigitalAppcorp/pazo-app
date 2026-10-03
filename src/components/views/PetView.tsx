import { useState, useRef } from 'react'
import { supabase } from '../../services/supabaseClient'
import type { Pet, CareItem, PrivateDoc } from '../../types/pazo'
import {
  IconPaw,
  IconCalendar,
  IconAlert,
  IconCheck,
  IconBowl,
} from '../icons/PazoIcons'

interface PetViewProps {
  currentPet: Pet
  availablePets: Pet[]
  onSelectPet: (pet: Pet) => void
  careItems: CareItem[]
  onToggleCompleteCare: (careId: string) => void
  docs: PrivateDoc[]
  onOpenQRPassport: () => void
  onOpenCareAgenda: () => void
  onOpenLostAlert: () => void
  lang: 'es' | 'en'
}

export const PetView = ({
  currentPet,
  availablePets,
  onSelectPet,
  careItems,
  onToggleCompleteCare,
  docs,
  onOpenQRPassport,
  onOpenCareAgenda,
  onOpenLostAlert,
  lang,
}: PetViewProps) => {
  const [showPetPicker, setShowPetPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado local para los campos editables (incluyendo el nombre)
  const [editForm, setEditForm] = useState({
    name: currentPet.name || '',
    bio: currentPet.bio || '',
    weight: currentPet.weight || '',
    dietPlan: currentPet.dietPlan || '',
    age: currentPet.age || '',
    photoUrl: currentPet.photoUrl,
  })

  // Próximo cuidado pendiente
  const nextPendingCare = careItems.find((c) => !c.completed)

  // Manejador para iniciar el modo edición y precargar los valores actuales
  const handleEditClick = () => {
    setEditForm({
      name: currentPet.name || '',
      bio: currentPet.bio || '',
      weight: currentPet.weight || '',
      dietPlan: currentPet.dietPlan || '',
      age: currentPet.age || '',
      photoUrl: currentPet.photoUrl,
    })
    setIsEditing(true)
  }

  // Manejar el cambio de fotografía localmente (previsualización antes de guardar)
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        alert(lang === 'es' ? 'La imagen debe ser menor a 5MB.' : 'Image must be less than 5MB.')
        return
      }
      const previewUrl = URL.createObjectURL(file)
      setEditForm({ ...editForm, photoUrl: previewUrl })
    }
  }

  // Guardar los cambios en Supabase (Incluyendo subida de foto y nombre)
  const handleSaveProfile = async () => {
    setIsSaving(true)
    let finalPhotoUrl = editForm.photoUrl

    try {
      if (editForm.photoUrl.startsWith('blob:')) {
        const fileInput = fileInputRef.current
        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0]
          const fileExt = file.name.split('.').pop()
          const fileName = `${currentPet.id}-${Date.now()}.${fileExt}`
          const filePath = `avatars/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('post-photos')
            .upload(filePath, file)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('post-photos')
            .getPublicUrl(filePath)

          finalPhotoUrl = publicUrl
        }
      }

      // Actualizamos el registro de la mascota en Supabase (Nombre, bio, peso, dieta, edad y foto)
      const { error: updateError } = await supabase
        .from('pets')
        .update({
          name: editForm.name,
          bio: editForm.bio,
          weight: editForm.weight,
          dietPlan: editForm.dietPlan,
          age: editForm.age,
          photo_url: finalPhotoUrl,
        })
        .eq('id', currentPet.id)

      if (updateError) throw updateError

      const updatedPet: Pet = {
        ...currentPet,
        name: editForm.name,
        bio: editForm.bio,
        weight: editForm.weight,
        dietPlan: editForm.dietPlan,
        age: editForm.age,
        photoUrl: finalPhotoUrl,
      }
      onSelectPet(updatedPet)
      setIsEditing(false)

    } catch (error: any) {
      alert(lang === 'es' ? `Error al guardar: ${error.message}` : `Error saving: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Función amable para funciones que están por venir (Puerta Falsa)
  const handleFeatureSoon = (featureName: string) => {
    alert(
      lang === 'es'
        ? `🐾 ¡Pronto podrás ${featureName}! Estamos trabajando con mucho cariño para traértelo muy pronto.`
        : `🐾 ${featureName} is coming soon! We're crafting it with love to release it shortly.`
    )
  }

  return (
    <div className="space-y-4 animate-slide-up pb-6">
      {/* Cabecera dinámica */}
      <div className="flex justify-between items-center px-1">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-3 py-1 rounded-full inline-block shadow-xs">
            {isEditing ? (lang === 'es' ? 'Editando Perfil' : 'Editing Profile') : (lang === 'es' ? 'Ficha Oficial' : 'Official Record')}
          </span>
          <h2 className="text-2xl font-black text-[#204E4A] tracking-tight mt-1">
            {currentPet.name}
          </h2>
          {!isEditing && (
            <p className="text-xs text-[#5C7470]">
              {currentPet.species.toUpperCase()} • {currentPet.age} • {currentPet.breed}
            </p>
          )}
        </div>

        {!isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPetPicker(!showPetPicker)}
              className="text-xs font-bold text-[#204E4A] bg-white hover:bg-neutral-50 px-4 py-2 rounded-full transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <span>{lang === 'es' ? 'Cambiar' : 'Switch'}</span>
              <span className="text-[10px]">▾</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs font-bold text-[#5C7470] bg-white border border-[#204E4A]/10 px-4 py-2 rounded-full transition-all cursor-pointer shadow-xs"
          >
            {lang === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
        )}
      </div>

      {/* Menú desplegable para alternar o agregar mascotas */}
      {showPetPicker && !isEditing && (
        <div className="p-3 bg-white rounded-[2rem] shadow-lg space-y-2 animate-slide-up">
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-extrabold uppercase text-[#5C7470] tracking-wider">
              {lang === 'es' ? 'Tus mascotas registradas' : 'Your registered pets'}
            </span>
            <button
              onClick={() => handleFeatureSoon(lang === 'es' ? 'añadir otra mascota a tu cuenta' : 'add another pet')}
              className="text-[11px] font-extrabold text-[#204E4A] hover:underline cursor-pointer"
            >
              + {lang === 'es' ? 'Añadir otra' : 'Add another'}
            </button>
          </div>

          {availablePets.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelectPet(p)
                setShowPetPicker(false)
              }}
              className={`w-full p-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer shadow-xs ${currentPet.id === p.id
                ? 'bg-[#204E4A] text-white'
                : 'bg-[#FAF8F5] text-[#204E4A] hover:bg-white'
                }`}
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={p.photoUrl}
                  alt={p.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="text-left">
                  <span className="font-extrabold text-xs block leading-tight">{p.name}</span>
                  <span
                    className={`text-[10px] ${currentPet.id === p.id ? 'text-white/70' : 'text-[#5C7470]'
                      }`}
                  >
                    {p.species} • {p.age}
                  </span>
                </div>
              </div>
              {currentPet.id === p.id && (
                <span className="text-xs text-[#E1E53F]">
                  <IconCheck size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Tarjeta Principal de Identidad */}
      <div className="p-5 bg-white rounded-[2.2rem] shadow-[0_4px_20px_rgba(32,78,74,0.05)] overflow-hidden relative">
        {!isEditing && (
          <button
            onClick={handleEditClick}
            className="absolute top-4 right-4 text-[10px] font-bold text-[#204E4A] bg-[#FAF8F5] hover:bg-[#E1E53F] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            {lang === 'es' ? 'Editar' : 'Edit'}
          </button>
        )}

        <div className="flex gap-4 items-start">
          <div className="relative shrink-0 group">
            <div className="w-20 h-20 rounded-[1.8rem] overflow-hidden shadow-xs relative bg-[#FAF8F5]">
              <img
                src={isEditing ? editForm.photoUrl : currentPet.photoUrl}
                alt={currentPet.name}
                className="w-full h-full object-cover"
              />
              {!isEditing && (
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full shadow-xs border-2 border-white"></div>
              )}
            </div>

            {isEditing && (
              <label className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-[1.8rem] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px] font-bold text-center leading-tight">
                  {lang === 'es' ? 'Cambiar\nFoto' : 'Change\nPhoto'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                />
              </label>
            )}
          </div>

          <div className="min-w-0 flex-1 w-full">
            {isEditing ? (
              <div className="space-y-2.5 w-full mt-1">
                <div>
                  <label className="text-[10px] font-bold text-[#5C7470] block mb-0.5">Nombre de la mascota</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] font-bold focus:outline-none focus:border-[#E1E53F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#5C7470] block mb-0.5">Biografía corta</label>
                  <input
                    type="text"
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] focus:outline-none focus:border-[#E1E53F]"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-[#5C7470] block mb-0.5">Peso</label>
                    <input
                      type="text"
                      value={editForm.weight}
                      onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                      className="w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] focus:outline-none focus:border-[#E1E53F]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-[#5C7470] block mb-0.5">Edad</label>
                    <input
                      type="text"
                      value={editForm.age}
                      onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                      className="w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] focus:outline-none focus:border-[#E1E53F]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#5C7470] block mb-0.5">Dieta / Plan</label>
                  <input
                    type="text"
                    value={editForm.dietPlan}
                    onChange={(e) => setEditForm({ ...editForm, dietPlan: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] focus:outline-none focus:border-[#E1E53F]"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full bg-[#204E4A] text-white font-bold text-xs py-2 rounded-xl mt-2 flex items-center justify-center cursor-pointer"
                >
                  {isSaving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : (lang === 'es' ? 'Guardar Cambios' : 'Save Changes')}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-black text-[#204E4A] truncate">{currentPet.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#E1E53F] text-[#204E4A] rounded-full shrink-0 shadow-xs">
                    {currentPet.species}
                  </span>
                </div>
                <p className="text-xs text-[#5C7470] mt-0.5">{currentPet.bio}</p>
                <div className="flex flex-wrap gap-2 text-[11px] font-bold text-[#204E4A] mt-2">
                  <span className="bg-[#FAF8F5] px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                    <span>{currentPet.weight}</span>
                  </span>
                  <span className="bg-[#FAF8F5] px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                    <IconBowl size={13} />
                    <span className="truncate max-w-[140px]">{currentPet.dietPlan}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bloques de Acción Inferiores */}
      {!isEditing && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-sm text-[#204E4A] px-1">
            {lang === 'es' ? `Todo sobre ${currentPet.name}` : `All about ${currentPet.name}`}
          </h3>

          {/* 1. Pasaporte y QR */}
          <div
            onClick={onOpenQRPassport}
            className="p-4 bg-white hover:bg-neutral-50 rounded-[2rem] shadow-[0_4px_16px_rgba(32,78,74,0.04)] flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E1E53F]/40 text-[#204E4A] flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform shadow-xs">
                <IconPaw size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#204E4A]">
                  {lang === 'es' ? 'Pasaporte y QR' : 'Passport & QR'}
                </h4>
                <p className="text-xs text-[#5C7470]">
                  {lang === 'es'
                    ? 'Identidad que puedes compartir públicamente'
                    : 'Identity you can safely share'}
                </p>
              </div>
            </div>
            <span className="text-lg text-[#5C7470] group-hover:translate-x-1 transition-transform font-bold">
              ›
            </span>
          </div>

          {/* 2. Cuidados y Documentos */}
          <div
            onClick={onOpenCareAgenda}
            className="p-4 bg-white hover:bg-neutral-50 rounded-[2rem] shadow-[0_4px_16px_rgba(32,78,74,0.04)] flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#204E4A]/10 text-[#204E4A] flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform shadow-xs">
                <IconCalendar size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#204E4A]">
                  {lang === 'es' ? 'Cuidados y Agenda' : 'Care & Documents'}
                </h4>
                <p className="text-xs text-[#5C7470]">
                  {lang === 'es'
                    ? `${careItems.length} cuidados agendados • ${docs.length} documentos`
                    : `${careItems.length} scheduled tasks • ${docs.length} docs`}
                </p>
              </div>
            </div>
            <span className="text-lg text-[#5C7470] group-hover:translate-x-1 transition-transform font-bold">
              ›
            </span>
          </div>

          {/* Próximo Cuidado Pendiente Rápido */}
          {nextPendingCare && (
            <div className="p-4 bg-[#FAF8F5] rounded-[2rem] flex justify-between items-center shadow-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase text-[#EC7357] tracking-wider block">
                  {lang === 'es' ? 'Próximo cuidado' : 'Next upcoming task'}
                </span>
                <span className="font-bold text-xs text-[#204E4A] block">
                  {nextPendingCare.title}
                </span>
                <span className="text-[11px] text-[#5C7470] block">
                  {nextPendingCare.date} • {nextPendingCare.time}
                </span>
              </div>

              <button
                onClick={() => onToggleCompleteCare(nextPendingCare.id)}
                className="text-xs font-bold text-[#204E4A] bg-white hover:bg-[#E1E53F] px-4 py-2 rounded-full transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <IconCheck size={13} />
                <span>{lang === 'es' ? 'Completar' : 'Done'}</span>
              </button>
            </div>
          )}

          {/* 3. Botón de Emergencia Crítico */}
          <div className="pt-2">
            <button
              onClick={onOpenLostAlert}
              className="w-full bg-[#EC7357]/15 hover:bg-[#EC7357]/25 text-[#EC7357] font-extrabold text-sm py-4 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <IconAlert size={18} />
              <span>
                {lang === 'es'
                  ? `¿${currentPet.name} se perdió? Activar Alerta`
                  : `Is ${currentPet.name} lost? Trigger Alert`}
              </span>
            </button>
            <p className="text-[11px] text-center text-[#5C7470] mt-1.5">
              {lang === 'es'
                ? 'Emite una búsqueda comunitaria protegida'
                : 'Broadcasts a protected community alert'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}