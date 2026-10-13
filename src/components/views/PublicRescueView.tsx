import { useEffect, useState } from 'react'
import {
  fetchPublicRescueProfile,
  submitPublicSighting,
  type PublicRescueProfile,
} from '../../services/rescueService'
import { RescuePassportHero } from '../../features/rescue/components/RescuePassportHero'
import { IconAlert, IconPaw } from '../icons/PazoIcons'

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
    <div className="flex min-h-dvh justify-center bg-[#EFECE4] p-0 text-[#204E4A] sm:p-6">
      <main className="min-h-dvh w-full overflow-hidden bg-[#FAF8F5] shadow-[0_18px_48px_rgba(32,78,74,0.10)] sm:min-h-[760px] sm:max-w-[430px] sm:rounded-[2.7rem]">
        <header className="grid grid-cols-[44px_1fr_44px] items-center bg-[#FFFCF6] px-4 py-3">
          <div>
            {fromPreview && onBack ? (
              <button type="button" onClick={onBack} aria-label="Regresar"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF8F5] text-[#204E4A] transition-colors hover:bg-[#E1E53F]/40 focus-visible:bg-[#E1E53F]/40">
                ←
              </button>
            ) : null}
          </div>
          <h1 className="text-center text-sm font-black text-[#204E4A]">Pasaporte QR</h1>
          <div aria-hidden="true" />
        </header>

        <div className="space-y-4 px-4 pb-9 pt-4">
          {isLoading ? (
            <div role="status" className="py-20 text-center text-sm font-bold text-[#5C7470]">Cargando pasaporte…</div>
          ) : loadError ? (
            <div role="alert" className="space-y-3 rounded-[2rem] bg-[#FFFCF6] px-5 py-12 text-center">
              <h2 className="text-xl font-black">Código no disponible</h2>
              <p className="text-sm text-[#5C7470]">{loadError}</p>
            </div>
          ) : profile ? (
            <>
              <RescuePassportHero profile={profile}/>
              <section aria-labelledby="pazo-report-heading" className="rounded-[2rem] bg-[#FFFCF6] p-4 shadow-[0_5px_24px_rgba(32,78,74,0.055)]">
                <div className="mb-4 text-center">
                  <div aria-hidden="true" className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#E1E53F]/35 text-[#204E4A]">
                    <IconPaw size={20}/>
                  </div>
                  <h3 id="pazo-report-heading" className="text-base font-black">¿La viste o está contigo?</h3>
                  <p className="mt-1 text-xs text-[#5C7470]">Cualquier información puede ayudar a encontrarla.</p>
                </div>
                {sent ? (
                  <div role="status" className="rounded-2xl bg-[#E9F4E9] p-4 text-center">
                    <p className="font-extrabold text-[#204E4A]">Aviso enviado.</p>
                    <p className="mt-1 text-xs text-[#5C7470]">La familia de {profile.name} recibirá una notificación privada.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <label htmlFor="pazo-rescue-name" className="sr-only">Tu nombre</label>
                    <input id="pazo-rescue-name" required minLength={2} maxLength={100}
                      autoComplete="name" value={reporterName}
                      onChange={(event) => setReporterName(event.target.value)}
                      placeholder="Tu nombre"
                      className="min-h-11 w-full rounded-2xl bg-[#F4F4F0] px-4 py-3 text-sm text-[#204E4A] placeholder:text-[#829591] focus-visible:bg-[#EAF0E5]"/>

                    <label htmlFor="pazo-rescue-phone" className="sr-only">Tu teléfono</label>
                    <input id="pazo-rescue-phone" required type="tel" minLength={7} maxLength={40}
                      autoComplete="tel" value={reporterPhone}
                      onChange={(event) => setReporterPhone(event.target.value)}
                      placeholder="Tu teléfono"
                      className="min-h-11 w-full rounded-2xl bg-[#F4F4F0] px-4 py-3 text-sm text-[#204E4A] placeholder:text-[#829591] focus-visible:bg-[#EAF0E5]"/>

                    <label htmlFor="pazo-rescue-message" className="sr-only">Información sobre el avistamiento</label>
                    <textarea id="pazo-rescue-message" required minLength={3} maxLength={1000}
                      rows={4} value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Cuéntanos algo (por ejemplo, dónde la viste)"
                      className="w-full resize-y rounded-2xl bg-[#F4F4F0] p-4 text-sm text-[#204E4A] placeholder:text-[#829591] focus-visible:bg-[#EAF0E5]"/>

                    <label htmlFor="pazo-rescue-location" className="sr-only">Ubicación aproximada, opcional</label>
                    <input id="pazo-rescue-location" maxLength={250} value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder="Ubicación aproximada · opcional"
                      className="min-h-11 w-full rounded-2xl bg-[#F4F4F0] px-4 py-3 text-sm text-[#204E4A] placeholder:text-[#829591] focus-visible:bg-[#EAF0E5]"/>

                    <button type="submit"
                      disabled={isSubmitting || !reporterName.trim() || !reporterPhone.trim() || !message.trim()}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#204E4A] px-4 py-3 text-sm font-extrabold text-[#E1E53F] transition-colors hover:bg-[#32645E] focus-visible:bg-[#32645E] disabled:opacity-50">
                      <IconAlert size={17}/>
                      {isSubmitting ? 'Enviando…' : 'Avisar a su familia'}
                    </button>
                    <p className="text-center text-[11px] leading-relaxed text-[#5C7470]">
                      Tu aviso se envía de forma privada a la familia de {profile.name}.
                    </p>
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
