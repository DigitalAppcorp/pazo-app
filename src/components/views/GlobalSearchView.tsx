import { useEffect, useMemo, useRef, useState } from 'react'
import { searchGlobal } from '../../features/search/searchService'
import type {
  GlobalSearchResponse,
  GlobalSearchResult,
  SearchEntityType,
  SearchFilter,
} from '../../features/search/types'
import {
  IconClose,
  IconCommunity,
  IconExplore,
  IconMap,
  IconPaw,
} from '../icons/PazoIcons'

interface GlobalSearchViewProps {
  canSearch: boolean
  onClose: () => void
  onSelectPet: (petId: string) => void
  onSelectCommunity: (communityId: string) => void
  onSelectPlace: (placeId: string) => void
  lang: 'es' | 'en'
}

const EMPTY_RESPONSE: GlobalSearchResponse = {
  pets: [],
  communities: [],
  places: [],
  failedTypes: [],
}

const groupConfig = {
  pet: {
    es: 'Mascotas',
    en: 'Pets',
    icon: IconPaw,
  },
  community: {
    es: 'Comunidades',
    en: 'Communities',
    icon: IconCommunity,
  },
  place: {
    es: 'Lugares',
    en: 'Places',
    icon: IconMap,
  },
} satisfies Record<
  SearchEntityType,
  {
    es: string
    en: string
    icon: typeof IconPaw
  }
>

