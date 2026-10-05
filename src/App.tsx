import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { supabase } from './services/supabaseClient'
import type { Pet, Post, Community, CareItem, Conversation } from './types/pazo'
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"
import {
  INITIAL_PETS,
  INITIAL_COMMUNITIES,
  INITIAL_PLACES,
  INITIAL_CARE_ITEMS,
  INITIAL_DOCS,
  INITIAL_CONVERSATIONS,
  INITIAL_NOTIFICATIONS,
} from './data/mockData'

import { BottomNav, type NavTab } from './components/BottomNav'
import { HeaderBar } from './components/HeaderBar'
import { HomeView } from './components/views/HomeView'
import { ExploreView } from './components/views/ExploreView'
import { MapView } from './components/views/MapView'
import { PetView } from './components/views/PetView'
import { OnboardingView } from './components/views/OnboardingView'
import { PublicProfileView } from './components/views/PublicProfileView'

import { CreateModal } from './components/modals/CreateModal'
import { CreatePostModal } from './components/modals/CreatePostModal'
import { PassportModal } from './components/modals/PassportModal'
import { CareModal } from './components/modals/CareModal'
import { AlertModal } from './components/modals/AlertModal'
import { MessagesModal } from './components/modals/MessagesModal'
import { NotificationsModal } from './components/modals/NotificationsModal'

