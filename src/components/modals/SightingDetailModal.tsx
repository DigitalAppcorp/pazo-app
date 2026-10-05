import { useEffect, useState } from 'react'
import {
  fetchSightingDetail,
  type SightingDetail,
} from '../../services/rescueService'

interface SightingDetailModalProps {
  sightingId: string | null
  onClose: () => void
  lang: 'es' | 'en'
}

export const SightingDetailModal = ({
  sightingId,
  onClose,
  lang,
}: SightingDetailModalProps) => {
  const [detail, setDetail] = useState<SightingDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sightingId) {
      setDetail(null)
      return
    }

    let active = true

    const load = async () => {
      setIsLoading(true)
      setError('')

      try {
        const result = await fetchSightingDetail(sightingId)
        if (active) setDetail(result)
      } catch (err) {
        console.error('Error loading sighting detail:', err)
        if (active) {
          setError(
            lang === 'es'
              ? 'No se pudo cargar el detalle del aviso.'
              : 'Could not load sighting details.'
          )
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [sightingId, lang])

  if (!sightingId) return null

  return (
    <div className="fixed inset-0 z-[170] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-slide-up">
      <div className="w-full max-w-sm bg-white rounded-[2.8rem] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#FAF8F5] text-[#204E4A] font-black cursor-pointer"
            aria-label={lang === 'es' ? 'Regresar' : 'Back'}
          >
            ←
          </button>
          <h3 className="text-base font-black text-[#204E4A]">
            {lang === 'es' ? 'Detalle del aviso' : 'Sighting details'}
          </h3>
          <div className="w-9" aria-hidden="true" />
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs font-bold text-[#5C7470]">
            {lang === 'es' ? 'Cargando…' : 'Loading…'}
          </div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-[#EC7357] font-bold">
            {error}
          </div>
        ) : detail ? (
          <>
            <div className="flex items-center gap-3 bg-[#FAF8F5] rounded-2xl p-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white shrink-0">
                {detail.petPhotoUrl ? (
                  <img
                    src={detail.petPhotoUrl}
                    alt={detail.petName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-[#204E4A]">
                    {detail.petName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#5C7470] font-bold">
                  {lang === 'es' ? 'Aviso sobre' : 'Sighting for'}
                </span>
                <p className="text-lg font-black text-[#204E4A]">{detail.petName}</p>
              </div>
            </div>

            <section className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#5C7470]">
                {lang === 'es' ? 'Contacto' : 'Contact'}
              </h4>

              <div className="bg-[#FAF8F5] rounded-2xl p-4 space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5C7470]">
                    {lang === 'es' ? 'Nombre' : 'Name'}
                  </span>
                  <p className="text-sm font-extrabold text-[#204E4A]">
                    {detail.reporterName || (lang === 'es' ? 'No disponible' : 'Unavailable')}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5C7470]">
                    {lang === 'es' ? 'Teléfono' : 'Phone'}
                  </span>
                  {detail.reporterPhone ? (
                    <a
                      href={`tel:${detail.reporterPhone}`}
                      className="text-sm font-extrabold text-[#204E4A] underline underline-offset-2 block"
                    >
                      {detail.reporterPhone}
                    </a>
                  ) : (
                    <p className="text-sm font-extrabold text-[#204E4A]">
                      {lang === 'es' ? 'No disponible' : 'Unavailable'}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#5C7470]">
                {lang === 'es' ? 'Información del aviso' : 'Sighting information'}
              </h4>

              <div className="bg-[#FAF8F5] rounded-2xl p-4 space-y-3">
                <p className="text-sm text-[#204E4A] leading-relaxed">{detail.message}</p>

                {detail.locationText && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5C7470]">
                      {lang === 'es' ? 'Ubicación aproximada' : 'Approximate location'}
                    </span>
                    <p className="text-sm font-extrabold text-[#204E4A]">
                      {detail.locationText}
                    </p>
                  </div>
                )}

                <p className="text-[10px] text-[#5C7470]">
                  {new Date(detail.createdAt).toLocaleString()}
                </p>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
