import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  ActivePlaceCheckin,
  EphemeralLocation,
  Pet,
  PetPlace,
  PlaceCategory,
} from '../../types/pazo'
import {
  addDistances,
  enrichPlacesWithPresence,
  fetchPlaces,
} from '../../services/placeService'
import {
  endPlaceCheckin,
  fetchActivePlaceCheckin,
  setPlaceCheckinVisibility,
  startPlaceCheckin,
} from '../../services/placeCheckinService'
import { recordPlaceUsageEvent } from '../../services/placeTelemetryService'
import { MapboxMap } from '../../features/places/map/MapboxMap'
import { SuggestPlaceModal } from '../modals/SuggestPlaceModal'
import { PlaceFeatureExperimentCard } from '../validation/PlaceFeatureExperimentCard'
import {
  IconCheck,
  IconClose,
  IconExplore,
  IconPaw,
  IconPin,
  IconPlus,
} from '../icons/PazoIcons'

interface MapViewProps {
  currentPet: Pet | null
  canUsePlaces: boolean
  suggestPlaceRequestKey?: number
  requestedPlaceId?: string | null
  requestedPlaceKey?: number
  lang: 'es' | 'en'
}

type CategoryFilter = 'all' | PlaceCategory

const categoryOptions: Array<{
  value: CategoryFilter
  es: string
  en: string
}> = [
  { value: 'all', es: 'Todos', en: 'All' },
  { value: 'park', es: 'Parques', en: 'Parks' },
  { value: 'trail', es: 'Senderos', en: 'Trails' },
  { value: 'food', es: 'Comida / café', en: 'Food / cafe' },
  { value: 'veterinary', es: 'Veterinarias', en: 'Veterinary' },
  { value: 'grooming', es: 'Grooming', en: 'Grooming' },
  { value: 'pet_store', es: 'Tiendas', en: 'Stores' },
]

const categoryLabel = (
  category: PlaceCategory,
  lang: 'es' | 'en'
) =>
  categoryOptions.find((item) => item.value === category)?.[
    lang === 'es' ? 'es' : 'en'
  ] || category

const formatDistance = (distanceKm?: number) => {
  if (distanceKm === undefined) return ''
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))} m`
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`
}

const formatExpiry = (value: string, lang: 'es' | 'en') =>
  new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))

