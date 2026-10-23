import type { ReactNode } from 'react'
import type { EphemeralLocation, PetPlace, PlaceCategory } from '../../../types/pazo'
import { MapboxMap } from '../map/MapboxMap'
import { PlaceCardPhoto } from './PlaceCardPhoto'
import { getCuratedPlacePhoto } from '../curatedPlacePhotography'
import { IconCheck, IconExplore, IconPaw, IconPin, IconPlus } from '../../../components/icons/PazoIcons'

type CategoryFilter = 'all' | PlaceCategory
type CategoryOption = { value: CategoryFilter; es: string; en: string }

interface ImmersivePlacesStageProps {
  lang: 'es' | 'en'
  places: PetPlace[]
  categoryOptions: CategoryOption[]
  category: CategoryFilter
  onCategory: (category: CategoryFilter) => void
  searchQuery: string
  onSearchChange: (value: string) => void
  onSearchCommit: () => void
  selectedPlaceId: string | null
  focusPlaceRequest: { placeId: string } | null
  onFocusPlace: (placeId: string) => void
  onSelectPlace: (placeId: string) => void
  userLocation: EphemeralLocation | null
  locationMessage: string
  isLocating: boolean
  onUseLocation: () => void
  canSuggest: boolean
  onSuggest: () => void
  activeCheckin: boolean
  isLoading: boolean
  loadError: string
  onRetry: () => void
  children?: ReactNode
}

const showDistance = (distanceKm?: number) =>
  distanceKm === undefined
    ? null
    : distanceKm < 1
      ? `${Math.max(1, Math.round(distanceKm * 1000))} m`
      : `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`

/**
 * F13 Opción 3: one contiguous map canvas with floating search, filters and
 * genuine horizontally scrollable places. No synthetic reviews, favorites,
 * distances, user locations, or new tracking events.
 */
