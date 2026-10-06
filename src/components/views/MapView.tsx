import { ValidationInterestPanel } from '../validation/ValidationInterestPanel'

interface MapViewProps {
  activePetId?: string | null
  activePetName: string
  canTrackValidation: boolean
  lang: 'es' | 'en'
}

const MAP_INTENTS = [
  {
    value: 'pet_friendly_parks',
    es: 'Parques pet-friendly',
    en: 'Pet-friendly parks',
  },
  {
    value: 'vets_services',
    es: 'Veterinarias y servicios',
    en: 'Vets and services',
  },
  {
    value: 'pet_friendly_food',
    es: 'Cafés o lugares para comer con mascota',
    en: 'Pet-friendly cafés and food spots',
  },
  {
    value: 'nearby_people_pets',
    es: 'Personas y mascotas cercanas',
    en: 'Nearby people and pets',
  },
  {
    value: 'check_ins',
    es: 'Check-ins en lugares',
    en: 'Place check-ins',
  },
  {
    value: 'other',
    es: 'Otro',
    en: 'Other',
  },
]

export const MapView = ({
  activePetId,
  activePetName,
  canTrackValidation,
  lang,
}: MapViewProps) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#E1E53F]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-28 h-28 rounded-full bg-[#E1E53F]/30 flex items-center justify-center mb-6 shadow-sm">
        <div className="absolute inset-0 border-2 border-[#204E4A]/10 rounded-full animate-ping opacity-50" />
        <div className="absolute inset-2 border border-[#204E4A]/10 rounded-full animate-pulse" />
        <svg
          className="w-12 h-12 text-[#204E4A] relative z-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <span className="inline-flex rounded-full bg-[#E1E53F]/35 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#204E4A]">
          {lang === 'es' ? 'Vista previa' : 'Preview'}
        </span>

        <h2 className="text-3xl font-black text-[#204E4A] mt-3 tracking-tight">
          {lang === 'es' ? 'Radar Pazo' : 'Pazo Radar'}
        </h2>

        <p className="text-xs sm:text-sm text-[#5C7470] mt-3 mb-5 leading-relaxed font-medium">
          {lang === 'es'
            ? `Estamos evaluando cómo debería funcionar un mapa donde ${activePetName} y tú puedan descubrir lugares y actividad cercana. Todavía no es un mapa activo.`
            : `We are evaluating how a map should work so you and ${activePetName} can discover nearby places and activity. This is not an active map yet.`}
        </p>

        <ValidationInterestPanel
          moduleKey="map_radar"
          source="map_tab"
          activePetId={activePetId}
          canTrack={canTrackValidation}
          titleEs="¿Usarías Radar Pazo?"
          titleEn="Would you use Pazo Radar?"
          descriptionEs="Queremos saber qué sería realmente útil antes de elegir proveedor de mapas, precisión de ubicación y reglas de privacidad."
          descriptionEn="We want to learn what would actually be useful before choosing a map provider, location precision, and privacy rules."
          intents={MAP_INTENTS}
          lang={lang}
        />
      </div>
    </div>
  )
}