export const MapView = ({
  currentPet,
  canUsePlaces,
  suggestPlaceRequestKey = 0,
  requestedPlaceId = null,
  requestedPlaceKey = 0,
  lang,
}: MapViewProps) => {
  const [places, setPlaces] = useState<PetPlace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [activeCheckin, setActiveCheckin] =
    useState<ActivePlaceCheckin | null>(null)
  const [isCheckinBusy, setIsCheckinBusy] = useState(false)
  const [newCheckinVisible, setNewCheckinVisible] = useState(false)
  const [userLocation, setUserLocation] =
    useState<EphemeralLocation | null>(null)
  const [locationMessage, setLocationMessage] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [isSuggestOpen, setIsSuggestOpen] = useState(false)

  const loadPlaces = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const rows = await fetchPlaces({ limit: 200 })
      const enriched = canUsePlaces
        ? await enrichPlacesWithPresence(rows)
        : rows.map((place) => ({
            ...place,
            activePresenceCount: 0,
            visiblePets: [],
          }))

      setPlaces(enriched)
    } catch (error: any) {
      console.error('Error loading Places:', error)
      setLoadError(
        lang === 'es'
          ? 'No pudimos cargar los lugares.'
          : 'We could not load the places.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [canUsePlaces, lang])

  const loadCheckin = useCallback(async () => {
    if (!canUsePlaces || !currentPet?.id) {
      setActiveCheckin(null)
      return
    }

    try {
      const row = await fetchActivePlaceCheckin(currentPet.id)
      setActiveCheckin(row)
    } catch (error) {
      console.error('Error loading active Place check-in:', error)
      setActiveCheckin(null)
    }
  }, [canUsePlaces, currentPet?.id])

  const refreshPresenceAndCheckin = useCallback(async () => {
    await Promise.all([loadPlaces(), loadCheckin()])
  }, [loadCheckin, loadPlaces])

  useEffect(() => {
    void loadPlaces()
  }, [loadPlaces])

  useEffect(() => {
    void loadCheckin()
  }, [loadCheckin])

  useEffect(() => {
    if (!canUsePlaces) return
    void recordPlaceUsageEvent({ eventType: 'map_open' }).catch((error) =>
      console.error('Error recording map open:', error)
    )
  }, [canUsePlaces])

  useEffect(() => {
    if (suggestPlaceRequestKey > 0 && canUsePlaces) {
      setIsSuggestOpen(true)
    }
  }, [canUsePlaces, suggestPlaceRequestKey])

  const displayPlaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const filtered = places.filter((place) => {
      const categoryMatches =
        category === 'all' || place.category === category

      const searchMatches =
        !query ||
        [place.name, place.zone, place.address]
          .join(' ')
          .toLowerCase()
          .includes(query)

      return categoryMatches && searchMatches
    })

    return addDistances(filtered, userLocation)
  }, [category, places, searchQuery, userLocation])

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) || null,
    [places, selectedPlaceId]
  )

  const handleSelectPlace = (placeId: string) => {
    setSelectedPlaceId(placeId)
    const place = places.find((item) => item.id === placeId)

    if (canUsePlaces && place) {
      void recordPlaceUsageEvent({
        eventType: 'place_open',
        placeId,
        category: place.category,
      }).catch((error) =>
        console.error('Error recording place open:', error)
      )
    }
  }

  useEffect(() => {
    if (!requestedPlaceId || requestedPlaceKey <= 0 || isLoading) return

    const requestedPlace = places.find((place) => place.id === requestedPlaceId)
    if (!requestedPlace) return

    setSearchQuery('')
    setCategory('all')
    setSelectedPlaceId(requestedPlaceId)

    if (canUsePlaces) {
      void recordPlaceUsageEvent({
        eventType: 'place_open',
        placeId: requestedPlace.id,
        category: requestedPlace.category,
      }).catch((error) =>
        console.error('Error recording requested Place open:', error)
      )
    }
  }, [
    canUsePlaces,
    isLoading,
    places,
    requestedPlaceId,
    requestedPlaceKey,
  ])

  const handleCategory = (next: CategoryFilter) => {
    setCategory(next)

    if (canUsePlaces && next !== 'all') {
      void recordPlaceUsageEvent({
        eventType: 'filter',
        category: next,
      }).catch((error) =>
        console.error('Error recording Place filter:', error)
      )
    }
  }

  const handleSearchCommit = () => {
    if (!canUsePlaces || !searchQuery.trim()) return

    void recordPlaceUsageEvent({ eventType: 'search' }).catch((error) =>
      console.error('Error recording Place search:', error)
    )
  }

  const handleUseLocation = () => {
    if (isLocating) return

    if (!navigator.geolocation) {
      setLocationMessage(
        lang === 'es'
          ? 'Este dispositivo no ofrece geolocalización.'
          : 'This device does not provide geolocation.'
      )
      return
    }

    setIsLocating(true)
    setLocationMessage('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationMessage(
          lang === 'es'
            ? 'Ubicación usada solo en esta sesión.'
            : 'Location is being used only for this session.'
        )
        setIsLocating(false)

        if (canUsePlaces) {
          void recordPlaceUsageEvent({
            eventType: 'use_location',
          }).catch((error) =>
            console.error('Error recording location use:', error)
          )
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        setIsLocating(false)

        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? lang === 'es'
              ? 'No diste permiso de ubicación. El mapa seguirá funcionando normalmente.'
              : 'Location permission was not granted. The map still works normally.'
            : lang === 'es'
              ? 'No pudimos obtener tu ubicación. Puedes explorar el mapa manualmente.'
              : 'We could not get your location. You can explore the map manually.'
        )
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    )
  }

  const handleStartCheckin = async () => {
    if (
      !canUsePlaces ||
      !currentPet?.id ||
      !selectedPlace ||
      isCheckinBusy
    ) {
      return
    }

    setIsCheckinBusy(true)
    try {
      await startPlaceCheckin({
        placeId: selectedPlace.id,
        petId: currentPet.id,
        visible: newCheckinVisible,
      })

      await refreshPresenceAndCheckin()
    } catch (error: any) {
      console.error('Error starting Place check-in:', error)
      alert(
        lang === 'es'
          ? `No se pudo hacer check-in: ${error?.message || 'error inesperado'}`
          : `Could not check in: ${error?.message || 'unexpected error'}`
      )
    } finally {
      setIsCheckinBusy(false)
    }
  }

  const handleEndCheckin = async () => {
    if (!activeCheckin || isCheckinBusy) return

    setIsCheckinBusy(true)
    try {
      await endPlaceCheckin(activeCheckin.id)
      await refreshPresenceAndCheckin()
    } catch (error: any) {
      console.error('Error ending Place check-in:', error)
      alert(
        lang === 'es'
          ? `No se pudo salir del lugar: ${error?.message || 'error inesperado'}`
          : `Could not leave the place: ${error?.message || 'unexpected error'}`
      )
    } finally {
      setIsCheckinBusy(false)
    }
  }

  const handleVisibility = async (visible: boolean) => {
    if (!activeCheckin || isCheckinBusy) return

    setIsCheckinBusy(true)
    try {
      await setPlaceCheckinVisibility({
        checkinId: activeCheckin.id,
        visible,
      })
      await refreshPresenceAndCheckin()
    } catch (error: any) {
      console.error('Error updating Place visibility:', error)
      alert(
        lang === 'es'
          ? `No se pudo cambiar la visibilidad: ${error?.message || 'error inesperado'}`
          : `Could not change visibility: ${error?.message || 'unexpected error'}`
      )
    } finally {
      setIsCheckinBusy(false)
    }
  }

  const isCheckedIntoSelected =
    Boolean(activeCheckin) &&
    activeCheckin?.placeId === selectedPlace?.id

  return (
    <>
      <div className="space-y-4 animate-slide-up pb-8">
        <div className="flex items-start justify-between gap-3 px-1">
          <div>
            <span className="inline-block rounded-full bg-[#E1E53F] px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] shadow-xs">
              {lang === 'es' ? 'Lugares' : 'Places'}
            </span>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#204E4A]">
              {lang === 'es'
                ? 'Explora con tu mascota.'
                : 'Explore with your pet.'}
            </h2>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-[#5C7470]">
              {lang === 'es'
                ? 'Descubre lugares pet-friendly. Tu ubicación solo se usa si tú la activas y nunca se guarda.'
                : 'Discover pet-friendly places. Your location is only used when you choose and is never stored.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSuggestOpen(true)}
            disabled={!canUsePlaces}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[10px] font-black text-[#204E4A] shadow-sm disabled:opacity-50"
          >
            <IconPlus size={14} />
            {lang === 'es' ? 'Sugerir' : 'Suggest'}
          </button>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onBlur={handleSearchCommit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSearchCommit()
              }}
              placeholder={
                lang === 'es'
                  ? 'Buscar lugar, zona o dirección...'
                  : 'Search place, area, or address...'
              }
              className="w-full rounded-full bg-white py-3 pl-11 pr-4 text-xs text-[#204E4A] shadow-sm outline-none ring-1 ring-transparent focus:ring-[#204E4A]/15"
            />
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C7470]">
              <IconExplore size={16} />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categoryOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleCategory(option.value)}
                className={
                  'shrink-0 rounded-full px-3.5 py-2 text-[10px] font-bold shadow-xs transition-all ' +
                  (category === option.value
                    ? 'bg-[#204E4A] text-[#E1E53F]'
                    : 'bg-white text-[#5C7470]')
                }
              >
                {lang === 'es' ? option.es : option.en}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[2.2rem] bg-white p-2 shadow-sm">
          <div className="h-[43vh] min-h-[300px] max-h-[520px]">
            <MapboxMap
              places={displayPlaces}
              selectedPlaceId={selectedPlaceId}
              userLocation={userLocation}
              onSelectPlace={handleSelectPlace}
              lang={lang}
            />
          </div>

          <div className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#5C7470]">
                {lang === 'es' ? 'Privacidad' : 'Privacy'}
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-[#5C7470]">
                {locationMessage ||
                  (lang === 'es'
                    ? 'PAZO no solicita tu ubicación automáticamente.'
                    : 'PAZO never requests your location automatically.')}
              </p>
            </div>

            <button
              type="button"
              onClick={handleUseLocation}
              disabled={isLocating}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#E1E53F] px-4 py-2.5 text-[10px] font-black text-[#204E4A] shadow-xs disabled:opacity-50"
            >
              <IconPin size={14} />
              {isLocating
                ? lang === 'es'
                  ? 'Buscando...'
                  : 'Locating...'
                : userLocation
                  ? lang === 'es'
                    ? 'Ubicación activa'
                    : 'Location active'
                  : lang === 'es'
                    ? 'Usar mi ubicación'
                    : 'Use my location'}
            </button>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-end justify-between px-1">
            <div>
              <h3 className="text-sm font-black text-[#204E4A]">
                {lang === 'es' ? 'Lugares disponibles' : 'Available places'}
              </h3>
              <p className="mt-0.5 text-[10px] text-[#5C7470]">
                {displayPlaces.length}{' '}
                {lang === 'es' ? 'resultados' : 'results'}
              </p>
            </div>

            {activeCheckin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E1E53F]/45 px-3 py-1.5 text-[9px] font-extrabold text-[#204E4A]">
                <IconCheck size={12} />
                {lang === 'es' ? 'Check-in activo' : 'Active check-in'}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center rounded-[2rem] bg-white py-8 shadow-sm">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#204E4A]/20 border-t-[#204E4A]" />
            </div>
          ) : loadError ? (
            <div className="rounded-[2rem] bg-white p-5 text-center shadow-sm">
              <p className="text-xs font-black text-[#204E4A]">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadPlaces()}
                className="mt-3 rounded-full bg-[#E1E53F] px-4 py-2 text-[10px] font-black text-[#204E4A]"
              >
                {lang === 'es' ? 'Reintentar' : 'Retry'}
              </button>
            </div>
          ) : displayPlaces.length === 0 ? (
            <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
              <IconPin size={22} className="mx-auto text-[#204E4A]/50" />
              <p className="mt-2 text-xs font-black text-[#204E4A]">
                {lang === 'es'
                  ? 'No encontramos lugares con esos filtros.'
                  : 'No places match those filters.'}
              </p>
              <p className="mt-1 text-[10px] text-[#5C7470]">
                {lang === 'es'
                  ? 'Puedes cambiar la búsqueda o sugerir un lugar para revisión.'
                  : 'Change the search or suggest a place for review.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayPlaces.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleSelectPlace(place.id)}
                  className={
                    'w-full rounded-[2rem] bg-white p-4 text-left shadow-sm transition-all ' +
                    (selectedPlaceId === place.id
                      ? 'ring-2 ring-[#E1E53F]'
                      : 'ring-1 ring-transparent')
                  }
                >
                  <div className="flex gap-3">
                    <img
                      src={place.photoUrl}
                      alt={place.name}
                      className="h-20 w-20 shrink-0 rounded-[1.4rem] bg-[#FAF8F5] object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-[#204E4A]">
                            {place.name}
                          </p>
                          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-[#5C7470]">
                            {categoryLabel(place.category, lang)}
                            {' · '}
                            {place.zone}
                          </p>
                        </div>

                        {place.distanceKm !== undefined && (
                          <span className="shrink-0 rounded-full bg-[#FAF8F5] px-2.5 py-1 text-[9px] font-bold text-[#204E4A]">
                            {formatDistance(place.distanceKm)}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-[#5C7470]">
                        {place.description || place.address}
                      </p>

                      <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-[#204E4A]">
                        <IconPaw size={12} />
                        {place.activePresenceCount || 0}{' '}
                        {lang === 'es'
                          ? 'mascotas presentes'
                          : 'pets present'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {selectedPlace && (
          <section className="rounded-[2.3rem] bg-white p-5 shadow-md ring-1 ring-[#204E4A]/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#5C7470]">
                  {categoryLabel(selectedPlace.category, lang)}
                </p>
                <h3 className="mt-1 text-lg font-black text-[#204E4A]">
                  {selectedPlace.name}
                </h3>
                <p className="mt-1 text-[10px] text-[#5C7470]">
                  {selectedPlace.address}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlaceId(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-[#204E4A]"
                aria-label={lang === 'es' ? 'Cerrar detalle' : 'Close details'}
              >
                <IconClose size={14} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {selectedPlace.hours && (
                <div className="rounded-2xl bg-[#FAF8F5] p-3">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#5C7470]">
                    {lang === 'es' ? 'Horario' : 'Hours'}
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-[#204E4A]">
                    {selectedPlace.hours}
                  </p>
                </div>
              )}

              {selectedPlace.speciesAllowed && (
                <div className="rounded-2xl bg-[#FAF8F5] p-3">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#5C7470]">
                    {lang === 'es'
                      ? 'Mascotas permitidas'
                      : 'Pets allowed'}
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-[#204E4A]">
                    {selectedPlace.speciesAllowed}
                  </p>
                </div>
              )}
            </div>

            {selectedPlace.description && (
              <p className="mt-4 text-xs leading-relaxed text-[#5C7470]">
                {selectedPlace.description}
              </p>
            )}

            {selectedPlace.petRules && (
              <div className="mt-4 rounded-2xl bg-[#FAF8F5] p-3">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#5C7470]">
                  {lang === 'es'
                    ? 'Reglas pet-friendly'
                    : 'Pet-friendly rules'}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[10px] leading-relaxed text-[#204E4A]">
                  {selectedPlace.petRules}
                </p>
              </div>
            )}

            <div className="mt-4 border-t border-[#204E4A]/8 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#204E4A]">
                    {selectedPlace.activePresenceCount || 0}{' '}
                    {lang === 'es'
                      ? 'mascotas presentes'
                      : 'pets present'}
                  </p>
                  <p className="mt-0.5 text-[9px] text-[#5C7470]">
                    {lang === 'es'
                      ? 'El contador incluye check-ins privados. Solo se muestran mascotas con permiso.'
                      : 'The count includes private check-ins. Only opted-in pets are shown.'}
                  </p>
                </div>
              </div>

              {(selectedPlace.visiblePets || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selectedPlace.visiblePets || []).map((pet) => (
                    <div
                      key={pet.id}
                      className="flex items-center gap-2 rounded-full bg-[#FAF8F5] py-1.5 pl-1.5 pr-3"
                    >
                      <img
                        src={pet.photoUrl}
                        alt={pet.name}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-[9px] font-black text-[#204E4A]">
                          {pet.name}
                        </p>
                        <p className="text-[8px] text-[#5C7470]">
                          {pet.species}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-[1.8rem] bg-[#204E4A] p-4 text-white">
              {!canUsePlaces || !currentPet ? (
                <p className="text-[10px] leading-relaxed text-white/80">
                  {lang === 'es'
                    ? 'Inicia sesión con una mascota real para hacer check-in.'
                    : 'Sign in with a real pet to check in.'}
                </p>
              ) : isCheckedIntoSelected && activeCheckin ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-black text-[#E1E53F]">
                      {lang === 'es'
                        ? `${currentPet.name} está aquí`
                        : `${currentPet.name} is here`}
                    </p>
                    <p className="mt-0.5 text-[9px] text-white/70">
                      {lang === 'es' ? 'Expira a las ' : 'Expires at '}
                      {formatExpiry(activeCheckin.expiresAt, lang)}
                    </p>
                  </div>

                  <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 p-3">
                    <div>
                      <p className="text-[10px] font-bold text-white">
                        {lang === 'es'
                          ? `Mostrar a ${currentPet.name} aquí`
                          : `Show ${currentPet.name} here`}
                      </p>
                      <p className="mt-0.5 text-[8px] leading-relaxed text-white/60">
                        {lang === 'es'
                          ? 'Si está apagado, solo cuenta como una mascota presente.'
                          : 'When off, the check-in only contributes to the presence count.'}
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={activeCheckin.visible}
                      disabled={isCheckinBusy}
                      onChange={(event) =>
                        void handleVisibility(event.target.checked)
                      }
                      className="h-4 w-4 accent-[#E1E53F]"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => void handleEndCheckin()}
                    disabled={isCheckinBusy}
                    className="w-full rounded-full bg-white py-2.5 text-[10px] font-black text-[#204E4A] disabled:opacity-50"
                  >
                    {isCheckinBusy
                      ? lang === 'es'
                        ? 'Actualizando...'
                        : 'Updating...'
                      : lang === 'es'
                        ? 'Salir del lugar'
                        : 'Leave place'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCheckin && (
                    <p className="rounded-2xl bg-white/8 p-3 text-[9px] leading-relaxed text-white/75">
                      {lang === 'es'
                        ? 'Tu mascota ya tiene otro check-in activo. Al entrar aquí, PAZO cerrará el anterior automáticamente.'
                        : 'Your pet already has another active check-in. Checking in here will close the previous one automatically.'}
                    </p>
                  )}

                  <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 p-3">
                    <div>
                      <p className="text-[10px] font-bold text-white">
                        {lang === 'es'
                          ? `Mostrar a ${currentPet.name} como presente`
                          : `Show ${currentPet.name} as present`}
                      </p>
                      <p className="mt-0.5 text-[8px] leading-relaxed text-white/60">
                        {lang === 'es'
                          ? 'Apagado por defecto. El contador seguirá aumentando sin mostrar su identidad.'
                          : 'Off by default. The count still increases without showing their identity.'}
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={newCheckinVisible}
                      onChange={(event) =>
                        setNewCheckinVisible(event.target.checked)
                      }
                      className="h-4 w-4 accent-[#E1E53F]"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => void handleStartCheckin()}
                    disabled={isCheckinBusy}
                    className="w-full rounded-full bg-[#E1E53F] py-3 text-[10px] font-black text-[#204E4A] disabled:opacity-50"
                  >
                    {isCheckinBusy
                      ? lang === 'es'
                        ? 'Entrando...'
                        : 'Checking in...'
                      : lang === 'es'
                        ? 'Estoy aquí'
                        : "I'm here"}
                  </button>
                </div>
              )}
            </div>

            {canUsePlaces && (
              <div className="mt-5 border-t border-[#204E4A]/8 pt-4">
                <div className="mb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#5C7470]">
                        {lang === 'es'
                          ? 'Funciones en desarrollo'
                          : 'Features in development'}
                      </p>
                      <h4 className="mt-1 text-sm font-black text-[#204E4A]">
                        {lang === 'es'
                          ? '¿Qué te gustaría hacer aquí después?'
                          : 'What would you like to do here next?'}
                      </h4>
                    </div>
                    <span className="rounded-full bg-[#E1E53F]/45 px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-wider text-[#204E4A]">
                      {lang === 'es' ? 'Ayúdanos a priorizar' : 'Help us prioritize'}
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] leading-relaxed text-[#5C7470]">
                    {lang === 'es'
                      ? 'Estas funciones todavía no están activas. Marca solo las que realmente usarías en este tipo de lugar.'
                      : 'These features are not active yet. Mark only the ones you would actually use for this type of place.'}
                  </p>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <PlaceFeatureExperimentCard
                    moduleKey="places_reviews"
                    title={
                      lang === 'es'
                        ? 'Reseñas y calificaciones'
                        : 'Reviews and ratings'
                    }
                    description={
                      lang === 'es'
                        ? 'Leer experiencias de otros dueños y valorar qué tan pet-friendly es este lugar.'
                        : 'Read other owners’ experiences and rate how pet-friendly this place is.'
                    }
                    source={`place_detail_${selectedPlace.category}`}
                    lang={lang}
                  />

                  <PlaceFeatureExperimentCard
                    moduleKey="places_favorites"
                    title={lang === 'es' ? 'Guardar y crear listas' : 'Save and create lists'}
                    description={
                      lang === 'es'
                        ? 'Guardar lugares favoritos y organizarlos para volver después.'
                        : 'Save favorite places and organize them for later.'
                    }
                    source={`place_detail_${selectedPlace.category}`}
                    lang={lang}
                  />

                  <PlaceFeatureExperimentCard
                    moduleKey="places_user_photos"
                    title={lang === 'es' ? 'Fotos de la comunidad' : 'Community photos'}
                    description={
                      lang === 'es'
                        ? 'Ver y compartir fotos reales de mascotas y espacios dentro del lugar.'
                        : 'See and share real photos of pets and spaces at this place.'
                    }
                    source={`place_detail_${selectedPlace.category}`}
                    lang={lang}
                  />

                  <PlaceFeatureExperimentCard
                    moduleKey="places_events"
                    title={lang === 'es' ? 'Eventos en este lugar' : 'Events at this place'}
                    description={
                      lang === 'es'
                        ? 'Descubrir encuentros, actividades y eventos pet-friendly organizados aquí.'
                        : 'Discover meetups, activities, and pet-friendly events organized here.'
                    }
                    source={`place_detail_${selectedPlace.category}`}
                    lang={lang}
                  />

                  <PlaceFeatureExperimentCard
                    moduleKey="places_routes"
                    title={lang === 'es' ? 'Rutas y caminatas' : 'Routes and walks'}
                    description={
                      lang === 'es'
                        ? 'Encontrar o seguir rutas para caminar con tu mascota alrededor de este lugar.'
                        : 'Find or follow routes for walking with your pet around this place.'
                    }
                    source={`place_detail_${selectedPlace.category}`}
                    lang={lang}
                  />

                  <PlaceFeatureExperimentCard
                    moduleKey="places_business_offers"
                    title={
                      lang === 'es'
                        ? 'Ofertas del negocio'
                        : 'Business offers'
                    }
                    description={
                      lang === 'es'
                        ? 'Recibir promociones o beneficios pet-friendly publicados por negocios verificados.'
                        : 'Receive pet-friendly offers or benefits from verified businesses.'
                    }
                    source={`place_detail_${selectedPlace.category}`}
                    lang={lang}
                  />
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <SuggestPlaceModal
        isOpen={isSuggestOpen}
        onClose={() => setIsSuggestOpen(false)}
        lang={lang}
      />
    </>
  )
}
