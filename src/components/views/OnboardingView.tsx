import { useState, useEffect } from 'react'
import type { Species, Pet } from '../../types/pazo'
import { IconCat, IconDog, IconRabbit, IconBird } from '../icons/PazoIcons'
import { useAuth } from '../../context/AuthContext'
import { createPetProfile } from '../../services/petService'

interface OnboardingViewProps {
  initialStep?: 'A01' | 'A02' | 'A03' | 'A04' | 'A05'
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
  const [step, setStep] = useState<'A01' | 'A02' | 'A03' | 'A04' | 'A05'>(initialStep)

  // Sincroniza el paso si cambia desde App.tsx (Vital para el redireccionamiento)
  useEffect(() => {
    if (initialStep) {
      setStep(initialStep)
    }
  }, [initialStep])

  // Datos del flujo de onboarding
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isOver18, setIsOver18] = useState(true)

  const { signUp } = useAuth()

  const [petName, setPetName] = useState('Luna')
  const [petSpecies, setPetSpecies] = useState<Species>('gato')
  const [petAge, setPetAge] = useState('3 años')
  const [petPhoto, setPetPhoto] = useState(
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=600&auto=format&fit=crop'
  )
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
    if (!email || !password) {
      alert('Por favor ingresa un correo y contraseña.')
      return
    }
    if (!isOver18) {
      alert(lang === 'es' ? 'Debes confirmar que eres mayor de edad.' : 'You must confirm that you are 18 or older.')
      return
    }

    const hasStrongPassword =
      password.length >= 8
      && /[a-z]/.test(password)
      && /[A-Z]/.test(password)
      && /[0-9]/.test(password)

    if (!hasStrongPassword) {
      alert(
        lang === 'es'
          ? 'Usa al menos 8 caracteres, una mayúscula, una minúscula y un número.'
          : 'Use at least 8 characters, one uppercase letter, one lowercase letter, and one number.'
      )
      return
    }

    const success = await signUp(email.trim(), password)

    if (success) {
      setStep('A03')
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
        photoUrl: petPhoto,
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
              className="text-[11px] font-extrabold tracking-widest px-3 py-1.5 rounded-full bg-white text-[#204E4A] cursor-pointer soft-button"
            >
              {lang === 'es' ? 'ES ▾' : 'EN ▾'}
            </button>
          </header>

          <div className="my-auto py-3 space-y-4">
            <div className="relative">
              <div className="w-full h-64 rounded-[2.2rem] overflow-hidden shadow-[0_12px_32px_rgba(32,78,74,0.12)] soft-card">
                <img
                  src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=900&auto=format&fit=crop"
                  alt="Mascotas felices"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#204E4A]/45 via-transparent to-transparent"></div>
                <div className="absolute bottom-3.5 left-3.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] font-bold text-[#204E4A]">Los Ángeles • Comunidad Abierta</span>
                </div>
              </div>

              <div className="absolute -top-3 right-4 bg-[#E1E53F] text-[#204E4A] text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-[0_4px_14px_rgba(225,229,63,0.55)] soft-card animate-float">
                ★ Identidad, Comunidad y Cuidado
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <h1 className="text-[34px] sm:text-[38px] font-black leading-[1.08] tracking-tight text-[#204E4A]">
                Su mundo, más cerca.
              </h1>
              <p className="text-[13px] leading-relaxed text-[#5C7470]">
                Comparte su vida. Encuentra tu comunidad. Cuida lo que más quieres.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pb-2">
            <button
              onClick={() => setStep('A02')}
              className="w-full bg-[#E1E53F] hover:bg-[#d8dc35] text-[#204E4A] font-extrabold text-[15px] py-4 rounded-full shadow-[0_8px_25px_rgba(225,229,63,0.38)] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Comenzar</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={onSkipToLogin}
                className="flex-1 bg-white hover:bg-neutral-50 text-[#204E4A] font-bold text-[15px] py-4 rounded-full shadow-sm transition-all cursor-pointer soft-button"
              >
                Ya tengo una cuenta
              </button>
              <button
                onClick={onQuickDemo}
                className="px-4 bg-[#204E4A]/5 hover:bg-[#204E4A]/10 text-[#204E4A] font-bold text-xs py-3 rounded-full transition-all cursor-pointer"
              >
                Demo
              </button>
            </div>
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
              ← Volver
            </button>
            <span className="text-[10px] font-bold text-[#5C7470]">Paso 1 de 4</span>
          </div>

          <div className="my-auto space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full">
                Tu cuenta
              </span>
              <h2 className="text-3xl font-black text-[#204E4A]">Comencemos.</h2>
              <p className="text-xs text-[#5C7470]">
                Una persona responsable, todas sus mascotas.
              </p>
            </div>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#204E4A] mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full bg-white rounded-2xl px-3.5 py-3 text-xs text-[#204E4A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#204E4A] mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full bg-white rounded-2xl px-3.5 py-3 text-xs text-[#204E4A] focus:outline-none"
                />
                <span className="block text-[10px] text-[#5C7470] mt-1">
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
                <span className="text-[11px]">Tengo 18 años o más y acepto los términos y reglas.</span>
              </label>

              <button
                onClick={handleSignUp}
                className="w-full bg-[#204E4A] hover:bg-[#183d3a] text-white font-extrabold py-3.5 rounded-full text-xs shadow-md transition-all cursor-pointer mt-2"
              >
                Crear cuenta
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled
                  className="flex-1 py-2 rounded-xl bg-white/70 font-semibold text-[11px] text-[#5C7470] cursor-not-allowed opacity-70"
                >
                  Google · {lang === 'es' ? 'próximamente' : 'coming soon'}
                </button>
                <button
                  type="button"
                  disabled
                  className="flex-1 py-2 rounded-xl bg-white/70 font-semibold text-[11px] text-[#5C7470] cursor-not-allowed opacity-70"
                >
                  Apple · {lang === 'es' ? 'próximamente' : 'coming soon'}
                </button>
              </div>
            </div>
          </div>

          <div className="text-center pb-2">
            <button
              onClick={onSkipToLogin}
              className="text-xs font-semibold text-[#5C7470] hover:text-[#204E4A] cursor-pointer"
            >
              ¿Ya tienes cuenta? Iniciar sesión
            </button>
          </div>
        </div>
      )}

      {step === 'A03' && (
        /* ================= A03 / CREAR MASCOTA ================= */
        <div className="flex flex-col h-full justify-between relative z-10 animate-slide-up">
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep('A02')}
              className="text-xs font-bold text-[#204E4A] bg-white px-3 py-1.5 rounded-full cursor-pointer soft-button"
            >
              ← Volver
            </button>
            <span className="text-[10px] font-bold text-[#5C7470]">Paso 2 de 4</span>
          </div>

          <div className="my-auto space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full">
                Agregar mascota
              </span>
              <h2 className="text-3xl font-black text-[#204E4A]">¿Quién te acompaña?</h2>
              <p className="text-xs text-[#5C7470]">
                Añade cualquier especie. La app se adapta con cariño.
              </p>
            </div>

            {/* Avatar selector conectado a la galería */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl soft-card">
              <img
                src={petPhoto}
                alt="Foto"
                className="w-14 h-14 rounded-2xl object-cover shrink-0"
              />
              <div className="flex-1">
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#204E4A] bg-[#FAF8F5] px-3.5 py-2 rounded-full cursor-pointer soft-button hover:bg-[#204E4A]/5 transition-colors">
                  <span>📷 Cambiar fotografía</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleGalleryPhotoChange}
                    className="hidden"
                  />
                </label>
                <span className="block text-[10px] text-[#5C7470] mt-1">Sube una foto desde tu galería</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#204E4A] mb-1">Nombre</label>
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="Ej: Luna, Bruno, Nube..."
                  className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs text-[#204E4A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#204E4A] mb-1">Especie</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['gato', 'perro', 'conejo', 'ave'] as Species[]).map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setPetSpecies(sp)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer soft-button ${petSpecies === sp ? 'bg-[#204E4A] text-[#E1E53F]' : 'bg-white text-[#5C7470]'} `}
                    >
                      {sp === 'gato' ? <><IconCat className="w-4 h-4 mr-1" /> Gato</> : sp === 'perro' ? <><IconDog className="w-4 h-4 mr-1" /> Perro</> : sp === 'conejo' ? <><IconRabbit className="w-4 h-4 mr-1" /> Conejo</> : <><IconBird className="w-4 h-4 mr-1" /> Ave</>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#204E4A] mb-1">Edad aproximada</label>
                <input
                  type="text"
                  value={petAge}
                  onChange={(e) => setPetAge(e.target.value)}
                  placeholder="Ej: 3 años o fecha estimada"
                  className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs text-[#204E4A]"
                />
              </div>

              <p className="text-[10px] text-[#5C7470]">Raza y datos médicos se pueden añadir después.</p>
            </div>
          </div>

          <div className="pb-2">
            <button
              onClick={() => setStep('A04')}
              className="w-full bg-[#E1E53F] hover:bg-[#d8dc35] text-[#204E4A] font-extrabold py-3.5 rounded-full text-xs shadow-md cursor-pointer transition-all"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 'A04' && (
        /* ================= A04 / PRIVACIDAD INICIAL ================= */
        <div className="flex flex-col h-full justify-between relative z-10 animate-slide-up">
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep('A03')}
              className="text-xs font-bold text-[#204E4A] bg-white px-3 py-1.5 rounded-full cursor-pointer soft-button"
            >
              ← Volver
            </button>
            <span className="text-[10px] font-bold text-[#5C7470]">Paso 3 de 4</span>
          </div>

          <div className="my-auto space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full">
                Privacidad
              </span>
              <h2 className="text-3xl font-black text-[#204E4A]">Tú decides.</h2>
              <p className="text-xs text-[#5C7470]">
                Revisa qué se podrá ver antes de compartir su perfil público.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 bg-white rounded-2xl flex justify-between items-center soft-card">
                <div>
                  <span className="font-extrabold text-[#204E4A] block">Nombre y fotografía</span>
                  <span className="text-[10px] text-[#5C7470]">Visible para la comunidad</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Públicos
                </span>
              </div>

              <div className="p-3.5 bg-white rounded-2xl flex justify-between items-center soft-card">
                <div>
                  <span className="font-extrabold text-[#204E4A] block">Zona aproximada</span>
                  <span className="text-[10px] text-[#5C7470]">Sin dirección exacta</span>
                </div>
                <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                  {zone}
                </span>
              </div>

              <div className="p-3.5 bg-white rounded-2xl flex justify-between items-center soft-card">
                <div>
                  <span className="font-extrabold text-[#204E4A] block">Datos de contacto</span>
                  <span className="text-[10px] text-[#5C7470]">Teléfono y correo protegidos</span>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                  Privados 🔒
                </span>
              </div>

              <div className="p-3.5 bg-white rounded-2xl flex justify-between items-center soft-card">
                <div>
                  <span className="font-extrabold text-[#204E4A] block">Cuidados y documentos</span>
                  <span className="text-[10px] text-[#5C7470]">Solo visibles por el tutor</span>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                  Privados 🔒
                </span>
              </div>
            </div>
          </div>

          <div className="pb-2">
            <button
              onClick={() => setStep('A05')}
              className="w-full bg-[#E1E53F] hover:bg-[#d8dc35] text-[#204E4A] font-extrabold py-3.5 rounded-full text-xs shadow-md cursor-pointer transition-all"
            >
              Guardar y continuar
            </button>
          </div>
        </div>
      )}

      {step === 'A05' && (
        /* ================= A05 / ZONA E INTERESES ================= */
        <div className="flex flex-col h-full justify-between relative z-10 animate-slide-up">
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep('A04')}
              className="text-xs font-bold text-[#204E4A] bg-white px-3 py-1.5 rounded-full cursor-pointer soft-button"
            >
              ← Volver
            </button>
            <span className="text-[10px] font-bold text-[#5C7470]">Paso 4 de 4</span>
          </div>

          <div className="my-auto space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full">
                Tu comunidad
              </span>
              <h2 className="text-3xl font-black text-[#204E4A]">Cerca de ustedes.</h2>
              <p className="text-xs text-[#5C7470]">
                Elige tu zona e intereses para empezar a explorar.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#204E4A] mb-1">Zona aproximada</label>
                <input
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="Los Ángeles"
                  className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs text-[#204E4A]"
                />
                <span className="text-[10px] text-[#5C7470] mt-0.5 block">También puedes buscar sin GPS.</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#204E4A] mb-1.5">¿Qué les interesa?</label>
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
                        <span>{topic}</span>
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
                : (lang === 'es' ? 'Descubrir Pazo →' : 'Discover Pazo →')}
            </button>
            <p className="text-[10px] text-center text-[#5C7470]">
              Podrás cambiar estos ajustes en cualquier momento desde tu perfil.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}