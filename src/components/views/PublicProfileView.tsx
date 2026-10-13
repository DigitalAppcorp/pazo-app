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
          photoUrl: petData.photo_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
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
    <div className="absolute inset-0 z-[100] flex flex-col overflow-y-auto bg-[#FBF8F1] font-sans text-[#204E4A] antialiased animate-slide-up">

      {/* Paso 3: Orbes de Luz Ambiental para Glassmorphism Avanzado */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="bg-[#E1E53F]/25 blur-[100px] w-96 h-96 rounded-full absolute -top-10 -left-10 animate-pulse"></div>
        <div className="bg-[#204E4A]/10 blur-[120px] w-[28rem] h-[28rem] rounded-full absolute top-1/4 -right-20"></div>
        <div className="bg-[#E8F3EE]/80 blur-[100px] w-[32rem] h-[32rem] rounded-full absolute bottom-10 left-1/4 animate-pulse" style={{ animationDuration: '7s' }}></div>
      </div>

      <header className="sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-[#FAF8F5]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <button type="button" onClick={onClose} aria-label={lang === 'es' ? 'Regresar' : 'Back'}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-[#204E4A] shadow-[0_3px_12px_rgba(32,78,74,0.08)] transition-colors hover:bg-[#E1E53F]/25">
          <span aria-hidden="true" className="text-[24px] leading-none">←</span>
        </button>
        <h1 className="text-[14px] font-extrabold uppercase tracking-[0.18em] text-[#204E4A]">
          {lang === 'es' ? 'Perfil' : 'Profile'}
        </h1>
        <div className="flex min-w-0 items-center justify-end">
          {canReport && !ownedPetIds.includes(targetPetId) && (
            <div ref={profileMenuRef} className="relative">
              <button type="button" onClick={() => setProfileMenuOpen((previous) => !previous)}
                aria-label={lang === 'es' ? 'Opciones del perfil' : 'Profile options'}
                aria-haspopup="menu" aria-expanded={profileMenuOpen}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-[#204E4A] shadow-[0_3px_12px_rgba(32,78,74,0.08)] transition-colors hover:bg-[#E1E53F]/25">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.65" /><circle cx="12" cy="12" r="1.65" /><circle cx="19" cy="12" r="1.65" />
                </svg>
              </button>
              {profileMenuOpen && (
                <div role="menu" aria-label={lang === 'es' ? 'Acciones del perfil' : 'Profile actions'}
                  className="absolute right-0 top-full z-50 mt-2 min-w-[175px] rounded-2xl bg-white/95 p-1.5 shadow-[0_12px_30px_rgba(32,78,74,0.14)] backdrop-blur-xl">
                  <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setPostReportId(null); setReportOpen(true) }}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-bold text-[#204E4A] hover:bg-[#FAF8F5]">
                    {lang === 'es' ? 'Denunciar perfil' : 'Report profile'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {reportOpen && <ReportDialog
        target={postReportId
          ? { kind: 'feed_post', id: postReportId, label: describeReportSubject('feed_post', petProfile?.name, petPosts.find((post) => post.id === postReportId)?.text, lang) }
          : { kind: 'pet_profile', id: targetPetId, label: describeReportSubject('pet_profile', petProfile?.name, null, lang) }}
        lang={lang}
        onClose={() => { setReportOpen(false); setPostReportId(null) }}
      />}
      {/* Contenedor Principal */}
      <div className="relative z-10 mx-auto w-full max-w-2xl flex-1 space-y-3 px-3 py-3 sm:px-6 sm:py-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-[#204E4A]/20 border-t-[#204E4A] rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-[#5C7470] tracking-wider uppercase">
              {lang === 'es' ? 'Cargando perfil...' : 'Loading profile...'}
            </p>
          </div>
        ) : !petProfile ? (
          <div className="space-y-4 rounded-[2.5rem] bg-white/60 p-8 py-16 text-center shadow-sm backdrop-blur-xl">
            <p className="text-lg font-bold text-[#204E4A]">
              {lang === 'es'
                ? 'No se encontró la información de esta mascota.'
                : 'Pet profile information could not be found.'}
            </p>
            <button
              onClick={onClose}
              className="bg-[#204E4A] text-white px-6 py-3 rounded-full text-sm font-bold cursor-pointer hover:bg-[#183d3a] transition-all"
            >
              {lang === 'es' ? 'Volver al feed' : 'Back to feed'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">

            {/* Comunidad/Lifestyle, Opción 4: composición editorial, SIN portada.
                El espacio de insignias no tiene placeholders: solo Fundador si existe. */}
            <section className="relative overflow-hidden rounded-[2.65rem] bg-[#FFFCF5]/90 px-5 pb-5 pt-6 shadow-[0_16px_44px_rgba(32,78,74,0.09)] backdrop-blur-xl sm:px-7 sm:pb-7 sm:pt-8">
              <div className="pointer-events-none absolute -right-12 -top-24 h-48 w-48 rounded-full bg-[#E1E53F]/10 blur-3xl" aria-hidden="true" />

              <div className="relative flex items-start justify-between">
                <div className="relative shrink-0">
                  <img
                    src={petProfile.photoUrl}
                    alt={petProfile.name}
                    className="h-[132px] w-[132px] rounded-full bg-[#FAF8F5] object-cover shadow-[0_8px_24px_rgba(32,78,74,0.16)] sm:h-[156px] sm:w-[156px]"
                  />
                  {petProfile.isLost && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#EC7357] px-3 py-1 text-[12px] font-extrabold text-white shadow-sm">
                      {lang === 'es' ? 'Perdido' : 'Lost'}
                    </span>
                  )}
                </div>
                {/* Reserva conceptual para futuras insignias reales: no ocupa altura ni finge logros. */}
                {isFounder && (
                  <span className="inline-flex max-w-[45%] items-center gap-1.5 rounded-full bg-[#E1E53F]/45 px-3 py-2 text-[12px] font-extrabold text-[#204E4A]">
                    <IconPaw size={17} />
                    {lang === 'es' ? 'Fundador' : 'Founder'}
                  </span>
                )}
              </div>

              <div className="relative mt-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="min-w-0 break-words text-[clamp(34px,9vw,48px)] font-black leading-[1.02] tracking-[-0.045em] text-[#204E4A]">
                    {petProfile.name}
                  </h2>
                  <IconPaw size={21} className="shrink-0 text-[#204E4A]/45" />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[#E1E53F]/65 px-4 py-1.5 text-[14px] font-black uppercase text-[#204E4A]">
                    {petProfile.species}
                  </span>
                  {petProfile.breed && (
                    <span className="break-words text-[13px] font-semibold text-[#5C7470]">{petProfile.breed}</span>
                  )}
                </div>
                {Boolean(petProfile.bio?.trim()) && (
                  <p className="mt-4 max-w-[42ch] whitespace-pre-wrap break-words pl-1 text-[16px] font-medium leading-relaxed text-[#204E4A]">
                    {petProfile.bio}
                  </p>
                )}
              </div>

              {Boolean(currentPetId) && !ownedPetIds.includes(petProfile.id) && (
                <div className="mt-5">
                  <FollowButton
                    currentPetId={currentPetId || ''}
                    targetPetId={petProfile.id}
                    canFollow={true}
                    lang={lang}
                    variant="profile"
                    onFollowChange={(following) =>
                      setFollowersCount((previous) => following ? previous + 1 : Math.max(0, previous - 1))
                    }
                  />
                </div>
              )}

              <div className="mt-5 grid grid-cols-3 gap-1 rounded-full bg-white/80 px-1.5 py-3 shadow-[0_5px_20px_rgba(32,78,74,0.04)] sm:gap-3 sm:px-3">
                {([
                  { key: 'posts', count: petPosts.length, label: lang === 'es' ? 'Publicaciones' : 'Posts', Icon: IconDocument },
                  { key: 'followers', count: followersCount, label: lang === 'es' ? 'Seguidores' : 'Followers', Icon: IconCommunity },
                  { key: 'following', count: followingCount, label: lang === 'es' ? 'Siguiendo' : 'Following', Icon: IconHeart },
                ] as const).map(({ key, count, label, Icon }) => (
                  <div key={key} className="flex min-w-0 flex-col items-center justify-center gap-1">
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E1E53F]/35 text-[#204E4A] sm:h-9 sm:w-9">
                        <Icon size={17} />
                      </span>
                      <span className="text-[23px] font-black leading-none text-[#204E4A] sm:text-[26px]">{count}</span>
                    </div>
                    <span className="w-full text-center text-[clamp(9px,2.5vw,11px)] font-extrabold uppercase leading-tight tracking-[-0.025em] text-[#5C7470]">{label}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-1 rounded-full bg-white/80 p-1.5 shadow-[0_5px_20px_rgba(32,78,74,0.06)] backdrop-blur-xl">
              <button type="button" aria-pressed={activeTab === 'posts'} onClick={() => setActiveTab('posts')}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-full px-1 py-3 text-[clamp(13px,3.7vw,16px)] font-extrabold transition-colors ${activeTab === 'posts' ? 'bg-[#204E4A] text-white shadow-sm' : 'text-[#5C7470] hover:bg-[#204E4A]/5'}`}>
                <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1.6" />
                  <rect x="14" y="3" width="7" height="7" rx="1.6" />
                  <rect x="3" y="14" width="7" height="7" rx="1.6" />
                  <rect x="14" y="14" width="7" height="7" rx="1.6" />
                </svg>
                <span>{lang === 'es' ? 'Publicaciones' : 'Posts'}</span>
              </button>
              <button type="button" aria-pressed={activeTab === 'info'} onClick={() => setActiveTab('info')}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-full px-1 py-3 text-[clamp(13px,3.7vw,16px)] font-extrabold transition-colors ${activeTab === 'info' ? 'bg-[#204E4A] text-white shadow-sm' : 'text-[#5C7470] hover:bg-[#204E4A]/5'}`}>
                <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 10v6M12 7v.2" strokeLinecap="round" />
                </svg>
                <span>{lang === 'es' ? 'Información' : 'Info'}</span>
              </button>
            </div>

            {/* Contenido (Galería / Información) */}
            <div className="pt-0">
              {activeTab === 'posts' ? (
                <div>
                  {petPosts.length === 0 ? (
                    <div className="rounded-[2rem] bg-white/65 px-6 py-12 text-center shadow-sm backdrop-blur-xl">
                      <p className="text-base font-bold text-[#5C7470]">
                        {lang === 'es'
                          ? 'Esta mascota aún no tiene publicaciones.'
                          : 'This pet has no posts yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {petPosts.map((post) => (
                        <article key={post.id} className="relative rounded-[2.15rem] bg-white/90 shadow-[0_10px_28px_rgba(32,78,74,0.07)] backdrop-blur-xl">
                          <div className="flex min-w-0 items-center gap-3 px-4 py-4">
                            <img src={petProfile.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover shadow-sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[19px] font-black leading-tight text-[#204E4A]">{petProfile.name}</p>
                              <p className="mt-0.5 text-[13px] text-[#5C7470]">{post.timeAgo}</p>
                            </div>
                            {canReport && !ownedPetIds.includes(targetPetId) && (
                              <div ref={postMenuId === post.id ? postMenuRef : null} className="relative shrink-0">
                                <button type="button" aria-label={lang === 'es' ? 'Opciones de publicación' : 'Post options'}
                                  aria-haspopup="menu" aria-expanded={postMenuId === post.id}
                                  onClick={() => setPostMenuId((current) => current === post.id ? null : post.id)}
                                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF8F5] text-[#204E4A] transition-colors hover:bg-[#E1E53F]/25">
                                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                                    <circle cx="5" cy="12" r="1.65" />
                                    <circle cx="12" cy="12" r="1.65" />
                                    <circle cx="19" cy="12" r="1.65" />
                                  </svg>
                                </button>
                                {postMenuId === post.id && (
                                  <div role="menu" aria-label={lang === 'es' ? 'Acciones de publicación' : 'Post actions'}
                                    className="absolute right-0 top-full z-40 mt-2 min-w-[190px] rounded-2xl bg-white/95 p-1.5 shadow-[0_12px_30px_rgba(32,78,74,0.14)] backdrop-blur-xl">
                                    <button type="button" role="menuitem"
                                      onClick={() => { setPostMenuId(null); setPostReportId(post.id); setReportOpen(true) }}
                                      className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-bold text-[#204E4A] hover:bg-[#FAF8F5]">
                                      {lang === 'es' ? 'Denunciar publicación' : 'Report post'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {post.photoUrl && (
                            <div className="max-h-[460px] w-full overflow-hidden bg-[#E9EFEB]">
                              <img src={post.photoUrl} alt={post.text || petProfile.name} className="max-h-[460px] w-full object-cover" />
                            </div>
                          )}
                          <div className="space-y-2 px-4 py-3">
                            <div className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#5C7470]">
                              <IconPaw size={17} className="text-[#204E4A]" />
                              <span>{post.likes} {lang === 'es' ? 'me gusta' : 'likes'}</span>
                            </div>
                            {post.text && <p className="break-words text-[16px] font-medium leading-relaxed text-[#204E4A]">{post.text}</p>}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Paso 4: Cajas de Información con Restricciones de Desbordamiento */
                <div className="rounded-[2rem] bg-white/70 p-4 shadow-[0_8px_26px_rgba(32,78,74,0.06)] backdrop-blur-xl sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm sm:text-base">
                    <div className="flex flex-col space-y-1 overflow-hidden rounded-[1.4rem] bg-white/65 p-4 shadow-sm backdrop-blur-sm">
                      <span className="font-bold text-[#5C7470]">
                        {lang === 'es' ? 'Edad' : 'Age'}
                      </span>
                      <span className="font-black text-sm sm:text-base text-[#204E4A] break-words">{petProfile.age}</span>
                    </div>
                    <div className="flex flex-col space-y-1 overflow-hidden rounded-[1.4rem] bg-white/65 p-4 shadow-sm backdrop-blur-sm">
                      <span className="font-bold text-[#5C7470]">
                        {lang === 'es' ? 'Género' : 'Gender'}
                      </span>
                      <span className="font-black text-sm sm:text-base text-[#204E4A] capitalize break-words">
                        {petProfile.gender || (lang === 'es' ? 'Sin especificar' : 'Not specified')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}