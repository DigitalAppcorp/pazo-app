import { useEffect, useState } from 'react'
import {
  getMyModuleValidationState,
  recordModuleValidationInterest,
  recordModuleValidationView,
  saveModuleValidationIntent,
  type ValidationModuleKey,
} from '../../services/validationService'

interface IntentOption {
  value: string
  es: string
  en: string
}

interface ValidationInterestPanelProps {
  moduleKey: ValidationModuleKey
  source: string
  activePetId?: string | null
  canTrack: boolean
  titleEs: string
  titleEn: string
  descriptionEs: string
  descriptionEn: string
  intents: IntentOption[]
  lang: 'es' | 'en'
}

export const ValidationInterestPanel = ({
  moduleKey,
  source,
  activePetId,
  canTrack,
  titleEs,
  titleEn,
  descriptionEs,
  descriptionEn,
  intents,
  lang,
}: ValidationInterestPanelProps) => {
  const [interested, setInterested] = useState(false)
  const [intentKey, setIntentKey] = useState<string | null>(null)
  const [isLoadingState, setIsLoadingState] = useState(canTrack)
  const [isSavingInterest, setIsSavingInterest] = useState(false)
  const [savingIntentKey, setSavingIntentKey] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    if (!canTrack) {
      setIsLoadingState(false)
      return () => {
        cancelled = true
      }
    }

    void recordModuleValidationView(moduleKey, source, activePetId).catch(
      (error) => {
        console.error('Could not record module validation view:', error)
      }
    )

    void getMyModuleValidationState(moduleKey)
      .then((state) => {
        if (cancelled) return
        setInterested(state.interested)
        setIntentKey(state.intentKey)
      })
      .catch((error) => {
        console.error('Could not load module validation state:', error)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingState(false)
      })

    return () => {
      cancelled = true
    }
  }, [moduleKey, source, activePetId, canTrack])

  const handleInterest = async () => {
    if (!canTrack) {
      setMessage(
        lang === 'es'
          ? 'Inicia sesión con una cuenta real para registrar tu interés.'
          : 'Log in with a real account to register your interest.'
      )
      return
    }

    if (interested || isSavingInterest) return

    setIsSavingInterest(true)
    setMessage('')

    try {
      await recordModuleValidationInterest(
        moduleKey,
        source,
        activePetId
      )
      setInterested(true)
    } catch (error) {
      console.error('Could not record module validation interest:', error)
      setMessage(
        lang === 'es'
          ? 'No pudimos registrar tu interés. Inténtalo de nuevo.'
          : 'We could not register your interest. Please try again.'
      )
    } finally {
      setIsSavingInterest(false)
    }
  }

  const handleIntent = async (nextIntentKey: string) => {
    if (!canTrack || savingIntentKey) return

    setSavingIntentKey(nextIntentKey)
    setMessage('')

    try {
      await saveModuleValidationIntent(
        moduleKey,
        nextIntentKey,
        source,
        activePetId
      )
      setIntentKey(nextIntentKey)
    } catch (error) {
      console.error('Could not save module validation intent:', error)
      setMessage(
        lang === 'es'
          ? 'No pudimos guardar tu respuesta. Inténtalo de nuevo.'
          : 'We could not save your response. Please try again.'
      )
    } finally {
      setSavingIntentKey(null)
    }
  }

  const title = lang === 'es' ? titleEs : titleEn
  const description = lang === 'es' ? descriptionEs : descriptionEn

  return (
    <div className="rounded-[1.75rem] border border-[#204E4A]/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex rounded-full bg-[#E1E53F]/35 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#204E4A]">
          {lang === 'es' ? 'En evaluación' : 'In evaluation'}
        </span>
        {isLoadingState && (
          <span className="text-[10px] font-bold text-[#5C7470]">
            {lang === 'es' ? 'Cargando…' : 'Loading…'}
          </span>
        )}
      </div>

      <h3 className="mt-3 text-base font-black text-[#204E4A]">
        {title}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-[#5C7470]">
        {description}
      </p>

      {!interested ? (
        <button
          type="button"
          onClick={() => void handleInterest()}
          disabled={isSavingInterest || isLoadingState}
          className="mt-4 w-full rounded-full bg-[#204E4A] px-4 py-3 text-xs font-black text-[#E1E53F] shadow-sm transition-all cursor-pointer disabled:cursor-wait disabled:opacity-60"
        >
          {isSavingInterest
            ? (lang === 'es' ? 'Registrando…' : 'Saving…')
            : (lang === 'es' ? 'Me interesa' : 'I’m interested')}
        </button>
      ) : (
        <div className="mt-4 rounded-2xl bg-[#204E4A]/5 p-3">
          <p className="text-xs font-black text-[#204E4A]">
            {lang === 'es'
              ? 'Gracias. Tu interés quedó registrado.'
              : 'Thanks. Your interest was recorded.'}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#5C7470]">
            {lang === 'es'
              ? 'Esto nos ayuda a decidir qué construir primero.'
              : 'This helps us decide what to build first.'}
          </p>
        </div>
      )}

      {interested && (
        <div className="mt-4">
          <p className="text-xs font-black text-[#204E4A]">
            {lang === 'es'
              ? '¿Qué te gustaría hacer aquí?'
              : 'What would you like to do here?'}
          </p>
          <p className="mt-1 text-[10px] text-[#5C7470]">
            {lang === 'es'
              ? 'Elige una opción. Puedes cambiarla después.'
              : 'Choose one option. You can change it later.'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {intents.map((option) => {
              const selected = intentKey === option.value
              const isSaving = savingIntentKey === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void handleIntent(option.value)}
                  disabled={Boolean(savingIntentKey)}
                  className={`rounded-full px-3 py-2 text-[10px] font-extrabold transition-all cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
                    selected
                      ? 'bg-[#204E4A] text-[#E1E53F]'
                      : 'bg-[#FAF8F5] text-[#204E4A] border border-[#204E4A]/10'
                  }`}
                >
                  {isSaving
                    ? (lang === 'es' ? 'Guardando…' : 'Saving…')
                    : (lang === 'es' ? option.es : option.en)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {message && (
        <p className="mt-3 text-[10px] font-bold text-[#EC7357]">
          {message}
        </p>
      )}
    </div>
  )
}
