import { useState, useEffect } from 'react'
import type { Pet, Post } from '../../types/pazo'
import { supabase } from '../../services/supabaseClient'
import { FollowButton } from '../shared/FollowButton'
import { IconPaw } from '../icons/PazoIcons'
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

  return (
    <div className="absolute inset-0 z-[100] bg-[#FDFBF7] overflow-y-auto animate-slide-up flex flex-col font-sans antialiased text-[#204E4A]">

      {/* Paso 3: Orbes de Luz Ambiental para Glassmorphism Avanzado */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="bg-[#E1E53F]/40 blur-[100px] w-96 h-96 rounded-full absolute -top-10 -left-10 animate-pulse"></div>
        <div className="bg-[#204E4A]/15 blur-[120px] w-[28rem] h-[28rem] rounded-full absolute top-1/4 -right-20"></div>
        <div className="bg-[#E8F3EE]/80 blur-[100px] w-[32rem] h-[32rem] rounded-full absolute bottom-10 left-1/4 animate-pulse" style={{ animationDuration: '7s' }}></div>
      </div>

      {/* Cabecera Fija */}
      <div className="sticky top-0 z-30 bg-[#FDFBF7]/80 backdrop-blur-xl px-4 sm:px-8 py-4 flex items-center justify-between border-b border-[#204E4A]/5">
        <button
          onClick={onClose}
          className="bg-white/80 backdrop-blur-md border border-[#204E4A]/10 text-[#204E4A] font-bold rounded-full px-5 py-2.5 cursor-pointer shadow-sm hover:bg-white transition-all active:scale-95 text-sm flex items-center gap-2"
        >
          <span className="text-lg leading-none mb-0.5">←</span>
          <span>{lang === 'es' ? 'Regresar' : 'Back'}</span>
        </button>
        <span className="text-sm font-black tracking-widest uppercase opacity-40 text-[#204E4A]">
          {lang === 'es' ? 'Perfil' : 'Profile'}
        </span>
        <div className="w-24"></div>
      </div>

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
          <div className="text-center py-16 space-y-4 bg-white/50 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-sm border border-white/60">
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

            {/* F13: Perfil social compacto. Sin contenedores vacíos cuando no se puede seguir. */}
            <section className="overflow-hidden rounded-[2rem] bg-white/65 px-4 py-5 shadow-[0_14px_34px_rgba(32,78,74,0.09)] backdrop-blur-2xl sm:px-6 sm:py-6">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  <img
                    src={petProfile.photoUrl}
                    alt={petProfile.name}
                    className="h-24 w-24 rounded-[1.75rem] bg-[#FAF8F5] object-cover shadow-sm sm:h-28 sm:w-28"
                  />
                  {petProfile.isLost && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#EC7357] px-2.5 py-1 text-[14px] font-black text-white shadow-sm">
                      {lang === 'es' ? 'Perdido' : 'Lost'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="min-w-0 break-words text-[28px] font-black leading-tight tracking-tight text-[#204E4A] sm:text-[33px]">
                      {petProfile.name}
                    </h2>
                    <IconPaw size={19} className="shrink-0 text-[#204E4A]/35" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#E1E53F]/50 px-3 py-1 text-[15px] font-extrabold uppercase tracking-wide text-[#204E4A]">
                      {petProfile.species}
                    </span>
                    {isFounder && (
                      <span className="rounded-full bg-[#204E4A] px-3 py-1 text-[14px] font-black uppercase tracking-wide text-white">
                        {lang === 'es' ? 'Fundador' : 'Founder'}
                      </span>
                    )}
                  </div>
                  {petProfile.breed && (
                    <p className="mt-2 break-words text-[17px] font-semibold text-[#5C7470]">{petProfile.breed}</p>
                  )}
                </div>
              </div>
              {petProfile.bio && (
                <p className="mt-4 rounded-2xl bg-white/55 px-4 py-3 text-[18px] font-medium leading-relaxed text-[#204E4A] break-words">
                  {petProfile.bio}
                </p>
              )}

              {Boolean(currentPetId) && !ownedPetIds.includes(petProfile.id) && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-full max-w-[260px]">
                    <FollowButton
                      currentPetId={currentPetId || ''}
                      targetPetId={petProfile.id}
                      canFollow={true}
                      lang={lang}
                      variant="profile"
                      onFollowChange={(isFollowing) => {
                        setFollowersCount((prev) => isFollowing ? prev + 1 : Math.max(0, prev - 1))
                      }}
                    />
                  </div>
                </div>
              )}
              {canReport && !ownedPetIds.includes(targetPetId) && (
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="mt-3 rounded-full bg-white/75 px-3 py-1.5 text-[15px] font-bold text-[#5C7470] underline"
                >
                  {lang === 'es' ? 'Denunciar perfil' : 'Report profile'}
                </button>
              )}

              {/* Métricas deliberadamente compactas: etiquetas legibles en tres columnas móviles. */}
              <div className="mt-3 grid grid-cols-3 items-center gap-1 rounded-[1.3rem] bg-[#F3F5EF]/75 px-2 py-2.5 text-center sm:gap-3">
                <div className="flex min-w-0 flex-col items-center gap-1">
                  <span className="text-[23px] font-extrabold leading-none text-[#204E4A]">{petPosts.length}</span>
                  <span className="block w-full whitespace-nowrap text-[10px] font-bold uppercase leading-tight tracking-[-0.025em] text-[#5C7470] sm:text-[11px]">
                    {lang === 'es' ? 'Publicaciones' : 'Posts'}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col items-center gap-1">
                  <span className="text-[23px] font-extrabold leading-none text-[#204E4A]">{followersCount}</span>
                  <span className="block w-full whitespace-nowrap text-[10px] font-bold uppercase leading-tight tracking-[-0.025em] text-[#5C7470] sm:text-[11px]">
                    {lang === 'es' ? 'Seguidores' : 'Followers'}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col items-center gap-1">
                  <span className="text-[23px] font-extrabold leading-none text-[#204E4A]">{followingCount}</span>
                  <span className="block w-full whitespace-nowrap text-[10px] font-bold uppercase leading-tight tracking-[-0.025em] text-[#5C7470] sm:text-[11px]">
                    {lang === 'es' ? 'Siguiendo' : 'Following'}
                  </span>
                </div>
              </div>
            </section>

            {/* Pestañas sociales compactas, accesibles y translúcidas. */}
            <div className="mx-auto flex w-full max-w-md gap-1 rounded-[1.4rem] bg-white/60 p-1 backdrop-blur-xl">
              <button
                type="button"
                aria-pressed={activeTab === 'posts'}
                onClick={() => setActiveTab('posts')}
                className={`min-w-0 flex-1 rounded-[1.15rem] px-2 py-2.5 text-[18px] font-extrabold transition-colors ${activeTab === 'posts' ? 'bg-[#204E4A] text-white shadow-sm' : 'text-[#5C7470] hover:bg-white/60'}`}
              >
                {lang === 'es' ? 'Publicaciones' : 'Posts'}
              </button>
              <button
                type="button"
                aria-pressed={activeTab === 'info'}
                onClick={() => setActiveTab('info')}
                className={`min-w-0 flex-1 rounded-[1.15rem] px-2 py-2.5 text-[18px] font-extrabold transition-colors ${activeTab === 'info' ? 'bg-[#204E4A] text-white shadow-sm' : 'text-[#5C7470] hover:bg-white/60'}`}
              >
                {lang === 'es' ? 'Información' : 'Info'}
              </button>
            </div>

            {/* Contenido (Galería / Información) */}
            <div className="pt-0">
              {activeTab === 'posts' ? (
                <div>
                  {petPosts.length === 0 ? (
                    <div className="text-center py-16 bg-white/40 backdrop-blur-md rounded-[2.5rem] p-6 shadow-sm border border-white/50">
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
                <div className="bg-white/40 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] border border-white/60 shadow-[0_8px_32px_rgba(32,78,74,0.05)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm sm:text-base">
                    <div className="flex flex-col p-5 bg-white/60 backdrop-blur-sm rounded-[1.5rem] border border-white/80 space-y-1 shadow-sm overflow-hidden">
                      <span className="font-bold text-[#5C7470]">
                        {lang === 'es' ? 'Edad' : 'Age'}
                      </span>
                      <span className="font-black text-sm sm:text-base text-[#204E4A] break-words">{petProfile.age}</span>
                    </div>
                    <div className="flex flex-col p-5 bg-white/60 backdrop-blur-sm rounded-[1.5rem] border border-white/80 space-y-1 shadow-sm overflow-hidden">
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