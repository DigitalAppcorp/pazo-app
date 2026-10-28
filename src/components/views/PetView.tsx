import {SupporterProfileEntry} from '../../features/supporter/components/SupporterProfileEntry'
import { FirstUsePrompt } from '../../features/onboarding/FirstUsePrompt'
import type { FirstUseIntent } from '../../features/onboarding/firstUse'
import { petSpeciesLabel, petAgeLabel } from '../../features/i18n/petLabels'
import { PazoMotifIcon } from '../icons/PazoMotifIcons'
import { DEMO_POST_MOTIFS } from '../../data/mockData'
import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { supabase } from '../../services/supabaseClient'
import { updatePetProfile } from '../../services/petService'
import { ModerationAccess } from '../../features/moderation/ModerationAccess'
import { LiquidChoiceTabs } from '../ui/LiquidChoiceTabs'
import { SupporterAccountManagement } from '../../features/supporter/components/SupporterAccountManagement'
import { useSupporterMembershipStatus } from '../../features/supporter/useSupporterMembershipStatus'
import { SupporterInvitationPrompt } from '../../features/supporter/components/SupporterInvitationPrompt'
import { LegalPreviewDialog } from '../../features/legal/LegalPreviewDialog'
import { DeletionRequestDialog } from '../../features/account/DeletionRequestDialog'
import { PAZO_PRIVACY_SUPPORT_EMAIL, PAZO_PRIVACY_SUPPORT_MAILTO } from '../../features/legal/supportContact'
import { PazoInstallControl } from '../../features/pwa/components/PazoInstallControl'
import { SupportRequestDialog } from '../../features/support/components/SupportRequestDialog'
import type { LegalKind } from '../../features/legal/legalCopy'
import type { Pet, CareItem, Post } from '../../types/pazo'
import {
  IconPaw,
  IconCalendar,
  IconAlert,
  IconCheck,
  IconBowl,
  IconDocument,
} from '../icons/PazoIcons'

interface PetViewProps {
  currentPet: Pet
  canModerate: boolean
  canManagePet: boolean
  isDemo?: boolean
  onExitDemo?: () => void
  onRequireAccount: () => void
  availablePets: Pet[]
  onSelectPet: (pet: Pet) => void
  onPetUpdated: (pet: Pet) => void
  onAddPet: () => void
  careItems: CareItem[]
  careReminderItem?: CareItem
  onCompleteCare: (careItem: CareItem) => void | Promise<void>
  onOpenQRPassport: () => void
  onOpenCareAgenda: () => void
  documentCount: number
  onOpenDocuments: () => void
  onOpenLostAlert: () => void
  lang: 'es' | 'en'
  userPosts?: Post[]
  firstUseIntent?: FirstUseIntent
  onExploreFirstUse?: () => void
}

