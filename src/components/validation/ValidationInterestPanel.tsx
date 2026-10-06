import { useEffect, useRef, useState } from 'react'
import { IconCheck, IconSparkle } from '../icons/PazoIcons'
import {
  getMyModuleValidationState,
  recordModuleValidationInterest,
  recordModuleValidationView,
  saveModuleValidationIntent,
} from '../../services/validationService'

export interface ValidationIntentOption {
  key: string
  label: string
}

interface ValidationInterestPanelProps {
  moduleKey: string
  source: string
  canTrack: boolean
  intentQuestion: string
  intentOptions: ValidationIntentOption[]
  lang: 'es' | 'en'
}

export const ValidationInterestPanel = ({
  moduleKey,
  source,
  canTrack,
  intentQuestion,
  intentOptions,
  lang,
}: ValidationInterestPanelProps) => {
  const mountedViewRef = useRef(false)
  const [interested, setInterested] = useState(false)
  const [intentKey, setIntentKey] = useState<string | null>(null)
  const [isLoadingState, setIsLoadingState] = useState(canTrack)
  const [isSavingInterest, setIsSavingInterest] = useState(false)
  const [savingIntentKey, setSavingIntentKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    if (!canTrack) {
      setIsLoadingState(false)
      return
    }

    const load = async () => {
      try {
        if (!mountedViewRef.current) {
          mountedViewRef.current = true
          await recordModuleValidationView(moduleKey, source)
        }

        const state = await getMyModuleValidationState(moduleKey)
        if (cancelled) return

        setInterested(state.interested)
        setIntentKey(state.intentKey)
        setError('')
      } catch (loadError) {
        console.error('Error loading validation state:', loadError)
        if (!cancelled) {
          setError(
            lang === 'es'
              ? 'No pudimos registrar esta señal. Intenta de nuevo.'
              : 'We could not record this signal. Please try again.'
          )
        }
      } finally {
        if (!cancelled) setIsLoadingState(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [canTrack, lang, moduleKey, source])

  const handleInterest = async () => {
    if (!canTrack) {
      setError(
        lang === 'es'
          ? 'Inicia sesión con una cuenta real para registrar tu interés.'
          : 'Sign in with a real account to register your interest.'
      )
      return
    }

    if (interested || isSavingInterest) return

    setIsSavingInterest(true)
    setError('')

    try {
      await recordModuleValidationInterest(moduleKey, source)
      setInterested(true)
    } catch (interestError) {
      console.error('Error saving module interest:', interestError)
      setError(
        lang === 'es'
          ? 'No pudimos guardar tu interés. Intenta de nuevo.'
          : 'We could not save your interest. Please try again.'
      )
    } finally {
      setIsSavingInterest(false)
    }
  }

  const handleIntent = async (nextIntentKey: string) => {
    if (!canTrack || savingIntentKey) return

    setSavingIntentKey(nextIntentKey)
    setError('')

    try {
      await saveModuleValidationIntent(moduleKey, nextIntentKey, source)
      setIntentKey(nextIntentKey)
    } catch (intentError) {
      console.error('Error saving module intent:', intentError)
      setError(
        lang === 'es'
          ? 'No pudimos guardar tu respuesta. Intenta de nuevo.'
          : 'We could not save your answer. Please try again.'
      )
    } finally {
      setSavingIntentKey(null)
    }
  }

  return (
    <section className="rounded-[2.2rem] bg-[#204E4A] text-white p-5 shadow-lg overflow-hidden relative">
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#E1E53F]/15 blur-xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E1E53F] text-[#204E4A] flex items-center justify-center shrink-0">
            <IconSparkle size={18} />
          </div>
          <div>
            <p className="text-sm font-black">
              {lang === 'es' ? '¿Usarías Comunidades en PAZO?' : 'Would you use Communities in PAZO?'}
            </p>
            <p className="text-[11px] text-white/75 leading-relaxed mt-1">
              {lang === 'es'
                ? 'Esta función todavía está en evaluación. Si la idea que acabas de ver te sería útil, marca tu interés.'
                : 'This feature is still being evaluated. If the idea you just saw would be useful to you, mark your interest.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleInterest()}
          disabled={isLoadingState || isSavingInterest || interested}
          className={
            'w-full rounded-full px-4 py-3 text-xs font-black transition-all flex items-center justify-center gap-2 disabled:opacity-70 ' +
            (interested
              ? 'bg-white/12 text-[#E1E53F] cursor-default'
              : 'bg-[#E1E53F] text-[#204E4A] hover:bg-[#d8dc35] cursor-pointer')
          }
        >
          {interested && <IconCheck size={15} />}
          {isLoadingState
            ? (lang === 'es' ? 'Comprobando...' : 'Checking...')
            : isSavingInterest
            ? (lang === 'es' ? 'Guardando...' : 'Saving...')
            : interested
            ? (lang === 'es' ? 'Interés registrado' : 'Interest registered')
            : (lang === 'es' ? 'Sí, me interesa' : "Yes, I'm interested")}
        </button>

        {interested && (
          <div className="rounded-[1.7rem] bg-white/8 border border-white/10 p-4 space-y-3">
            <div>
              <p className="text-xs font-black">{intentQuestion}</p>
              <p className="text-[10px] text-white/65 mt-1">
                {lang === 'es'
                  ? 'Elige la razón principal. Puedes cambiarla después.'
                  : 'Choose the main reason. You can change it later.'}
              </p>
            </div>

            <div className="space-y-2">
              {intentOptions.map((option) => {
                const selected = intentKey === option.key
                const saving = savingIntentKey === option.key

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => void handleIntent(option.key)}
                    disabled={Boolean(savingIntentKey)}
                    className={
                      'w-full text-left rounded-2xl px-3.5 py-3 text-[11px] font-bold transition-all flex items-center justify-between gap-3 disabled:opacity-70 ' +
                      (selected
                        ? 'bg-[#E1E53F] text-[#204E4A]'
                        : 'bg-white/10 text-white hover:bg-white/15')
                    }
                  >
                    <span>{option.label}</span>
                    {selected && <IconCheck size={14} />}
                    {!selected && saving && (
                      <span className="text-[9px] font-bold uppercase tracking-wide">
                        {lang === 'es' ? 'Guardando' : 'Saving'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {error && (
          <p className="text-[10px] font-semibold text-[#FFD9D0] leading-relaxed">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