export const ImmersivePlacesStage = ({
  lang, places, categoryOptions, category, onCategory,
  searchQuery, onSearchChange, onSearchCommit,
  selectedPlaceId, focusPlaceRequest, onFocusPlace, onSelectPlace, userLocation, locationMessage,
  isLocating, onUseLocation, canSuggest, onSuggest, activeCheckin,
  isLoading, loadError, onRetry, children,
}: ImmersivePlacesStageProps) => (
  <section
    aria-label={lang === 'es' ? 'Explorar lugares en el mapa' : 'Explore places on map'}
    className="relative isolate h-full min-h-[370px] w-full overflow-hidden bg-[#FAF8F5]"
  >
    {/* Mapbox occupies the ENTIRE module, not a framed card. */}
    <div className="absolute inset-0 z-0 [&_.mapboxgl-ctrl-top-right]:!right-2 [&_.mapboxgl-ctrl-top-right]:!top-[132px]">
      <MapboxMap
        places={places}
        focusPlaceRequest={focusPlaceRequest}
        userLocation={userLocation}
        onSelectPlace={onSelectPlace}
        lang={lang}
        immersive
      />
    </div>

    {/* Gradual blending at all 4 edges. Gradient layers must not eat map gestures. */}
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-24 bg-gradient-to-b from-[#FAF8F5] via-[#FAF8F5]/45 to-transparent sm:h-32 sm:via-[#FAF8F5]/70" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[165px] bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/40 to-transparent sm:h-[270px] sm:via-[#FAF8F5]/65" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-7 bg-gradient-to-r from-[#FAF8F5]/85 to-transparent" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-7 bg-gradient-to-l from-[#FAF8F5]/85 to-transparent" />

    <div className="absolute inset-x-3 top-3 z-20 space-y-2 sm:inset-x-5 sm:top-4">
      <div className="flex items-center gap-2 rounded-full bg-transparent p-0 shadow-none">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{lang === 'es' ? 'Buscar lugar, zona o dirección' : 'Search place, area or address'}</span>
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#204E4A]">
            <IconExplore size={19} />
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            onBlur={onSearchCommit}
            onKeyDown={(event) => { if (event.key === 'Enter') onSearchCommit() }}
            placeholder={lang === 'es' ? 'Buscar lugar, zona o dirección...' : 'Search place, area, or address...'}
            className="h-11 w-full min-w-0 rounded-full bg-white/90 py-2 pl-10 pr-3 text-[13px] font-semibold text-[#204E4A] shadow-[0_2px_8px_rgba(32,78,74,0.05)] outline-none placeholder:text-[#8A9D97] focus:bg-[#E9F1E7]"
          />
        </label>
        <button
          type="button"
          onClick={onSuggest}
          disabled={!canSuggest}
          aria-label={lang === 'es' ? 'Sugerir un lugar' : 'Suggest a place'}
          title={lang === 'es' ? 'Sugerir un lugar' : 'Suggest a place'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#204E4A] shadow-[0_2px_8px_rgba(32,78,74,0.05)] transition-colors hover:bg-[#E1E53F]/50 focus-visible:bg-[#E1E53F]/50 disabled:opacity-50"
        >
          <IconPlus size={20}/>
        </button>
      </div>
      <div
        role="group"
        aria-label={lang === 'es' ? 'Categorías de lugares' : 'Place categories'}
        data-pazo-category-fade="true"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent 0, black 20px, black calc(100% - 24px), transparent 100%)',
          maskImage: 'linear-gradient(to right, transparent 0, black 20px, black calc(100% - 24px), transparent 100%)',
        }}
        className="flex gap-1.5 overflow-x-auto bg-transparent px-5 py-1.5 shadow-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categoryOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={category === option.value}
            onClick={() => onCategory(option.value)}
            className={`min-h-9 shrink-0 rounded-full px-3.5 py-2 text-[11px] font-extrabold transition-colors ${category === option.value
              ? 'bg-[#204E4A] text-[#E1E53F] shadow-[0_3px_9px_rgba(32,78,74,0.11)]'
              : 'bg-white/90 text-[#204E4A] hover:bg-[#E1E53F]/35 focus-visible:bg-[#E1E53F]/35'}`}
          >
            {lang === 'es' ? option.es : option.en}
          </button>
        ))}
      </div>
      {(locationMessage || activeCheckin) && (
        <div role="status" className="flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl bg-white/85 px-3 py-2 text-[11px] font-semibold text-[#204E4A] shadow-sm backdrop-blur-lg">
          {activeCheckin && <><IconCheck size={13}/>{lang === 'es' ? 'Check-in activo' : 'Active check-in'}</>}
          {locationMessage && <span>{locationMessage}</span>}
        </div>
      )}
    </div>

    {/* Mapbox renders legally required provider attribution in its own control. */}

    {/* Uses current voluntary-location action. Never calls geolocation on mount. */}
    <div className="absolute right-3 top-[145px] z-20 flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onUseLocation}
        disabled={isLocating}
        title={lang === 'es' ? 'Usar mi ubicación' : 'Use my location'}
        aria-label={lang === 'es' ? 'Usar mi ubicación' : 'Use my location'}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E1E53F] text-[#204E4A] shadow-[0_4px_16px_rgba(32,78,74,0.12)] transition-colors hover:bg-[#D5DB2A] focus-visible:bg-[#D5DB2A] disabled:opacity-60"
      >
        <IconPin size={20} />
      </button>
      <span className="max-w-[115px] rounded-full bg-white/90 px-2 py-1 text-center text-[11px] font-semibold leading-tight text-[#204E4A]">
        {isLocating
          ? (lang === 'es' ? 'Buscando…' : 'Locating…')
          : userLocation
            ? (lang === 'es' ? 'Ubicación activa' : 'Location active')
            : (lang === 'es' ? 'Ubicación opcional' : 'Location optional')}
      </span>
    </div>

    {/* The cards and title sit above the floating dock. Map and cards never
        get an extra vertical scrollbar; only the cards scroll horizontally. */}
    <div data-pazo-places-bottom-rail="true"
      className="pointer-events-none absolute inset-x-0 bottom-[calc(6.75rem+env(safe-area-inset-bottom))] z-20 flex max-h-[min(44dvh,345px)] flex-col bg-transparent">
      <div data-pazo-places-fixed-heading="true" className="pointer-events-none relative z-20 mb-2 flex shrink-0 items-end justify-between gap-3 px-4 sm:px-6">
        <div className="min-w-0 max-w-full">
          <h2 className="text-[15px] font-black leading-tight text-[#204E4A]">
            {lang === 'es' ? 'Lugares disponibles' : 'Available places'}
          </h2>
          <p aria-live="polite" className="text-[11px] font-semibold text-[#5C7470]">
            {places.length} {lang === 'es' ? 'resultados' : 'results'}
          </p>
        </div>
        <span className="sr-only">
          {lang === 'es'
            ? 'Tu ubicación se usa solo si la activas; no se guarda.'
            : 'Location is only used with permission; never stored.'}
        </span>
      </div>
      <div data-pazo-places-card-scroll="true" className="pointer-events-auto min-h-0 overflow-visible bg-transparent">

      {isLoading ? (
        <div role="status" className="mx-4 flex min-h-[170px] items-center justify-center rounded-[1.8rem] bg-white/90 px-5 text-[13px] font-bold text-[#204E4A] shadow-sm">
          {lang === 'es' ? 'Cargando lugares…' : 'Loading places…'}
        </div>
      ) : loadError ? (
        <div role="alert" className="mx-4 min-h-[170px] space-y-3 rounded-[1.8rem] bg-white/95 p-5 text-center shadow-sm">
          <p className="text-[13px] font-bold text-[#204E4A]">{loadError}</p>
          <button type="button" onClick={onRetry} className="rounded-full bg-[#204E4A] px-5 py-2.5 text-[12px] font-black text-white">
            {lang === 'es' ? 'Reintentar' : 'Retry'}
          </button>
        </div>
      ) : places.length === 0 ? (
        <div className="mx-4 flex min-h-[170px] flex-col items-center justify-center rounded-[1.8rem] bg-white/95 px-5 py-4 text-center shadow-sm">
          <IconPin size={23} className="text-[#204E4A]/55"/>
          <p className="mt-2 text-[13px] font-extrabold text-[#204E4A]">
            {lang === 'es' ? 'No encontramos lugares con esos filtros.' : 'No places match those filters.'}
          </p>
          <p className="mt-1 text-xs text-[#5C7470]">
            {lang === 'es' ? 'Cambia tu búsqueda o sugiere un lugar para revisión.' : 'Change your search or suggest a place for review.'}
          </p>
        </div>
      ) : (
        <div
          role="region"
          aria-label={lang === 'es' ? 'Carrusel horizontal de lugares' : 'Horizontal places carousel'}
          tabIndex={0}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 pr-12 scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6"
        >
          {places.map((place) => {
            const distance = showDistance(place.distanceKm)
            const categoryName = categoryOptions.find((option) => option.value === place.category)
            const photoCredit = !place.photoUrl?.trim() ? getCuratedPlacePhoto(place.name) : null
            return (
              <article
                key={place.id}
                className={`pazo-place-card group relative flex w-[215px] max-w-[75vw] shrink-0 snap-start flex-col overflow-hidden rounded-[1.8rem] shadow-[0_10px_27px_rgba(32,78,74,0.11)] transition-colors sm:w-[242px] ${selectedPlaceId === place.id
                  ? 'bg-[#EAF2E4]'
                  : 'bg-[#FFFCF6]/95 hover:bg-[#F1F5EC] focus-within:bg-[#F1F5EC]'}`}
              >
                <button
                  type="button"
                  onClick={() => onFocusPlace(place.id)}
                  aria-label={lang === 'es' ? `Centrar mapa en ${place.name}` : `Center map on ${place.name}`}
                  className="flex w-full flex-1 flex-col rounded-[1.8rem] p-2 text-left"
                >
                <div className="relative">
                  <PlaceCardPhoto place={place} lang={lang} />
                  {distance && <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-[#204E4A]">{distance}</span>}
                </div>
                <div className="flex min-h-[64px] flex-col px-1.5 pb-0.5 pt-2">
                  <span className="line-clamp-2 text-[14px] font-black leading-tight text-[#204E4A]">{place.name}</span>
                  <span className="mt-1 truncate text-[10px] font-extrabold uppercase tracking-[0.025em] text-[#68817B]">
                    {categoryName ? (lang === 'es' ? categoryName.es : categoryName.en) : place.category}{place.zone ? ` · ${place.zone}` : ''}
                  </span>
                  <span className="mt-auto flex items-center gap-1 pt-1.5 text-[10px] font-bold text-[#204E4A]">
                    <IconPaw size={13}/>
                    {place.activePresenceCount || 0} {lang === 'es' ? 'mascotas presentes' : 'pets present'}
                  </span>
                </div>
                </button>
                {photoCredit&&(
                  <div className="pazo-photo-credit absolute left-3 top-[96px] z-[2] hidden max-w-[calc(100%-24px)] items-center gap-1 truncate rounded-full bg-[#204E4A]/75 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                    <a className="truncate hover:underline focus-visible:underline"
                      href={photoCredit.sourceUrl} target="_blank" rel="noopener noreferrer"
                      title={lang==='es'?`Foto: ${photoCredit.author}. Wikimedia Commons`:`Photo: ${photoCredit.author}. Wikimedia Commons`}>
                      {photoCredit.author}
                    </a>
                    <span aria-hidden="true">·</span>
                    <a className="shrink-0 hover:underline focus-visible:underline"
                      href={photoCredit.licenseUrl} target="_blank" rel="noopener noreferrer"
                      title={lang==='es'?'Licencia de la fotografía':'Photo license'}>
                      {photoCredit.license}
                    </a>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
       </div>
    </div>
    {children}
  </section>
)
