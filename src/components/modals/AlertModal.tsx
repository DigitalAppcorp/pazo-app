import { useEffect, useState } from 'react'
import type { Pet } from '../../types/pazo'
import {
  activateLostPetAlert,
  fetchActiveLostPetAlert,
  resolveLostPetAlert,
} from '../../services/rescueService'

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="w-full max-w-sm bg-white rounded-[2.8rem] border border-[#EC7357]/30 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="py-16 text-center text-xs font-bold text-[#5C7470]">
            {lang === 'es' ? 'Cargando alerta…' : 'Loading alert…'}
          </div>
        ) : step === 'create' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#204E4A]/10">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white bg-[#EC7357] px-2.5 py-0.5 rounded-full inline-block">
                  {lang === 'es' ? 'Emergencia Comunitaria' : 'Community Alert'}
                </span>
                <h3 className="text-xl font-black text-[#204E4A] mt-1">
                  {lang === 'es' ? `Busquemos a ${pet.name}.` : `Let's find ${pet.name}.`}
                </h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#5C7470] font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-2xl flex items-center gap-3">
                <img src={pet.photoUrl} alt={pet.name} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <span className="font-extrabold text-[#204E4A] block">{pet.name}</span>
                  <span className="text-[11px] text-[#5C7470]">
                    {pet.species}{pet.breed ? ` • ${pet.breed}` : ''}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
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
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
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
                <label className="block text-[10px] font-bold uppercase text-[#5C7470] mb-1">
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

              <div className="p-3 bg-white border border-[#204E4A]/10 rounded-2xl text-[11px] text-[#5C7470]">
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
          <div className="space-y-4">
            <button onClick={() => setStep('create')} className="text-xs font-bold text-[#5C7470]">
              ← {lang === 'es' ? 'Modificar datos' : 'Edit info'}
            </button>

            <div className="text-center space-y-3">
              <img src={pet.photoUrl} alt={pet.name} className="w-24 h-24 rounded-[2rem] object-cover mx-auto border-3 border-[#EC7357]" />
              <div>
                <h3 className="text-2xl font-black text-[#EC7357]">
                  {lang === 'es' ? `Se busca a ${pet.name}.` : `Searching for ${pet.name}.`}
                </h3>
                <p className="text-xs text-[#5C7470] mt-1">{lastSeen}</p>
              </div>
              {details && (
                <div className="p-3 bg-[#FAF8F5] rounded-2xl text-xs text-left">
                  {details}
                </div>
              )}
              <button
                onClick={handlePublish}
                disabled={isSaving}
                className="w-full bg-[#EC7357] disabled:opacity-50 text-white font-extrabold py-3.5 rounded-full text-xs"
              >
                {isSaving
                  ? (lang === 'es' ? 'Publicando…' : 'Publishing…')
                  : (lang === 'es' ? 'Publicar alerta' : 'Publish alert')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto animate-pulse">
              !
            </div>
            <div>
              <h3 className="text-xl font-black text-[#204E4A]">
                {lang === 'es' ? 'Alerta activa' : 'Alert active'}
              </h3>
              <p className="text-xs text-[#5C7470] mt-1">
                {lang === 'es'
                  ? `El pasaporte QR de ${pet.name} muestra ahora la información de búsqueda.`
                  : `${pet.name}'s QR passport now shows the search information.`}
              </p>
            </div>

            <div className="p-3 bg-[#FFF2EE] rounded-2xl text-left text-xs">
              <span className="font-bold block">{lastSeen}</span>
              {details && <span className="text-[#5C7470] block mt-1">{details}</span>}
            </div>

            <button
              onClick={handleResolve}
              disabled={isSaving}
              className="w-full bg-[#204E4A] disabled:opacity-50 text-[#E1E53F] font-extrabold py-3.5 rounded-full text-xs"
            >
              {isSaving
                ? (lang === 'es' ? 'Finalizando…' : 'Finishing…')
                : (lang === 'es' ? '¡Ya está en casa! Finalizar alerta' : 'Safe at home — resolve alert')}
            </button>

            <button onClick={onClose} className="w-full py-2.5 text-xs font-bold text-[#5C7470]">
              {lang === 'es' ? 'Cerrar ventana' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
