import { useState, useEffect } from 'react'
import type { Pet, Post } from '../../types/pazo'
import { supabase } from '../../services/supabaseClient'
import { FollowButton } from '../shared/FollowButton'
import { IconPaw } from '../icons/PazoIcons'

interface PublicProfileViewProps {
  targetPetId: string
  currentPetId?: string
  onClose: () => void
  lang: 'es' | 'en'
}

export const PublicProfileView = ({
  targetPetId,
  currentPetId,
  onClose,
  lang,
}: PublicProfileViewProps) => {
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
          .select('id,owner_id,name,species,age,photo_url,created_at,bio,breed,gender,is_lost,last_seen_location')
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

        if (petData.owner_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('is_founder')
            .eq('id', petData.owner_id)
            .maybeSingle()

          if (profileData?.is_founder && isMounted) {
            setIsFounder(true)
          }
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
          lastSeenLocation: petData.is_lost ? (petData.last_seen_location || undefined) : undefined,
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
    <div className="absolute inset-0 z-[100] bg-[#FDFBF7] overflow-y-auto animate-slide-up flex flex-col font-['Quicksand','Nunito',sans-serif] antialiased text-[#204E4A]">

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

      {/* Contenedor Principal */}
      <div className="p-4 sm:p-6 md:p-8 max-w-3xl w-full mx-auto space-y-8 flex-1 relative z-10">
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
          <div className="space-y-8 animate-fade-in">

            {/* Paso 3: Tarjeta Principal (Verdadero Glassmorphism Avanzado) */}
            <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(32,78,74,0.08)] rounded-[2.5rem] p-6 sm:p-8 text-center space-y-6">

              {/* Avatar */}
              <div className="relative inline-block">
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-[#E1E53F] shadow-sm overflow-hidden bg-white mx-auto relative z-10">
                  <img
                    src={petProfile.photoUrl}
                    alt={petProfile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {petProfile.isLost && (
                  <span className="absolute bottom-1 right-0 bg-[#EC7357] text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-md border-2 border-white z-20">
                    {lang === 'es' ? 'Perdido' : 'Lost'}
                  </span>
                )}
              </div>

              {/* Info Central */}
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center gap-2">
                  <h2 className="text-3xl sm:text-4xl text-[#204E4A] font-black tracking-tight flex items-center flex-wrap justify-center gap-2">
                    {petProfile.name}
                    <IconPaw size={24} className="text-[#204E4A]/30" />
                    {isFounder && (
                      <span className="bg-gradient-to-r from-[#E1E53F] to-[#d4d82e] text-[#204E4A] font-black text-[10px] px-2.5 py-1 rounded-full shadow-sm border border-[#204E4A]/10 ml-1 tracking-wider uppercase">
                        Fundador
                      </span>
                    )}
                  </h2>
                  <span className="bg-white/60 backdrop-blur-sm text-[#204E4A] font-extrabold text-sm px-4 py-1.5 rounded-full uppercase tracking-wide border border-white">
                    {petProfile.species}
                  </span>
                </div>

                {(petProfile.breed || petProfile.lastSeenLocation) && (
                  <p className="text-base text-[#5C7470] font-bold">
                    {petProfile.breed && <span>{petProfile.breed}</span>}
                    {petProfile.breed && petProfile.lastSeenLocation && <span className="mx-2 opacity-30">|</span>}
                    {petProfile.lastSeenLocation && <span>📍 {petProfile.lastSeenLocation}</span>}
                  </p>
                )}

                {petProfile.bio && (
                  <p className="text-base text-[#204E4A]/90 font-medium bg-white/50 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/60 max-w-xl mx-auto leading-relaxed break-words shadow-sm">
                    "{petProfile.bio}"
                  </p>
                )}
              </div>

              {/* Paso 1: Reparación y Conexión del FollowButton */}
              <div className="flex justify-center w-full mt-2 relative z-20">
                <div className="w-full max-w-[260px]">
                  <FollowButton
                    currentPetId={currentPetId || ''}
                    targetPetId={petProfile.id}
                    lang={lang}
                    variant="profile" // Obliga al estilo de perfil sin que se oculte
                    onFollowChange={(isFollowing) => {
                      // Actualización instantánea en tiempo real del contador
                      setFollowersCount((prev) => isFollowing ? prev + 1 : Math.max(0, prev - 1))
                    }}
                  />
                </div>
              </div>

              {/* Métricas Reales */}
              <div className="flex items-center justify-around gap-2 pt-6 border-t border-[#204E4A]/10">
                <div className="flex flex-col items-center flex-1">
                  <span className="font-black text-2xl text-[#204E4A]">{petPosts.length}</span>
                  <span className="text-xs font-bold text-[#5C7470] uppercase tracking-wider mt-1">{lang === 'es' ? 'Publicaciones' : 'Posts'}</span>
                </div>
                <div className="w-px h-12 bg-[#204E4A]/10"></div>
                <div className="flex flex-col items-center flex-1">
                  <span className="font-black text-2xl text-[#204E4A] transition-all duration-300">{followersCount}</span>
                  <span className="text-xs font-bold text-[#5C7470] uppercase tracking-wider mt-1">{lang === 'es' ? 'Seguidores' : 'Followers'}</span>
                </div>
                <div className="w-px h-12 bg-[#204E4A]/10"></div>
                <div className="flex flex-col items-center flex-1">
                  <span className="font-black text-2xl text-[#204E4A]">{followingCount}</span>
                  <span className="text-xs font-bold text-[#5C7470] uppercase tracking-wider mt-1">{lang === 'es' ? 'Siguiendo' : 'Following'}</span>
                </div>
              </div>
            </div>

            {/* Paso 4: Refinamiento de Pestañas (Totalmente Transparentes) */}
            <div className="relative flex bg-transparent p-1.5 rounded-full border border-[#204E4A]/10 w-full max-w-md mx-auto">
              {/* Indicador de fondo oscuro que se desliza */}
              <div
                className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-[#204E4A] rounded-full transition-transform duration-300 ease-out shadow-[0_4px_12px_rgba(32,78,74,0.3)]"
                style={{
                  transform: activeTab === 'posts' ? 'translateX(0)' : 'translateX(100%)',
                }}
              />
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex-1 relative z-10 py-3.5 text-sm sm:text-base font-bold rounded-full transition-colors duration-300 ${activeTab === 'posts' ? 'text-white' : 'text-[#5C7470] hover:text-[#204E4A]'
                  }`}
              >
                {lang === 'es' ? 'Publicaciones' : 'Posts'}
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 relative z-10 py-3.5 text-sm sm:text-base font-bold rounded-full transition-colors duration-300 ${activeTab === 'info' ? 'text-white' : 'text-[#5C7470] hover:text-[#204E4A]'
                  }`}
              >
                {lang === 'es' ? 'Información' : 'Info'}
              </button>
            </div>

            {/* Contenido (Galería / Información) */}
            <div className="pt-2">
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
                    /* Galería Inmersiva */
                    <div className="grid grid-cols-2 gap-4 sm:gap-5">
                      {petPosts.map((post) => (
                        <div
                          key={post.id}
                          className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-[0_4px_20px_rgba(32,78,74,0.08)] relative group bg-neutral-100 cursor-pointer"
                        >
                          <img
                            src={post.photoUrl}
                            alt={post.text}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-4 sm:p-5">
                            <p className="text-white text-sm sm:text-base font-medium z-10 relative line-clamp-3 leading-snug drop-shadow-md">
                              {post.text}
                            </p>
                          </div>
                        </div>
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