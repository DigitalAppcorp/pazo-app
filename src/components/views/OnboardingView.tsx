import { PazoMotifIcon } from '../icons/PazoMotifIcons'
import { useState, useEffect } from 'react'
import type { Species, Pet } from '../../types/pazo'
import { IconCat, IconDog, IconRabbit, IconBird, IconPaw } from '../icons/PazoIcons'
import { useAuth } from '../../context/AuthContext'
import { createPetProfile } from '../../services/petService'
import { isValidPazoPassword } from '../../features/auth/recoveryFlow'
import { pazoBuildVersion } from '../../features/release/buildVersion'
import { LegalPreviewDialog } from '../../features/legal/LegalPreviewDialog'
import type { LegalKind } from '../../features/legal/legalCopy'

interface OnboardingViewProps {
  initialStep?: 'A01' | 'A02' | 'A03' | 'A04'
  onComplete: (createdPet: Pet) => void
  onSkipToLogin: () => void
  onQuickDemo: () => void
  lang: 'es' | 'en'
  onToggleLang: () => void
}

export const OnboardingView = ({
  initialStep = 'A01',
  onComplete,
  onSkipToLogin,
  onQuickDemo,
  lang,
  onToggleLang,
}: OnboardingViewProps) => {
  const [step, setStep] = useState<'A01' | 'A02' | 'A03' | 'A04'>(initialStep)
  const [legalKind, setLegalKind] = useState<LegalKind | null>(null)

  // Sincroniza el paso si cambia desde App.tsx (Vital para el redireccionamiento)
  useEffect(() => {
    if (initialStep) {
      setStep(initialStep)
    }
  }, [initialStep])

  // Datos del flujo de onboarding
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isOver18, setIsOver18] = useState(false)

  const { signUp, user } = useAuth()
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false)

  const [petName, setPetName] = useState('')
  const [petSpecies, setPetSpecies] = useState<Species>('gato')
  const [petAge, setPetAge] = useState('')
  const [petPhoto, setPetPhoto] = useState('')
  const [petPhotoFile, setPetPhotoFile] = useState<File | null>(null)
  const [isSubmittingPet, setIsSubmittingPet] = useState(false)

  const handleGalleryPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setPetPhotoFile(file)
    setPetPhoto(URL.createObjectURL(file))
  }

  const [zone, setZone] = useState('Los Ángeles')
  const [interests, setInterests] = useState<string[]>([
    'Comunidades de gatos',
    'Lugares aptos para mascotas',
  ])

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    )
  }

  const handleSignUp = async () => {
    if (isSigningUp || awaitingEmailConfirmation) return
    if (!email || !password) {
      alert(lang === 'es' ? 'Por favor ingresa un correo y contraseña.' : 'Please enter an email and password.')
      return
    }
    if (!isOver18) {
      alert(lang === 'es' ? 'Debes confirmar que eres mayor de edad.' : 'You must confirm that you are 18 or older.')
      return
    }

    if (!isValidPazoPassword(password)) {
      alert(
        lang === 'es'
          ? 'Usa al menos 8 caracteres, una mayúscula, una minúscula y un número.'
          : 'Use at least 8 characters, one uppercase letter, one lowercase letter, and one number.'
      )
      return
    }

    setIsSigningUp(true)
    try {
      const outcome = await signUp(email.trim(), password)
      if (outcome === 'authenticated') {
        setPassword('')
        setStep('A03')
      } else if (outcome === 'verify_email') {
        setPassword('')
        setAwaitingEmailConfirmation(true)
      }
    } catch {
      alert(lang === 'es'
        ? 'No hay conexión. Inténtalo nuevamente.'
        : 'Connection error. Please try again.')
    } finally {
      setIsSigningUp(false)
    }
  }

  const handleFinishOnboarding = async () => {
    if (isSubmittingPet) return

    const normalizedName = petName.trim()
    if (!normalizedName) {
      alert(lang === 'es' ? 'Escribe el nombre de tu mascota.' : 'Enter your pet\'s name.')
      return
    }

    setIsSubmittingPet(true)

    try {
      const createdPet = await createPetProfile({
        name: normalizedName,
        species: petSpecies,
        age: petAge,
        photoUrl: petPhotoFile ? petPhoto : undefined,
        photoFile: petPhotoFile,
        zone,
        interests,
      })

      onComplete(createdPet)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(
        lang === 'es'
          ? `Hubo un problema al guardar tu mascota: ${message}`
          : `There was a problem saving your pet: ${message}`
      )
    } finally {
      setIsSubmittingPet(false)
    }
  }

  return (
    <div className="flex flex-col h-full justify-between p-6 sm:p-7 bg-[#FAF8F5] relative overflow-hidden">
      {/* Fondo orgánico sutil */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#E1E53F]/35 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 -left-28 w-60 h-60 bg-[#204E4A]/5 rounded-full blur-2xl pointer-events-none"></div>

      {step === 'A01' && (
        /* ================= A01 / BIENVENIDA ================= */
        <div className="flex flex-col h-full justify-between relative z-10 animate-slide-up">
          <header className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <span className="font-black text-2xl tracking-tighter text-[#204E4A]">pazo.</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#E1E53F] animate-pulse-soft"></span>
            </div>
            <button
              onClick={onToggleLang}
              className="text-[14px] font-extrabold tracking-widest px-3 py-1.5 rounded-full bg-white text-[#204E4A] cursor-pointer soft-button"
            >
              {lang === 'es' ? 'ES ▾' : 'EN ▾'}
            </button>
          </header>

          <div className="my-auto py-3 space-y-4">
            <div className="relative">
              <div className="w-full h-64 rounded-[2.2rem] overflow-hidden shadow-[0_12px_32px_rgba(32,78,74,0.12)] soft-card">
                <img
                  src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=900&auto=format&fit=crop"
                  alt={lang === 'es' ? "Mascotas felices" : "Happy pets"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#204E4A]/45 via-transparent to-transparent"></div>
                <div className="absolute bottom-3.5 left-3.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[14px] font-bold text-[#204E4A]">{lang === 'es' ? "Los Ángeles • Comunidad Abierta" : "Los Angeles • Open community"}</span>
                </div>
              </div>

            </div>

            <div className="space-y-1.5 text-left">
              <h1 className="text-[37px] sm:text-[41px] font-black leading-[1.08] tracking-tight text-[#204E4A]">
                {lang === 'es' ? "Su mundo, más cerca." : "Their world, closer."}
              </h1>
              <p className="text-[16px] leading-relaxed text-[#5C7470]">
                {lang === 'es' ? "Comparte su vida. Encuentra tu comunidad. Cuida lo que más quieres." : "Share their life. Find your community. Care for those you love."}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pb-2">
            <button
              onClick={() => setStep('A02')}
              className="w-full bg-[#E1E53F] hover:bg-[#d8dc35] text-[#204E4A] font-extrabold text-[18px] py-4 rounded-full shadow-[0_8px_25px_rgba(225,229,63,0.38)] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{lang === 'es' ? "Comenzar" : "Get started"}</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={onSkipToLogin}
                className="flex-1 bg-white hover:bg-neutral-50 text-[#204E4A] font-bold text-[18px] py-4 rounded-full shadow-sm transition-all cursor-pointer soft-button"
              >
                {lang === 'es' ? "Ya tengo una cuenta" : "I already have an account"}
              </button>
              <button
                onClick={onQuickDemo}
                className="px-4 bg-[#204E4A]/5 hover:bg-[#204E4A]/10 text-[#204E4A] font-bold text-xs py-3 rounded-full transition-all cursor-pointer"
              >
                Demo
              </button>
            </div>
            <p aria-label={lang === 'es' ? "Versión de PAZO" : "PAZO version"} className="pt-1 text-center text-[13px] font-medium tracking-[0.05em] tabular-nums text-[#5C7470]/65">
              {lang === 'es' ? 'Versión' : 'Version'} {pazoBuildVersion}
            </p>
          </div>
        </div>
      )}

      {step === 'A02' && (
        /* ================= A02 / REGISTRO ================= */
        <div className="flex flex-col h-full justify-between relative z-10 animate-slide-up">
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep('A01')}
              className="text-xs font-bold text-[#204E4A] bg-white px-3 py-1.5 rounded-full cursor-pointer soft-button"
            >
              {lang === 'es' ? "← Volver" : "← Back"}
            </button>
            <span className="text-[13px] font-bold text-[#5C7470]">{lang === 'es' ? "Paso 1 de 3" : "Step 1 of 3"}</span>
          </div>

          <div className="my-auto space-y-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-[#204E4A]">{lang === 'es' ? "Comencemos." : "Let’s get started."}</h2>
              <p className="text-xs text-[#5C7470]">
                {lang === 'es' ? "Una persona responsable, todas sus mascotas." : "One responsible person, all their pets."}
              </p>
            </div>

            {awaitingEmailConfirmation ? (
              <div role="status" className="p-4 pazo-glass-card border border-[#204E4A]/15 rounded-2xl text-[#204E4A] space-y-3">
                <h3 className="font-extrabold text-base">
                  {lang === 'es' ? 'Revisa tu correo' : 'Check your email'}
                </h3>
                <p className="text-xs text-[#5C7470] leading-relaxed">
                  {lang === 'es'
                    ? 'Si tu dirección puede registrarse, recibirás un enlace de confirmación. Confirma tu correo y después inicia sesión para agregar tu mascota.'
                    : 'If your address can be registered, you will receive a confirmation link. Confirm your email, then sign in to add your pet.'}
                </p>
                <button type="button" onClick={onSkipToLogin}
                  className="w-full bg-[#204E4A] text-white rounded-full py-3 text-xs font-extrabold cursor-pointer">
                  {lang === 'es' ? 'Ya confirmé: iniciar sesión' : 'Confirmed: sign in'}
                </button>
                <button type="button" onClick={() => setAwaitingEmailConfirmation(false)}
                  className="w-full text-xs font-bold text-[#5C7470] underline cursor-pointer">
                  {lang === 'es' ? 'Usar otro correo' : 'Use another email'}
                </button>
              </div>
            ) : (
            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="block text-[14px] font-bold text-[#204E4A] mb-1">{lang === 'es' ? "Correo electrónico" : "Email"}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={lang === 'es' ? "tu@correo.com" : "you@example.com"}
                  className="w-full bg-white rounded-2xl px-3.5 py-3 text-xs text-[#204E4A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[14px] font-bold text-[#204E4A] mb-1">{lang === 'es' ? "Contraseña" : "Password"}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full bg-white rounded-2xl px-3.5 py-3 text-xs text-[#204E4A] focus:outline-none"
                />
                <span className="block text-[13px] text-[#5C7470] mt-1">
                  {lang === 'es'
                    ? 'Mínimo 8 caracteres, con mayúscula, minúscula y número.'
                    : 'At least 8 characters with uppercase, lowercase, and a number.'}
                </span>
              </div>

              <label className="flex items-center gap-2 pt-1 text-[#5C7470] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOver18}
                  onChange={(e) => setIsOver18(e.target.checked)}
                  className="rounded text-[#204E4A]"
                />
                <span className="text-[14px]">
                  {lang === 'es'
                    ? 'Confirmo que tengo 18 años o más.'
                    : 'I confirm that I am 18 or older.'}
                </span>
              </label>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[14px]">
                <button type="button" onClick={() => setLegalKind('privacy')}
                  className="font-semibold text-[#204E4A] underline underline-offset-2 focus-visible:bg-[#E1E53F]">
                  {lang === 'es' ? 'Política de privacidad' : 'Privacy policy'}
                </button>
                <button type="button" onClick={() => setLegalKind('terms')}
                  className="font-semibold text-[#204E4A] underline underline-offset-2 focus-visible:bg-[#E1E53F]">
                  {lang === 'es' ? 'Términos de uso' : 'Terms of use'}
                </button>
              </div>

              <button
                onClick={handleSignUp}
                disabled={isSigningUp}
                className="w-full disabled:opacity-60 bg-[#204E4A] hover:bg-[#183d3a] text-white font-extrabold py-3.5 rounded-full text-xs shadow-md transition-all cursor-pointer mt-2"
              >
                {isSigningUp
                  ? (lang === 'es' ? 'Creando cuenta...' : 'Creating account...')
                  : (lang === 'es' ? 'Crear cuenta' : 'Create account')}
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled
                  className="flex-1 py-2 rounded-xl bg-white/70 font-semibold text-[14px] text-[#5C7470] cursor-not-allowed opacity-70"
                >
                  Google · {lang === 'es' ? 'próximamente' : 'coming soon'}
                </button>
                <button
                  type="button"
                  disabled
                  className="flex-1 py-2 rounded-xl bg-white/70 font-semibold text-[14px] text-[#5C7470] cursor-not-allowed opacity-70"
                >
                  Apple · {lang === 'es' ? 'próximamente' : 'coming soon'}
                </button>
              </div>
            </div>
            )}
          </div>

          <div className="text-center pb-2">
            <button
              onClick={onSkipToLogin}
              className="text-xs font-semibold text-[#5C7470] hover:text-[#204E4A] cursor-pointer"
            >
              {lang === 'es' ? "¿Ya tienes cuenta? Iniciar sesión" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      )}

      {step === 'A03' && (
        /* ================= A03 / CREAR MASCOTA ================= */
        <div className="flex flex-col h-full justify-between relative z-10 animate-slide-up">
          <div className="flex items-center justify-between pt-2">
            {user ? (
              <span role="status" className="text-xs font-bold text-[#204E4A] bg-white px-3 py-1.5 rounded-full">
                {lang === 'es' ? 'Sesión recuperada' : 'Session restored'}
              </span>
            ) : (
              <button
                onClick={() => setStep('A02')}
                className="text-xs font-bold text-[#204E4A] bg-white px-3 py-1.5 rounded-full cursor-pointer soft-button"
              >
                {lang === 'es' ? "← Volver" : "← Back"}
              </button>
            )}
            <span className="text-[13px] font-bold text-[#5C7470]">{lang === 'es' ? "Paso 2 de 3" : "Step 2 of 3"}</span>
          </div>

          <div className="my-auto min-h-0 space-y-4 overflow-y-auto py-2">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-[#204E4A]">{lang === 'es' ? "¿Quién te acompaña?" : "Who is by your side?"}</h2>
              <p className="text-xs text-[#5C7470]">
                {lang === 'es' ? "Añade cualquier especie. La app se adapta con cariño." : "Add your pet. Choose their species below."}
              </p>
            </div>

            {/* Avatar selector conectado a la galería */}
            <div className="flex items-center gap-3 p-3 pazo-glass-card rounded-2xl soft-card">
              {petPhoto ? (
                <img src={petPhoto} alt={lang === 'es' ? "Foto elegida para tu mascota" : "Selected pet photo"} className="w-14 h-14 rounded-2xl object-cover shrink-0" />
              ) : (
                <div aria-hidden="true" className="w-14 h-14 rounded-2xl bg-[#FAF8F5] flex items-center justify-center shrink-0 text-[#204E4A]">
                  <IconPaw size={24} />
                </div>
              )}
              <div className="flex-1">
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#204E4A] bg-[#FAF8F5] px-3.5 py-2 rounded-full cursor-pointer soft-button hover:bg-[#204E4A]/5 transition-colors">
                  <span className="inline-flex items-center gap-1.5"><PazoMotifIcon kind="camera" size={17} />{lang === 'es' ? 'Cambiar fotografía' : 'Change photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleGalleryPhotoChange}
                    className="hidden"
                  />
                </label>
                <span className="block text-[13px] text-[#5C7470] mt-1">{lang === 'es' ? "Sube una foto desde tu galería" : "Upload a photo from your gallery"}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[14px] font-bold text-[#204E4A] mb-1">{lang === 'es' ? "Nombre" : "Name"}</label>
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder={lang === 'es' ? "Ej: Luna, Bruno, Nube..." : "E.g. Luna, Bruno, Cloud..."}
                  className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs text-[#204E4A]"
                />
              </div>

              <div>
                <label className="block text-[14px] font-bold text-[#204E4A] mb-1">{lang === 'es' ? "Especie" : "Species"}</label>
                <div role="group" aria-label={lang === 'es' ? 'Seleccionar especie' : 'Select species'} className="grid grid-cols-4 gap-2">
                  {(['gato', 'perro', 'conejo', 'ave'] as Species[]).map((sp) => {
                    const isSelected = petSpecies === sp
                    const name = sp === 'gato'
                      ? (lang === 'es' ? 'Gato' : 'Cat')
                      : sp === 'perro'
                        ? (lang === 'es' ? 'Perro' : 'Dog')
                        : sp === 'conejo'
                          ? (lang === 'es' ? 'Conejo' : 'Rabbit')
                          : (lang === 'es' ? 'Ave' : 'Bird')
                    return (
                      <button
                        key={sp}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={name}
                        onClick={() => setPetSpecies(sp)}
                        className={`flex h-[74px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[18px] px-1.5 py-2 text-center transition-colors duration-200 ${isSelected
                          ? 'bg-[#204E4A] text-[#E1E53F] shadow-[0_5px_15px_rgba(32,78,74,0.15)]'
                          : 'bg-white/80 text-[#5C7470] shadow-[0_3px_12px_rgba(32,78,74,0.05)] backdrop-blur-md hover:bg-white'}`}
                      >
                        <span aria-hidden="true" className="flex h-[24px] items-center justify-center">
                          {sp === 'gato' ? <IconCat size={23} /> : sp === 'perro' ? <IconDog size={23} /> : sp === 'conejo' ? <IconRabbit size={23} /> : <IconBird size={23} />}
                        </span>
                        <span className="block w-full truncate text-[12px] font-extrabold leading-tight">{name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-[#204E4A] mb-1">{lang === 'es' ? "Edad aproximada" : "Approximate age"}</label>
                <input
                  type="text"
                  value={petAge}
                  onChange={(e) => setPetAge(e.target.value)}
                  placeholder={lang === 'es' ? "Ej: 3 años o fecha estimada" : "E.g. 3 years or estimated date"}
                  className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs text-[#204E4A]"
                />
              </div>

              <p className="text-[13px] text-[#5C7470]">{lang === 'es' ? "Raza y datos médicos se pueden añadir después." : "Breed and medical details can be added later."}</p>
              <aside aria-label={lang === 'es' ? 'Aviso de privacidad' : 'Privacy notice'} className="px-1 text-[12px] leading-relaxed text-[#71847F]">
                <span>
                  {lang === 'es'
                    ? 'El nombre, especie y foto de tu mascota pueden ser públicos. Evita incluir datos personales. '
                    : "Your pet's name, species and photo may be public. Avoid including personal information. "}
                </span>
                <button type="button" onClick={() => setLegalKind('privacy')} className="inline text-[12px] font-semibold text-[#204E4A] underline underline-offset-2">
                  {lang === 'es' ? 'Ver privacidad' : 'Privacy details'}
                </button>
              </aside>
            </div>
          </div>

          <div className="pb-2">
            <button
              onClick={() => setStep('A04')}
              className="w-full bg-[#E1E53F] hover:bg-[#d8dc35] text-[#204E4A] font-extrabold py-3.5 rounded-full text-xs shadow-md cursor-pointer transition-all"
            >
              {lang === 'es' ? "Continuar" : "Continue"}
            </button>
          </div>
        </div>
      )}

      {step === 'A04' && (
        /* ================= A04 / ZONA E INTERESES ================= */
        <div className="flex flex-col h-full justify-between relative z-10 animate-slide-up">
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep('A03')}
              className="text-xs font-bold text-[#204E4A] bg-white px-3 py-1.5 rounded-full cursor-pointer soft-button"
            >
              {lang === 'es' ? "← Volver" : "← Back"}
            </button>
            <span className="text-[13px] font-bold text-[#5C7470]">{lang === 'es' ? "Paso 3 de 3" : "Step 3 of 3"}</span>
          </div>

          <div className="my-auto space-y-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-[#204E4A]">{lang === 'es' ? "Cerca de ustedes." : "Close to you."}</h2>
              <p className="text-xs text-[#5C7470]">
                {lang === 'es' ? "Elige tu zona e intereses para empezar a explorar." : "Choose your area and interests to start exploring."}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[14px] font-bold text-[#204E4A] mb-1">{lang === 'es' ? "Zona aproximada" : "Approximate area"}</label>
                <input
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder={lang === 'es' ? "Los Ángeles" : "Los Angeles"}
                  className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs text-[#204E4A]"
                />
                <span className="text-[13px] text-[#5C7470] mt-0.5 block">{lang === 'es' ? "También puedes buscar sin GPS." : "You can also search without GPS."}</span>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-[#204E4A] mb-1.5">{lang === 'es' ? "¿Qué les interesa?" : "What interests you?"}</label>
                <div className="space-y-2">
                  {[
                    'Comunidades de gatos',
                    'Lugares aptos para mascotas',
                    'Actividades y encuentros',
                    'Nutrición y alimentación natural',
                  ].map((topic) => {
                    const selected = interests.includes(topic)
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleInterest(topic)}
                        className={`w-full p-3 rounded-2xl text-xs font-bold flex justify-between items-center transition-all cursor-pointer soft-button ${selected ? 'bg-[#204E4A] text-[#E1E53F]' : 'bg-white text-[#5C7470]'} `}
                      >
                        <span>{lang === 'es' ? topic : ({
                          'Comunidades de gatos': 'Cat communities',
                          'Lugares aptos para mascotas': 'Pet-friendly places',
                          'Actividades y encuentros': 'Activities and meetups',
                          'Nutrición y alimentación natural': 'Nutrition and natural food',
                        } as Record<string, string>)[topic]}</span>
                        <span>{selected ? '✓' : '+'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="pb-2 space-y-2">
            <button
              onClick={handleFinishOnboarding}
              disabled={isSubmittingPet}
              className="w-full bg-[#E1E53F] hover:bg-[#d8dc35] disabled:opacity-60 text-[#204E4A] font-extrabold py-4 rounded-full text-sm shadow-[0_8px_25px_rgba(225,229,63,0.38)] cursor-pointer transition-all"
            >
              {isSubmittingPet
                ? (lang === 'es' ? 'Guardando mascota...' : 'Saving pet...')
                : (lang === 'es' ? 'Crear perfil y entrar' : 'Create profile and enter')}
            </button>
            <p className="text-[13px] text-center text-[#5C7470]">
              {lang === 'es' ? "Podrás cambiar estos ajustes en cualquier momento desde tu perfil." : "You can change these settings anytime from your profile."}
            </p>
          </div>
        </div>
      )}
      {legalKind && <LegalPreviewDialog kind={legalKind} lang={lang} onClose={() => setLegalKind(null)} />}
    </div>
  )
}