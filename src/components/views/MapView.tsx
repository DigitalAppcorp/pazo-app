import { useState } from 'react'
import { supabase } from '../../services/supabaseClient'

interface MapViewProps {
  places?: any[]
  activePetName: string
  lang: 'es' | 'en'
}

export const MapView = ({ activePetName, lang }: MapViewProps) => {
  const [hasVoted, setHasVoted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInterestClick = async () => {
    setIsSubmitting(true)
    try {
      // Registramos el interés explícito en Supabase
      await supabase.from('interactions').insert({
        target_id: 'feature_map_interested',
        target_type: 'place',
        action_type: 'join' // Usamos 'join' para denotar un voto de interés activo
      })
      setHasVoted(true)
    } catch (error) {
      console.error('Error registrando interés:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#E1E53F]/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Icono de Radar animado */}
      <div className="relative w-28 h-28 rounded-full bg-[#E1E53F]/30 flex items-center justify-center mb-6 shadow-sm">
        <div className="absolute inset-0 border-2 border-[#204E4A]/10 rounded-full animate-ping opacity-50"></div>
        <div className="absolute inset-2 border border-[#204E4A]/10 rounded-full animate-pulse"></div>
        <svg className="w-12 h-12 text-[#204E4A] relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </div>

      <h2 className="text-3xl font-black text-[#204E4A] mb-3 tracking-tight relative z-10">
        {lang === 'es' ? 'Radar Pazo' : 'Pazo Radar'}
      </h2>

      {/* Mensaje Inspirador y transparente */}
      <p className="text-xs sm:text-sm text-[#5C7470] mb-8 leading-relaxed max-w-[300px] relative z-10 font-medium">
        {lang === 'es'
          ? `Estamos trabajando fuertemente para construir el mapa definitivo donde ${activePetName} y tú descubran parques, servicios y amigos cercanos. Queremos crear herramientas que realmente transformen su día a día.`
          : `We are working hard to build the ultimate map where you and ${activePetName} can discover nearby parks, services, and friends. We want to craft tools that truly transform your daily routine.`}
      </p>

      {hasVoted ? (
        <div className="bg-[#204E4A] text-[#E1E53F] px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 animate-slide-up relative z-10">
          <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <div className="text-left">
            <span className="block font-black text-xs">{lang === 'es' ? '¡Gracias por ayudarnos a priorizar!' : 'Thanks for helping us prioritize!'}</span>
            <span className="block text-[10px] text-white/80">
              {lang === 'es' ? 'Tu opinión guía el futuro de Pazo.' : 'Your feedback guides the future of Pazo.'}
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={handleInterestClick}
          disabled={isSubmitting}
          className="bg-[#204E4A] hover:bg-[#183d3a] text-[#E1E53F] font-black py-3.5 px-7 rounded-full text-xs sm:text-sm shadow-[0_8px_20px_rgba(32,78,74,0.15)] transition-all cursor-pointer active:scale-95 flex items-center gap-2.5 relative z-10"
        >
          {isSubmitting ? (
            <span className="animate-pulse">{lang === 'es' ? 'Registrando...' : 'Registering...'}</span>
          ) : (
            <>
              <span>{lang === 'es' ? 'Me interesa esta función 🐾' : 'I am interested in this feature 🐾'}</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}