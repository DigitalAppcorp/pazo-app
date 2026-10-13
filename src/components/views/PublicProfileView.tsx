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

  return (
    <div className="absolute inset-0 z-[100] bg-[#FDFBF7] overflow-y-auto animate-slide-up flex flex-col font-sans antialiased text-[#204E4A]">

      {/* Paso 3: Orbes de Luz Ambiental para Glassmorphism Avanzado */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="bg-[#E1E53F]/40 blur-[100px] w-96 h-96 rounded-full absolute -top-10 -left-10 animate-pulse"></div>
        <div className="bg-[#204E4A]/15 blur-[120px] w-[28rem] h-[28rem] rounded-full absolute top-1/4 -right-20"></div>
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
                  <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setReportOpen(true) }}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-bold text-[#204E4A] hover:bg-[#FAF8F5]">
                    {lang === 'es' ? 'Denunciar perfil' : 'Report profile'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {reportOpen && <ReportDialog target={{kind:'pet_profile',id:targetPetId,label:describeReportSubject('pet_profile',petProfile?.name,null,lang)}} lang={lang} onClose={() => setReportOpen(false)} />}
      {/* Contenedor Principal */}
      <div className="w-full max-w-2xl flex-1 mx-auto space-y-4 px-4 py-4 sm:px-6 sm:py-6 relative z-10">
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

            {/* Comunidad/Lifestyle: sin portada. Las insignias futuras se añadirán
                junto a la identidad; sin espacio vacío ni insignias inventadas. */}
            <section className="rounded-[2rem] bg-white/75 px-4 py-5 shadow-[0_12px_32px_rgba(32,78,74,0.08)] backdrop-blur-xl sm:px-6 sm:py-6">
              <div className="flex items-start gap-3.5 sm:gap-5">
                <div className="relative shrink-0">
                  <img src={petProfile.photoUrl} alt={petProfile.name}
                    className="h-[94px] w-[94px] rounded-[1.75rem] bg-[#FAF8F5] object-cover shadow-sm sm:h-28 sm:w-28" />
                  {petProfile.isLost && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#EC7357] px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm">
                      {lang === 'es' ? 'Perdido' : 'Lost'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <h2 className="min-w-0 break-words text-[clamp(23px,6vw,31px)] font-black leading-tight tracking-tight text-[#204E4A]">
                      {petProfile.name}
                    </h2>
                    <IconPaw size={18} className="shrink-0 text-[#204E4A]/45" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[#E1E53F]/65 px-3 py-1 text-[12px] font-extrabold uppercase text-[#204E4A]">{petProfile.species}</span>
                    {/* Punto de extensión para insignias; solo las existentes y verificadas. */}
                    {isFounder && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#204E4A]/10 px-2.5 py-1 text-[11px] font-extrabold text-[#204E4A]">
                        <IconPaw size={13} />{lang === 'es' ? 'Fundador' : 'Founder'}
                      </span>
                    )}
                  </div>
                  {petProfile.breed && <p className="mt-2 break-words text-[13px] font-semibold text-[#5C7470]">{petProfile.breed}</p>}
                </div>
              </div>

              {Boolean(petProfile.bio?.trim()) && (
                <p className="mt-4 break-words text-[14px] font-semibold leading-relaxed text-[#204E4A]">{petProfile.bio}</p>
              )}

              {Boolean(currentPetId) && !ownedPetIds.includes(petProfile.id) && (
                <div className="mt-4">
                  <FollowButton currentPetId={currentPetId || ''} targetPetId={petProfile.id}
                    canFollow={true} lang={lang} variant="profile"
                    onFollowChange={(following) => setFollowersCount((previous) => following ? previous + 1 : Math.max(0, previous - 1))} />
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-1 rounded-[1.5rem] bg-[#F6F7EE]/90 px-1.5 py-3 sm:gap-2">
                {([
                  { key: 'posts', count: petPosts.length, label: lang === 'es' ? 'Publicaciones' : 'Posts', Icon: IconDocument },
                  { key: 'followers', count: followersCount, label: lang === 'es' ? 'Seguidores' : 'Followers', Icon: IconCommunity },
                  { key: 'following', count: followingCount, label: lang === 'es' ? 'Siguiendo' : 'Following', Icon: IconHeart },
                ] as const).map(({ key, count, label, Icon }) => (
                  <div key={key} className="flex min-w-0 flex-col items-center justify-center gap-1 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E1E53F]/35 text-[#204E4A]">
                        <Icon size={16} />
                      </span>
                      <span className="text-[23px] font-black leading-none text-[#204E4A]">{count}</span>
                    </div>
                    <span className="w-full text-[clamp(9px,2.5vw,11px)] font-extrabold uppercase leading-tight tracking-[-0.025em] text-[#5C7470]">{label}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-1 rounded-[1.65rem] bg-white/75 p-1.5 shadow-[0_4px_18px_rgba(32,78,74,0.05)] backdrop-blur-xl">
              <button type="button" aria-pressed={activeTab === 'posts'} onClick={() => setActiveTab('posts')}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-[1.35rem] px-2 py-3 text-[clamp(13px,3.7vw,16px)] font-extrabold transition-colors ${activeTab === 'posts' ? 'bg-[#204E4A] text-white shadow-sm' : 'text-[#5C7470] hover:bg-[#204E4A]/5'}`}>
                <IconDocument size={17} /><span>{lang === 'es' ? 'Publicaciones' : 'Posts'}</span>
              </button>
              <button type="button" aria-pressed={activeTab === 'info'} onClick={() => setActiveTab('info')}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-[1.35rem] px-2 py-3 text-[clamp(13px,3.7vw,16px)] font-extrabold transition-colors ${activeTab === 'info' ? 'bg-[#204E4A] text-white shadow-sm' : 'text-[#5C7470] hover:bg-[#204E4A]/5'}`}>
                <span aria-hidden="true" className="text-[17px] font-black leading-none">ⓘ</span>
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
                    /* Publicaciones en formato social: una publicación ocupa todo el ancho. */
                    <div className="flex flex-col gap-4">
                      {petPosts.map((post) => (
                        <article key={post.id} className="overflow-hidden rounded-[1.8rem] bg-white/75 shadow-[0_6px_24px_rgba(32,78,74,0.07)] backdrop-blur-xl">
                          <div className="flex items-center gap-3 px-4 py-3">
                            <img src={petProfile.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[19px] font-black text-[#204E4A]">{petProfile.name}</p>
                              <p className="text-[15px] text-[#5C7470]">{post.timeAgo}</p>
                            </div>
                          </div>
                          {post.photoUrl && (
                            <div className="max-h-[420px] w-full overflow-hidden bg-[#E9EFEB]">
                              <img src={post.photoUrl} alt={post.text || petProfile.name} className="max-h-[420px] w-full object-cover" />
                            </div>
                          )}
                          <div className="space-y-2 px-4 py-3">
                            <div className="flex items-center gap-1.5 text-[16px] font-extrabold text-[#5C7470]">
                              <IconPaw size={17} className="text-[#204E4A]" />
                              <span>{post.likes} {lang === 'es' ? 'me gusta' : 'likes'}</span>
                            </div>
                            {post.text && <p className="break-words text-[19px] font-medium leading-relaxed text-[#204E4A]">{post.text}</p>}
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