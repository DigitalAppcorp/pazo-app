import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { supabase } from './services/supabaseClient'
import { fetchOwnedPets } from './services/petService'
import {
  fetchLatestUnreadSightingNotification,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
} from './services/rescueService'
import {
  CARE_HISTORY_PAGE_SIZE,
  archiveCareItem,
  completeCareItem,
  createCareItem,
  fetchActiveCareItems,
  fetchCareHistory,
  fetchCareReminderCandidates,
  undoCareCompletion,
  updateCareItem,
} from './services/careService'
import type {
  Pet,
  Post,
  Community,
  CareItem,
  CareCompletion,
  CareItemInput,
  Conversation,
  PazoNotification,
} from './types/pazo'
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"
import {
  INITIAL_PETS,
  INITIAL_COMMUNITIES,
  INITIAL_PLACES,
  INITIAL_CONVERSATIONS,
} from './data/mockData'

import { BottomNav, type NavTab } from './components/BottomNav'
import { HeaderBar } from './components/HeaderBar'
import { HomeView } from './components/views/HomeView'
import { ExploreView } from './components/views/ExploreView'
import { MapView } from './components/views/MapView'
import { PetView } from './components/views/PetView'
import { OnboardingView } from './components/views/OnboardingView'
import { PublicProfileView } from './components/views/PublicProfileView'
import { PublicRescueView } from './components/views/PublicRescueView'

import { CreateModal } from './components/modals/CreateModal'
import { CreatePostModal } from './components/modals/CreatePostModal'
import { AddPetModal } from './components/modals/AddPetModal'
import { PassportModal } from './components/modals/PassportModal'
import { CareModal } from './components/modals/CareModal'
import { AlertModal } from './components/modals/AlertModal'
import { MessagesModal } from './components/modals/MessagesModal'
import { NotificationsModal } from './components/modals/NotificationsModal'
import { SightingDetailModal } from './components/modals/SightingDetailModal'

const getPublicRescueRoute = () => {
  const match = window.location.hash.match(
    /^#\/rescue\/([0-9a-f-]{36})(?:\?from=(preview))?$/i
  )

  return {
    token: match?.[1] || null,
    fromPreview: match?.[2] === 'preview',
  }
}

const FEED_PAGE_SIZE = 10
const NOTIFICATIONS_PAGE_SIZE = 10

const dateKey = (date = new Date()) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')

