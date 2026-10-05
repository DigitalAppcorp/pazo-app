import { useState, useRef } from 'react'
import { supabase } from '../../services/supabaseClient'
import { updatePetProfile } from '../../services/petService'
import type { Pet, CareItem, PrivateDoc, Post } from '../../types/pazo'
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
  onPetUpdated: (pet: Pet) => void
  careItems: CareItem[]
  onToggleCompleteCare: (careId: string) => void
  docs: PrivateDoc[]
  onOpenQRPassport: () => void
  onOpenCareAgenda: () => void
  onOpenLostAlert: () => void
  lang: 'es' | 'en'
  userPosts?: Post[]
}

export const PetView = ({
  currentPet,
  availablePets,
  onSelectPet,
  onPetUpdated,
  careItems,
  onToggleCompleteCare,
  docs,
  onOpenQRPassport,
  onOpenCareAgenda,
  onOpenLostAlert,
  lang,
  userPosts = [],
}: PetViewProps) => {
  const [showPetPicker, setShowPetPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'menu' | 'myposts'>('menu')
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const interestOptions = [
    'Comunidades de gatos',
    'Lugares aptos para mascotas',
    'Actividades y encuentros',
    'Nutrición y alimentación natural',
  ]

  const buildEditForm = () => ({
    name: currentPet.name || '',
    bio: currentPet.bio || '',
    breed: currentPet.breed || '',
    gender: currentPet.gender || '',
    weight: currentPet.weight || '',
    dietPlan: currentPet.dietPlan || '',
    age: currentPet.age || '',
    zone: currentPet.zone || '',
    interests: currentPet.interests || [],
    photoUrl: currentPet.photoUrl,
  })

  const [editForm, setEditForm] = useState(buildEditForm)

  const nextPendingCare = careItems.find((c) => !c.completed)

  const handleEditClick = () => {
    setEditForm(buildEditForm())
    setEditPhotoFile(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (editForm.photoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(editForm.photoUrl)
    }
    setEditPhotoFile(null)
    setIsEditing(false)
  }

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

    if (editForm.photoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(editForm.photoUrl)
    }

    setEditPhotoFile(file)
    setEditForm((prev) => ({ ...prev, photoUrl: URL.createObjectURL(file) }))
  }

  const toggleEditInterest = (interest: string) => {
    setEditForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((item) => item !== interest)
        : [...prev.interests, interest],
    }))
  }

  const handleSaveProfile = async () => {
    if (isSaving) return
    if (!editForm.name.trim()) {
      alert(lang === 'es' ? 'El nombre de la mascota es obligatorio.' : 'Pet name is required.')
      return
    }

    setIsSaving(true)

    try {
      const updatedPet = await updatePetProfile({
        petId: currentPet.id,
        name: editForm.name,
        species: currentPet.species,
        age: editForm.age,
        photoUrl: currentPet.photoUrl,
        photoFile: editPhotoFile,
        bio: editForm.bio,
        breed: editForm.breed,
        gender: editForm.gender === 'macho' || editForm.gender === 'hembra'
          ? editForm.gender
          : undefined,
        zone: editForm.zone,
        interests: editForm.interests,
        weight: editForm.weight,
        dietPlan: editForm.dietPlan,
      })

      if (editForm.photoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(editForm.photoUrl)
      }

      setEditPhotoFile(null)
      onPetUpdated(updatedPet)
      setIsEditing(false)
    } catch (error: any) {
      alert(lang === 'es' ? `Error al guardar: ${error.message}` : `Error saving: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    const confirmMsg = lang === 'es' ? '¿Estás seguro de cerrar sesión?' : 'Are you sure you want to log out?'
    if (window.confirm(confirmMsg)) {
      await supabase.auth.signOut()
      window.location.reload()
    }
  }

  const handleFeatureSoon = (featureName: string) => {
    alert(
      lang === 'es'
        ? `🐾 ¡Pronto podrás ${featureName}! Estamos trabajando con mucho cariño para traértelo muy pronto.`
        : `🐾 ${featureName} is coming soon! We're crafting it with love to release it shortly.`
    )
  }

  return (
    <div className="space-y-4 animate-slide-up pb-6">
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
              {currentPet.species.toUpperCase()} • {currentPet.age}{currentPet.breed ? ` • ${currentPet.breed}` : ''}
            </p>
          )}
        </div>

        {!isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPetPicker(!showPetPicker)}
              className="text-xs font-bold text-[#204E4A] bg-white hover:bg-neutral-50 px-3.5 py-2 rounded-full transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <span>{lang === 'es' ? 'Cambiar' : 'Switch'}</span>
              <span className="text-[10px]">▾</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
              title={lang === 'es' ? 'Cerrar sesión' : 'Log out'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={handleCancelEdit}
            className="text-xs font-bold text-[#5C7470] bg-white border border-[#204E4A]/10 px-4 py-2 rounded-full transition-all cursor-pointer shadow-xs"
          >
            {lang === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
        )}
      </div>

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

      {!isEditing && (
        <div className="flex bg-white p-1 rounded-2xl border border-[#204E4A]/10 shadow-xs">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-2 font-extrabold rounded-xl transition-all cursor-pointer text-xs ${activeTab === 'menu' ? 'bg-[#204E4A] text-[#E1E53F]' : 'text-[#5C7470]'}`}
          >
            {lang === 'es' ? 'Menú y Utilidades' : 'Menu & Utilities'}
          </button>
          <button
            onClick={() => setActiveTab('myposts')}
            className={`flex-1 py-2 font-extrabold rounded-xl transition-all cursor-pointer text-xs ${activeTab === 'myposts' ? 'bg-[#204E4A] text-[#E1E53F]' : 'text-[#5C7470]'}`}
          >
            {lang === 'es' ? `Mis Publicaciones (${userPosts.length})` : `My Posts (${userPosts.length})`}
          </button>
        </div>
      )}

      {!isEditing && activeTab === 'myposts' ? (
        <div className="space-y-3 animate-fade-in">
          {userPosts.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-8 text-center border border-[#204E4A]/10 shadow-xs">
              <p className="text-xs text-[#5C7470] font-medium">
                {lang === 'es'
                  ? `Aún no has compartido historias de ${currentPet.name}.`
                  : `You haven't shared any stories for ${currentPet.name} yet.`}
              </p>
            </div>
          ) : (
            userPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-[2rem] p-4 shadow-xs border border-[#204E4A]/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#5C7470] font-bold">{post.timeAgo}</span>
                  <span className="text-[10px] bg-[#E1E53F]/40 text-[#204E4A] px-2 py-0.5 rounded-full font-bold">♥ {post.likes}</span>
                </div>
                <p className="text-xs text-[#204E4A] font-medium">{post.text}</p>
                {post.photoUrl && (
                  <div className="w-full h-44 rounded-2xl overflow-hidden shadow-xs">
                    <img src={post.photoUrl} alt="User post" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : !isEditing && (
        <div className="space-y-3 animate-fade-in">
          <h3 className="font-extrabold text-sm text-[#204E4A] px-1">
            {lang === 'es' ? `Todo sobre ${currentPet.name}` : `All about ${currentPet.name}`}
          </h3>

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