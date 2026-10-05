import { useEffect, useState } from 'react'
import {
  fetchPublicRescueProfile,
  submitPublicSighting,
  type PublicRescueProfile,
} from '../../services/rescueService'

interface PublicRescueViewProps {
  token: string
  fromPreview?: boolean
  onBack?: () => void
}

export const PublicRescueView = ({
  token,
  fromPreview = false,
  onBack,
}: PublicRescueViewProps) => {
  const [profile, setProfile] = useState<PublicRescueProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reporterName, setReporterName] = useState('')
  const [reporterPhone, setReporterPhone] = useState('')
  const [message, setMessage] = useState('')
  const [location, setLocation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      setIsLoading(true)
      setLoadError('')

      try {
        const result = await fetchPublicRescueProfile(token)

        if (!active) return

        if (!result) {
          setLoadError('Este código QR no es válido o fue desactivado.')
          return
        }

        setProfile(result)
      } catch (error) {
        console.error('Error loading rescue profile:', error)
        if (active) {
          setLoadError('No se pudo cargar el pasaporte de esta mascota.')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [token])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (
      !reporterName.trim()
      || !reporterPhone.trim()
      || !message.trim()
      || isSubmitting
    ) return

    setIsSubmitting(true)

    try {
      await submitPublicSighting(
        token,
        reporterName,
        reporterPhone,
        message,
        location
      )
      setSent(true)
      setReporterName('')
      setReporterPhone('')
      setMessage('')
      setLocation('')
    } catch (error: any) {
      alert(`No se pudo enviar el aviso: ${error.message || 'error inesperado'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#EFECE4] text-[#204E4A] flex justify-center p-0 sm:p-6">
      <main className="w-full sm:max-w-[430px] min-h-screen sm:min-h-[760px] bg-[#FAF8F5] sm:rounded-[2.8rem] shadow-[0_20px_60px_-15px_rgba(32,78,74,0.18)] overflow-hidden">
        <header className="px-5 py-4 bg-white border-b border-[#204E4A]/8 grid grid-cols-[40px_1fr_40px] items-center">
          <div>
            {fromPreview && onBack ? (
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-full bg-[#FAF8F5] text-[#204E4A] font-black cursor-pointer"
                aria-label="Regresar"
              >
                ←
              </button>
            ) : null}
          </div>

          <h1 className="text-base font-black text-center text-[#204E4A]">
            Pasaporte QR
          </h1>

          <div className="w-10" aria-hidden="true" />
        </header>

        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="py-20 text-center text-sm font-bold text-[#5C7470]">
              Cargando pasaporte…
            </div>
          ) : loadError ? (
            <div className="py-16 text-center space-y-3">
              <div className="text-4xl">×</div>
              <h2 className="text-xl font-black">Código no disponible</h2>
              <p className="text-sm text-[#5C7470]">{loadError}</p>
            </div>
          ) : profile ? (
            <>
              <section className="text-center space-y-3">
                <div className="w-28 h-28 mx-auto rounded-[2.2rem] overflow-hidden bg-white shadow-md">
                  {profile.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-black">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-3xl font-black">
                    Soy {profile.name}.
                  </h2>
                  <p className="text-sm text-[#5C7470] mt-1">
                    {profile.species}
                    {profile.breed ? ` • ${profile.breed}` : ''}
                  </p>
                </div>

                {profile.bio && (
                  <p className="text-sm text-[#5C7470] leading-relaxed max-w-xs mx-auto">
                    {profile.bio}
                  </p>
                )}
              </section>

              {profile.isLost && (
                <section className="bg-[#FFF2EE] border border-[#EC7357]/30 rounded-[2rem] p-4 space-y-2">
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-white bg-[#EC7357] px-3 py-1 rounded-full">
                    Mascota reportada como perdida
                  </span>
                  {profile.lastSeenLocation && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#5C7470]">
                        Última vez vista
                      </span>
                      <p className="font-extrabold text-sm">{profile.lastSeenLocation}</p>
                    </div>
                  )}
                  {profile.alertLastSeenAt && (
                    <p className="text-xs text-[#5C7470]">
                      {new Date(profile.alertLastSeenAt).toLocaleString()}
                    </p>
                  )}
                  {profile.alertDetails && (
                    <p className="text-sm leading-relaxed">{profile.alertDetails}</p>
                  )}
                </section>
              )}

              <section className="bg-white rounded-[2.2rem] p-5 shadow-xs space-y-4">
                <div>
                  <h3 className="text-lg font-black">¿La viste o está contigo?</h3>
                </div>

                {sent ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                    <p className="font-extrabold text-emerald-800">Aviso enviado.</p>
                    <p className="text-xs text-emerald-700 mt-1">
                      La familia de {profile.name} recibirá una notificación privada.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={reporterName}
                      onChange={(event) => setReporterName(event.target.value)}
                      placeholder="Tu nombre"
                      className="w-full bg-[#FAF8F5] rounded-2xl px-4 py-3 text-sm focus:outline-none"
                    />

                    <input
                      required
                      type="tel"
                      minLength={7}
                      maxLength={40}
                      value={reporterPhone}
                      onChange={(event) => setReporterPhone(event.target.value)}
                      placeholder="Tu teléfono"
                      className="w-full bg-[#FAF8F5] rounded-2xl px-4 py-3 text-sm focus:outline-none"
                    />

                    <textarea
                      required
                      minLength={3}
                      maxLength={1000}
                      rows={4}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Ej: Lo vi cerca del parque, lleva collar verde…"
                      className="w-full bg-[#FAF8F5] rounded-2xl p-3 text-sm focus:outline-none"
                    />

                    <input
                      maxLength={250}
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder="Ubicación aproximada · opcional"
                      className="w-full bg-[#FAF8F5] rounded-2xl px-4 py-3 text-sm focus:outline-none"
                    />

                    <button
                      type="submit"
                      disabled={
                        isSubmitting
                        || !reporterName.trim()
                        || !reporterPhone.trim()
                        || !message.trim()
                      }
                      className="w-full bg-[#204E4A] text-[#E1E53F] disabled:opacity-50 font-extrabold py-3.5 rounded-full"
                    >
                      {isSubmitting ? 'Enviando…' : 'Avisar a su familia'}
                    </button>
                  </form>
                )}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
