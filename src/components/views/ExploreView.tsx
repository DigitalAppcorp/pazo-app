import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CommunitySummary, Pet, Post } from '../../types/pazo'
import {
  fetchCommunitySummaries,
  joinCommunity,
  leaveCommunity,
} from '../../services/communityService'
import { IconCheck, IconExplore, IconPlus } from '../icons/PazoIcons'
import { CreateCommunityModal } from '../modals/CreateCommunityModal'
import { CommunityDetailView } from './CommunityDetailView'

interface ExploreViewProps {
  currentPet: Pet | null
  canUseCommunities: boolean
  onSelectPetProfile: (petId: string) => void
  featuredPost?: Post
  createCommunityRequestKey?: number
  lang: 'es' | 'en'
}

type ExploreCategory = 'para_ti' | 'comunidades' | 'eventos'

export const ExploreView = ({
  currentPet,
  canUseCommunities,
  onSelectPetProfile,
  featuredPost,
  createCommunityRequestKey = 0,
  lang,
}: ExploreViewProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] =
    useState<ExploreCategory>('para_ti')
  const [communities, setCommunities] = useState<CommunitySummary[]>([])
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true)
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null
  )
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false)
  const [membershipBusyId, setMembershipBusyId] = useState<string | null>(null)

  const loadCommunities = useCallback(async () => {
    if (!canUseCommunities) {
      setCommunities([])
      setIsLoadingCommunities(false)
      return
    }

    setIsLoadingCommunities(true)
    try {
      const rows = await fetchCommunitySummaries({ limit: 20 })
      setCommunities(rows)
    } catch (error) {
      console.error('Error loading Communities:', error)
    } finally {
      setIsLoadingCommunities(false)
    }
  }, [canUseCommunities])

  useEffect(() => {
    void loadCommunities()
  }, [loadCommunities])

  useEffect(() => {
    if (createCommunityRequestKey > 0 && canUseCommunities) {
      setActiveCategory('comunidades')
      setSelectedCommunityId(null)
      setIsCreateCommunityOpen(true)
    }
  }, [canUseCommunities, createCommunityRequestKey])

  const filteredCommunities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return communities

    return communities.filter((community) =>
      [
        community.name,
        community.description,
        community.category,
        community.species || '',
        community.zone || '',
      ].some((value) => value.toLowerCase().includes(query))
    )
  }, [communities, searchQuery])

  const handleQuickMembership = async (
    event: React.MouseEvent,
    community: CommunitySummary
  ) => {
    event.stopPropagation()
    if (!canUseCommunities || !currentPet?.id || membershipBusyId) return
    if (community.role === 'owner') {
      setSelectedCommunityId(community.id)
      setActiveCategory('comunidades')
      return
    }

    setMembershipBusyId(community.id)

    try {
      if (community.isJoined) {
        await leaveCommunity(community.id)
      } else {
        await joinCommunity(community.id, currentPet.id)
      }

      await loadCommunities()
    } catch (error: any) {
      console.error('Error updating Community membership:', error)
      alert(
        lang === 'es'
          ? `No se pudo actualizar la membresía: ${error?.message || 'error inesperado'}`
          : `Could not update membership: ${error?.message || 'unexpected error'}`
      )
    } finally {
      setMembershipBusyId(null)
    }
  }

  if (selectedCommunityId) {
    return (
      <>
        <CommunityDetailView
          communityId={selectedCommunityId}
          currentPet={currentPet}
          onBack={() => setSelectedCommunityId(null)}
          onCommunityChanged={() => void loadCommunities()}
          lang={lang}
        />
        <CreateCommunityModal
          isOpen={isCreateCommunityOpen}
          onClose={() => setIsCreateCommunityOpen(false)}
          currentPet={currentPet}
          onCreated={(communityId) => {
            setIsCreateCommunityOpen(false)
            setSelectedCommunityId(communityId)
            void loadCommunities()
          }}
          lang={lang}
        />
      </>
    )
  }

  const suggestedCommunities = filteredCommunities.slice(0, 3)

  const renderCommunityCard = (community: CommunitySummary) => (
    <div
      key={community.id}
      role="button"
      tabIndex={0}
      onClick={() => {
        setSelectedCommunityId(community.id)
        setActiveCategory('comunidades')
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          setSelectedCommunityId(community.id)
          setActiveCategory('comunidades')
        }
      }}
      className="w-full cursor-pointer rounded-[2rem] bg-white p-4 text-left shadow-[0_3px_16px_rgba(32,78,74,0.04)] transition-all hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-[#FAF8F5] shadow-xs">
            <img
              src={community.imageUrl}
              alt={community.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="truncate text-xs font-extrabold text-[#204E4A]">
                {community.name}
              </h4>
              <span className="shrink-0 rounded-full bg-[#FAF8F5] px-2 py-0.5 text-[9px] font-bold uppercase text-[#5C7470] shadow-xs">
                {community.species ||
                  (lang === 'es' ? 'todas' : 'all')}
              </span>
            </div>

            <p className="mt-0.5 truncate text-[11px] text-[#5C7470]">
              {community.description}
            </p>

            <span className="mt-0.5 block text-[10px] font-semibold text-[#5C7470]/70">
              {community.membersCount.toLocaleString()}{' '}
              {lang === 'es' ? 'miembros' : 'members'}
              {community.zone ? ` · ${community.zone}` : ''}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(event) => void handleQuickMembership(event, community)}
          disabled={!currentPet || membershipBusyId === community.id}
          className={
            'flex shrink-0 items-center gap-1 rounded-full px-4 py-2 text-xs font-bold shadow-xs transition-all disabled:opacity-50 ' +
            (community.isJoined
              ? 'bg-[#FAF8F5] text-[#204E4A] hover:bg-neutral-100'
              : 'bg-[#E1E53F] text-[#204E4A] hover:bg-[#d8dc35]')
          }
        >
          {community.isJoined && <IconCheck size={13} />}
          <span>
            {membershipBusyId === community.id
              ? '...'
              : community.role === 'owner'
                ? 'Admin'
                : community.isJoined
                  ? lang === 'es'
                    ? 'Unido'
                    : 'Joined'
                  : lang === 'es'
                    ? 'Unirme'
                    : 'Join'}
          </span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="space-y-4 animate-slide-up pb-6">
        <div className="space-y-1 px-1">
          <span className="inline-block rounded-full bg-[#E1E53F] px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] shadow-xs">
            {lang === 'es' ? 'Descubrimiento' : 'Discovery'}
          </span>
          <h2 className="text-2xl font-black tracking-tight text-[#204E4A]">
            {lang === 'es' ? 'Encuentra a los tuyos.' : 'Find your crowd.'}
          </h2>
          <p className="text-xs text-[#5C7470]">
            {lang === 'es'
              ? 'Descubre mascotas, comunidades, eventos y nuevas experiencias dentro de PAZO.'
              : 'Discover pets, communities, events and new experiences across PAZO.'}
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={
              lang === 'es'
                ? 'Mascotas, comunidades, eventos en LA...'
                : 'Pets, communities, events in LA...'
            }
            className="w-full rounded-full bg-white py-3 pl-11 pr-4 text-xs text-[#204E4A] shadow-sm focus:bg-white"
          />
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C7470]">
            <IconExplore size={16} />
          </div>
        </div>

        <div className="flex gap-2">
          {([
            ['para_ti', lang === 'es' ? 'Para ti' : 'For you'],
            ['comunidades', lang === 'es' ? 'Comunidades' : 'Communities'],
            ['eventos', lang === 'es' ? 'Eventos' : 'Events'],
          ] as Array<[ExploreCategory, string]>).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={
                'rounded-full px-4 py-2 text-xs font-bold shadow-xs transition-all ' +
                (activeCategory === key
                  ? 'bg-[#204E4A] text-[#E1E53F]'
                  : 'bg-white text-[#5C7470] hover:bg-neutral-50')
              }
            >
              {label}
            </button>
          ))}
        </div>

        {activeCategory === 'para_ti' && (
          <>
            {featuredPost ? (
              <div className="flex items-center justify-between rounded-[2.2rem] bg-white p-4 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl shadow-xs">
                    <img
                      src={featuredPost.petAvatar}
                      alt={featuredPost.petName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-extrabold text-[#204E4A]">
                        {featuredPost.petName}
                      </span>
                      <span className="shrink-0 rounded-full bg-[#FAF8F5] px-2.5 py-0.5 text-[10px] font-bold text-[#204E4A] shadow-xs">
                        {featuredPost.petSpecies}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-[11px] text-[#5C7470]">
                      {featuredPost.text}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPetProfile(featuredPost.petId)}
                  className="shrink-0 rounded-full bg-[#FAF8F5] px-3.5 py-2 text-[11px] font-bold text-[#204E4A] shadow-xs transition-all hover:bg-[#E1E53F]"
                >
                  {lang === 'es' ? 'Ver Ficha' : 'View Profile'}
                </button>
              </div>
            ) : (
              <div className="rounded-[2.2rem] bg-white p-4 shadow-sm">
                <p className="text-xs font-bold text-[#204E4A]">
                  {lang === 'es'
                    ? 'Cuando haya nuevas mascotas para descubrir, aparecerán aquí.'
                    : 'New pets to discover will appear here.'}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-extrabold text-[#204E4A]">
                  {lang === 'es'
                    ? 'Comunidades sugeridas'
                    : 'Suggested communities'}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveCategory('comunidades')}
                  className="text-[10px] font-bold text-[#204E4A]"
                >
                  {lang === 'es' ? 'Ver todas' : 'See all'}
                </button>
              </div>

              {isLoadingCommunities ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#204E4A]/20 border-t-[#204E4A]" />
                </div>
              ) : suggestedCommunities.length > 0 ? (
                <div className="space-y-3">
                  {suggestedCommunities.map(renderCommunityCard)}
                </div>
              ) : (
                <div className="rounded-[2rem] bg-white p-5 text-center shadow-sm">
                  <p className="text-xs font-black text-[#204E4A]">
                    {!canUseCommunities
                      ? lang === 'es'
                        ? 'Inicia sesión para usar Comunidades'
                        : 'Sign in to use Communities'
                      : lang === 'es'
                        ? 'Todavía no hay comunidades reales'
                        : 'No real communities yet'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreateCommunityOpen(true)}
                    disabled={!canUseCommunities}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E1E53F] px-4 py-2 text-[10px] font-black text-[#204E4A]"
                  >
                    <IconPlus size={14} />
                    {lang === 'es' ? 'Crear la primera' : 'Create the first'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {activeCategory === 'comunidades' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-extrabold text-[#204E4A]">
                  {lang === 'es' ? 'Comunidades' : 'Communities'}
                </h3>
                <p className="mt-0.5 text-[10px] text-[#5C7470]">
                  {filteredCommunities.length}{' '}
                  {lang === 'es' ? 'disponibles' : 'available'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateCommunityOpen(true)}
                disabled={!currentPet || !canUseCommunities}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#E1E53F] px-4 py-2 text-[10px] font-black text-[#204E4A] shadow-xs disabled:opacity-50"
              >
                <IconPlus size={14} />
                {lang === 'es' ? 'Crear' : 'Create'}
              </button>
            </div>

            {isLoadingCommunities ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#204E4A]/20 border-t-[#204E4A]" />
              </div>
            ) : filteredCommunities.length > 0 ? (
              <div className="space-y-3">
                {filteredCommunities.map(renderCommunityCard)}
              </div>
            ) : (
              <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
                <p className="text-xs font-black text-[#204E4A]">
                  {!canUseCommunities
                    ? lang === 'es'
                      ? 'Inicia sesión con una cuenta real para usar Comunidades.'
                      : 'Sign in with a real account to use Communities.'
                    : searchQuery
                      ? lang === 'es'
                        ? 'No encontramos comunidades con esa búsqueda.'
                        : 'No communities match that search.'
                      : lang === 'es'
                        ? 'Todavía no hay comunidades.'
                        : 'No communities yet.'}
                </p>
                {!searchQuery && canUseCommunities && (
                  <p className="mt-1 text-[10px] text-[#5C7470]">
                    {lang === 'es'
                      ? 'Puedes crear una comunidad real desde aquí.'
                      : 'You can create a real community from here.'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeCategory === 'eventos' && (
          <div className="rounded-[2rem] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5C7470]">
              {lang === 'es' ? 'Próximamente' : 'Coming later'}
            </p>
            <h3 className="mt-1 text-sm font-black text-[#204E4A]">
              {lang === 'es' ? 'Eventos y actividades' : 'Events and activities'}
            </h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#5C7470]">
              {lang === 'es'
                ? 'Esta extensión se validará dentro de Comunidades antes de construirla completa.'
                : 'This extension will be validated inside Communities before building it fully.'}
            </p>
          </div>
        )}
      </div>

      <CreateCommunityModal
        isOpen={isCreateCommunityOpen}
        onClose={() => setIsCreateCommunityOpen(false)}
        currentPet={currentPet}
        onCreated={(communityId) => {
          setIsCreateCommunityOpen(false)
          setActiveCategory('comunidades')
          setSelectedCommunityId(communityId)
          void loadCommunities()
        }}
        lang={lang}
      />
    </>
  )
}