function PazoMain() {
  const { user, loading, signIn } = useAuth()
  const [lang, setLang] = useState<'es' | 'en'>('es')

  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false)
    }, 2500)

    return () => clearTimeout(splashTimer)
  }, [])

  const [isDemoUser, setIsDemoUser] = useState(false)
  const [authMode, setAuthMode] = useState<'onboarding' | 'login'>('onboarding')
  const [isOnboardingActive, setIsOnboardingActive] = useState(true)
  const [initialOnboardingStep, setInitialOnboardingStep] = useState<'A01' | 'A02' | 'A03' | 'A04' | 'A05'>('A01')

  const [showFounderModal, setShowFounderModal] = useState(false)
  const [isFeedLoading, setIsFeedLoading] = useState(true)

  const [pets, setPets] = useState<Pet[]>(INITIAL_PETS)
  const [currentPet, setCurrentPet] = useState<Pet>(INITIAL_PETS[0])
  const [posts, setPosts] = useState<Post[]>([])
  const likingPostIdsRef = useRef<Set<string>>(new Set())
  const savingPostIdsRef = useRef<Set<string>>(new Set())
  const [communities, setCommunities] = useState<Community[]>(INITIAL_COMMUNITIES)
  const [places] = useState(INITIAL_PLACES)
  const [careItems, setCareItems] = useState<CareItem[]>(INITIAL_CARE_ITEMS)
  const [docs] = useState(INITIAL_DOCS)
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)

  const [activeTab, setActiveTab] = useState<NavTab>('inicio')

  // Estado global para la pantalla exclusiva de perfil público
  const [selectedPublicProfileId, setSelectedPublicProfileId] = useState<string | null>(null)

  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [isPassportOpen, setIsPassportOpen] = useState(false)
  const [isCareOpen, setIsCareOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [isMessagesOpen, setIsMessagesOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const blendFeeds = (followed: Post[], recommended: Post[]): Post[] => {
    if (!followed || followed.length === 0) return recommended
    if (!recommended || recommended.length === 0) return followed

    // Crear un Set con los IDs de las publicaciones seguidas para evitar duplicados
    const followedIds = new Set(followed.map(p => p.id))

    // Filtrar recomendaciones que ya existan en el feed de seguidos
    const filteredRecommended = recommended.filter(p => !followedIds.has(p.id))

    const blended: Post[] = []
    let recIndex = 0

    // Calcular frecuencia dinámica de inyección basada en el tamaño del feed de seguidos
    const frequency = followed.length <= 3 ? 2 : 4

    for (let i = 0; i < followed.length; i++) {
      blended.push(followed[i])

      // Inyectar un post recomendado cada 'frequency' posts de seguidos
      if ((i + 1) % frequency === 0 && recIndex < filteredRecommended.length) {
        blended.push({
          ...filteredRecommended[recIndex],
          isRecommended: true
        } as Post)
        recIndex++
      }
    }

    // Si sobraron recomendaciones filtradas y el feed es corto, añadirlas al final
    while (recIndex < filteredRecommended.length) {
      blended.push({
        ...filteredRecommended[recIndex],
        isRecommended: true
      } as Post)
      recIndex++
    }

    return blended
  }

  const enrichPostsWithInteractions = async (postsList: Post[], petId?: string): Promise<Post[]> => {
    if (postsList.length === 0) return postsList

    if (!petId) {
      return postsList.map((post) => ({
        ...post,
        isLiked: false,
        isSaved: false,
      }))
    }

    try {
      const postIds = postsList.map((post) => post.id)
      const { data: interactionsData, error } = await supabase
        .from('interactions')
        .select('target_id, action_type')
        .eq('actor_pet_id', petId)
        .eq('target_type', 'post')
        .in('action_type', ['like', 'save'])
        .in('target_id', postIds)

      if (error) throw error

      const likedPostIds = new Set<string>()
      const savedPostIds = new Set<string>()

      interactionsData?.forEach((interaction) => {
        if (interaction.action_type === 'like') {
          likedPostIds.add(interaction.target_id)
        } else if (interaction.action_type === 'save') {
          savedPostIds.add(interaction.target_id)
        }
      })

      return postsList.map((post) => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
        isSaved: savedPostIds.has(post.id),
      }))
    } catch (err) {
      console.error('Error cargando estados de interacciones (Like/Save):', err)
      return postsList.map((post) => ({
        ...post,
        isLiked: false,
        isSaved: false,
      }))
    }
  }

  const trackInteraction = async (targetId: string, targetType: 'post' | 'community' | 'place' | 'profile', actionType: 'like' | 'comment' | 'join' | 'view') => {
    try {
      if (!currentPet?.id) return
      await supabase.from('interactions').insert({
        actor_pet_id: currentPet.id,
        target_id: targetId,
        target_type: targetType,
        action_type: actionType,
      })
    } catch (err) {
      console.error('Error tracking interaction:', err)
    }
  }

  useEffect(() => {
    if (!loading && user) {
      const initApp = async () => {
        if (!user?.id) return
        setIsFeedLoading(true)

        const { data: myPet, error: petError } = await supabase
          .from('pets')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (petError) {
          console.error('Error fetching pet profile:', petError)
        }

        if (myPet) {
          setIsOnboardingActive(false)

          const hasSeenPitch = localStorage.getItem(`pitch_seen_${user.id}`)
          if (!hasSeenPitch) {
            setShowFounderModal(true)
            localStorage.setItem(`pitch_seen_${user.id}`, 'true')
          }

          const realPet: Pet = {
            id: myPet.id,
            name: myPet.name,
            species: myPet.species as any,
            breed: 'Raza por definir',
            age: myPet.age || 'Desconocida',
            gender: 'hembra',
            weight: myPet.weight || '-- kg',
            dietPlan: myPet.dietPlan || 'Por definir',
            bio: myPet.bio || `Perfil oficial de ${myPet.name} en Pazo.`,
            photoUrl: myPet.photo_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
            qrId: `PAZO-QR-${myPet.name.toUpperCase()}`,
            isLost: false,
          }
          setCurrentPet(realPet)

          let userInterests: string[] = ['Comunidades de gatos', 'Lugares aptos para mascotas']
          if (myPet.interests && Array.isArray(myPet.interests)) {
            userInterests = myPet.interests
          }

          const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', myPet.id)
          const followingIds = follows?.map(f => f.following_id) || []

          // 1. Consulta segura para followedPosts: abortar si no hay followingIds
          let followedPostsData: any[] = []
          if (followingIds && followingIds.length > 0) {
            const { data: fData, error: fError } = await supabase
              .from('posts')
              .select('*')
              .in('pet_id', followingIds)
              .order('created_at', { ascending: false })

            if (!fError && fData) {
              followedPostsData = fData
            }
          }

          // 2. Consulta segura para recommendedPosts: construcción dinámica del query
          const excludedIds = [...followingIds, myPet.id].filter(Boolean)
          let recommendedQuery = supabase
            .from('posts')
            .select('*')
            .overlaps('tags', userInterests)
            .order('likes', { ascending: false })
            .limit(3)

          // Aplicar el .not() ÚNICAMENTE si hay IDs para excluir, evitando el error HTTP 406
          if (excludedIds && excludedIds.length > 0) {
            recommendedQuery = recommendedQuery.not('pet_id', 'in', `(${excludedIds.join(',')})`)
          }

          const { data: recommendedData, error: recommendedError } = await recommendedQuery

          if (recommendedError) {
            console.error('Error fetching recommended posts:', recommendedError)
          }

          const followedPosts = followedPostsData
          const recommendedPosts = recommendedData || []

          const formattedFollowed: Post[] = (followedPosts || []).map((p: any) => ({
            id: p.id, petId: p.pet_id, petName: p.pet_name, petSpecies: p.pet_species, petAvatar: p.pet_avatar, location: p.location, timeAgo: 'Hace un momento', createdAt: p.created_at, isRecommended: false, tags: p.tags || [], text: p.text, photoUrl: p.photo_url, likes: p.likes || 0, isLiked: false, isSaved: false, comments: p.comments || [],
          }))

          const formattedRecommended: Post[] = (recommendedPosts || []).map((p: any) => ({
            id: p.id, petId: p.pet_id, petName: p.pet_name, petSpecies: p.pet_species, petAvatar: p.pet_avatar, location: p.location, timeAgo: 'Hace un momento', createdAt: p.created_at, isRecommended: true, tags: p.tags || [], text: p.text, photoUrl: p.photo_url, likes: p.likes || 0, isLiked: false, isSaved: false, comments: p.comments || [],
          }))

          // Consulta RPC de recomendaciones personalizadas del motor de inteligencia
          let formattedRpcRecommended: Post[] = []
          if (myPet?.id) {
            const { data: recommendedData, error: recommendedError } = await supabase.rpc('get_recommended_posts', {
              p_actor_pet_id: myPet.id,
              p_limit: 10
            })

            if (recommendedError) {
              console.error('Error fetching recommended posts:', recommendedError)
            } else if (recommendedData) {
              formattedRpcRecommended = recommendedData.map((p: any) => ({
                id: p.id, petId: p.pet_id, petName: p.pet_name, petSpecies: p.pet_species, petAvatar: p.pet_avatar, location: p.location, timeAgo: 'Hace un momento', createdAt: p.created_at, isRecommended: true, tags: p.tags || [], text: p.text, photoUrl: p.photo_url, likes: p.likes || 0, isLiked: false, isSaved: false, comments: p.comments || [],
              }))
            }
          }

          // Mezclar con deduplicación: RPC si disponible, fallback a tag-based
          const recommendationsLayer = formattedRpcRecommended.length > 0 ? formattedRpcRecommended : formattedRecommended
          let smartFeed = blendFeeds(formattedFollowed, recommendationsLayer)

          if (smartFeed.length === 0) {
            const { data: fallbackPosts } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(10)
            smartFeed = (fallbackPosts || []).map((p: any) => ({
              id: p.id, petId: p.pet_id, petName: p.pet_name, petSpecies: p.pet_species, petAvatar: p.pet_avatar, location: p.location, timeAgo: 'Hace un momento', createdAt: p.created_at, isRecommended: false, tags: p.tags || [], text: p.text, photoUrl: p.photo_url, likes: p.likes || 0, isLiked: false, isSaved: false, comments: p.comments || [],
            }))
          }

          const enrichedFeed = await enrichPostsWithInteractions(smartFeed, myPet.id)
          setPosts(enrichedFeed)
          setIsFeedLoading(false)

        } else {
          setAuthMode('onboarding')
          setInitialOnboardingStep('A03')
          setIsOnboardingActive(true)
          setIsFeedLoading(false)
        }
      }

      initApp()
    }
  }, [user, loading])

  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')
  const [submittingLogin, setSubmittingLogin] = useState(false)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingLogin(true)
    setLoginMessage('')

    const success = await signIn(emailInput, passwordInput)

    if (!success) {
      setLoginMessage(lang === 'es' ? 'Credenciales incorrectas o error de acceso.' : 'Invalid credentials or login error.')
    }
    setSubmittingLogin(false)
  }

  const handleLikePost = async (postId: string) => {
    if (!currentPet?.id) return
    if (likingPostIdsRef.current.has(postId)) return

    const postToUpdate = posts.find((post) => post.id === postId)
    if (!postToUpdate) return

    likingPostIdsRef.current.add(postId)

    const previousIsLiked = postToUpdate.isLiked ?? false
    const previousLikes = postToUpdate.likes
    const newIsLiked = !previousIsLiked
    const newLikes = newIsLiked ? previousLikes + 1 : Math.max(0, previousLikes - 1)
    const actionType = newIsLiked ? 'like' : 'unlike'

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? { ...post, isLiked: newIsLiked, likes: newLikes }
          : post
      )
    )

    try {
      const { error } = await supabase.rpc('register_interaction_signal', {
        p_actor_pet_id: currentPet.id,
        p_target_id: postId,
        p_action_type: actionType,
      })

      if (error) throw error
    } catch (err) {
      console.error(`Error procesando ${actionType} para el post ${postId}:`, err)
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, isLiked: previousIsLiked, likes: previousLikes }
            : post
        )
      )
    } finally {
      likingPostIdsRef.current.delete(postId)
    }
  }

  const handleSavePost = async (postId: string) => {
    if (!currentPet?.id) return
    if (savingPostIdsRef.current.has(postId)) return

    const postToUpdate = posts.find((post) => post.id === postId)
    if (!postToUpdate) return

    savingPostIdsRef.current.add(postId)

    const previousIsSaved = postToUpdate.isSaved ?? false
    const newIsSaved = !previousIsSaved
    const actionType = newIsSaved ? 'save' : 'unsave'

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? { ...post, isSaved: newIsSaved }
          : post
      )
    )

    try {
      const { error } = await supabase.rpc('register_interaction_signal', {
        p_actor_pet_id: currentPet.id,
        p_target_id: postId,
        p_action_type: actionType,
      })

      if (error) throw error
    } catch (err) {
      console.error(`Error procesando ${actionType} para el post ${postId}:`, err)
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, isSaved: previousIsSaved }
            : post
        )
      )
    } finally {
      savingPostIdsRef.current.delete(postId)
    }
  }

  const handleAddComment = async (postId: string, text: string) => {
    // Guarda previa estricta (incluyendo texto vacío)
    if (!currentPet?.id || !postId || !text.trim()) return

    const targetPost = posts.find((p) => p.id === postId)
    if (!targetPost) return

    const newComment = {
      id: `c-${Date.now()}`,
      authorName: currentPet.name,
      authorPet: currentPet.species,
      authorAvatar: currentPet.photoUrl,
      text: text.trim(),
      timeAgo: lang === 'es' ? 'justo ahora' : 'just now',
      createdAt: new Date().toISOString(),
    }

    const updatedComments = [...targetPost.comments, newComment]

    // 1. Actualización optimista del estado local
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p
        return {
          ...p,
          comments: updatedComments,
        }
      })
    )

    // 2. Persistencia en background (no bloqueante)
    supabase
      .from('posts')
      .update({ comments: updatedComments })
      .eq('id', postId)
      .then(({ error }) => {
        if (error) console.error('Error updating comments in DB:', error)
      })

    // 3. Registro de señal analítica e inteligente
    trackInteraction(postId, 'post', 'comment')

    supabase.rpc('register_interaction_signal', {
      p_actor_pet_id: currentPet.id,
      p_target_id: postId,
      p_action_type: 'comment'
    }).then(({ error }) => {
      if (error) console.error('Error registering comment signal:', error)
    })
  }

  const handlePostCreated = (newPost: Post) => {
    setPosts((prevPosts) => [newPost, ...prevPosts])
    setIsCreatePostOpen(false)
    setActiveTab('inicio')
  }

  const handleToggleJoinCommunity = (commId: string) => {
    setCommunities((prev) =>
      prev.map((c) => {
        if (c.id === commId) {
          const willJoin = !c.isJoined
          if (willJoin) {
            trackInteraction(commId, 'community', 'join')
          }
          return {
            ...c,
            isJoined: willJoin,
            membersCount: c.isJoined ? c.membersCount - 1 : c.membersCount + 1,
          }
        }
        return c
      })
    )
  }

  const handleToggleCompleteCare = (id: string) => {
    setCareItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
    )
  }

  const handleAddCare = (item: Omit<CareItem, 'id'>) => {
    const newItem: CareItem = {
      ...item,
      id: `care-${Date.now()}`,
    }
    setCareItems((prev) => [newItem, ...prev])
  }

  const handleSendMessage = (convId: string, text: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c
        const newMsg = {
          id: `m-${Date.now()}`,
          sender: 'me' as const,
          text,
          timestamp: 'Ahora',
        }
        return {
          ...c,
          lastMessage: text,
          timeAgo: 'Ahora',
          messages: [...c.messages, newMsg],
        }
      })
    )
  }

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const unreadMessages = conversations.filter((c) => c.isRequest).length
  const unreadNotifications = notifications.filter((n) => !n.read).length

  if (showSplash || loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#204E4A] flex flex-col items-center justify-center relative overflow-hidden p-5">
        <style>{`
          @keyframes flyOutSpin {
            0%, 15% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
            45% { transform: translate(var(--tx), var(--ty)) rotate(180deg) scale(1.4); opacity: 0.85; }
            65% { transform: translate(var(--tx), var(--ty)) rotate(720deg) scale(1.4); opacity: 0.85; }
            90%, 100% { transform: translate(0, 0) rotate(1080deg) scale(1); opacity: 1; }
          }
          .letter-epic {
            display: inline-block;
            animation: flyOutSpin 4s cubic-bezier(0.68, -0.55, 0.26, 1.55) infinite;
            transform-origin: center;
          }
        `}</style>
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#E1E53F]/35 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#204E4A]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-6xl sm:text-7xl font-black text-[#204E4A] tracking-tighter flex items-center relative z-10">
          <span className="letter-epic" style={{ '--tx': '-70px', '--ty': '-50px' } as React.CSSProperties}>p</span>
          <span className="letter-epic" style={{ '--tx': '-35px', '--ty': '60px' } as React.CSSProperties}>a</span>
          <span className="letter-epic" style={{ '--tx': '35px', '--ty': '-60px' } as React.CSSProperties}>z</span>
          <span className="letter-epic" style={{ '--tx': '70px', '--ty': '50px' } as React.CSSProperties}>o</span>
          <span className="letter-epic text-[#E1E53F]" style={{ '--tx': '95px', '--ty': '-20px' } as React.CSSProperties}>.</span>
        </div>
        <p className="mt-8 text-xs font-extrabold text-[#5C7470] tracking-[0.3em] uppercase animate-pulse relative z-10">Su mundo, más cerca.</p>
      </div>
    )
  }

  const isAuthenticated = (!!user && !isOnboardingActive) || isDemoUser

  return (
    <div className="min-h-screen bg-[#EFECE4] text-[#204E4A] flex items-center justify-center p-0 sm:p-5 selection:bg-[#E1E53F] selection:text-[#204E4A]">
      <div className="w-full sm:max-w-[430px] h-screen sm:h-[860px] bg-[#FAF8F5] sm:border sm:border-[#204E4A]/10 sm:rounded-[2.8rem] flex flex-col shadow-[0_20px_60px_-15px_rgba(32,78,74,0.18)] overflow-hidden relative transition-all duration-300">

        {/* Pantalla exclusiva de perfil público global (flota sobre todo el contenedor) */}
        {selectedPublicProfileId && (
          <PublicProfileView
            targetPetId={selectedPublicProfileId}
            currentPetId={currentPet?.id}
            onClose={() => setSelectedPublicProfileId(null)}
            lang={lang}
          />
        )}

        {!isAuthenticated ? (
          authMode === 'onboarding' ? (
            <OnboardingView
              initialStep={initialOnboardingStep}
              lang={lang}
              onToggleLang={() => setLang((prev) => (prev === 'es' ? 'en' : 'es'))}
              onSkipToLogin={() => {
                setAuthMode('login')
                setIsOnboardingActive(false)
              }}
              onQuickDemo={() => setIsDemoUser(true)}
              onComplete={(newPet) => {
                setPets((prev) => [newPet, ...prev])
                setCurrentPet(newPet)
                setIsOnboardingActive(false)
              }}
            />
          ) : (
            <div className="flex flex-col h-full justify-between p-6 sm:p-7 bg-[#FAF8F5] relative animate-slide-up">
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => {
                    setAuthMode('onboarding')
                    setIsOnboardingActive(true)
                  }}
                  className="text-xs font-bold text-[#204E4A] bg-white border border-[#204E4A]/15 px-3.5 py-1.5 rounded-full cursor-pointer shadow-sm"
                >
                  ← {lang === 'es' ? 'Volver' : 'Back'}
                </button>
                <button
                  onClick={() => setLang((prev) => (prev === 'es' ? 'en' : 'es'))}
                  className="text-[11px] font-bold tracking-widest px-3 py-1.5 rounded-full border border-[#204E4A]/20 bg-white text-[#204E4A] cursor-pointer"
                >
                  {lang === 'es' ? 'ES ▾' : 'EN ▾'}
                </button>
              </div>

              <div className="my-auto space-y-5">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A] bg-[#E1E53F] px-2.5 py-0.5 rounded-full inline-block">
                    Pazo Acceso
                  </span>
                  <h2 className="text-3xl font-black text-[#204E4A]">
                    {lang === 'es' ? 'Iniciar Sesión' : 'Log in to Pazo'}
                  </h2>
                  <p className="text-xs text-[#5C7470]">
                    {lang === 'es'
                      ? 'Ingresa tus datos para entrar directamente a tu cuenta.'
                      : 'Enter your credentials to access your account.'}
                  </p>
                </div>

                <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#204E4A] mb-1">
                      {lang === 'es' ? 'Correo electrónico' : 'Email address'}
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full bg-white border-2 border-[#204E4A]/15 rounded-2xl px-4 py-3 text-xs text-[#204E4A] focus:outline-none focus:border-[#204E4A] focus:ring-2 focus:ring-[#E1E53F]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#204E4A] mb-1">
                      {lang === 'es' ? 'Contraseña' : 'Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-white border-2 border-[#204E4A]/15 rounded-2xl px-4 py-3 pr-16 text-xs text-[#204E4A] focus:outline-none focus:border-[#204E4A] focus:ring-2 focus:ring-[#E1E53F]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold uppercase tracking-wider text-[#5C7470] hover:text-[#204E4A] bg-[#204E4A]/5 hover:bg-[#204E4A]/10 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        {showPassword ? (lang === 'es' ? 'Ocultar' : 'Hide') : (lang === 'es' ? 'Ver' : 'Show')}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingLogin}
                    className="w-full bg-[#204E4A] hover:bg-[#183d3a] text-white font-extrabold py-3.5 rounded-full text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submittingLogin
                      ? (lang === 'es' ? 'Iniciando sesión...' : 'Logging in...')
                      : (lang === 'es' ? 'Iniciar Sesión' : 'Log in')}
                  </button>
                </form>

                {loginMessage && (
                  <div className="p-3 bg-[#E1E53F]/30 border border-[#204E4A]/20 text-[#204E4A] rounded-2xl text-xs text-center font-semibold">
                    {loginMessage}
                  </div>
                )}

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setIsDemoUser(true)}
                    className="text-xs font-bold text-[#5C7470] hover:text-[#204E4A] underline decoration-[#E1E53F] decoration-2 underline-offset-4 cursor-pointer"
                  >
                    {lang === 'es' ? 'O entrar directamente en modo demo interactivo →' : 'Or enter directly in interactive demo mode →'}
                  </button>
                </div>
              </div>

              <div className="text-center pb-2">
                <p className="text-[11px] text-[#5C7470]">Pazo MVP • Los Ángeles • 2026</p>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col h-full bg-[#FAF8F5] relative overflow-hidden">

            {showFounderModal && (
              <div className="absolute inset-0 z-50 bg-[#204E4A]/80 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
                <div className="bg-[#FAF8F5] rounded-[2.8rem] p-6 text-center shadow-2xl relative overflow-hidden w-full max-w-sm flex flex-col max-h-[90vh]">
                  <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#E1E53F]/40 rounded-full blur-2xl pointer-events-none"></div>

                  <h3 className="text-2xl font-black text-[#204E4A] mb-2 leading-tight relative z-10 shrink-0">
                    Haz que esta comunidad sea tuya 🐾
                  </h3>
                  <p className="text-[13px] text-[#5C7470] mb-5 leading-relaxed relative z-10 shrink-0">
                    Nacimos para crear el espacio que tus mascotas merecen. Por solo <b>$2 al mes</b>, únete al Círculo de Fundadores. Tu respaldo mantiene Pazo vivo, rápido y sin publicidad.
                  </p>

                  <div className="relative z-10 w-full overflow-y-auto pb-2 custom-scrollbar">
                    <PayPalScriptProvider
                      options={{
                        clientId: "BAAtHDXEJD99tZkvR7n4JsSIkYtVggw6MFKIa7M-CZ_VZDmYiVbGku66tIFT9AeDvRMsmAYNAszPzCHrfs",
                        vault: true,
                        intent: "subscription"
                      }}
                    >
                      <PayPalButtons
                        style={{ shape: "pill", color: "gold", layout: "vertical", label: "subscribe" }}
                        createSubscription={(_data, actions) => {
                          return actions.subscription.create({
                            plan_id: "P-44J89528BL127951CMX2GSKA",
                            custom_id: user?.id
                          });
                        }}
                        onApprove={async (_data, _actions) => {
                          alert(lang === 'es'
                            ? '¡Gracias por unirte al Círculo de Fundadores! Tu insignia se activará en breve.'
                            : 'Thank you for becoming a Founder! Your badge will activate shortly.'
                          );

                          setCurrentPet(prev => ({ ...prev, is_founder: true } as any));

                          setShowFounderModal(false);
                          localStorage.setItem(`pitch_seen_${user?.id}`, 'true');
                        }}
                        onError={(err) => {
                          console.error("Error en PayPal:", err);
                          alert(lang === 'es' ? 'Hubo un problema al procesar el pago. Intenta de nuevo.' : 'Payment error. Please try again.');
                        }}
                        onCancel={() => {
                          console.log("El usuario canceló el flujo de pago");
                        }}
                      />
                    </PayPalScriptProvider>
                  </div>

                  <div className="pt-2 shrink-0 relative z-10 border-t border-[#204E4A]/10 mt-2">
                    <button
                      onClick={() => {
                        setShowFounderModal(false);
                        localStorage.setItem(`pitch_seen_${user?.id}`, 'true');
                      }}
                      className="text-xs font-bold text-[#5C7470] hover:text-[#204E4A] py-2 cursor-pointer transition-colors w-full"
                    >
                      Quizás más tarde
                    </button>
                  </div>
                </div>
              </div>
            )}

            <HeaderBar
              lang={lang}
              onToggleLang={() => setLang((prev) => (prev === 'es' ? 'en' : 'es'))}
              onOpenMessages={() => setIsMessagesOpen(true)}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              unreadMessagesCount={unreadMessages}
              unreadNotificationsCount={unreadNotifications}
            />

            <main className="flex-1 overflow-y-auto p-4 sm:p-5 relative">
              {isFeedLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-8 h-8 border-3 border-[#204E4A]/20 border-t-[#204E4A] rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-[#5C7470] tracking-wider uppercase">Sincronizando feed...</p>
                </div>
              ) : (
                <>
                  {activeTab === 'inicio' && (
                    <HomeView
                      posts={posts}
                      onLikePost={handleLikePost}
                      onSavePost={handleSavePost}
                      onAddComment={handleAddComment}
                      lang={lang}
                      currentPetId={currentPet?.id}
                      onSelectPetProfile={(petId) => setSelectedPublicProfileId(petId)}
                    />
                  )}

                  {activeTab === 'explorar' && (
                    <ExploreView
                      communities={communities}
                      onToggleJoinCommunity={handleToggleJoinCommunity}
                      onSelectPetProfile={(petId) => setSelectedPublicProfileId(petId)}
                      lang={lang}
                    />
                  )}

                  {activeTab === 'mapa' && (
                    <MapView
                      places={places}
                      activePetName={currentPet.name}
                      lang={lang}
                    />
                  )}

                  {activeTab === 'mascota' && (
                    <PetView
                      currentPet={currentPet}
                      availablePets={pets}
                      onSelectPet={(p) => setCurrentPet(p)}
                      careItems={careItems}
                      onToggleCompleteCare={handleToggleCompleteCare}
                      docs={docs}
                      onOpenQRPassport={() => setIsPassportOpen(true)}
                      onOpenCareAgenda={() => setIsCareOpen(true)}
                      onOpenLostAlert={() => setIsAlertOpen(true)}
                      lang={lang}
                      userPosts={posts.filter((p) => p.petId === currentPet.id)}
                    />
                  )}
                </>
              )}
            </main>

            <BottomNav
              activeTab={activeTab}
              onSelectTab={(tab) => {
                setActiveTab(tab)
                if (tab === 'mapa') {
                  trackInteraction('feature_map_tab', 'place', 'view')
                }
              }}
              onOpenCreate={() => setIsCreateMenuOpen(true)}
              labels={{
                inicio: lang === 'es' ? 'Inicio' : 'Home',
                explorar: lang === 'es' ? 'Explorar' : 'Explore',
                crear: lang === 'es' ? 'Crear' : 'Create',
                mapa: lang === 'es' ? 'Mapa' : 'Map',
                mascota: lang === 'es' ? 'Mi mascota' : 'My Pet',
              }}
            />

            <CreateModal
              isOpen={isCreateMenuOpen}
              onClose={() => setIsCreateMenuOpen(false)}
              onSelectOption={(type) => {
                setIsCreateMenuOpen(false)
                if (type === 'post') setIsCreatePostOpen(true)
                if (type === 'alerta') setIsAlertOpen(true)
                if (type === 'lugar') alert(lang === 'es' ? 'Módulo de creación de lugares próximamente' : 'Place creation coming soon')
                if (type === 'comunidad') alert(lang === 'es' ? 'Módulo de creación de comunidades próximamente' : 'Community creation coming soon')
              }}
              lang={lang}
            />

            <CreatePostModal
              isOpen={isCreatePostOpen}
              onClose={() => setIsCreatePostOpen(false)}
              currentPet={currentPet}
              onPostCreated={handlePostCreated}
              lang={lang}
            />

            <PassportModal
              isOpen={isPassportOpen}
              onClose={() => setIsPassportOpen(false)}
              pet={currentPet}
              lang={lang}
            />

            <CareModal
              isOpen={isCareOpen}
              onClose={() => setIsCareOpen(false)}
              petName={currentPet.name}
              careItems={careItems}
              onToggleCare={handleToggleCompleteCare}
              onAddCare={handleAddCare}
              docs={docs}
              lang={lang}
            />

            <AlertModal
              isOpen={isAlertOpen}
              onClose={() => setIsAlertOpen(false)}
              pet={currentPet}
              lang={lang}
            />

            <MessagesModal
              isOpen={isMessagesOpen}
              onClose={() => setIsMessagesOpen(false)}
              conversations={conversations}
              onSendMessage={handleSendMessage}
              lang={lang}
            />

            <NotificationsModal
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              notifications={notifications}
              onMarkAllRead={handleMarkAllNotificationsRead}
              lang={lang}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <PazoMain />
    </AuthProvider>
  )
}