export const PetView = ({
  currentPet,
  canModerate,
  canManagePet,
  isDemo = false,
  onExitDemo,
  onRequireAccount,
  availablePets,
  onSelectPet,
  onPetUpdated,
  onAddPet,
  careItems,
  careReminderItem,
  onCompleteCare,
  onOpenQRPassport,
  onOpenCareAgenda,
  documentCount,
  onOpenDocuments,
  onOpenLostAlert,
  lang,
  userPosts = [],
  firstUseIntent,
  onExploreFirstUse,
}: PetViewProps) => {
  const [showPetPicker, setShowPetPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSupporterAccount, setShowSupporterAccount] = useState(false)
  const [dismissedInvitationPreview, setDismissedInvitationPreview] = useState(false)
  const supporterAccountEntryRef = useRef<HTMLButtonElement>(null)
  const { status: supporterStatus } = useSupporterMembershipStatus(undefined, canManagePet)
  // Explicit localhost QA visual preview. No automatic targeting, tracking or cooldown writes.
  const invitationPreviewRequested = import.meta.env.DEV &&
    import.meta.env.VITE_PAZO_F16_SANDBOX_QA_UI === 'true' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('supporter_preview') === '1'
  const [activeTab, setActiveTab] = useState<'menu' | 'myposts'>('menu')
  const [legalKind, setLegalKind] = useState<LegalKind | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const [showDeletionRequest, setShowDeletionRequest] = useState(false)
  const [showSupportRequest,setShowSupportRequest]=useState(false)
  // The intake RPCs are installed and QA-tested. Keep production disabled
  // until launch gates close; allow request/status/cancel QA in localhost.
  const requestEnabled = import.meta.env.DEV || import.meta.env.VITE_F14_DELETION_REQUESTS_ENABLED === 'true'
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [completingCareId, setCompletingCareId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const firstQrButtonRef = useRef<HTMLButtonElement>(null)
  const firstCareButtonRef = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    if (!firstUseIntent) return
    const frame=requestAnimationFrame(()=>{
      const qr=firstQrButtonRef.current, care=firstCareButtonRef.current
      const main=care?.closest('main')
      if (!qr||!care||!main) return
      qr.focus({preventScroll:true})
      const dock=main.closest('[data-pazo-app-shell]')?.querySelector('nav[data-pazo-floating-nav="true"]')
      const dockTop=dock?Math.min(dock.getBoundingClientRect().top,...Array.from(dock.querySelectorAll('button')).map(button=>button.getBoundingClientRect().top)):main.getBoundingClientRect().bottom
      const safeBottom=Math.min(main.getBoundingClientRect().bottom,dockTop-12)
      const coveredByDock=care.getBoundingClientRect().bottom-safeBottom
      if (coveredByDock>0) main.scrollTop+=coveredByDock
    })
    return ()=>cancelAnimationFrame(frame)
  },[firstUseIntent,currentPet.id])

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

  const nextPendingCare = careReminderItem

  useEffect(() => {
    if (!showSettings || typeof document === 'undefined') return
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !settingsMenuRef.current?.contains(event.target)) {
        setShowSettings(false)
      }
    }
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSettings(false)
        settingsButtonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [showSettings])

  const handleEditClick = () => {
    setShowSettings(false)
    if (!canManagePet) { onRequireAccount(); return }
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

  const handleCompleteReminderCare = async (careItem: CareItem) => {
    if (!canManagePet) { onRequireAccount(); return }
    if (completingCareId) return

    setCompletingCareId(careItem.id)

    try {
      await onCompleteCare(careItem)
    } catch (error) {
      console.error('Error completing care reminder:', error)
      alert(
        lang === 'es'
          ? 'No se pudo completar el cuidado. Inténtalo de nuevo.'
          : 'Could not complete this care item. Please try again.'
      )
    } finally {
      setCompletingCareId(null)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManagePet) { onRequireAccount(); return }
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
    if (!canManagePet) { onRequireAccount(); return }
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
    if (isDemo) { onExitDemo?.(); return }
    const confirmMsg = lang === 'es' ? '¿Estás seguro de cerrar sesión?' : 'Are you sure you want to log out?'
    if (window.confirm(confirmMsg)) {
      await supabase.auth.signOut()
      window.location.reload()
    }
  }

  return (
    <div className="space-y-4 animate-slide-up pb-6">
        <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-2xl font-black text-[#204E4A] tracking-tight mt-1">
            {currentPet.name}
          </h2>
          {!isEditing && (
            <p className="text-xs text-[#5C7470]">
              {petSpeciesLabel(currentPet.species,lang).toUpperCase()} • {petAgeLabel(currentPet.age,lang)}{currentPet.breed ? ` • ${currentPet.breed}` : ''}
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
              <span className="text-[13px]">▾</span>
            </button>

            <div className="relative z-30" ref={settingsMenuRef}>
              <button
                ref={settingsButtonRef}
                type="button"
                onClick={() => setShowSettings((open) => !open)}
                aria-label={lang === 'es' ? 'Configuración' : 'Settings'}
                title={lang === 'es' ? 'Configuración' : 'Settings'}
                aria-expanded={showSettings}
                aria-controls="pazo-profile-settings"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#204E4A] shadow-xs transition-colors hover:bg-[#E1E53F]/40 focus-visible:bg-[#E1E53F]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.3 2.8h3.4l.55 2.12c.48.19.94.46 1.36.78l2.07-.63 1.7 2.94-1.54 1.5a7.5 7.5 0 0 1 0 1.98l1.54 1.5-1.7 2.94-2.07-.63c-.42.32-.88.59-1.36.78l-.55 2.12h-3.4l-.55-2.12a6.8 6.8 0 0 1-1.36-.78l-2.07.63-1.7-2.94 1.54-1.5a7.5 7.5 0 0 1 0-1.98l-1.54-1.5 1.7-2.94 2.07.63c.42-.32.88-.59 1.36-.78z" transform="translate(0 1.5)" />
                  <circle cx="12" cy="12" r="2.65" />
                </svg>
              </button>
              {showSettings && (
                <div
                  id="pazo-profile-settings"
                  role="group"
                  aria-label={lang === 'es' ? 'Configuración de cuenta' : 'Account settings'}
                  className="absolute right-0 top-full z-50 mt-2 max-h-[70dvh] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-[1.5rem] bg-[#FFFCF6] p-2 shadow-[0_12px_35px_rgba(32,78,74,0.17)] motion-safe:animate-[slideUpFade_220ms_ease-out_both]"
                >
                  <p className="px-3 pb-1 pt-2 text-[11px] font-extrabold text-[#5C7470]">
                    {lang === 'es' ? 'Privacidad y reglas' : 'Privacy and community rules'}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowSettings(false); setLegalKind('privacy') }}
                    className="w-full rounded-2xl px-3 py-3 text-left text-xs font-bold text-[#204E4A] transition-colors hover:bg-[#E1E53F]/35 focus-visible:bg-[#E1E53F]/35"
                  >
                    {lang === 'es' ? 'Privacidad' : 'Privacy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowSettings(false); setLegalKind('terms') }}
                    className="w-full rounded-2xl px-3 py-3 text-left text-xs font-bold text-[#204E4A] transition-colors hover:bg-[#E1E53F]/35 focus-visible:bg-[#E1E53F]/35"
                  >
                    {lang === 'es' ? 'Reglas de uso' : 'Community rules'}
                  </button>
                  <PazoInstallControl lang={lang} />
                  <button type="button" onClick={() => {setShowSettings(false);canManagePet?setShowSupportRequest(true):onRequireAccount()}}
                   className="min-h-11 w-full rounded-2xl bg-[#EFF4E8] px-3 py-3 text-left text-xs font-bold text-[#204E4A] hover:bg-[#E1E53F]/35 focus-visible:bg-[#E1E53F]/45">
                   {lang==='es'?'Ayuda, consultas y sugerencias':'Help, questions and suggestions'}
                  </button>
              <div className="mt-2 rounded-2xl bg-[#F0F3ED]/85 p-3">
                <h4 className="text-sm font-extrabold text-[#204E4A]">
                  {lang==='es'?'Cuenta y datos':'Account and data'}
                </h4>
                <p className="mt-1 text-xs text-[#5C7470]">
                  {requestEnabled
                    ?(lang==='es'?'Puedes solicitar revisión para eliminar tu cuenta. El envío no provoca eliminación inmediata.':'You can request account deletion review. Submitting does not immediately delete your account.')
                    :(lang==='es'?'Las solicitudes de eliminación se habilitarán cuando termine la verificación del servicio.':'Deletion requests will be available after service verification.')}
                </p>
                <button type="button" disabled={!requestEnabled}
                  onClick={() => { setShowSettings(false); canManagePet ? setShowDeletionRequest(true) : onRequireAccount() }}
                  className="mt-3 w-full rounded-2xl bg-[#204E4A]/10 px-3 py-3 text-left text-xs font-bold text-[#204E4A] transition-colors disabled:opacity-40 focus-visible:bg-[#E1E53F]">
                  {lang==='es'?'Solicitar eliminación de cuenta':'Request account deletion'}
                </button>
                <a href={PAZO_PRIVACY_SUPPORT_MAILTO} className="mt-3 block break-all rounded-xl py-2 text-xs font-bold text-[#204E4A] underline focus-visible:bg-[#E1E53F]/35">
                  {lang === 'es' ? 'Soporte y privacidad: ' : 'Support and privacy: '}{PAZO_PRIVACY_SUPPORT_EMAIL}
                </a>
              </div>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-full bg-red-50 hover:bg-red-100 focus-visible:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
              title={isDemo ? (lang === 'es' ? 'Salir de demo' : 'Exit demo') : (lang === 'es' ? 'Cerrar sesión' : 'Log out')}
              aria-label={isDemo ? (lang === 'es' ? 'Salir de demo' : 'Exit demo') : (lang === 'es' ? 'Cerrar sesión' : 'Log out')}
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
        <div className="p-3 pazo-glass-card rounded-[2rem] shadow-lg space-y-2 animate-slide-up">
          <div className="flex justify-between items-center px-2">
            <span className="text-[13px] font-extrabold uppercase text-[#5C7470] tracking-wider">
              {isDemo
                ? (lang === 'es' ? 'Mascotas de ejemplo' : 'Sample pets')
                : (lang === 'es' ? 'Tus mascotas registradas' : 'Your registered pets')}
            </span>
            <button
              onClick={onAddPet}
              className="text-[14px] font-extrabold text-[#204E4A] hover:underline cursor-pointer"
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
                    className={`text-[13px] ${currentPet.id === p.id ? 'text-white/70' : 'text-[#5C7470]'
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

      <div className="p-5 pazo-glass-card rounded-[2.2rem] shadow-[0_4px_20px_rgba(32,78,74,0.05)] overflow-hidden relative">
        {!isEditing && (
          <button
            onClick={handleEditClick}
            className="absolute top-4 right-4 text-[13px] font-bold text-[#204E4A] bg-[#FAF8F5] hover:bg-[#E1E53F] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
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
                <span className="text-white text-[13px] font-bold text-center leading-tight">
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
                  <label className="text-[13px] font-bold text-[#5C7470] block mb-0.5">Nombre de la mascota</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] font-bold focus:outline-none focus:border-[#E1E53F]"
                  />
                </div>

                <div>
                  <label htmlFor="pazo-pet-bio" className="mb-1 block text-[13px] font-bold text-[#5C7470]">
                    {lang === 'es' ? 'Biografía corta (opcional)' : 'Short bio (optional)'}
                  </label>
                  <textarea id="pazo-pet-bio" rows={2} maxLength={240} value={editForm.bio}
                    onChange={(event) => setEditForm({ ...editForm, bio: event.target.value })}
                    placeholder={lang === 'es' ? '¿Qué hace especial a tu mascota?' : 'What makes your pet special?'}
                    className="w-full resize-y rounded-xl bg-[#FAF8F5] px-3 py-2 text-[13px] leading-relaxed text-[#204E4A]" />
                  <p className="text-[11px] leading-snug text-[#5C7470]">
                    {lang === 'es' ? 'Aparecerá en el perfil público solo si la completas.' : 'Shown on the public profile only if you fill it in.'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[13px] font-bold text-[#5C7470] block mb-0.5">Raza</label>
                    <input
                      type="text"
                      value={editForm.breed}
                      onChange={(e) => setEditForm({ ...editForm, breed: e.target.value })}
                      placeholder={lang === 'es' ? 'Opcional' : 'Optional'}
                      className="w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] focus:outline-none focus:border-[#E1E53F]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[13px] font-bold text-[#5C7470] block mb-0.5">Género</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] focus:outline-none focus:border-[#E1E53F]"
                    >
                      <option value="">{lang === 'es' ? 'Sin especificar' : 'Not specified'}</option>
                      <option value="macho">{lang === 'es' ? 'Macho' : 'Male'}</option>
                      <option value="hembra">{lang === 'es' ? 'Hembra' : 'Female'}</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[13px] font-bold text-[#5C7470] block mb-0.5">Peso · privado</label>
                    <input
                      type="text"
                      value={editForm.weight}
                      onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                      className="w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] focus:outline-none focus:border-[#E1E53F]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[13px] font-bold text-[#5C7470] block mb-0.5">Edad</label>
                    <input
                      type="text"
                      value={editForm.age}
                      onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                      className="w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] focus:outline-none focus:border-[#E1E53F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[13px] font-bold text-[#5C7470] block mb-0.5">Dieta / Plan · privado</label>
                  <input
                    type="text"
                    value={editForm.dietPlan}
                    onChange={(e) => setEditForm({ ...editForm, dietPlan: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] focus:outline-none focus:border-[#E1E53F]"
                  />
                </div>

                <div>
                  <label className="text-[13px] font-bold text-[#5C7470] block mb-0.5">Zona aproximada · privada</label>
                  <input
                    type="text"
                    value={editForm.zone}
                    onChange={(e) => setEditForm({ ...editForm, zone: e.target.value })}
                    placeholder={lang === 'es' ? 'Ciudad o zona general' : 'City or general area'}
                    className="w-full bg-[#FAF8F5] border border-[#204E4A]/10 rounded-xl px-3 py-1.5 text-xs text-[#204E4A] focus:outline-none focus:border-[#E1E53F]"
                  />
                </div>

                <div>
                  <label className="text-[13px] font-bold text-[#5C7470] block mb-1">Intereses · privados</label>
                  <div className="flex flex-wrap gap-1.5">
                    {interestOptions.map((interest) => {
                      const selected = editForm.interests.includes(interest)
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleEditInterest(interest)}
                          className={`text-[12px] font-bold px-2.5 py-1.5 rounded-full transition-colors cursor-pointer ${selected
                            ? 'bg-[#204E4A] text-[#E1E53F]'
                            : 'bg-[#FAF8F5] text-[#5C7470]'
                            }`}
                        >
                          {interest}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full bg-[#204E4A] disabled:opacity-60 text-white font-bold text-xs py-2.5 rounded-xl mt-2 flex items-center justify-center cursor-pointer"
                >
                  {isSaving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : (lang === 'es' ? 'Guardar Cambios' : 'Save Changes')}
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1.5 pr-16">
                  <h3 className="text-lg font-black text-[#204E4A] truncate">{currentPet.name}</h3>
                  <span className="text-[13px] font-bold px-2 py-0.5 bg-[#E1E53F] text-[#204E4A] rounded-full shrink-0 shadow-xs">
                    {petSpeciesLabel(currentPet.species,lang)}
                  </span>
                </div>
                <p className="text-xs text-[#5C7470] mt-0.5">{currentPet.bio}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[17px] font-bold text-[#204E4A]">
                  {currentPet.weight && (
                    <span className="flex items-center gap-1 rounded-full bg-white/65 px-3 py-1.5 shadow-xs">{currentPet.weight}</span>
                  )}
                  {currentPet.dietPlan && (
                    <span className="flex items-center gap-1 rounded-full bg-white/65 px-3 py-1.5 shadow-xs">
                      <IconBowl size={16} />
                      <span className="max-w-[180px] break-words">{currentPet.dietPlan}</span>
                    </span>
                  )}
                  {!currentPet.weight && !currentPet.dietPlan && (
                    <p className="text-[16px] font-medium text-[#5C7470]">
                      {lang === 'es' ? 'Datos adicionales sin registrar' : 'Additional details not provided'}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {!isEditing && (
        <LiquidChoiceTabs
          variant="pet"
          active={activeTab}
          onChange={setActiveTab}
          accessibleLabel={lang === 'es' ? 'Secciones de mi mascota' : 'My pet sections'}
          choices={[
            {id: 'menu', label: lang === 'es' ? 'Menú y Utilidades' : 'Menu & Utilities'},
            {id: 'myposts', label: lang === 'es' ? `Mis Publicaciones (${userPosts.length})` : `My Posts (${userPosts.length})`},
          ]}
        />
      )}

      {!isEditing && activeTab === 'myposts' ? (
        <div className="space-y-3 animate-fade-in">
          {userPosts.length === 0 ? (
            <div className="pazo-glass-card rounded-[2rem] p-8 text-center border border-[#204E4A]/10 shadow-xs">
              <p className="text-xs text-[#5C7470] font-medium">
                {lang === 'es'
                  ? `Aún no has compartido historias de ${currentPet.name}.`
                  : `You haven't shared any stories for ${currentPet.name} yet.`}
              </p>
            </div>
          ) : (
            userPosts.map((post) => (
              <div key={post.id} className="pazo-glass-card rounded-[2rem] p-4 shadow-xs border border-[#204E4A]/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#5C7470] font-bold">{post.timeAgo}</span>
                  <span className="inline-flex items-center gap-1 text-[13px] bg-[#E1E53F]/40 text-[#204E4A] px-2 py-0.5 rounded-full font-bold"><PazoMotifIcon kind="like" size={12} />{post.likes}</span>
                </div>
                <p className="text-xs text-[#204E4A] font-medium">
                  {post.text}
                  {DEMO_POST_MOTIFS[post.id] && (
                    <span className="ml-1 inline-flex items-center gap-0.5 align-middle" aria-hidden="true">
                      {DEMO_POST_MOTIFS[post.id].map((kind, index) => (
                        <PazoMotifIcon key={`${kind}-${index}`} kind={kind} size={15} />
                      ))}
                    </span>
                  )}
                </p>
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
          {firstUseIntent&&onExploreFirstUse?<FirstUsePrompt petName={currentPet.name} intent={firstUseIntent} lang={lang} onExplore={onExploreFirstUse}/>:<h3 className="font-extrabold text-sm text-[#204E4A] px-1">
            {lang === 'es' ? `Todo sobre ${currentPet.name}` : `All about ${currentPet.name}`}
          </h3>}
          <ModerationAccess enabled={canModerate} lang={lang} />
          <button type="button" ref={firstQrButtonRef}
            onClick={onOpenQRPassport}
            className="w-full text-left p-4 bg-white hover:bg-neutral-50 rounded-[2rem] shadow-[0_4px_16px_rgba(32,78,74,0.04)] flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-2xl bg-[#E1E53F]/40 text-[#204E4A] flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform shadow-xs">
                <IconPaw size={22} />
              </span>
              <span>
                <span className="block font-extrabold text-sm text-[#204E4A]">
                  {lang === 'es' ? 'Pasaporte y QR' : 'Passport & QR'}
                </span>
                <span className="block text-xs text-[#5C7470]">
                  {lang === 'es'
                    ? 'Identidad que puedes compartir públicamente'
                    : 'Public profile you can share'}
                </span>
              </span>
            </span>
            <span className="text-lg text-[#5C7470] group-hover:translate-x-1 transition-transform font-bold">
              ›
            </span>
          </button>

          <button type="button" ref={firstCareButtonRef}
            onClick={onOpenCareAgenda}
            className="w-full text-left p-4 bg-white hover:bg-neutral-50 rounded-[2rem] shadow-[0_4px_16px_rgba(32,78,74,0.04)] flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-2xl bg-[#204E4A]/10 text-[#204E4A] flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform shadow-xs">
                <IconCalendar size={22} />
              </span>
              <span>
                <span className="block font-extrabold text-sm text-[#204E4A]">
                  {lang === 'es' ? 'Cuidados y Agenda' : 'Care & Agenda'}
                </span>
                <span className="block text-xs text-[#5C7470]">
                  {lang === 'es'
                    ? `${careItems.length} cuidados agendados`
                    : `${careItems.length} scheduled care items`}
                </span>
              </span>
            </span>
            <span className="text-lg text-[#5C7470] group-hover:translate-x-1 transition-transform font-bold">
              ›
            </span>
          </button>

          <div
            onClick={onOpenDocuments}
            className="p-4 bg-white hover:bg-neutral-50 rounded-[2rem] shadow-[0_4px_16px_rgba(32,78,74,0.04)] flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E1E53F]/30 text-[#204E4A] flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform shadow-xs">
                <IconDocument size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#204E4A]">
                  {lang === 'es' ? 'Documentos privados' : 'Private documents'}
                </h4>
                <p className="text-xs text-[#5C7470]">
                  {lang === 'es'
                    ? `${documentCount} documentos guardados`
                    : `${documentCount} saved documents`}
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
                <span className="text-[13px] font-extrabold uppercase text-[#EC7357] tracking-wider block">
                  {lang === 'es' ? 'Próximo cuidado' : 'Next upcoming task'}
                </span>
                <span className="font-bold text-xs text-[#204E4A] block">
                  {nextPendingCare.title}
                </span>
                <span className="text-[14px] text-[#5C7470] block">
                  {nextPendingCare.dueDate}
                  {nextPendingCare.dueTime ? ` • ${nextPendingCare.dueTime}` : ''}
                </span>
              </div>

              <button
                onClick={() => void handleCompleteReminderCare(nextPendingCare)}
                disabled={completingCareId === nextPendingCare.id}
                className="text-xs font-bold text-[#204E4A] bg-white hover:bg-[#E1E53F] px-4 py-2 rounded-full transition-all cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
              >
                <IconCheck size={13} />
                <span>
                  {completingCareId === nextPendingCare.id
                    ? (lang === 'es' ? 'Completando…' : 'Completing…')
                    : (lang === 'es' ? 'Completar' : 'Done')}
                </span>
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
            <p className="text-[14px] text-center text-[#5C7470] mt-1.5">
              {lang === 'es'
                ? 'Emite una búsqueda comunitaria protegida'
                : 'Broadcasts a protected community alert'}
            </p>
          </div>
          {canManagePet && <SupporterProfileEntry status={supporterStatus} lang={lang} buttonRef={supporterAccountEntryRef} onClick={() => setShowSupporterAccount(true)}/>}
        </div>
      )}
      {showSupporterAccount && (
        <SupporterAccountManagement pet={currentPet} lang={lang} onClose={() => {
          setShowSupporterAccount(false)
          supporterAccountEntryRef.current?.focus()
        }} />
      )}
      {canManagePet && invitationPreviewRequested && !dismissedInvitationPreview &&
        !showSupporterAccount && supporterStatus.kind === 'inactive' && (
          <SupporterInvitationPrompt lang={lang} previewOnly
            onExplore={() => { setDismissedInvitationPreview(true); setShowSupporterAccount(true) }}
            onDismiss={() => setDismissedInvitationPreview(true)}
          />
        )}
      {legalKind && <LegalPreviewDialog kind={legalKind} lang={lang} onClose={() => setLegalKind(null)} />}
      {showDeletionRequest && <DeletionRequestDialog lang={lang} onClose={() => setShowDeletionRequest(false)} />}
      {showSupportRequest && <SupportRequestDialog lang={lang} onClose={() => setShowSupportRequest(false)} />}
    </div>
  )
}
