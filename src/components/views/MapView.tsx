import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import { ImmersivePlacesStage } from '../../features/places/components/ImmersivePlacesStage'
import { SuggestPlaceModal } from '../modals/SuggestPlaceModal'
import { PlacesWorkspace } from '../../features/places/components/PlacesWorkspace'
import { localizePlaceContent } from '../../features/places/placeContent'
import { IconCalendar } from '../icons/PazoIcons'
import { buildPlaceDirectionsUrl } from '../../features/places/placeDirections'

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
  useEffect(() => {
    if (!selectedPlaceId) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedPlaceId(null)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [selectedPlaceId])

  // A new request also re-centers repeated taps on the same carousel card.
  const [mapFocusRequest, setMapFocusRequest] = useState<{ placeId: string } | null>(null)
  const [activeCheckin, setActiveCheckin] =
    useState<ActivePlaceCheckin | null>(null)
  const [isCheckinBusy, setIsCheckinBusy] = useState(false)
  const [newCheckinVisible, setNewCheckinVisible] = useState(false)
  const [userLocation, setUserLocation] =
    useState<EphemeralLocation | null>(null)
  const [locationMessage, setLocationMessage] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [isSuggestOpen, setIsSuggestOpen] = useState(false)
  const handledRequestedPlaceKeyRef = useRef(0)

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

  // Carousel taps pan/zoom the map without opening the check-in detail.
  const handleFocusPlace = (placeId: string) => {
    setSelectedPlaceId(null)
    setMapFocusRequest({ placeId })
  }

  // Map pins (2D/3D) still open the complete details and check-in actions.
  const handleSelectPlace = (placeId: string) => {
    setSelectedPlaceId(placeId)
    setMapFocusRequest({ placeId })
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
    if (
      !requestedPlaceId ||
      requestedPlaceKey <= 0 ||
      requestedPlaceKey === handledRequestedPlaceKeyRef.current ||
      isLoading
    ) {
      return
    }

    const requestedPlace = places.find((place) => place.id === requestedPlaceId)
    if (!requestedPlace) return

    handledRequestedPlaceKeyRef.current = requestedPlaceKey
    setSearchQuery('')
    setCategory('all')
    setSelectedPlaceId(requestedPlaceId)
    setMapFocusRequest({ placeId: requestedPlaceId })

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
      <div className="relative h-full min-h-0 w-full animate-fade-in">
        <ImmersivePlacesStage
          lang={lang}
          places={displayPlaces}
          categoryOptions={categoryOptions}
          category={category}
          onCategory={handleCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchCommit={handleSearchCommit}
          selectedPlaceId={mapFocusRequest?.placeId ?? selectedPlaceId}
          focusPlaceRequest={mapFocusRequest}
          onFocusPlace={handleFocusPlace}
          onSelectPlace={handleSelectPlace}
          userLocation={userLocation}
          locationMessage={locationMessage}
          isLocating={isLocating}
          onUseLocation={handleUseLocation}
          canSuggest={canUsePlaces}
          onSuggest={() => setIsSuggestOpen(true)}
          activeCheckin={Boolean(activeCheckin)}
          isLoading={isLoading}
          loadError={loadError}
          onRetry={() => void loadPlaces()}
        >
        {selectedPlace && createPortal(
          <div data-pazo-place-backdrop="true"
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#163A34]/50 px-4 py-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-[2px]"
            onClick={(event) => { if (event.target === event.currentTarget) setSelectedPlaceId(null) }}>
          <PlacesWorkspace key={selectedPlace.id+':'+(currentPet?.id||'guest')} place={selectedPlace} lang={lang} canParticipate={canUsePlaces} onClose={()=>setSelectedPlaceId(null)}>{({open})=><>            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a
                data-pazo-directions="true"
                href={buildPlaceDirectionsUrl(selectedPlace,
                  typeof navigator !== 'undefined' ? navigator.userAgent : '')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#204E4A] px-4 py-2.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(32,78,74,0.12)] transition-colors hover:bg-[#2C665B] focus-visible:bg-[#2C665B]"
                aria-label={lang === 'es' ? `Cómo llegar a ${selectedPlace.name}` : `Directions to ${selectedPlace.name}`}
              >
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 6.5h8l4.5 4.5-8.5 8.5-8.5-8.5z"/>
                  <path d="M8.5 11.5h7M13 8.5l3 3-3 3"/>
                </svg>
                {lang === 'es' ? 'Cómo llegar' : 'Directions'}
              </a>
              {(selectedPlace.category==='park'||selectedPlace.category==='trail')&&<button type="button" className="place-route-entry" onClick={()=>open('routes')}>{lang==='es'?'Rutas y paseos':'Routes and walks'} <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12 12 4M4 4h8v8"/></svg></button>}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {selectedPlace.hours && (
                <div className="rounded-2xl bg-[#FAF8F5] p-3">
                  <p className="text-sm font-extrabold uppercase tracking-wider text-[#5C7470]">
                    {lang === 'es' ? 'Horario' : 'Hours'}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#204E4A]">
                    {selectedPlace.hours}
                  </p>
                </div>
              )}

              {selectedPlace.speciesAllowed && (
                <div className="rounded-2xl bg-[#FAF8F5] p-3">
                  <p className="text-sm font-extrabold uppercase tracking-wider text-[#5C7470]">
                    {lang === 'es'
                      ? 'Mascotas permitidas'
                      : 'Pets allowed'}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#204E4A]">
                    {localizePlaceContent(selectedPlace,lang).speciesAllowed}
                  </p>
                </div>
              )}
            </div>

            {selectedPlace.description && (
              <p className="mt-4 text-[15px] leading-relaxed text-[#5C7470]">
                {localizePlaceContent(selectedPlace,lang).description}
              </p>
            )}

            <button type="button" className="place-review-entry place-context-entry" onClick={()=>open('reviews')}><span className="place-context-icon" aria-hidden="true">☆</span><span><strong>{lang==='es'?'Opiniones del lugar':'Place reviews'}</strong><small>{lang==='es'?'Experiencias de quienes vienen con su mascota':'Experiences from people visiting with their pets'}</small></span><span aria-hidden="true">›</span></button>
            {!['park','trail'].includes(selectedPlace.category)&&<button type="button" className="place-offer-entry place-context-entry" onClick={()=>open('offers')}><span className="place-context-icon" aria-hidden="true">%</span><span><strong>{lang==='es'?'Promociones de este lugar':'Offers at this place'}</strong><small>{lang==='es'?'Un espacio para los beneficios del negocio':'A place for this business’s offers'}</small></span><span aria-hidden="true">›</span></button>}
            {selectedPlace.petRules && (
              <div className="mt-4 rounded-2xl bg-[#FAF8F5] p-3">
                <p className="text-sm font-extrabold uppercase tracking-wider text-[#5C7470]">
                  {lang === 'es'
                    ? 'Reglas pet-friendly'
                    : 'Pet-friendly rules'}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#204E4A]">
                  {localizePlaceContent(selectedPlace,lang).petRules}
                </p>
              </div>
            )}

            <button type="button" className="place-event-entry place-context-entry" onClick={()=>open('events')}><IconCalendar size={22}/><span><strong>{lang==='es'?'Actividades aquí':'Activities here'}</strong><small>{lang==='es'?'Encuentros para compartir este lugar':'Meetups to enjoy this place together'}</small></span><span aria-hidden="true">›</span></button>
            <div className="mt-4 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#204E4A]">
                    {selectedPlace.activePresenceCount || 0}{' '}
                    {lang === 'es'
                      ? 'mascotas presentes'
                      : 'pets present'}
                  </p>
                  <p className="mt-0.5 text-sm text-[#5C7470]">
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
                        <p className="text-sm font-black text-[#204E4A]">
                          {pet.name}
                        </p>
                        <p className="text-sm text-[#5C7470]">
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
                <p className="text-sm leading-relaxed text-white/80">
                  {lang === 'es'
                    ? 'Inicia sesión con una mascota real para hacer check-in.'
                    : 'Sign in with a real pet to check in.'}
                </p>
              ) : isCheckedIntoSelected && activeCheckin ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-black text-[#E1E53F]">
                      {lang === 'es'
                        ? `${currentPet.name} está aquí`
                        : `${currentPet.name} is here`}
                    </p>
                    <p className="mt-0.5 text-sm text-white/70">
                      {lang === 'es' ? 'Expira a las ' : 'Expires at '}
                      {formatExpiry(activeCheckin.expiresAt, lang)}
                    </p>
                  </div>

                  <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 p-3">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {lang === 'es'
                          ? `Mostrar a ${currentPet.name} aquí`
                          : `Show ${currentPet.name} here`}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-white/60">
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
                    className="w-full rounded-full bg-white py-2.5 text-sm font-black text-[#204E4A] disabled:opacity-50"
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
                    <p className="rounded-2xl bg-white/8 p-3 text-sm leading-relaxed text-white/75">
                      {lang === 'es'
                        ? 'Tu mascota ya tiene otro check-in activo. Al entrar aquí, PAZO cerrará el anterior automáticamente.'
                        : 'Your pet already has another active check-in. Checking in here will close the previous one automatically.'}
                    </p>
                  )}

                  <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 p-3">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {lang === 'es'
                          ? `Mostrar a ${currentPet.name} como presente`
                          : `Show ${currentPet.name} as present`}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-white/60">
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
                    className="w-full rounded-full bg-[#E1E53F] py-3 text-sm font-black text-[#204E4A] disabled:opacity-50"
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

</>}</PlacesWorkspace>
          </div>, document.body
        )}
        </ImmersivePlacesStage>
      </div>

      <SuggestPlaceModal
        isOpen={isSuggestOpen}
        onClose={() => setIsSuggestOpen(false)}
        lang={lang}
      />
    </>
  )
}
