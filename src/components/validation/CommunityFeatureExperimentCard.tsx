import { useEffect, useRef, useState } from 'react'
import {
  hasFeatureExperimentInterest,
  recordFeatureExperimentInterest,
  recordFeatureExperimentView,
} from '../../services/featureExperimentService'

interface CommunityFeatureExperimentCardProps {
  moduleKey: string
  title: string
  description: string
  source: string
  lang: 'es' | 'en'
}

export const CommunityFeatureExperimentCard = ({
  moduleKey,
  title,
  description,
  source,
  lang,
}: CommunityFeatureExperimentCardProps) => {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [isInterested, setIsInterested] = useState(false)
  const [isLoadingState, setIsLoadingState] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasRecordedView = useRef(false)

  useEffect(() => {
    let active = true

    void hasFeatureExperimentInterest(moduleKey)
      .then((value) => {
        if (active) setIsInterested(value)
      })
      .catch((error) => {
        console.error('Error loading feature experiment state:', error)
      })
      .finally(() => {
        if (active) setIsLoadingState(false)
      })

    return () => {
      active = false
    }
  }, [moduleKey])

  useEffect(() => {
    const node = cardRef.current
    if (!node || hasRecordedView.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.5) return

        hasRecordedView.current = true
        observer.disconnect()

        void recordFeatureExperimentView(moduleKey, source).catch((error) => {
          hasRecordedView.current = false
          console.error('Error recording feature experiment view:', error)
        })
      },
      { threshold: [0.5] }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [moduleKey, source])

  const handleInterest = async () => {
    if (isInterested || isSubmitting) return

    setIsSubmitting(true)
    try {
      await recordFeatureExperimentInterest(moduleKey, source)
      setIsInterested(true)
    } catch (error: any) {
      console.error('Error recording feature experiment interest:', error)
      alert(
        lang === 'es'
          ? `No se pudo registrar tu interés: ${error?.message || 'error inesperado'}`
          : `Could not record your interest: ${error?.message || 'unexpected error'}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      ref={cardRef}
      className="rounded-[1.6rem] bg-[#FAF8F5] p-4 ring-1 ring-[#204E4A]/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-white px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-wider text-[#5C7470] shadow-xs">
            {lang === 'es' ? 'En desarrollo' : 'In development'}
          </span>
          <h5 className="mt-2 text-xs font-black text-[#204E4A]">{title}</h5>
          <p className="mt-1 text-[10px] leading-relaxed text-[#5C7470]">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleInterest()}
          disabled={isInterested || isSubmitting || isLoadingState}
          className={
            'shrink-0 rounded-full px-3 py-2 text-[9px] font-extrabold transition-all disabled:cursor-default ' +
            (isInterested
              ? 'bg-[#204E4A] text-[#E1E53F]'
              : 'bg-[#E1E53F] text-[#204E4A] hover:bg-[#d8dc35] disabled:opacity-60')
          }
        >
          {isLoadingState
            ? '...'
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
      </div>
    </div>
  )
}
