import { useCallback, useEffect, useState } from 'react'
import type { CommunitySummary, Pet } from '../../types/pazo'
import {
  fetchCommunitySummaries,
  joinCommunity,
  leaveCommunity,
} from '../../services/communityService'
import { IconCheck, IconCommunity, IconPlus } from '../icons/PazoIcons'
import { CreateCommunityModal } from '../modals/CreateCommunityModal'
import { CommunityDetailView } from './CommunityDetailView'

interface CommunitiesViewProps {
  currentPet: Pet | null
  canUseCommunities: boolean
  createCommunityRequestKey?: number
  requestedCommunityId?: string | null
  requestedCommunityKey?: number
  lang: 'es' | 'en'
}

export const CommunitiesView = ({
  currentPet,
  canUseCommunities,
  createCommunityRequestKey = 0,
  requestedCommunityId = null,
  requestedCommunityKey = 0,
  lang,
}: CommunitiesViewProps) => {
  const [communities, setCommunities] = useState<CommunitySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null
  )
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false)
  const [membershipBusyId, setMembershipBusyId] = useState<string | null>(null)

  const loadCommunities = useCallback(async () => {
    if (!canUseCommunities) {
      setCommunities([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const rows = await fetchCommunitySummaries({ limit: 50 })
      setCommunities(rows)
    } catch (error) {
      console.error('Error loading Communities:', error)
    } finally {
      setIsLoading(false)
    }
  }, [canUseCommunities])

  useEffect(() => {
    void loadCommunities()
  }, [loadCommunities])

  useEffect(() => {
    if (createCommunityRequestKey > 0 && canUseCommunities) {
      setSelectedCommunityId(null)
      setIsCreateCommunityOpen(true)
    }
  }, [canUseCommunities, createCommunityRequestKey])

  useEffect(() => {
    if (
      requestedCommunityKey > 0 &&
      requestedCommunityId &&
      canUseCommunities
    ) {
      setSelectedCommunityId(requestedCommunityId)
    }
  }, [canUseCommunities, requestedCommunityId, requestedCommunityKey])

  const handleQuickMembership = async (
    community: CommunitySummary
  ) => {
    if (!canUseCommunities || !currentPet?.id || membershipBusyId) return

    if (community.role === 'owner') {
      setSelectedCommunityId(community.id)
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
          canReport={canUseCommunities}
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

  return (
    <>
      <div className="space-y-4 animate-slide-up pb-6">
        <div className="flex items-start justify-between gap-3 px-1">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E1E53F] px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] shadow-xs">
              <IconCommunity size={13} />
              {lang === 'es' ? 'Comunidades' : 'Communities'}
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#204E4A]">
              {lang === 'es'
                ? 'Encuentra tu comunidad.'
                : 'Find your community.'}
            </h2>
            <p className="mt-1 text-xs text-[#5C7470]">
              {lang === 'es'
                ? 'Únete, comparte y participa con otras mascotas de PAZO.'
                : 'Join, share and participate with other PAZO pets.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateCommunityOpen(true)}
            disabled={!currentPet || !canUseCommunities}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#E1E53F] px-4 py-2 text-[10px] font-black text-[#204E4A] shadow-xs disabled:opacity-50"
          >
            <IconPlus size={14} />
            {lang === 'es' ? 'Crear' : 'Create'}
          </button>
        </div>

        {!canUseCommunities ? (
          <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
            <p className="text-xs font-black text-[#204E4A]">
              {lang === 'es'
                ? 'Inicia sesión con una cuenta real para usar Comunidades.'
                : 'Sign in with a real account to use Communities.'}
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#204E4A]/20 border-t-[#204E4A]" />
          </div>
        ) : communities.length === 0 ? (
          <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
            <p className="text-xs font-black text-[#204E4A]">
              {lang === 'es'
                ? 'Todavía no hay comunidades.'
                : 'No communities yet.'}
            </p>
            <p className="mt-1 text-[10px] text-[#5C7470]">
              {lang === 'es'
                ? 'Puedes crear la primera desde aquí.'
                : 'You can create the first one here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {communities.map((community) => (
              <div
                key={community.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCommunityId(community.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedCommunityId(community.id)
                  }
                }}
                className="w-full cursor-pointer rounded-[2rem] bg-white p-4 text-left shadow-[0_3px_16px_rgba(32,78,74,0.04)] transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-[#FAF8F5] shadow-xs">
                      {community.imageUrl ? (
                        <img
                          src={community.imageUrl}
                          alt={community.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#204E4A]">
                          <IconCommunity size={18} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-extrabold text-[#204E4A]">
                        {community.name}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-[#5C7470]">
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
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleQuickMembership(community)
                    }}
                    disabled={membershipBusyId === community.id || !currentPet}
                    className={
                      'flex shrink-0 items-center gap-1 rounded-full px-4 py-2 text-xs font-bold shadow-xs transition-all disabled:opacity-50 ' +
                      (community.isJoined
                        ? 'bg-[#FAF8F5] text-[#204E4A]'
                        : 'bg-[#E1E53F] text-[#204E4A]')
                    }
                  >
                    {community.isJoined && <IconCheck size={13} />}
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
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