const calendarDayDiff = (fromDate: string, toDate: string) => {
  const from = new Date(`${fromDate}T12:00:00`)
  const to = new Date(`${toDate}T12:00:00`)
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

const isCareReminderRelevant = (item: CareItem) => {
  const today = dateKey()
  const daysUntilDue = calendarDayDiff(today, item.dueDate)

  if (daysUntilDue <= 0) return true
  if (item.reminderDaysBefore === null) return false
  return daysUntilDue <= item.reminderDaysBefore
}

const sortCareItems = (items: CareItem[]) =>
  [...items].sort((a, b) => {
    const dateCompare = a.dueDate.localeCompare(b.dueDate)
    if (dateCompare !== 0) return dateCompare

    const aTime = a.dueTime || '99:99'
    const bTime = b.dueTime || '99:99'
    return aTime.localeCompare(bTime)
  })

interface FeedPaginationState {
  petId: string
  socialPetIds: string[]
  socialOffset: number
  recommendationOffset: number
  socialExhausted: boolean
  recommendationExhausted: boolean
}

const EMPTY_FEED_PAGINATION: FeedPaginationState = {
  petId: '',
  socialPetIds: [],
  socialOffset: 0,
  recommendationOffset: 0,
  socialExhausted: false,
  recommendationExhausted: false,
}

function PazoMain() {
  const { user, loading, signIn } = useAuth()
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [publicRescueRoute, setPublicRescueRoute] = useState(getPublicRescueRoute)

  useEffect(() => {
    const syncPublicRoute = () => {
      setPublicRescueRoute(getPublicRescueRoute())
    }

    window.addEventListener('hashchange', syncPublicRoute)
    return () => window.removeEventListener('hashchange', syncPublicRoute)
  }, [])

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
  const [isFeedLoadingMore, setIsFeedLoadingMore] = useState(false)
  const [hasMoreFeed, setHasMoreFeed] = useState(true)

  const [pets, setPets] = useState<Pet[]>(INITIAL_PETS)
  const [currentPet, setCurrentPet] = useState<Pet>(INITIAL_PETS[0])
  const activePetIdRef = useRef(INITIAL_PETS[0].id)
  const [posts, setPosts] = useState<Post[]>([])
  const [profilePosts, setProfilePosts] = useState<Post[]>([])
  const likingPostIdsRef = useRef<Set<string>>(new Set())
  const savingPostIdsRef = useRef<Set<string>>(new Set())
  const commentingPostIdsRef = useRef<Set<string>>(new Set())
  const feedLoadVersionRef = useRef(0)
  const feedLoadMoreInFlightRef = useRef(false)
  const feedPaginationRef = useRef<FeedPaginationState>({ ...EMPTY_FEED_PAGINATION })
  const ownedPetIdsRef = useRef<string[]>([])
  const mainScrollRef = useRef<HTMLElement | null>(null)
  const tabScrollPositionsRef = useRef<Record<NavTab, number>>({
    inicio: 0,
    explorar: 0,
    mapa: 0,
    mascota: 0,
  })
  const [communities, setCommunities] = useState<Community[]>(INITIAL_COMMUNITIES)
  const [places] = useState(INITIAL_PLACES)
  const [careItems, setCareItems] = useState<CareItem[]>([])
  const [careHistory, setCareHistory] = useState<CareCompletion[]>([])
  const [isCareLoading, setIsCareLoading] = useState(false)
  const [careError, setCareError] = useState('')
  const [isCareHistoryLoading, setIsCareHistoryLoading] = useState(false)
  const [hasMoreCareHistory, setHasMoreCareHistory] = useState(true)
  const [careReminderItems, setCareReminderItems] = useState<CareItem[]>([])
  const careLoadVersionRef = useRef(0)
  const careHistoryOffsetRef = useRef(0)
  const careHistoryLoadInFlightRef = useRef(false)
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS)
  const [notifications, setNotifications] = useState<PazoNotification[]>([])
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true)
  const [isNotificationsLoadingMore, setIsNotificationsLoadingMore] = useState(false)
  const [latestUnreadLostPetSighting, setLatestUnreadLostPetSighting] = useState<PazoNotification | null>(null)
  const notificationOffsetRef = useRef(0)
  const notificationLoadInFlightRef = useRef(false)

  const [activeTab, setActiveTab] = useState<NavTab>('inicio')

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const scrollContainer = mainScrollRef.current
      if (!scrollContainer) return
      scrollContainer.scrollTop = tabScrollPositionsRef.current[activeTab] ?? 0
    })

    return () => cancelAnimationFrame(frame)
  }, [activeTab])

  // Estado global para la pantalla exclusiva de perfil público
  const [selectedPublicProfileId, setSelectedPublicProfileId] = useState<string | null>(null)

  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [isAddPetOpen, setIsAddPetOpen] = useState(false)
  const [isPassportOpen, setIsPassportOpen] = useState(false)
  const [isCareOpen, setIsCareOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [isMessagesOpen, setIsMessagesOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [selectedSightingId, setSelectedSightingId] = useState<string | null>(null)

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

  const formatPostRow = (post: any, isRecommended: boolean): Post => ({
    id: post.id,
    petId: post.pet_id,
    petName: post.pet_name,
    petSpecies: post.pet_species,
    petAvatar: post.pet_avatar,
    location: post.location,
    timeAgo: 'Hace un momento',
    createdAt: post.created_at,
    isRecommended,
    tags: post.tags || [],
    text: post.text,
    photoUrl: post.photo_url,
    likes: post.likes || 0,
    isLiked: false,
    isSaved: false,
    comments: [],
    commentsCount: post.comments_count ?? (post.comments || []).length,
    commentsLoaded: false,
  })

  const loadFeedPageForPet = async (pet: Pet, reset: boolean) => {
    const loadVersion = reset
      ? ++feedLoadVersionRef.current
      : feedLoadVersionRef.current

    if (reset) {
      setIsFeedLoading(true)
      setHasMoreFeed(true)
      feedPaginationRef.current = {
        ...EMPTY_FEED_PAGINATION,
        petId: pet.id,
      }
    }

    try {
      let pagination = feedPaginationRef.current

      if (reset || pagination.petId !== pet.id) {
        const ownedPetIds =
          ownedPetIdsRef.current.length > 0
            ? ownedPetIdsRef.current
            : [pet.id]

        const { data: follows, error: followsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', pet.id)

        if (followsError) {
          console.error('Error fetching follows for feed pagination:', followsError)
        }

        const followingIds = follows?.map((follow) => follow.following_id) || []

        pagination = {
          petId: pet.id,
          socialPetIds: Array.from(
            new Set([...ownedPetIds, ...followingIds].filter(Boolean))
          ),
          socialOffset: 0,
          recommendationOffset: 0,
          socialExhausted: false,
          recommendationExhausted: false,
        }

        feedPaginationRef.current = pagination
      }

      let socialRows: any[] = []
      if (!pagination.socialExhausted && pagination.socialPetIds.length > 0) {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .in('pet_id', pagination.socialPetIds)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(
            pagination.socialOffset,
            pagination.socialOffset + FEED_PAGE_SIZE - 1
          )

        if (error) {
          throw error
        }

        socialRows = data || []
      }

      let recommendationRows: any[] = []
      if (!pagination.recommendationExhausted) {
        const { data, error } = await supabase.rpc(
          'get_recommended_posts_page',
          {
            p_actor_pet_id: pet.id,
            p_limit: FEED_PAGE_SIZE,
            p_offset: pagination.recommendationOffset,
          }
        )

        if (error) {
          throw error
        }

        recommendationRows = data || []
      }

      const socialPosts = socialRows.map((post) => formatPostRow(post, false))
      const recommendedPosts = recommendationRows.map((post) =>
        formatPostRow(post, true)
      )

      const page = blendFeeds(socialPosts, recommendedPosts)
        .slice(0, FEED_PAGE_SIZE)

      const consumedSocial = page.filter((post) => !post.isRecommended).length
      const consumedRecommendations = page.filter((post) => post.isRecommended).length

      pagination.socialOffset += consumedSocial
      pagination.recommendationOffset += consumedRecommendations

      if (
        socialRows.length === 0
        || (
          socialRows.length < FEED_PAGE_SIZE
          && consumedSocial >= socialRows.length
        )
      ) {
        pagination.socialExhausted = true
      }

      if (
        recommendationRows.length === 0
        || (
          recommendationRows.length < FEED_PAGE_SIZE
          && consumedRecommendations >= recommendationRows.length
        )
      ) {
        pagination.recommendationExhausted = true
      }

      feedPaginationRef.current = pagination

      const enrichedPage = await enrichPostsWithInteractions(page, pet.id)

      if (feedLoadVersionRef.current !== loadVersion) return

      if (reset) {
        setPosts(enrichedPage)
      } else {
        setPosts((previousPosts) => {
          const existingIds = new Set(previousPosts.map((post) => post.id))
          const uniqueNext = enrichedPage.filter((post) => !existingIds.has(post.id))
          return [...previousPosts, ...uniqueNext]
        })
      }

      setHasMoreFeed(
        !(pagination.socialExhausted && pagination.recommendationExhausted)
      )
    } catch (error) {
      console.error(`Error loading feed page for pet ${pet.id}:`, error)

      if (reset && feedLoadVersionRef.current === loadVersion) {
        setPosts([])
        setHasMoreFeed(false)
      }
    } finally {
      if (reset && feedLoadVersionRef.current === loadVersion) {
        setIsFeedLoading(false)
      }
    }
  }

  const loadFeedForPet = async (pet: Pet) => {
    await loadFeedPageForPet(pet, true)
  }

  const loadMoreFeed = async () => {
    if (
      feedLoadMoreInFlightRef.current
      || isFeedLoading
      || !hasMoreFeed
      || activePetIdRef.current !== currentPet.id
    ) {
      return
    }

    feedLoadMoreInFlightRef.current = true
    setIsFeedLoadingMore(true)

    try {
      await loadFeedPageForPet(currentPet, false)
    } finally {
      feedLoadMoreInFlightRef.current = false
      setIsFeedLoadingMore(false)
    }
  }

  const loadProfilePostsForPet = async (petId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })

      if (error) throw error

      if (activePetIdRef.current !== petId) return
      setProfilePosts((data || []).map((post) => formatPostRow(post, false)))
    } catch (error) {
      console.error('Error loading pet profile posts:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'mascota' && currentPet?.id) {
      void loadProfilePostsForPet(currentPet.id)
    }
  }, [activeTab, currentPet?.id])

  const selectActivePet = (pet: Pet) => {
    if (!user?.id) return

    localStorage.setItem(`active_pet_${user.id}`, pet.id)
    tabScrollPositionsRef.current.inicio = 0
    activePetIdRef.current = pet.id
    setCurrentPet(pet)
    setProfilePosts([])
    setSelectedPublicProfileId(null)
    void loadFeedForPet(pet)
  }

  useEffect(() => {
    if (!loading && user) {
      const initApp = async () => {
        if (!user.id) return
        setIsFeedLoading(true)

        let ownedPets: Pet[] = []

        try {
          ownedPets = await fetchOwnedPets(user.id)
        } catch (petError) {
          console.error('Error fetching pet profiles:', petError)
          setIsFeedLoading(false)
          return
        }

        if (ownedPets.length > 0) {
          setIsOnboardingActive(false)
          ownedPetIdsRef.current = ownedPets.map((pet) => pet.id)
          setPets(ownedPets)

          const storedActivePetId = localStorage.getItem(`active_pet_${user.id}`)
          const activePet =
            ownedPets.find((pet) => pet.id === storedActivePetId)
            || ownedPets[0]

          activePetIdRef.current = activePet.id
          setCurrentPet(activePet)
          localStorage.setItem(`active_pet_${user.id}`, activePet.id)

          const hasSeenPitch = localStorage.getItem(`pitch_seen_${user.id}`)
          if (!hasSeenPitch) {
            setShowFounderModal(true)
            localStorage.setItem(`pitch_seen_${user.id}`, 'true')
          }

          await loadFeedForPet(activePet)
        } else {
          ownedPetIdsRef.current = []
          setPets([])
          setAuthMode('onboarding')
          setInitialOnboardingStep('A03')
          setIsOnboardingActive(true)
          setIsFeedLoading(false)
        }
      }

      void initApp()
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
    const actorPetId = currentPet.id
    const operationKey = `${actorPetId}:${postId}`
    if (likingPostIdsRef.current.has(operationKey)) return

    const postToUpdate = posts.find((post) => post.id === postId)
    if (!postToUpdate) return

    likingPostIdsRef.current.add(operationKey)

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
        p_actor_pet_id: actorPetId,
        p_target_id: postId,
        p_action_type: actionType,
      })

      if (error) throw error
    } catch (err) {
      console.error(`Error procesando ${actionType} para el post ${postId}:`, err)
      if (activePetIdRef.current === actorPetId) {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, isLiked: previousIsLiked, likes: previousLikes }
              : post
          )
        )
      }
    } finally {
      likingPostIdsRef.current.delete(operationKey)
    }
  }

  const handleSavePost = async (postId: string) => {
    if (!currentPet?.id) return
    const actorPetId = currentPet.id
    const operationKey = `${actorPetId}:${postId}`
    if (savingPostIdsRef.current.has(operationKey)) return

    const postToUpdate = posts.find((post) => post.id === postId)
    if (!postToUpdate) return

    savingPostIdsRef.current.add(operationKey)

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
        p_actor_pet_id: actorPetId,
        p_target_id: postId,
        p_action_type: actionType,
      })

      if (error) throw error
    } catch (err) {
      console.error(`Error procesando ${actionType} para el post ${postId}:`, err)
      if (activePetIdRef.current === actorPetId) {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, isSaved: previousIsSaved }
              : post
          )
        )
      }
    } finally {
      savingPostIdsRef.current.delete(operationKey)
    }
  }

  const loadCommentsForPost = async (postId: string): Promise<boolean> => {
    const targetPost = posts.find((post) => post.id === postId)
    if (!targetPost) return false
    if (targetPost.commentsLoaded) return true

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          post_id,
          body,
          created_at,
          author_pet_id,
          author:pets!post_comments_author_pet_id_fkey (
            name,
            species,
            photo_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const loadedComments = (data || []).map((row: any) => {
        const author = Array.isArray(row.author) ? row.author[0] : row.author

        return {
          id: row.id,
          authorPetId: row.author_pet_id,
          authorName: author?.name || (lang === 'es' ? 'Mascota' : 'Pet'),
          authorPet: author?.species || 'otro',
          authorAvatar: author?.photo_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
          text: row.body,
          timeAgo: lang === 'es' ? 'Reciente' : 'Recent',
          createdAt: row.created_at,
        }
      })

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: loadedComments,
                commentsCount: loadedComments.length,
                commentsLoaded: true,
              }
            : post
        )
      )

      return true
    } catch (err) {
      console.error(`Error cargando comentarios del post ${postId}:`, err)
      return false
    }
  }

  const handleAddComment = async (postId: string, text: string): Promise<boolean> => {
    const trimmedText = text.trim()
    if (!currentPet?.id || !postId || !trimmedText) return false
    const actorPet = currentPet
    const operationKey = `${actorPet.id}:${postId}`
    if (commentingPostIdsRef.current.has(operationKey)) return false

    const targetPost = posts.find((post) => post.id === postId)
    if (!targetPost) return false

    commentingPostIdsRef.current.add(operationKey)

    const previousComments = targetPost.comments
    const previousCommentsCount = targetPost.commentsCount ?? targetPost.comments.length
    const temporaryId = `temp-comment-${crypto.randomUUID()}`
    const createdAt = new Date().toISOString()

    const optimisticComment = {
      id: temporaryId,
      authorPetId: actorPet.id,
      authorName: actorPet.name,
      authorPet: actorPet.species,
      authorAvatar: actorPet.photoUrl,
      text: trimmedText,
      timeAgo: lang === 'es' ? 'justo ahora' : 'just now',
      createdAt,
    }

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [...post.comments, optimisticComment],
              commentsCount: (post.commentsCount ?? post.comments.length) + 1,
              commentsLoaded: true,
            }
          : post
      )
    )

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_pet_id: actorPet.id,
          body: trimmedText,
        })
        .select('id, created_at')
        .single()

      if (error) throw error

      if (activePetIdRef.current === actorPet.id) {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  comments: post.comments.map((comment) =>
                    comment.id === temporaryId
                      ? {
                          ...comment,
                          id: data.id,
                          createdAt: data.created_at,
                        }
                      : comment
                  ),
                }
              : post
          )
        )
      }

      return true
    } catch (err) {
      console.error(`Error creando comentario en el post ${postId}:`, err)
      if (activePetIdRef.current === actorPet.id) {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  comments: previousComments,
                  commentsCount: previousCommentsCount,
                  commentsLoaded: targetPost.commentsLoaded ?? false,
                }
              : post
          )
        )
      }
      return false
    } finally {
      commentingPostIdsRef.current.delete(operationKey)
    }
  }

  const handlePostCreated = (newPost: Post) => {
    if (
      feedPaginationRef.current.petId === currentPet.id
      && feedPaginationRef.current.socialPetIds.includes(newPost.petId)
    ) {
      feedPaginationRef.current.socialOffset += 1
    }

    setPosts((prevPosts) => [newPost, ...prevPosts])
    setProfilePosts((prevPosts) =>
      newPost.petId === currentPet.id ? [newPost, ...prevPosts] : prevPosts
    )
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

  const refreshCareReminders = async (petsToCheck: Pet[] = pets) => {
    try {
      const candidates = await fetchCareReminderCandidates(
        petsToCheck.map((pet) => pet.id)
      )
      setCareReminderItems(candidates.filter(isCareReminderRelevant))
    } catch (error) {
      console.error('Error loading Agenda reminders:', error)
    }
  }

  const loadCareForPet = async (petId: string) => {
    const loadVersion = ++careLoadVersionRef.current
    setIsCareLoading(true)
    setCareError('')
    careHistoryOffsetRef.current = 0
    setHasMoreCareHistory(true)

    try {
      const [activeItems, history] = await Promise.all([
        fetchActiveCareItems(petId),
        fetchCareHistory(petId, 0, CARE_HISTORY_PAGE_SIZE),
      ])

      if (
        loadVersion !== careLoadVersionRef.current
        || activePetIdRef.current !== petId
      ) {
        return
      }

      setCareItems(sortCareItems(activeItems))
      setCareHistory(history)
      careHistoryOffsetRef.current = history.length
      setHasMoreCareHistory(history.length === CARE_HISTORY_PAGE_SIZE)
    } catch (error: any) {
      console.error('Error loading Agenda:', error)

      if (
        loadVersion === careLoadVersionRef.current
        && activePetIdRef.current === petId
      ) {
        setCareItems([])
        setCareHistory([])
        setCareError(error?.message || 'Agenda unavailable')
      }
    } finally {
      if (loadVersion === careLoadVersionRef.current) {
        setIsCareLoading(false)
      }
    }
  }

  const loadMoreCareHistory = async () => {
    if (
      careHistoryLoadInFlightRef.current
      || !hasMoreCareHistory
      || !currentPet?.id
    ) {
      return
    }

    const petId = currentPet.id
    careHistoryLoadInFlightRef.current = true
    setIsCareHistoryLoading(true)

    try {
      const nextPage = await fetchCareHistory(
        petId,
        careHistoryOffsetRef.current,
        CARE_HISTORY_PAGE_SIZE
      )

      if (activePetIdRef.current !== petId) return

      careHistoryOffsetRef.current += nextPage.length
      setHasMoreCareHistory(nextPage.length === CARE_HISTORY_PAGE_SIZE)
      setCareHistory((previous) => {
        const existing = new Set(previous.map((item) => item.id))
        return [
          ...previous,
          ...nextPage.filter((item) => !existing.has(item.id)),
        ]
      })
    } catch (error) {
      console.error('Error loading more Agenda history:', error)
    } finally {
      careHistoryLoadInFlightRef.current = false
      setIsCareHistoryLoading(false)
    }
  }

  const reloadCurrentCare = async () => {
    if (!currentPet?.id) return
    await loadCareForPet(currentPet.id)
    await refreshCareReminders()
  }

  const handleCreateCare = async (input: CareItemInput) => {
    const petId = currentPet.id
    const created = await createCareItem(petId, input)

    if (activePetIdRef.current === petId) {
      setCareItems((previous) => sortCareItems([...previous, created]))
    }

    await refreshCareReminders()
  }

  const handleUpdateCare = async (
    careItemId: string,
    input: CareItemInput
  ) => {
    const petId = currentPet.id
    const updated = await updateCareItem(careItemId, input)

    if (activePetIdRef.current === petId) {
      setCareItems((previous) =>
        sortCareItems(
          previous.map((item) => item.id === updated.id ? updated : item)
        )
      )
    }

    await refreshCareReminders()
  }

  const handleArchiveCare = async (careItemId: string) => {
    await archiveCareItem(careItemId)
    setCareItems((previous) =>
      previous.filter((item) => item.id !== careItemId)
    )
    await refreshCareReminders()
  }

  const handleCompleteCare = async (item: CareItem) => {
    await completeCareItem(item)
    await reloadCurrentCare()
  }

  const handleUndoCareCompletion = async (completion: CareCompletion) => {
    await undoCareCompletion(completion.id)
    await reloadCurrentCare()
  }

  useEffect(() => {
    if (isCareOpen && currentPet?.id) {
      void loadCareForPet(currentPet.id)
    }
  }, [isCareOpen, currentPet?.id])

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

  const refreshLostPetSightingReminder = async () => {
    const lostPetIds = pets.filter((pet) => pet.isLost).map((pet) => pet.id)

    try {
      const latest = await fetchLatestUnreadSightingNotification(lostPetIds)
      setLatestUnreadLostPetSighting(latest)
    } catch (error) {
      console.error('Error loading latest unread lost-pet sighting:', error)
    }
  }

  const refreshNotifications = async () => {
    if (!user?.id || notificationLoadInFlightRef.current) return

    notificationLoadInFlightRef.current = true

    try {
      const lostPetIds = pets.filter((pet) => pet.isLost).map((pet) => pet.id)
      const [latest, unreadCount, latestLostPetSighting] = await Promise.all([
        fetchNotifications(0, NOTIFICATIONS_PAGE_SIZE),
        fetchUnreadNotificationCount(),
        fetchLatestUnreadSightingNotification(lostPetIds),
      ])

      setNotifications(latest)
      setUnreadNotificationCount(unreadCount)
      setLatestUnreadLostPetSighting(latestLostPetSighting)
      notificationOffsetRef.current = latest.length
      setHasMoreNotifications(latest.length === NOTIFICATIONS_PAGE_SIZE)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      notificationLoadInFlightRef.current = false
    }
  }

  const loadMoreNotifications = async () => {
    if (
      !user?.id
      || notificationLoadInFlightRef.current
      || !hasMoreNotifications
    ) {
      return
    }

    notificationLoadInFlightRef.current = true
    setIsNotificationsLoadingMore(true)

    try {
      const nextPage = await fetchNotifications(
        notificationOffsetRef.current,
        NOTIFICATIONS_PAGE_SIZE
      )

      notificationOffsetRef.current += nextPage.length
      setHasMoreNotifications(nextPage.length === NOTIFICATIONS_PAGE_SIZE)

      setNotifications((previous) => {
        const existingIds = new Set(previous.map((notification) => notification.id))
        const uniqueNext = nextPage.filter(
          (notification) => !existingIds.has(notification.id)
        )
        return [...previous, ...uniqueNext]
      })
    } catch (error) {
      console.error('Error loading more notifications:', error)
    } finally {
      notificationLoadInFlightRef.current = false
      setIsNotificationsLoadingMore(false)
    }
  }

  const handleOpenNotifications = () => {
    setIsNotificationsOpen(true)
    void refreshNotifications()
  }

  const handleOpenNotification = async (notification: PazoNotification) => {
    if (!notification.sourceId) return

    setIsNotificationsOpen(false)
    setSelectedSightingId(notification.sourceId)

    if (!notification.read) {
      try {
        await markNotificationRead(notification.id)
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item
          )
        )
        setUnreadNotificationCount((count) => Math.max(0, count - 1))

        if (latestUnreadLostPetSighting?.id === notification.id) {
          setLatestUnreadLostPetSighting(null)
          void refreshLostPetSightingReminder()
        }
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }
  }

  useEffect(() => {
    if (user?.id && !isOnboardingActive) {
      void refreshNotifications()
    } else if (!user?.id) {
      setNotifications([])
      setUnreadNotificationCount(0)
      setLatestUnreadLostPetSighting(null)
      notificationOffsetRef.current = 0
      setHasMoreNotifications(true)
    }
  }, [user?.id, isOnboardingActive, pets.length])

  const unreadMessages = conversations.filter((c) => c.isRequest).length
  const unreadNotifications = unreadNotificationCount
  const lostPets = pets.filter((pet) => pet.isLost)

  const reminderPet =
    (latestUnreadLostPetSighting?.petId
      ? pets.find((pet) => pet.id === latestUnreadLostPetSighting.petId)
      : undefined)
    || (currentPet.isLost ? currentPet : lostPets[0])

  const handleOpenLostAlertReminder = () => {
    if (latestUnreadLostPetSighting?.sourceId) {
      void handleOpenNotification(latestUnreadLostPetSighting)
      return
    }

    if (!reminderPet) return

    if (reminderPet.id !== currentPet.id) {
      selectActivePet(reminderPet)
    }

    setIsAlertOpen(true)
  }

  if (publicRescueRoute.token) {
    return (
      <PublicRescueView
        token={publicRescueRoute.token}
        fromPreview={publicRescueRoute.fromPreview}
        onBack={() => window.history.back()}
      />
    )
  }

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
            ownedPetIds={pets.map((pet) => pet.id)}
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
                ownedPetIdsRef.current = [newPet.id]
                setPets([newPet])
                activePetIdRef.current = newPet.id
                setCurrentPet(newPet)
                if (user?.id) {
                  localStorage.setItem(`active_pet_${user.id}`, newPet.id)
                }
                setIsOnboardingActive(false)
                void loadFeedForPet(newPet)
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
              onOpenNotifications={handleOpenNotifications}
              unreadMessagesCount={unreadMessages}
              unreadNotificationsCount={unreadNotifications}
            />

            {lostPets.length > 0 && reminderPet && (
              <button
                type="button"
                onClick={handleOpenLostAlertReminder}
                className="mx-4 mt-3 rounded-2xl bg-[#FFF2EE] border border-[#EC7357]/25 px-4 py-3 flex items-center gap-3 text-left cursor-pointer shrink-0"
              >
                <span className="w-8 h-8 rounded-full bg-[#EC7357] text-white flex items-center justify-center font-black shrink-0">
                  !
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-black text-[#204E4A]">
                    {latestUnreadLostPetSighting
                      ? (lang === 'es'
                          ? `Hay un nuevo avistamiento de ${reminderPet.name}`
                          : `There is a new sighting of ${reminderPet.name}`)
                      : (lang === 'es'
                          ? `Seguimos esperando que ${reminderPet.name} vuelva pronto y esté bien`
                          : `We hope ${reminderPet.name} comes home safe soon`)}
                  </span>
                  <span className="block text-[10px] text-[#5C7470] mt-0.5 leading-relaxed">
                    {latestUnreadLostPetSighting
                      ? (lang === 'es'
                          ? 'Alguien reportó haberlo visto. Toca aquí para ver los detalles.'
                          : 'Someone reported seeing them. Tap here to view the details.')
                      : (lang === 'es'
                          ? 'Estamos alerta y te avisaremos si alguien reporta un avistamiento.'
                          : 'We are staying alert and will notify you if someone reports a sighting.')}
                  </span>
                </span>
                <span className="font-black text-[#EC7357]">›</span>
              </button>
            )}

            <main
              ref={mainScrollRef}
              className="flex-1 overflow-y-auto p-4 sm:p-5 relative"
              onScroll={(event) => {
                const element = event.currentTarget
                tabScrollPositionsRef.current[activeTab] = element.scrollTop

                if (
                  activeTab === 'inicio'
                  && hasMoreFeed
                  && !isFeedLoading
                  && !isFeedLoadingMore
                  && element.scrollHeight - element.scrollTop - element.clientHeight < 700
                ) {
                  void loadMoreFeed()
                }
              }}
            >
              {isFeedLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-8 h-8 border-3 border-[#204E4A]/20 border-t-[#204E4A] rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-[#5C7470] tracking-wider uppercase">Sincronizando feed...</p>
                </div>
              ) : (
                <>
                  {activeTab === 'inicio' && (
                    <>
                      <HomeView
                        posts={posts}
                        onLikePost={handleLikePost}
                        onSavePost={handleSavePost}
                        onAddComment={handleAddComment}
                        onLoadComments={loadCommentsForPost}
                        lang={lang}
                        currentPetId={currentPet?.id}
                        ownedPetIds={pets.map((pet) => pet.id)}
                        onSelectPetProfile={(petId) => setSelectedPublicProfileId(petId)}
                      />
                      {isFeedLoadingMore && (
                        <div className="py-5 flex justify-center">
                          <div className="w-6 h-6 border-2 border-[#204E4A]/20 border-t-[#204E4A] rounded-full animate-spin" />
                        </div>
                      )}
                    </>
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
                      onSelectPet={selectActivePet}
                      onPetUpdated={(updatedPet) => {
                        setCurrentPet(updatedPet)
                        setPets((prevPets) =>
                          prevPets.map((pet) => pet.id === updatedPet.id ? updatedPet : pet)
                        )
                      }}
                      onAddPet={() => setIsAddPetOpen(true)}
                      careItems={careItems}
                      onToggleCompleteCare={handleToggleCompleteCare}
                      docs={docs}
                      onOpenQRPassport={() => setIsPassportOpen(true)}
                      onOpenCareAgenda={() => setIsCareOpen(true)}
                      onOpenLostAlert={() => setIsAlertOpen(true)}
                      lang={lang}
                      userPosts={profilePosts}
                    />
                  )}
                </>
              )}
            </main>

            <BottomNav
              activeTab={activeTab}
              onSelectTab={(tab) => {
                const scrollContainer = mainScrollRef.current
                if (scrollContainer) {
                  tabScrollPositionsRef.current[activeTab] = scrollContainer.scrollTop
                }

                if (tab !== activeTab) {
                  setActiveTab(tab)
                }

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

            <AddPetModal
              isOpen={isAddPetOpen}
              onClose={() => setIsAddPetOpen(false)}
              onPetCreated={(newPet) => {
                ownedPetIdsRef.current = Array.from(
                  new Set([...ownedPetIdsRef.current, newPet.id])
                )
                setPets((prevPets) => {
                  if (prevPets.some((pet) => pet.id === newPet.id)) return prevPets
                  return [...prevPets, newPet]
                })
                selectActivePet(newPet)
                setIsAddPetOpen(false)
              }}
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
              onPetUpdated={(updatedPet) => {
                activePetIdRef.current = updatedPet.id
                setCurrentPet(updatedPet)
                setPets((prevPets) =>
                  prevPets.map((pet) => pet.id === updatedPet.id ? updatedPet : pet)
                )
              }}
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
              onOpenNotification={handleOpenNotification}
              onLoadMore={() => void loadMoreNotifications()}
              hasMore={hasMoreNotifications}
              isLoadingMore={isNotificationsLoadingMore}
              lang={lang}
            />

            <SightingDetailModal
              sightingId={selectedSightingId}
              onClose={() => setSelectedSightingId(null)}
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