import { useState, useEffect, useRef } from 'react'
import type { Pet, Post } from '../../types/pazo'
import { supabase } from '../../services/supabaseClient'
import { FollowButton } from '../shared/FollowButton'
import { IconPaw, IconDocument, IconCommunity, IconHeart } from '../icons/PazoIcons'
import { ReportDialog } from '../../features/moderation/ReportDialog'
import { describeReportSubject } from '../../features/moderation/reportSubject'

interface PublicProfileViewProps {
  targetPetId: string
  canReport: boolean
  currentPetId?: string
  ownedPetIds: string[]
  onClose: () => void
  lang: 'es' | 'en'
}

export const PublicProfileView = ({
  targetPetId,
  canReport,
  currentPetId,
  ownedPetIds,
  onClose,
  lang,
}: PublicProfileViewProps) => {
  const [reportOpen, setReportOpen] = useState(false)
  const [postReportId, setPostReportId] = useState<string | null>(null)
  const [postMenuId, setPostMenuId] = useState<string | null>(null)
  const postMenuRef = useRef<HTMLDivElement | null>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const [petProfile, setPetProfile] = useState<Pet | null>(null)
  const [petPosts, setPetPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'info'>('posts')

  // Paso 2: Estados Reales
  const [followersCount, setFollowersCount] = useState<number>(0)
  const [followingCount, setFollowingCount] = useState<number>(0)
  const [isFounder, setIsFounder] = useState<boolean>(false)

  useEffect(() => {
    let isMounted = true

    const fetchPublicProfile = async () => {
      if (!targetPetId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const { data: petData, error: petError } = await supabase
          .from('pets')
          .select('id,name,species,age,photo_url,created_at,bio,breed,gender,is_lost')
          .eq('id', targetPetId)
          .maybeSingle()

        if (petError) {
          console.error('Error fetching public pet profile:', petError)
        }

        if (!petData) {
          if (isMounted) setIsLoading(false)
          return
        }

        // Paso 2: Conexión de Datos Reales (Seguidores, Siguiendo, Fundador)
        const { count: followers } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', targetPetId)

        if (followers !== null && isMounted) {
          setFollowersCount(followers)
        }

        const { count: following } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', targetPetId)

        if (following !== null && isMounted) {
          setFollowingCount(following)
        }

        const { data: founderStatus, error: founderError } = await supabase.rpc(
          'get_pet_founder_status',
          { p_pet_id: targetPetId }
        )

        if (founderError) {
          console.error('Error fetching founder status:', founderError)
        }

        if (isMounted) {
          setIsFounder(Boolean(founderStatus))
        }

        const mappedPet: Pet = {
          id: petData.id,
          name: petData.name,
          species: petData.species || 'perro',
          breed: petData.breed || undefined,
          age: petData.age || 'Desconocida',
          gender: petData.gender === 'macho' || petData.gender === 'hembra'
            ? petData.gender
            : undefined,
          bio: petData.bio || undefined,
          photoUrl: petData.photo_url || '',
          qrId: `PAZO-QR-${petData.id}`,
          isLost: petData.is_lost || false,
        }

        if (isMounted) setPetProfile(mappedPet)

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('pet_id', targetPetId)
          .order('created_at', { ascending: false })

        if (postsError) {
          console.error('Error fetching public pet posts:', postsError)
        }

        if (postsData && isMounted) {
          const formattedPosts: Post[] = postsData.map((p: any) => ({
            id: p.id,
            petId: p.pet_id,
            petName: p.pet_name,
            petSpecies: p.pet_species,
            petAvatar: p.pet_avatar,
            location: p.location,
            timeAgo: 'Reciente',
            createdAt: p.created_at,
            isRecommended: false,
            tags: p.tags || [],
            text: p.text,
            photoUrl: p.photo_url,
            likes: p.likes || 0,
            isLiked: false,
            isSaved: false,
            comments: p.comments || [],
          }))
          setPetPosts(formattedPosts)
        }
      } catch (err) {
        console.error('Unexpected error loading public profile:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchPublicProfile()

    return () => {
      isMounted = false
    }
  }, [targetPetId])

  useEffect(() => {
    setProfileMenuOpen(false)
    setPostMenuId(null)
    setPostReportId(null)
  }, [targetPetId])

  useEffect(() => {
    if (!profileMenuOpen || typeof document === 'undefined') return
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false)
    }
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileMenuOpen(false)
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('keydown', dismissEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('keydown', dismissEscape)
    }
  }, [profileMenuOpen])

  useEffect(() => {
    if (!postMenuId || typeof document === 'undefined') return
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !postMenuRef.current?.contains(event.target)) setPostMenuId(null)
    }
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPostMenuId(null)
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('keydown', dismissEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('keydown', dismissEscape)
    }
  }, [postMenuId])

  return (
    <div className="absolute inset-0 z-[100] flex flex-col overflow-x-hidden overflow-y-auto bg-[#F8F5EC] font-sans text-[#204E4A] antialiased animate-slide-up">
      {/* Warm open canvas, not a card and never a synthetic cover photograph. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[540px] overflow-hidden">
        <div className="absolute -left-36 -top-32 h-80 w-80 rounded-full bg-[#EFE9D6]/55 blur-[75px]" />
        <svg className="absolute right-[-14px] top-[132px] h-28 w-24 text-[#D9D6A8]/65" viewBox="0 0 100 120" fill="currentColor">
          <ellipse cx="29" cy="32" rx="8" ry="16" transform="rotate(-20 29 32)" />
          <ellipse cx="49" cy="19" rx="8" ry="16" transform="rotate(12 49 19)" />
          <ellipse cx="70" cy="29" rx="8" ry="16" transform="rotate(29 70 29)" />
          <ellipse cx="84" cy="50" rx="7" ry="15" transform="rotate(45 84 50)" />
          <path d="M21 79C18 66 29 54 40 52c13-3 16 5 28 13 7 5 13 11 9 22-4 11-19 15-32 12-14-3-21-6-24-20Z" />
        </svg>
        <svg className="absolute left-[-25px] top-[360px] h-28 w-28 text-[#D6CAAD]/60" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 55C7 47 10 30 22 28c11-2 16 8 18 15l14-14c7-7 18 0 18 9 0 7-6 11-12 17 8 6 14 15 6 23-7 8-17 3-23-5L28 87c-8 6-17-1-17-10 0-8 4-14 9-22Z" />
        </svg>
      </div>

      <header className="sticky top-0 z-30 bg-[#F8F5EC]/95 backdrop-blur-xl">
        <div className="mx-auto grid h-[70px] w-full max-w-xl grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-3 px-4">
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'es' ? 'Regresar' : 'Back'}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#204E4A] shadow-[0_5px_18px_rgba(32,78,74,0.10)] transition-colors hover:bg-[#E1E53F]/30"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-center text-[17px] font-extrabold uppercase tracking-[0.17em] text-[#204E4A]">
            {lang === 'es' ? 'Perfil' : 'Profile'}
          </h1>
          {canReport && !ownedPetIds.includes(targetPetId) ? (
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                aria-label={lang === 'es' ? 'Opciones del perfil' : 'Profile options'}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#204E4A] shadow-[0_5px_18px_rgba(32,78,74,0.10)] transition-colors hover:bg-[#E1E53F]/30"
              >
                <svg viewBox="0 0 24 24" width="23" height="23" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
                </svg>
              </button>
              {profileMenuOpen && (
                <div role="menu" aria-label={lang === 'es' ? 'Acciones del perfil' : 'Profile actions'}
                  className="absolute right-0 top-full z-50 mt-2 w-48 rounded-[20px] bg-white/95 p-1.5 shadow-[0_12px_32px_rgba(32,78,74,0.14)] backdrop-blur-xl">
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full rounded-2xl px-3 py-3 text-left text-[13px] font-extrabold text-[#204E4A] hover:bg-[#F8F5EC]"
                    onClick={() => { setProfileMenuOpen(false); setPostReportId(null); setReportOpen(true) }}
                  >
                    {lang === 'es' ? 'Denunciar perfil' : 'Report profile'}
                  </button>
                </div>
              )}
            </div>
          ) : <div aria-hidden="true" />}
        </div>
      </header>

      {reportOpen && (
        <ReportDialog
          target={postReportId
            ? { kind: 'feed_post', id: postReportId, label: describeReportSubject('feed_post', petProfile?.name, petPosts.find((post) => post.id === postReportId)?.text, lang) }
            : { kind: 'pet_profile', id: targetPetId, label: describeReportSubject('pet_profile', petProfile?.name, null, lang) }}
          lang={lang}
          onClose={() => { setReportOpen(false); setPostReportId(null) }}
        />
      )}

      <main className="relative z-10 mx-auto w-full max-w-xl flex-1 px-4 pb-12 pt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24" role="status">
            <div className="h-9 w-9 animate-spin rounded-full bg-[#204E4A]/20" />
            <p className="text-[14px] font-bold text-[#5C7470]">
              {lang === 'es' ? 'Cargando perfil…' : 'Loading profile…'}
            </p>
          </div>
        ) : !petProfile ? (
          <div className="rounded-[32px] bg-white/85 px-6 py-14 text-center shadow-sm">
            <p className="text-[17px] font-bold">{lang === 'es' ? 'No se encontró el perfil de esta mascota.' : 'Pet profile not found.'}</p>
            <button type="button" onClick={onClose} className="mt-5 rounded-full bg-[#204E4A] px-6 py-3 text-[14px] font-bold text-white">
              {lang === 'es' ? 'Regresar' : 'Back'}
            </button>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* A genuine redesign: the identity is ON the canvas, not inside a profile card. */}
            <section aria-label={lang === 'es' ? 'Identidad de la mascota' : 'Pet identity'} className="relative px-2 pt-4">
              <div className="relative inline-flex">
                <div className="flex h-[148px] w-[148px] items-center justify-center overflow-hidden rounded-full bg-[#E9EFE6] shadow-[0_12px_28px_rgba(32,78,74,0.14)] sm:h-[168px] sm:w-[168px]">
                  {petProfile.photoUrl ? (
                    <img src={petProfile.photoUrl} alt={petProfile.name} className="h-full w-full object-cover" />
                  ) : (
                    <IconPaw size={61} className="text-[#204E4A]/40" />
                  )}
                </div>
                {isFounder && (
                  <div
                    className="absolute bottom-1 right-0 flex h-[46px] items-center gap-1 rounded-full bg-[#E1E53F] px-3 text-[#204E4A] shadow-[0_5px_12px_rgba(32,78,74,0.14)]"
                    title={lang === 'es' ? 'Fundador' : 'Founder'}
                  >
                    <IconPaw size={23} />
                    <span className="text-[11px] font-black">{lang === 'es' ? 'Fundador' : 'Founder'}</span>
                  </div>
                )}
                {petProfile.isLost && (
                  <span className="absolute -bottom-2 left-2 rounded-full bg-[#EC7357] px-3 py-1.5 text-[11px] font-extrabold text-white">
                    {lang === 'es' ? 'Perdido' : 'Lost'}
                  </span>
                )}
              </div>

              <div className="relative mt-5">
                <svg aria-hidden="true" className="pointer-events-none absolute -right-1 top-1 h-14 w-14 text-[#D8DA7E]" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                  <path d="m15 26 12-17M22 43l22-10M38 51l12-2" />
                </svg>
                <h2 className="max-w-[90%] break-words text-[clamp(39px,10vw,56px)] font-black leading-[1.03] tracking-[-0.05em] text-[#204E4A]">
                  {petProfile.name}
                </h2>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#E1E53F]/75 px-4 py-1.5 text-[14px] font-extrabold uppercase text-[#204E4A]">
                    {petProfile.species}
                  </span>
                  {petProfile.breed && <span className="text-[13px] font-semibold text-[#607B73]">{petProfile.breed}</span>}
                </div>
                {Boolean(petProfile.bio?.trim()) && (
                  <p className="mt-5 max-w-[40ch] whitespace-pre-wrap break-words text-[16px] font-medium leading-relaxed text-[#315B55]">
                    {petProfile.bio}
                  </p>
                )}
              </div>

              {Boolean(currentPetId) && !ownedPetIds.includes(petProfile.id) && (
                <div className="mt-6">
                  <FollowButton
                    currentPetId={currentPetId || ''}
                    targetPetId={petProfile.id}
                    canFollow={true}
                    lang={lang}
                    variant="profile"
                    onFollowChange={(following) => setFollowersCount((n) => following ? n + 1 : Math.max(0, n - 1))}
                  />
                </div>
              )}
            </section>

            {/* One lightweight stats capsule, as in mockup, outside the identity composition. */}
            <section aria-label={lang === 'es' ? 'Estadísticas de la mascota' : 'Pet statistics'} className="mt-6 rounded-full bg-white/90 px-2 py-3 shadow-[0_5px_22px_rgba(32,78,74,0.05)] backdrop-blur-md sm:px-4">
              <div className="grid grid-cols-3 gap-0">
                {([
                  { key: 'posts', count: petPosts.length, label: lang === 'es' ? 'Publicaciones' : 'Posts', Icon: IconDocument },
                  { key: 'followers', count: followersCount, label: lang === 'es' ? 'Seguidores' : 'Followers', Icon: IconCommunity },
                  { key: 'following', count: followingCount, label: lang === 'es' ? 'Siguiendo' : 'Following', Icon: IconHeart },
                ] as const).map(({ key, count, label, Icon }, index) => (
                  <div key={key} className="relative flex min-w-0 flex-col items-center justify-center gap-1.5 px-0.5">
                    {index > 0 && <span aria-hidden="true" className="absolute -left-[1px] top-2 h-10 w-[1px] bg-[#204E4A]/12" />}
                    <div className="flex items-center justify-center gap-1.5">
                      <span aria-hidden="true" className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-[#E1E53F]/40 text-[#204E4A]">
                        <Icon size={17} />
                      </span>
                      <span className="text-[22px] font-black leading-none text-[#204E4A]">{count}</span>
                    </div>
                    <span className="max-w-full text-center text-[clamp(9px,2.5vw,11px)] font-extrabold uppercase leading-tight tracking-[-0.025em] text-[#5C7470]">{label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Wide unified segmented tabs (not two disconnected blocks). */}
            <nav className="mt-5 grid grid-cols-2 gap-1.5 rounded-full bg-white/85 p-1.5 shadow-[0_5px_20px_rgba(32,78,74,0.05)] backdrop-blur-md"
              aria-label={lang === 'es' ? 'Secciones del perfil' : 'Profile sections'}>
              <button
                type="button"
                aria-current={activeTab === 'posts' ? 'page' : undefined}
                aria-pressed={activeTab === 'posts'}
                onClick={() => setActiveTab('posts')}
                className={activeTab === 'posts'
                  ? 'flex min-w-0 items-center justify-center gap-2 rounded-full bg-[#204E4A] px-2 py-3.5 text-[clamp(13px,3.7vw,16px)] font-extrabold text-white shadow-sm'
                  : 'flex min-w-0 items-center justify-center gap-2 rounded-full px-2 py-3.5 text-[clamp(13px,3.7vw,16px)] font-extrabold text-[#607B73] hover:bg-[#204E4A]/5'}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
                  <rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>
                </svg>
                <span>{lang === 'es' ? 'Publicaciones' : 'Posts'}</span>
              </button>
              <button
                type="button"
                aria-current={activeTab === 'info' ? 'page' : undefined}
                aria-pressed={activeTab === 'info'}
                onClick={() => setActiveTab('info')}
                className={activeTab === 'info'
                  ? 'flex min-w-0 items-center justify-center gap-2 rounded-full bg-[#204E4A] px-2 py-3.5 text-[clamp(13px,3.7vw,16px)] font-extrabold text-white shadow-sm'
                  : 'flex min-w-0 items-center justify-center gap-2 rounded-full px-2 py-3.5 text-[clamp(13px,3.7vw,16px)] font-extrabold text-[#607B73] hover:bg-[#204E4A]/5'}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7v.2" strokeLinecap="round"/>
                </svg>
                <span>{lang === 'es' ? 'Información' : 'Info'}</span>
              </button>
            </nav>

            <section className="mt-4" aria-label={activeTab === 'posts'
              ? (lang === 'es' ? 'Publicaciones de la mascota' : 'Pet posts')
              : (lang === 'es' ? 'Información de la mascota' : 'Pet information')}>
              {activeTab === 'posts' ? (
                petPosts.length === 0 ? (
                  <div className="rounded-[30px] bg-white/85 px-5 py-12 text-center shadow-sm">
                    <IconPaw size={27} className="mx-auto mb-3 text-[#204E4A]/50" />
                    <p className="text-[14px] font-semibold text-[#5C7470]">
                      {lang === 'es' ? 'Esta mascota aún no tiene publicaciones.' : 'This pet has no posts yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {petPosts.map((post) => (
                      <article key={post.id} className="relative rounded-[32px] bg-white/95 pb-1 shadow-[0_8px_28px_rgba(32,78,74,0.06)]">
                        <div className="flex min-w-0 items-center gap-3 px-4 py-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E9EFE6]">
                            {petProfile.photoUrl ? (
                              <img src={petProfile.photoUrl} alt="" className="h-full w-full object-cover"/>
                            ) : <IconPaw size={21} className="text-[#204E4A]/50"/>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-[17px] font-black leading-tight text-[#204E4A]">{petProfile.name}</h3>
                            <p className="mt-0.5 text-[12px] text-[#71847F]">{post.timeAgo}</p>
                          </div>
                          {canReport && !ownedPetIds.includes(targetPetId) && (
                            <div ref={postMenuId === post.id ? postMenuRef : null} className="relative shrink-0">
                              <button
                                type="button"
                                aria-label={lang === 'es' ? 'Opciones de publicación' : 'Post options'}
                                aria-haspopup="menu"
                                aria-expanded={postMenuId === post.id}
                                onClick={() => setPostMenuId((prev) => prev === post.id ? null : post.id)}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8F5EC] text-[#204E4A] hover:bg-[#E1E53F]/25"
                              >
                                <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true">
                                  <circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>
                                </svg>
                              </button>
                              {postMenuId === post.id && (
                                <div role="menu" aria-label={lang === 'es' ? 'Acciones de publicación' : 'Post actions'}
                                  className="absolute right-0 top-full z-40 mt-2 min-w-[188px] rounded-[18px] bg-white/95 p-1.5 shadow-[0_12px_30px_rgba(32,78,74,0.15)] backdrop-blur-xl">
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => { setPostMenuId(null); setPostReportId(post.id); setReportOpen(true) }}
                                    className="w-full rounded-2xl px-3 py-3 text-left text-[13px] font-bold text-[#204E4A] hover:bg-[#F8F5EC]"
                                  >
                                    {lang === 'es' ? 'Denunciar publicación' : 'Report post'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {post.photoUrl && (
                          <div className="max-h-[490px] w-full overflow-hidden bg-[#EDF1EC]">
                            <img src={post.photoUrl} alt={post.text || petProfile.name} className="max-h-[490px] w-full object-cover" />
                          </div>
                        )}
                        <div className="space-y-2 px-4 pb-4 pt-3">
                          <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#5C7470]">
                            <IconPaw size={17} className="text-[#204E4A]" />
                            <span>{post.likes} {lang === 'es' ? 'me gusta' : 'likes'}</span>
                          </div>
                          {post.text && <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-relaxed text-[#204E4A]">{post.text}</p>}
                        </div>
                      </article>
                    ))}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-[26px] bg-white/85 px-5 py-5 shadow-sm">
                    <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#71847F]">{lang === 'es' ? 'Edad' : 'Age'}</p>
                    <p className="mt-2 break-words text-[17px] font-black text-[#204E4A]">{petProfile.age}</p>
                  </div>
                  <div className="rounded-[26px] bg-white/85 px-5 py-5 shadow-sm">
                    <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#71847F]">{lang === 'es' ? 'Género' : 'Gender'}</p>
                    <p className="mt-2 break-words text-[17px] font-black capitalize text-[#204E4A]">
                      {petProfile.gender || (lang === 'es' ? 'Sin especificar' : 'Not specified')}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