export const GlobalSearchView = ({
  canSearch,
  onClose,
  onSelectPet,
  onSelectCommunity,
  onSelectPlace,
  lang,
}: GlobalSearchViewProps) => {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchFilter>('all')
  const [response, setResponse] = useState<GlobalSearchResponse>(EMPTY_RESPONSE)
  const [isLoading, setIsLoading] = useState(false)
  const [unexpectedError, setUnexpectedError] = useState(false)
  const requestVersionRef = useRef(0)

  const trimmedQuery = query.trim()

  useEffect(() => {
    if (!canSearch || !trimmedQuery) {
      requestVersionRef.current += 1
      setResponse(EMPTY_RESPONSE)
      setIsLoading(false)
      setUnexpectedError(false)
      return
    }

    const version = ++requestVersionRef.current
    setIsLoading(true)
    setUnexpectedError(false)

    const timer = window.setTimeout(() => {
      void searchGlobal(trimmedQuery)
        .then((nextResponse) => {
          if (requestVersionRef.current !== version) return
          setResponse(nextResponse)
        })
        .catch((error) => {
          if (requestVersionRef.current !== version) return
          console.error('Unexpected Global Search error:', error)
          setResponse(EMPTY_RESPONSE)
          setUnexpectedError(true)
        })
        .finally(() => {
          if (requestVersionRef.current === version) {
            setIsLoading(false)
          }
        })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [canSearch, trimmedQuery])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const totalResults =
    response.pets.length + response.communities.length + response.places.length

  const groups = useMemo(
    () =>
      [
        ['pet', response.pets],
        ['community', response.communities],
        ['place', response.places],
      ] as Array<[SearchEntityType, GlobalSearchResult[]]>,
    [response]
  )

  const handleSelect = (result: GlobalSearchResult) => {
    if (result.type === 'pet') onSelectPet(result.id)
    if (result.type === 'community') onSelectCommunity(result.id)
    if (result.type === 'place') onSelectPlace(result.id)
  }

  const renderResult = (result: GlobalSearchResult) => (
    <button
      key={`${result.type}-${result.id}`}
      type="button"
      onClick={() => handleSelect(result)}
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-[0_3px_14px_rgba(32,78,74,0.04)] transition-all hover:shadow-md"
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-[#FAF8F5]">
        {result.imageUrl ? (
          <img
            src={result.imageUrl}
            alt={result.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#204E4A]/60">
            {result.type === 'pet' && <IconPaw size={18} />}
            {result.type === 'community' && <IconCommunity size={18} />}
            {result.type === 'place' && <IconMap size={18} />}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[#204E4A]">
          {result.title}
        </p>
        {result.subtitle && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-[#5C7470]">
            {result.subtitle}
          </p>
        )}
        {result.meta && result.meta.length > 0 && (
          <p className="mt-1 truncate text-[10px] font-semibold text-[#5C7470]/70">
            {result.meta.join(' · ')}
          </p>
        )}
      </div>

      <span className="text-lg font-black text-[#204E4A]/35">›</span>
    </button>
  )

  return (
    <div className="absolute inset-0 z-[90] flex flex-col bg-[#FAF8F5] text-[#204E4A] animate-slide-up">
      <div className="sticky top-0 z-10 border-b border-[#204E4A]/5 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-[#204E4A] shadow-xs"
            aria-label={lang === 'es' ? 'Cerrar búsqueda' : 'Close search'}
          >
            <IconClose size={16} />
          </button>

          <div className="relative min-w-0 flex-1">
            <input
              autoFocus
              type="search"
              value={query}
              maxLength={80}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                lang === 'es'
                  ? 'Buscar mascotas, comunidades o lugares'
                  : 'Search pets, communities or places'
              }
              className="w-full rounded-full bg-[#FAF8F5] py-3 pl-10 pr-4 text-sm font-semibold text-[#204E4A] shadow-inner outline-none placeholder:text-[#5C7470]/60"
            />
            <IconExplore
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C7470]"
            />
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {(
            [
              ['all', lang === 'es' ? 'Todos' : 'All'],
              ['pet', lang === 'es' ? 'Mascotas' : 'Pets'],
              ['community', lang === 'es' ? 'Comunidades' : 'Communities'],
              ['place', lang === 'es' ? 'Lugares' : 'Places'],
            ] as Array<[SearchFilter, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={
                'shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ' +
                (filter === key
                  ? 'bg-[#204E4A] text-[#E1E53F]'
                  : 'bg-[#FAF8F5] text-[#5C7470]')
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {!canSearch ? (
          <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-black text-[#204E4A]">
              {lang === 'es'
                ? 'Inicia sesión con una cuenta real para buscar en PAZO.'
                : 'Sign in with a real account to search PAZO.'}
            </p>
          </div>
        ) : !trimmedQuery ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E1E53F] text-[#204E4A] shadow-sm">
              <IconExplore size={26} />
            </div>
            <h2 className="mt-5 text-xl font-black text-[#204E4A]">
              {lang === 'es' ? 'Busca en todo PAZO' : 'Search all of PAZO'}
            </h2>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-[#5C7470]">
              {lang === 'es'
                ? 'Encuentra mascotas, comunidades y lugares reales desde un solo sitio.'
                : 'Find real pets, communities and places from one place.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-[#5C7470]">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#204E4A]/20 border-t-[#204E4A]" />
                {lang === 'es' ? 'Buscando...' : 'Searching...'}
              </div>
            )}

            {!isLoading && unexpectedError && (
              <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
                <p className="text-xs font-black text-[#204E4A]">
                  {lang === 'es'
                    ? 'No pudimos completar la búsqueda.'
                    : 'We could not complete the search.'}
                </p>
              </div>
            )}

            {!isLoading &&
              !unexpectedError &&
              totalResults === 0 &&
              response.failedTypes.length === 0 && (
                <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
                  <p className="text-sm font-black text-[#204E4A]">
                    {lang === 'es'
                      ? `No encontramos resultados para “${trimmedQuery}”.`
                      : `No results found for “${trimmedQuery}”.`}
                  </p>
                  <p className="mt-1 text-[11px] text-[#5C7470]">
                    {lang === 'es'
                      ? 'Prueba otra palabra o cambia el tipo de resultado.'
                      : 'Try another word or change the result type.'}
                  </p>
                </div>
              )}

            {groups.map(([type, results]) => {
              if (filter !== 'all' && filter !== type) return null

              const config = groupConfig[type]
              const GroupIcon = config.icon
              const visible = filter === 'all' ? results.slice(0, 5) : results
              const failed = response.failedTypes.includes(type)

              if (results.length === 0 && !failed) return null

              return (
                <section key={type} className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <GroupIcon size={15} />
                      <h3 className="text-sm font-black text-[#204E4A]">
                        {lang === 'es' ? config.es : config.en}
                      </h3>
                    </div>

                    {filter === 'all' && results.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setFilter(type)}
                        className="text-[10px] font-black text-[#204E4A]"
                      >
                        {lang === 'es' ? 'Ver todos' : 'See all'}
                      </button>
                    )}
                  </div>

                  {failed ? (
                    <div className="rounded-2xl bg-white p-4 text-[11px] font-semibold text-[#5C7470] shadow-sm">
                      {lang === 'es'
                        ? 'Esta categoría no pudo cargarse. Los demás resultados siguen disponibles.'
                        : 'This category could not load. Other results are still available.'}
                    </div>
                  ) : (
                    <div className="space-y-2">{visible.map(renderResult)}</div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
