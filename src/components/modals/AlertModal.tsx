import { useEffect, useState } from 'react'
import type { Pet } from '../../types/pazo'
import {
  activateLostPetAlert,
  fetchActiveLostPetAlert,
  resolveLostPetAlert,
  getPetPublicToken,
  buildPublicRescueUrl,
} from '../../services/rescueService'
import { LostAlertReview } from '../../features/rescue/components/LostAlertReview'
import { ActiveLostAlertPanel } from '../../features/rescue/components/ActiveLostAlertPanel'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  pet: Pet
  onPetUpdated: (pet: Pet) => void
  lang: 'es' | 'en'
}

const toDateTimeLocal = (value?: string | null) => {
  const date = value ? new Date(value) : new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export const AlertModal = ({ isOpen, onClose, pet, onPetUpdated, lang }: AlertModalProps) => {
  const [step, setStep] = useState<'create' | 'review' | 'active'>('create')
  const [lastSeen, setLastSeen] = useState('')
  const [dateTime, setDateTime] = useState(toDateTimeLocal())
  const [details, setDetails] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [publicUrl, setPublicUrl] = useState('')
  const [isLinkLoading, setIsLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [shareFeedback, setShareFeedback] = useState('')
  const [linkAttempt, setLinkAttempt] = useState(0)

  useEffect(() => {
    if (!isOpen || !pet.id) return

    let active = true

    const load = async () => {
      setIsLoading(true)

      try {
        const alert = await fetchActiveLostPetAlert(pet.id)
        if (!active) return

        if (alert) {
          setLastSeen(alert.lastSeenLocation)
          setDateTime(toDateTimeLocal(alert.lastSeenAt))
          setDetails(alert.details || '')
          setStep('active')
        } else {
          setLastSeen(pet.lastSeenLocation || '')
          setDateTime(toDateTimeLocal())
          setDetails('')
          setStep('create')
        }
      } catch (error) {
        console.error('Error loading lost pet alert:', error)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [isOpen, pet.id, pet.lastSeenLocation])


  // Reuse the identical token and public QR route from PassportModal.
  useEffect(() => {
    if (!isOpen || step !== 'active' || !pet.id) return
    let active = true
    setPublicUrl('')
    setLinkError('')
    setShareFeedback('')
    setIsLinkLoading(true)
    void getPetPublicToken(pet.id).then((token) => {
      if (active) setPublicUrl(buildPublicRescueUrl(token))
    }).catch(() => {
      if (active) setLinkError(lang === 'es' ? 'No se pudo preparar el enlace del pasaporte.' : 'Could not prepare the passport link.')
    }).finally(() => {
      if (active) setIsLinkLoading(false)
    })
    return () => { active = false }
  }, [isOpen, step, pet.id, lang, linkAttempt])

  const isLocalLink = typeof window !== 'undefined'
    && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
  const shareMessage = lang === 'es'
    ? `Ayudemos a encontrar a ${pet.name}. Consulta su alerta en el pasaporte de PAZO:`
    : `Help us find ${pet.name}. See the alert on the PAZO passport:`

  const copyPublicLink = async (instagram = false) => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setShareFeedback(instagram
        ? (lang === 'es' ? 'Enlace copiado. Pégalo en Instagram (historia, mensaje o biografía).' : 'Link copied. Paste it into Instagram (story, message or bio).')
        : (lang === 'es' ? 'Enlace copiado.' : 'Link copied.'))
    } catch {
      setShareFeedback(lang === 'es' ? `Copia este enlace manualmente: ${publicUrl}` : `Copy this link manually: ${publicUrl}`)
    }
  }

  const shareWhatsApp = () => {
    if (!publicUrl || isLocalLink) return
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${publicUrl}`)}`, '_blank', 'noopener,noreferrer')
  }

  const shareMore = async () => {
    if (!publicUrl || isLocalLink) return
    try {
      if (navigator.share) await navigator.share({ title: `PAZO · ${pet.name}`, text: shareMessage, url: publicUrl })
      else await copyPublicLink()
    } catch (err: any) {
      if (err?.name !== 'AbortError') setShareFeedback(lang === 'es' ? 'No se pudo compartir. Prueba copiar el enlace.' : 'Could not share. Try copying the link.')
    }
  }

  if (!isOpen) return null

  const handlePublish = async () => {
    if (!lastSeen.trim() || isSaving) return

    setIsSaving(true)
    try {
      await activateLostPetAlert(
        pet.id,
        lastSeen,
        new Date(dateTime).toISOString(),
        details
      )

      onPetUpdated({
        ...pet,
        isLost: true,
        lastSeenLocation: lastSeen.trim(),
      })
      setStep('active')
    } catch (error: any) {
      alert(
        lang === 'es'
          ? `No se pudo activar la alerta: ${error.message}`
          : `Could not activate alert: ${error.message}`
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleResolve = async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      await resolveLostPetAlert(pet.id)
      onPetUpdated({
        ...pet,
        isLost: false,
        lastSeenLocation: undefined,
      })
      setStep('create')
      onClose()
    } catch (error: any) {
      alert(
        lang === 'es'
          ? `No se pudo finalizar la alerta: ${error.message}`
          : `Could not resolve alert: ${error.message}`
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={lang === 'es' ? 'Búsqueda de mascota' : 'Lost pet search'} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs motion-safe:animate-[slideUpFade_260ms_ease-out_both]">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-[420px] space-y-4 overflow-y-auto overscroll-contain rounded-[2.6rem] bg-[#FFFCF6] p-5 shadow-[0_18px_52px_rgba(32,78,74,0.20)] sm:p-6">
        {isLoading ? (
          <div className="py-16 text-center text-xs font-bold text-[#5C7470]">
            {lang === 'es' ? 'Cargando alerta…' : 'Loading alert…'}
          </div>
        ) : step === 'create' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#204E4A]/10">
              <div>
                <h3 className="text-xl font-black text-[#204E4A] mt-1">
                  {lang === 'es' ? `Busquemos a ${pet.name}.` : `Let's find ${pet.name}.`}
                </h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#5C7470] font-bold">✕</button>
            </div>

            <p className="text-[14px] leading-relaxed text-[#5C7470]">{lang==='es'
              ?'Úsala solo si tu mascota se ha perdido. El aviso permite recibir avistamientos; no garantiza difusión externa ni rescate.'
              :'Use this only if your pet is missing. The alert lets you receive sightings; it does not guarantee external distribution or rescue.'}</p>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-2xl flex items-center gap-3">
                <img src={pet.photoUrl} alt={pet.name} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <span className="font-extrabold text-[#204E4A] block">{pet.name}</span>
                  <span className="text-[14px] text-[#5C7470]">
                    {pet.species}{pet.breed ? ` • ${pet.breed}` : ''}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Última vez vista' : 'Last seen location'}
                </label>
                <input
                  required
                  maxLength={250}
                  value={lastSeen}
                  onChange={(event) => setLastSeen(event.target.value)}
                  placeholder={lang === 'es' ? 'Ej: Parque Silver Lake' : 'E.g. Silver Lake Park'}
                  className="w-full bg-[#FAF8F5] rounded-xl px-3 py-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Fecha y hora aproximada' : 'Approximate date & time'}
                </label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(event) => setDateTime(event.target.value)}
                  className="w-full bg-[#FAF8F5] rounded-xl px-3 py-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold uppercase text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Descripción' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  maxLength={1500}
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder={lang === 'es' ? 'Collar, comportamiento, señas particulares…' : 'Collar, behavior, identifying details…'}
                  className="w-full bg-[#FAF8F5] rounded-xl p-3 text-xs"
                />
              </div>

              <div className="p-3 bg-white border border-[#204E4A]/10 rounded-2xl text-[14px] text-[#5C7470]">
                {lang === 'es'
                  ? 'Tu teléfono y domicilio no se mostrarán. El QR permitirá enviar avisos privados.'
                  : 'Your phone and home address stay hidden. The QR allows private notices.'}
              </div>

              <button
                onClick={() => lastSeen.trim() && setStep('review')}
                disabled={!lastSeen.trim()}
                className="w-full bg-[#EC7357] disabled:opacity-50 text-white font-extrabold py-3.5 rounded-full text-xs"
              >
                {lang === 'es' ? 'Revisar alerta →' : 'Review alert →'}
              </button>
            </div>
          </div>
        ) : step === 'review' ? (
          <LostAlertReview pet={pet} lastSeen={lastSeen} dateTime={dateTime} details={details}
            lang={lang} isSaving={isSaving} onEdit={() => setStep('create')} onPublish={handlePublish}/>
        ) : (
          <ActiveLostAlertPanel pet={pet} lastSeen={lastSeen} details={details} lang={lang}
            isSaving={isSaving} publicUrl={publicUrl} isLinkLoading={isLinkLoading}
            linkError={linkError} shareFeedback={shareFeedback} isLocalLink={isLocalLink}
            onCopy={() => void copyPublicLink()} onWhatsApp={shareWhatsApp}
            onInstagram={() => void copyPublicLink(true)} onMore={() => void shareMore()}
            onRetryLink={() => setLinkAttempt((value) => value + 1)}
            onResolve={handleResolve} onClose={onClose}/>
        )}
      </div>
    </div>
  )
}
