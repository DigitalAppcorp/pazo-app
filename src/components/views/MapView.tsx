import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import type { PetPlace } from '../../types/pazo'
import { IconExplore, IconPaw, IconPin, IconCalendar, IconClose } from '../icons/PazoIcons'

interface MapViewProps {
  places: PetPlace[] // Mantenemos el prop para compatibilidad con App.tsx, pero lo sobreescribiremos
  activePetName: string
  lang: 'es' | 'en'
}

export const MapView = ({ places, activePetName, lang }: MapViewProps) => {
  const [selectedCategory, setSelectedCategory] = useState<'lugares' | 'eventos' | 'alertas'>('lugares')

  // Estados para manejar los datos reales de la BD
  const [localPlaces, setLocalPlaces] = useState<PetPlace[]>(places)
  const [selectedPlace, setSelectedPlace] = useState<PetPlace>(places[0] || {} as PetPlace)
  const [isLoading, setIsLoading] = useState(true)

  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [visibilityOption, setVisibilityOption] = useState<'privado' | 'publico'>('privado')
  const [durationHours, setDurationHours] = useState('1 hora')

  // 1. Obtener los lugares desde Supabase al montar el componente
  useEffect(() => {
    const fetchPlaces = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('pet_places')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        // Mapear de snake_case (BD) a camelCase (Frontend)
        const mappedPlaces: PetPlace[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          zone: d.zone,
          address: d.address,
          hours: d.hours,
          speciesAllowed: d.species_allowed,
          description: d.description,
          photoUrl: d.photo_url,
          activeCheckIns: d.active_check_ins || 0,
        }))
        setLocalPlaces(mappedPlaces)
        setSelectedPlace(mappedPlaces[0])
      }
      setIsLoading(false)
    }

    fetchPlaces()
  }, [])

  // 2. Lógica real de Check-in (Suma +1 a la BD)
  const handleConfirmCheckIn = async () => {
    const newCount = (selectedPlace.activeCheckIns || 0) + 1

    // Actualización optimista en UI
    setSelectedPlace((prev) => ({ ...prev, activeCheckIns: newCount }))
    setLocalPlaces((prev) =>
      prev.map((p) => (p.id === selectedPlace.id ? { ...p, activeCheckIns: newCount } : p))
    )
    setIsCheckedIn(true)
    setShowCheckInModal(false)

    // Actualización en BD
    await supabase
      .from('pet_places')
      .update({ active_check_ins: newCount })
      .eq('id', selectedPlace.id)
  }

  // 3. Lógica real de Salida (Resta -1 a la BD)
  const handleCancelCheckIn = async () => {
    const newCount = Math.max(0, (selectedPlace.activeCheckIns || 1) - 1)

    // Actualización optimista en UI
    setSelectedPlace((prev) => ({ ...prev, activeCheckIns: newCount }))
    setLocalPlaces((prev) =>
      prev.map((p) => (p.id === selectedPlace.id ? { ...p, activeCheckIns: newCount } : p))
    )
    setIsCheckedIn(false)

    // Actualización en BD
    await supabase
      .from('pet_places')
      .update({ active_check_ins: newCount })
      .eq('id', selectedPlace.id)
  }

  return (
    <div className="space-y-4 animate-slide-up pb-6">
      {/* Título y filtro superior */}
      <div className="space-y-1 px-1">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-3 py-1 rounded-full inline-block shadow-xs">
          {lang === 'es' ? 'Presencia Local' : 'Local Presence'}
        </span>
        <h2 className="text-2xl font-black text-[#204E4A] tracking-tight">
          {lang === 'es' ? 'Cerca de ustedes.' : 'Near you.'}
        </h2>
        <p className="text-xs text-[#5C7470]">
          {lang === 'es'
            ? 'Parques, cafeterías y espacios seguros en Los Ángeles'
            : 'Parks, cafes and pet-friendly spots in LA'}
        </p>
      </div>

      {/* Tabs: Lugares / Eventos / Alertas */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedCategory('lugares')}
          className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${selectedCategory === 'lugares'
              ? 'bg-[#204E4A] text-[#E1E53F] shadow-sm'
              : 'bg-white text-[#5C7470] hover:bg-neutral-50 shadow-xs'
            }`}
        >
          {lang === 'es' ? 'Lugares' : 'Places'}
        </button>
        <button
          onClick={() => setSelectedCategory('eventos')}
          className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${selectedCategory === 'eventos'
              ? 'bg-[#204E4A] text-[#E1E53F] shadow-sm'
              : 'bg-white text-[#5C7470] hover:bg-neutral-50 shadow-xs'
            }`}
        >
          {lang === 'es' ? 'Eventos' : 'Events'}
        </button>
        <button
          onClick={() => setSelectedCategory('alertas')}
          className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${selectedCategory === 'alertas'
              ? 'bg-[#204E4A] text-[#E1E53F] shadow-sm'
              : 'bg-white text-[#5C7470] hover:bg-neutral-50 shadow-xs'
            }`}
        >
          {lang === 'es' ? 'Alertas' : 'Alerts'}
        </button>
      </div>

      {/* Mapa Gráfico Estilizado con Pines Interactivos */}
      <div className="relative w-full h-52 bg-[#E9E5DC] rounded-[2.5rem] overflow-hidden shadow-sm">
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-[#E9E5DC]/80 backdrop-blur-sm flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#204E4A]/20 border-t-[#204E4A] rounded-full animate-spin"></div>
          </div>
        )}

        {/* Calles vectoriales suaves */}
        <svg className="w-full h-full opacity-35" viewBox="0 0 400 220" preserveAspectRatio="none">
          <path d="M0,40 Q150,70 400,20" stroke="#204E4A" strokeWidth="8" fill="none" />
          <path d="M0,130 Q200,90 400,160" stroke="#204E4A" strokeWidth="6" fill="none" />
          <path d="M120,0 L180,220" stroke="#204E4A" strokeWidth="4" fill="none" />
          <path d="M280,0 L240,220" stroke="#204E4A" strokeWidth="5" fill="none" />
          <circle cx="210" cy="110" r="45" fill="#204E4A" fillOpacity="0.1" />
        </svg>

        {/* Botón flotante: Buscar en esta zona */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
          <button className="bg-white/95 hover:bg-white text-[#204E4A] text-[11px] font-extrabold px-4 py-1.5 rounded-full shadow-md backdrop-blur-sm transition-all cursor-pointer flex items-center gap-1.5">
            <IconExplore size={14} />
            <span>{lang === 'es' ? 'Buscar en esta zona' : 'Search this area'}</span>
          </button>
        </div>

        {/* Pines interactivos en el mapa */}
        {localPlaces.map((place, idx) => {
          const isSelected = selectedPlace?.id === place.id
          // Asignación de coordenadas estéticas para los primeros pines en el MVP
          const coords = [
            { top: '35%', left: '30%' },
            { top: '55%', left: '60%' },
            { top: '65%', left: '25%' },
            { top: '25%', left: '75%' },
          ][idx] || { top: `${Math.random() * 60 + 20}%`, left: `${Math.random() * 60 + 20}%` }

          return (
            <button
              key={place.id}
              onClick={() => setSelectedPlace(place)}
              style={coords}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform transform active:scale-95 cursor-pointer z-10 ${isSelected ? 'scale-125 z-20' : 'hover:scale-110'
                }`}
              title={place.name}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${isSelected
                    ? 'bg-[#204E4A] text-[#E1E53F]'
                    : 'bg-[#E1E53F] text-[#204E4A]'
                  }`}
              >
                <IconPaw size={16} />
              </div>
            </button>
          )
        })}

        {/* Badge inferior de mapa */}
        <div className="absolute bottom-2.5 right-3 bg-white/90 text-[#204E4A] text-[9px] font-bold px-3 py-1 rounded-full shadow-xs">
          South Gate & Surrounds, CA
        </div>
      </div>

      {/* Estado de Check-in activo */}
      {isCheckedIn && (
        <div className="p-4 bg-emerald-50 rounded-[2rem] flex items-center justify-between animate-slide-up shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <div>
              <span className="block text-xs font-bold text-emerald-900">
                {lang === 'es'
                  ? `Check-in activo en ${selectedPlace.name}`
                  : `Active check-in at ${selectedPlace.name}`}
              </span>
              <span className="text-[11px] text-emerald-700">
                {lang === 'es'
                  ? `Acompañado de ${activePetName} • Modo ${visibilityOption}`
                  : `With ${activePetName} • ${visibilityOption} mode`}
              </span>
            </div>
          </div>
          <button
            onClick={handleCancelCheckIn}
            className="text-[11px] font-bold text-red-600 bg-white px-3.5 py-1.5 rounded-full hover:bg-red-50 cursor-pointer transition-colors shadow-xs"
          >
            {lang === 'es' ? 'Salir' : 'Leave'}
          </button>
        </div>
      )}

      {/* Ficha del Lugar Seleccionado */}
      {selectedPlace && selectedPlace.name && (
        <div className="p-5 bg-white rounded-[2.2rem] shadow-[0_4px_20px_rgba(32,78,74,0.05)] space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#FAF8F5] px-3 py-1 rounded-full shadow-xs">
                {selectedPlace.zone} • {selectedPlace.type}
              </span>
              <h3 className="text-lg font-black text-[#204E4A] mt-1.5 leading-tight">
                {selectedPlace.name}
              </h3>
              <p className="text-xs text-[#5C7470] mt-0.5">{selectedPlace.address}</p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full shadow-xs transition-all">
                {selectedPlace.activeCheckIns} {lang === 'es' ? 'mascotas hoy' : 'pets now'}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-[#FAF8F5] rounded-2xl text-xs space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-[#204E4A] font-semibold">
              <IconPaw size={16} />
              <span>{selectedPlace.speciesAllowed}</span>
            </div>
            <div className="flex items-center gap-2 text-[#5C7470]">
              <IconCalendar size={16} />
              <span>{selectedPlace.hours}</span>
            </div>
          </div>

          <p className="text-xs text-[#5C7470] leading-relaxed">
            {selectedPlace.description}
          </p>

          {/* Botón para abrir Check-in */}
          <div className="pt-1">
            <button
              onClick={() => setShowCheckInModal(true)}
              className="w-full bg-[#E1E53F] hover:bg-[#d8dc35] text-[#204E4A] font-extrabold text-sm py-4 rounded-full shadow-[0_6px_20px_rgba(225,229,63,0.35)] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <IconPin size={17} />
              <span>
                {isCheckedIn
                  ? lang === 'es'
                    ? 'Modificar Check-in'
                    : 'Edit Check-in'
                  : lang === 'es'
                    ? 'Hacer Check-in Temporal'
                    : 'Make Temporary Check-in'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmar Check-in */}
      {showCheckInModal && selectedPlace && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-slide-up">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full shadow-xs">
                  {lang === 'es' ? 'Presencia Temporal' : 'Temporary Presence'}
                </span>
                <h3 className="text-xl font-black text-[#204E4A]">
                  {lang === 'es' ? 'Aquí por un rato.' : 'Here for a while.'}
                </h3>
              </div>
              <button
                onClick={() => setShowCheckInModal(false)}
                className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#5C7470] hover:text-[#204E4A] flex items-center justify-center font-bold text-sm cursor-pointer shadow-xs"
              >
                <IconClose size={16} />
              </button>
            </div>

            <p className="text-xs text-[#5C7470]">
              {lang === 'es'
                ? 'Tu presencia es voluntaria y temporal. No se comparte tu recorrido ni tu domicilio exacto.'
                : 'Your presence is voluntary and temporary. Your route and address remain private.'}
            </p>

            <div className="space-y-3 pt-1 text-xs">
              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-[#5C7470]">
                  {lang === 'es' ? 'Lugar' : 'Place'}
                </span>
                <span className="font-extrabold text-[#204E4A] text-sm">
                  {selectedPlace.name}
                </span>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-[#5C7470]">
                  {lang === 'es' ? 'Me acompaña' : 'With me'}
                </span>
                <span className="font-extrabold text-[#204E4A] text-sm">
                  {activePetName}
                </span>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Visibilidad' : 'Visibility'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisibilityOption('privado')}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs ${visibilityOption === 'privado'
                        ? 'bg-[#204E4A] text-[#E1E53F]'
                        : 'bg-white text-[#5C7470]'
                      }`}
                  >
                    {lang === 'es' ? 'Sin mostrar perfil' : 'Anonymous'}
                  </button>
                  <button
                    onClick={() => setVisibilityOption('publico')}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs ${visibilityOption === 'publico'
                        ? 'bg-[#204E4A] text-[#E1E53F]'
                        : 'bg-white text-[#5C7470]'
                      }`}
                  >
                    {lang === 'es' ? 'Mascota visible' : 'Pet visible'}
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-[#5C7470] mb-1">
                  {lang === 'es' ? 'Duración estimada' : 'Duration'}
                </span>
                <div className="flex gap-2">
                  {['30 min', '1 hora', '2 horas'].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setDurationHours(dur)}
                      className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs ${durationHours === dur
                          ? 'bg-[#204E4A] text-[#E1E53F]'
                          : 'bg-white text-[#5C7470]'
                        }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCheckInModal(false)}
                className="flex-1 py-3.5 rounded-full font-bold text-xs bg-[#FAF8F5] text-[#5C7470] hover:bg-neutral-100 cursor-pointer transition-colors shadow-xs"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmCheckIn}
                className="flex-1 py-3.5 rounded-full font-extrabold text-xs bg-[#204E4A] text-[#E1E53F] shadow-md hover:bg-[#183d3a] cursor-pointer transition-all"
              >
                {lang === 'es' ? 'Confirmar Check-in' : 'Confirm Check-in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}