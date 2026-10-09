import { useEffect, useState } from 'react'
import {
  hasFeatureExperimentInterest,
  recordFeatureExperimentInterest,
  recordFeatureExperimentView,
} from '../../../services/featureExperimentService'
import {
  IconMap,
  IconPaw,
  IconPin,
} from '../../../components/icons/PazoIcons'

interface PlacesDemandExperimentProps {
  canTrack: boolean
  lang: 'es' | 'en'
}

const MODULE_KEY = 'places_map'
const SOURCE = 'bottom_nav_map'

export const PlacesDemandExperiment = ({
  canTrack,
  lang,
}: PlacesDemandExperimentProps) => {
  const [isInterested, setIsInterested] = useState(false)
  const [isLoadingState, setIsLoadingState] = useState(canTrack)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!canTrack) {
      setIsLoadingState(false)
      return
    }

    let active = true

    void Promise.all([
      hasFeatureExperimentInterest(MODULE_KEY),
      recordFeatureExperimentView(MODULE_KEY, SOURCE),
    ])
      .then(([interest]) => {
        if (active) setIsInterested(interest)
      })
      .catch((error) => {
        console.error('Error loading Places demand experiment:', error)
      })
      .finally(() => {
        if (active) setIsLoadingState(false)
      })

    return () => {
      active = false
    }
  }, [canTrack])

  const handleInterest = async () => {
    if (!canTrack || isInterested || isSubmitting) return

    setIsSubmitting(true)
    setFeedback('')

    try {
      await recordFeatureExperimentInterest(MODULE_KEY, SOURCE)
      setIsInterested(true)
      setFeedback(
        lang === 'es'
          ? 'Gracias. Tu interés quedó registrado y nos ayuda a decidir si priorizamos esta función.'
          : 'Thanks. Your interest was recorded and helps us decide whether to prioritize this feature.'
      )
    } catch (error: any) {
      console.error('Error recording Places demand:', error)
      setFeedback(
        lang === 'es'
          ? 'No pudimos registrar tu interés. Inténtalo de nuevo.'
          : 'We could not record your interest. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const benefits = [
    {
      icon: IconPin,
      es: 'Descubrir lugares pet-friendly cerca de ti.',
      en: 'Discover pet-friendly places near you.',
    },
    {
      icon: IconMap,
      es: 'Explorar parques, senderos, veterinarias y negocios en un mapa.',
      en: 'Explore parks, trails, vets, and businesses on a map.',
    },
    {
      icon: IconPaw,
      es: 'Ver actividad útil para salir con tu mascota sin guardar tu ubicación exacta.',
      en: 'See useful activity for outings without storing your exact location.',
    },
  ]

  return (
    <section className="space-y-4 animate-slide-up pb-8">
      <div className="rounded-[2.2rem] bg-white p-5 shadow-sm ring-1 ring-[#204E4A]/5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-[#E1E53F]/55 px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#204E4A]">
              {lang === 'es' ? 'En evaluación' : 'Under evaluation'}
            </span>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-[#204E4A]">
              {lang === 'es'
                ? '¿Usarías un mapa para salir con tu mascota?'
                : 'Would you use a map for outings with your pet?'}
            </h2>

            <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#5C7470]">
              {lang === 'es'
                ? 'Estamos evaluando si Mapa y Lugares debe formar parte de PAZO. Todavía no está activo en la app publicada. Si realmente lo usarías, puedes decírnoslo con un solo toque.'
                : 'We are evaluating whether Maps and Places should become part of PAZO. It is not active in the published app yet. If you would genuinely use it, tell us with one tap.'}
            </p>
          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.5rem] bg-[#204E4A] text-[#E1E53F] shadow-sm">
            <IconMap size={26} />
          </div>
        </div>

        <div className="mt-5 grid gap-2.5">
          {benefits.map(({ icon: Icon, es, en }) => (
            <div
              key={es}
              className="flex items-center gap-3 rounded-[1.35rem] bg-[#FAF8F5] p-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#204E4A] shadow-xs">
                <Icon size={16} />
              </span>
              <p className="text-[10px] font-bold leading-relaxed text-[#5C7470]">
                {lang === 'es' ? es : en}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handleInterest()}
          disabled={!canTrack || isLoadingState || isInterested || isSubmitting}
          className={
            'mt-5 w-full rounded-full py-3.5 text-xs font-black transition-all disabled:cursor-default ' +
            (isInterested
              ? 'bg-[#204E4A] text-[#E1E53F]'
              : 'bg-[#E1E53F] text-[#204E4A] shadow-sm hover:bg-[#d8dc35] disabled:opacity-60')
          }
        >
          {isLoadingState
            ? lang === 'es'
              ? 'Cargando...'
              : 'Loading...'
            : isInterested
              ? lang === 'es'
                ? 'Interés registrado'
                : 'Interest saved'
              : isSubmitting
                ? lang === 'es'
                  ? 'Guardando...'
                  : 'Saving...'
                : lang === 'es'
                  ? 'Me interesa'
                  : "I'm interested"}
        </button>

        {!canTrack && (
          <p className="mt-2 text-center text-[9px] leading-relaxed text-[#5C7470]">
            {lang === 'es'
              ? 'El interés se mide únicamente en cuentas registradas para evitar duplicados.'
              : 'Interest is measured only for registered accounts to avoid duplicates.'}
          </p>
        )}

        {feedback && (
          <p
            className="mt-3 rounded-2xl bg-[#FAF8F5] p-3 text-center text-[9px] font-bold leading-relaxed text-[#5C7470]"
            role="status"
          >
            {feedback}
          </p>
        )}
      </div>

      <div className="rounded-[1.8rem] border border-dashed border-[#204E4A]/15 bg-[#FAF8F5] p-4 text-center">
        <p className="text-[9px] leading-relaxed text-[#5C7470]">
          {lang === 'es'
            ? 'Esta pantalla mide interés real. No solicita tu ubicación ni activa servicios de mapas mientras el experimento esté en curso.'
            : 'This screen measures real interest. It does not request your location or activate map services while the experiment is running.'}
        </p>
      </div>
    </section>
  )
}
