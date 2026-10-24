import {isSupporterNotification} from './features/notifications/supporterNotification'
import { canUseAccountFeatures } from './features/auth/accountAccess'
import { recordAdminActivity } from './features/admin/adminDashboardService'
import { getNotificationCommunityId, getNotificationSightingId } from './features/notifications/notificationSource'
import { useState, useEffect, useRef } from 'react'
import { wasAuthorDeleted } from './features/account/deletedAuthorThread'
import { AuthProvider, useAuth } from './context/AuthContext'
import { stageMarketingLanding } from './features/marketing/marketingRuntime'
import { pazoBuildVersion } from './features/release/buildVersion'
import { PasswordRecoveryView } from './features/auth/PasswordRecoveryView'
import { PazoSplash } from './features/splash/PazoSplash'
import { supabase } from './services/supabaseClient'
import { fetchOwnedPets } from './services/petService'
import { selectFeedPage } from './features/feed/selectFeedPage'
import { advanceFeedCursors } from './features/feed/advanceFeedCursors'
import {attachVerifiedFeedBadges,attachVerifiedCommentBadges,preloadVerifiedFeedBadgeArt} from './features/supporter/verifiedFeedPostBadges'
import {supporterBenefitsUiEnabled} from './features/supporter/supporterUiRelease'
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
import {
  DOCUMENTS_PAGE_SIZE,
  deletePetDocument,
  downloadPetDocumentBlob,
  fetchPetDocumentsPage,
  recoverPetDocumentOperations,
  updatePetDocumentMetadata,
  uploadPetDocument,
} from './services/documentService'
import type {
  Pet,
  Post,
  PostComment,
  CareItem,
  CareCompletion,
  CareItemInput,
  DocumentCategory,
  PetDocument,
  Conversation,
  PazoNotification,
} from './types/pazo'
import {
  INITIAL_PETS,
  INITIAL_CONVERSATIONS,
} from './data/mockData'

import { BottomNav, type NavTab } from './components/BottomNav'
import { HeaderBar } from './components/HeaderBar'
import { HomeView } from './components/views/HomeView'
import { CommunitiesView } from './components/views/CommunitiesView'
import { GlobalSearchView } from './components/views/GlobalSearchView'
import { MapView } from './components/views/MapView'
import { PetView } from './components/views/PetView'
import { SupporterAccountManagement } from './features/supporter/components/SupporterAccountManagement'
import { isSupporterAccountHash, leaveSupporterAccountRoute, normalizeSupporterPaypalCallback } from './features/supporter/supporterAccountRoute.mjs'
import { OnboardingView } from './components/views/OnboardingView'
import { PazoInstallControl } from './features/pwa/components/PazoInstallControl'
import { PublicProfileView } from './components/views/PublicProfileView'
import { PublicRescueView } from './components/views/PublicRescueView'

import { CreateModal } from './components/modals/CreateModal'
import { CreatePostModal } from './components/modals/CreatePostModal'
import { AddPetModal } from './components/modals/AddPetModal'
import { PassportModal } from './components/modals/PassportModal'
import { CareModal } from './components/modals/CareModal'
import { DocumentsModal } from './components/modals/DocumentsModal'
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

const zonedDateKey = (timezone: string) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value])
    )

    return `${values.year}-${values.month}-${values.day}`
  } catch {
    return dateKey()
  }
}

const calendarDayDiff = (fromDate: string, toDate: string) => {
  const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number)
  const [toYear, toMonth, toDay] = toDate.split('-').map(Number)

  const from = Date.UTC(fromYear, fromMonth - 1, fromDay)
  const to = Date.UTC(toYear, toMonth - 1, toDay)

  return Math.round((to - from) / 86400000)
}

const isCareReminderRelevant = (item: CareItem) => {
  const today = zonedDateKey(item.timezone)
  const daysUntilDue = calendarDayDiff(today, item.dueDate)

  if (item.reminderDaysBefore === null) return false
  if (daysUntilDue <= 0) return true
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
  const {
    user, loading, signIn, isPasswordRecovery, recoverySessionVerified,
    requestPasswordReset, changePassword, finishPasswordRecovery,
  } = useAuth()
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [publicRescueRoute, setPublicRescueRoute] = useState(getPublicRescueRoute)
  const [isSupporterAccountRoute, setSupporterAccountRoute] = useState(() => {
    normalizeSupporterPaypalCallback(window.location,window.history)
    return isSupporterAccountHash(window.location.hash)
  })

  useEffect(() => {
    const syncPublicRoute = () => {
      setPublicRescueRoute(getPublicRescueRoute())
      setSupporterAccountRoute(isSupporterAccountHash(window.location.hash))
    }

    window.addEventListener('hashchange', syncPublicRoute)
    return () => window.removeEventListener('hashchange', syncPublicRoute)
  }, [])

  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    // Code-only gate currently OFF. The welcome flow and analytics remain unchanged.
    stageMarketingLanding()
  }, [])

  useEffect(() => {
    // Keep the previously approved 2.5-second splash lifetime.
    // Reduced-motion users see the static identity without an unnecessary wait.
    const duration = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 150 : 2500
    const splashTimer = setTimeout(() => {
      setShowSplash(false)
    }, duration)

    return () => clearTimeout(splashTimer)
  }, [])

  const [isDemoUser, setIsDemoUser] = useState(false)
  const [authMode, setAuthMode] = useState<'onboarding' | 'login'>('onboarding')
  const [isOnboardingActive, setIsOnboardingActive] = useState(true)
  const [initialOnboardingStep, setInitialOnboardingStep] = useState<'A01' | 'A02' | 'A03' | 'A04'>('A01')

  const [isFeedLoading, setIsFeedLoading] = useState(true)
  const [isFeedLoadingMore, setIsFeedLoadingMore] = useState(false)
  const [hasMoreFeed, setHasMoreFeed] = useState(true)
  const [feedError, setFeedError] = useState<'initial' | 'more' | null>(null)

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
  // A transient network failure must not send an existing account to signup.
  const [petBootstrap, setPetBootstrap] = useState<{
    userId: string
    status: 'loading' | 'error' | 'ready'
  } | null>(null)
  const [petBootstrapRetry, setPetBootstrapRetry] = useState(0)
  const mainScrollRef = useRef<HTMLElement | null>(null)
  const tabScrollPositionsRef = useRef<Record<NavTab, number>>({
    inicio: 0,
    comunidades: 0,
    mapa: 0,
    mascota: 0,
  })
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
  const [documents, setDocuments] = useState<PetDocument[]>([])
  const [documentCount, setDocumentCount] = useState(0)
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false)
  const [isDocumentsLoadingMore, setIsDocumentsLoadingMore] = useState(false)
  const [hasMoreDocuments, setHasMoreDocuments] = useState(false)
  const [documentsError, setDocumentsError] = useState('')
  const documentLoadVersionRef = useRef(0)
  const documentOffsetRef = useRef(0)
  const documentLoadMoreInFlightRef = useRef(false)
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

  // Estados globales para superficies y deep-links internos.
  const [selectedPublicProfileId, setSelectedPublicProfileId] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(()=>{
    if(!user||petBootstrap?.userId!==user.id||petBootstrap.status!=='ready')return
    const screen=isSearchOpen?'explore':activeTab
    const day=new Date().toISOString().slice(0,10)
    const key='pazo_daily_activity_'+user.id+'_'+day+'_'+screen
    try{if(sessionStorage.getItem(key)==='1')return}catch{/* Browsing without storage still works */}
    void recordAdminActivity(screen).then(()=>{
      try{sessionStorage.setItem(key,'1')}catch{/* Optional measurement */}
    }).catch(()=>{
      // Analytics is optional; never block opening or navigating PAZO.
    })
  },[user?.id,petBootstrap?.userId,petBootstrap?.status,activeTab,isSearchOpen])

  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [communityCreateRequestKey, setCommunityCreateRequestKey] = useState(0)
  const [communityTargetId, setCommunityTargetId] = useState<string | null>(null)
  const [communityTargetKey, setCommunityTargetKey] = useState(0)
  const [placeSuggestionRequestKey, setPlaceSuggestionRequestKey] = useState(0)
  const [placeTargetId, setPlaceTargetId] = useState<string | null>(null)
  const [placeTargetKey, setPlaceTargetKey] = useState(0)
  const [isAddPetOpen, setIsAddPetOpen] = useState(false)
  const [isPassportOpen, setIsPassportOpen] = useState(false)
  const [isCareOpen, setIsCareOpen] = useState(false)
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [isMessagesOpen, setIsMessagesOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [selectedSightingId, setSelectedSightingId] = useState<string | null>(null)

  const canUseAccount = canUseAccountFeatures(user?.id, isDemoUser)
  const requireAccount = () => {
    setIsCreateMenuOpen(false)
    setIsDemoUser(false)
    setIsOnboardingActive(false)
    setAuthMode('login')
  }
  const openAccountAction = (action: () => void) => {
    if (!canUseAccount) { requireAccount(); return }
    action()
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

  const formatPostRow = (post: any, isRecommended: boolean): Post => ({
    id: post.id,
    petId: wasAuthorDeleted(post) ? '' : (post.pet_id || ''),
    isAuthorDeleted: wasAuthorDeleted(post),
    petName: wasAuthorDeleted(post) ? 'Autor eliminado' : post.pet_name,
    petSpecies: wasAuthorDeleted(post) ? 'otro' : post.pet_species,
    petAvatar: wasAuthorDeleted(post) ? '' : post.pet_avatar,
    location: wasAuthorDeleted(post) ? '' : (post.location || ''),
    timeAgo: 'Hace un momento',
    createdAt: post.created_at,
    isRecommended,
    tags: wasAuthorDeleted(post) ? [] : (post.tags || []),
    text: wasAuthorDeleted(post) ? '' : post.text,
    photoUrl: wasAuthorDeleted(post) ? null : post.photo_url,
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
      setFeedError(null)
      setPosts([])
      feedPaginationRef.current = {
        ...EMPTY_FEED_PAGINATION,
        petId: pet.id,
      }
    }

    try {
      let pagination = { ...feedPaginationRef.current }

      if (reset || pagination.petId !== pet.id) {
        const ownedPetIds =
          ownedPetIdsRef.current.length > 0
            ? ownedPetIdsRef.current
            : [pet.id]

        const { data: follows, error: followsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', pet.id)

        if (followsError) throw followsError

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

        if (feedLoadVersionRef.current !== loadVersion) return
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

      // Each query returns up to one page; only the items rendered should
      // advance that source's cursor. Other candidates stay on later pages.
      if (feedLoadVersionRef.current !== loadVersion) return
      const selection = selectFeedPage(
        socialRows,
        recommendationRows,
        FEED_PAGE_SIZE,
        reset ? new Set<string>() : new Set(posts.map((post) => post.id)),
        () => true
      )
      const page = selection.entries.map(({ item, recommended }) =>
        formatPostRow(item, recommended)
      )

      const nextPagination = advanceFeedCursors(
        pagination, selection, socialRows.length, recommendationRows.length, FEED_PAGE_SIZE
      )

      // Resolve membership BEFORE publishing posts. Two backend reads may run
      // concurrently, but the Feed receives one completed Post+badge payload.
      // On RPC failure, preserve the cursor and show the existing retry UI.
      const [interactionsPage,badgedPage]=await Promise.all([
        enrichPostsWithInteractions(page,pet.id),
        supporterBenefitsUiEnabled
          ?attachVerifiedFeedBadges(page,async ids=>await supabase.rpc('pazo_supporter_public_badges_batch',{p_pet_ids:ids}))
          :Promise.resolve(page),
      ])
      const enrichedPage=interactionsPage.map((post,index)=>({
        ...post,supporterBadge:badgedPage[index].supporterBadge,
      }))
      if(supporterBenefitsUiEnabled)await preloadVerifiedFeedBadgeArt(enrichedPage)

      if (feedLoadVersionRef.current !== loadVersion) return

      // Commit fetched data and corresponding cursors as one successful page.
      feedPaginationRef.current = nextPagination
      setFeedError(null)
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
        !(nextPagination.socialExhausted && nextPagination.recommendationExhausted)
      )
    } catch (error) {
      console.error(`Error loading feed page for pet ${pet.id}:`, error)

      if (feedLoadVersionRef.current === loadVersion) {
        // Report transient failure instead of claiming the feed is empty.
        // Preserve the last committed page cursor so retry cannot skip posts.
        setFeedError(reset ? 'initial' : 'more')
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

  // Verified badge snapshots are presentation-only. Revalidate while the Feed
  // is in use; never keep a departed member's badge indefinitely. Unlike the
  // initial page, this rechecks existing cards and changes badges atomically.
  const badgePetSignature=[...new Set(posts.filter(p=>!p.isAuthorDeleted).map(p=>p.petId))]
    .sort().join('|')
  // The interval must inspect newly loaded comments, not a stale page snapshot.
  const displayedPostsRef=useRef(posts)
  displayedPostsRef.current=posts
  useEffect(()=>{
    if(!supporterBenefitsUiEnabled||activeTab!=='inicio'||!badgePetSignature)return
    let alive=true
    let inFlight=false
    const refresh=async()=>{
      if(inFlight)return
      inFlight=true
      const version=feedLoadVersionRef.current
      const petId=activePetIdRef.current
      try{
        const snapshot=displayedPostsRef.current
        const visibleComments=snapshot.flatMap(post=>post.comments)
        const [checked,checkedComments]=await Promise.all([
          attachVerifiedFeedBadges(snapshot,
            async ids=>await supabase.rpc('pazo_supporter_public_badges_batch',{p_pet_ids:ids})),
          attachVerifiedCommentBadges(visibleComments,
            async ids=>await supabase.rpc('pazo_supporter_public_badges_batch',{p_pet_ids:ids})),
        ])
        await preloadVerifiedFeedBadgeArt([...checked,...checkedComments])
        if(!alive||feedLoadVersionRef.current!==version||activePetIdRef.current!==petId)return
        const badgeByPet=new Map(checked.filter(p=>!p.isAuthorDeleted)
          .map(p=>[p.petId,p.supporterBadge] as const))
        const commentBadgesByPet=new Map(checkedComments.map(c=>[c.authorPetId,c.supporterBadge] as const))
        setPosts(previous=>previous.map(post=>({
          ...post,
          supporterBadge:badgeByPet.has(post.petId)?badgeByPet.get(post.petId):post.supporterBadge,
          comments:post.comments.map(comment=>({
            ...comment,
            supporterBadge:comment.authorPetId&&commentBadgesByPet.has(comment.authorPetId)
              ?commentBadgesByPet.get(comment.authorPetId):undefined,
          })),
        })))
      }catch(error){
        if(alive&&feedLoadVersionRef.current===version&&activePetIdRef.current===petId){
          // Never retain a prior paid display claim when rechecking fails.
          setPosts(previous=>previous.map(post=>({
            ...post,supporterBadge:undefined,
            comments:post.comments.map(comment=>({...comment,supporterBadge:undefined})),
          })))
          console.error('PAZO Feed badge revalidation unavailable:',error)
        }
      }finally{inFlight=false}
    }
    const onReturn=()=>{
      if(document.visibilityState==='visible')void refresh()
    }
    document.addEventListener('visibilitychange',onReturn)
    const interval=setInterval(()=>void refresh(),60000)
    return ()=>{
      alive=false
      document.removeEventListener('visibilitychange',onReturn)
      clearInterval(interval)
    }
  },[badgePetSignature,activeTab,currentPet.id])

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
    setCareItems([])
    setCareHistory([])
    setCareError('')
    careHistoryOffsetRef.current = 0
    setHasMoreCareHistory(true)
    setDocuments([])
    setDocumentCount(0)
    setDocumentsError('')
    documentOffsetRef.current = 0
    setHasMoreDocuments(false)
    setSelectedPublicProfileId(null)
    void loadFeedForPet(pet)
    void loadCareForPet(pet.id)
    void loadDocumentsForPet(pet.id)
  }

  useEffect(() => {
    let cancelled = false

    if (!loading && user) {
      const userId = user.id
      const initApp = async () => {
        setPetBootstrap({ userId, status: 'loading' })
        setIsFeedLoading(true)

        let ownedPets: Pet[] = []
        try {
          ownedPets = await fetchOwnedPets(userId)
        } catch (petError) {
          console.error('Error fetching pet profiles:', petError)
          if (!cancelled) {
            setPetBootstrap({ userId, status: 'error' })
            setIsFeedLoading(false)
          }
          return
        }

        if (cancelled) return

        if (ownedPets.length > 0) {
          setIsOnboardingActive(false)
          ownedPetIdsRef.current = ownedPets.map((pet) => pet.id)
          setPets(ownedPets)

          const storedActivePetId = localStorage.getItem(`active_pet_${userId}`)
          const activePet =
            ownedPets.find((pet) => pet.id === storedActivePetId)
            || ownedPets[0]

          activePetIdRef.current = activePet.id
          setCurrentPet(activePet)
          localStorage.setItem(`active_pet_${userId}`, activePet.id)

          try {
            await Promise.all([
              loadFeedForPet(activePet),
              loadCareForPet(activePet.id),
              loadDocumentsForPet(activePet.id),
              refreshCareReminders(ownedPets),
            ])
          } catch (initialDataError) {
            // Pet identity is already confirmed. Secondary data failures
            // should not send the user back to account creation.
            console.error('Error loading initial pet data:', initialDataError)
          }
        } else {
          ownedPetIdsRef.current = []
          setPets([])
          setAuthMode('onboarding')
          setInitialOnboardingStep('A03')
          setIsOnboardingActive(true)
          setIsFeedLoading(false)
        }

        if (!cancelled) setPetBootstrap({ userId, status: 'ready' })
      }

      void initApp()
    }

    return () => { cancelled = true }
    // Supabase MFA verification refreshes the user object (SIGNED_IN) without
    // changing the account identity. Rebooting pets on every such refresh
    // temporarily unmounts PetView/AdminDashboard and loses the pending
    // security-sensitive operation. Rebootstrap ONLY on a real identity
    // change, auth loading transition, or explicit retry.
  }, [user?.id, loading, petBootstrapRetry])

  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')
  const [submittingLogin, setSubmittingLogin] = useState(false)
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [requestingPasswordReset, setRequestingPasswordReset] = useState(false)
  const [resetRequestMessage, setResetRequestMessage] = useState('')
  const [resetRequestError, setResetRequestError] = useState(false)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingLogin(true)
    setLoginMessage('')

    try {
      const success = await signIn(emailInput, passwordInput)
      if (success) {
        setPasswordInput('')
      } else {
        setLoginMessage(lang === 'es' ? 'Credenciales incorrectas o error de acceso.' : 'Invalid credentials or login error.')
      }
    } catch {
      setLoginMessage(lang === 'es' ? 'No hay conexión. Inténtalo nuevamente.' : 'Connection error. Please try again.')
    } finally {
      setSubmittingLogin(false)
    }
  }

  const handleRequestPasswordReset = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!resetEmail.trim() || requestingPasswordReset) return
    setRequestingPasswordReset(true)
    setResetRequestMessage('')
    setResetRequestError(false)
    try {
      const ok = await requestPasswordReset(resetEmail.trim())
      setResetRequestError(!ok)
      setResetRequestMessage(ok
        ? (lang === 'es'
          ? 'Si existe una cuenta con ese correo, recibirás un enlace de recuperación. Revisa también el spam.'
          : 'If an account exists for that email, you will receive a recovery link. Check spam too.')
        : (lang === 'es'
          ? 'No pudimos enviar el correo. Inténtalo más tarde.'
          : 'We could not send the email. Please try again later.'))
    } catch {
      setResetRequestError(true)
      setResetRequestMessage(lang === 'es'
        ? 'Error de conexión. Inténtalo nuevamente.'
        : 'Connection error. Please try again.')
    } finally {
      setRequestingPasswordReset(false)
    }
  }

  const handleExitPasswordRecovery = async () => {
    await finishPasswordRecovery()
    setIsDemoUser(false)
    setIsOnboardingActive(false)
    setAuthMode('login')
    setForgotPasswordMode(false)
    setLoginMessage('')
  }

  const handleLikePost = async (postId: string) => {
    if (!canUseAccount) { requireAccount(); return }
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
    if (!canUseAccount) { requireAccount(); return }
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

      const rawComments:PostComment[] = (data || []).map((row: any) => {
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

      // Comments and verified membership arrive in one visible payload.
      // Never show a paid author's comment first without their badge.
      let loadedComments:PostComment[]=rawComments
      if(supporterBenefitsUiEnabled){
        try{
          loadedComments=await attachVerifiedCommentBadges(rawComments,
            async ids=>await supabase.rpc('pazo_supporter_public_badges_batch',{p_pet_ids:ids}))
          await preloadVerifiedFeedBadgeArt(loadedComments)
        }catch(error){
          // Badge verification may fail, but reading comments must remain free.
          // A missing proof never produces a synthetic paid badge.
          console.error('PAZO comments badge evidence unavailable:',error)
          loadedComments=rawComments
        }
      }

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId && !post.commentsLoaded
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
    if (!canUseAccount) { requireAccount(); return false }
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

    // Verify this pet's badge before showing the optimistic comment.
    // No membership is inferred from the owner, previous post or login.
    let authorCommentBadge:Post['supporterBadge']
    if(supporterBenefitsUiEnabled){
      try{
        const verified=await attachVerifiedCommentBadges(
          [{authorPetId:actorPet.id,supporterBadge:undefined}],
          async ids=>await supabase.rpc('pazo_supporter_public_badges_batch',{p_pet_ids:ids}))
        await preloadVerifiedFeedBadgeArt(verified)
        authorCommentBadge=verified[0].supporterBadge
      }catch(error){
        // The optional badge cannot break a free commenting workflow.
        // Keep it absent until verification works; never claim paid membership.
        console.error('PAZO comment badge verification unavailable:',error)
      }
      // A pet switch or feed refresh invalidates the pending author identity.
    }
    if(activePetIdRef.current!==actorPet.id){
      commentingPostIdsRef.current.delete(operationKey)
      return false
    }

    const optimisticComment = {
      supporterBadge:authorCommentBadge,
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

  const handlePostCreated = async (newPost:Post) => {
    const petAtCreation=currentPet.id
    const versionAtCreation=feedLoadVersionRef.current
    // Newly created posts also arrive with their verified author badge.
    // The insert already happened in CreatePostModal; never POST a duplicate.
    let publishedPost=newPost
    if(supporterBenefitsUiEnabled){
      try{
        const resolved=await attachVerifiedFeedBadges([newPost],
          async ids=>await supabase.rpc('pazo_supporter_public_badges_batch',{p_pet_ids:ids}))
        await preloadVerifiedFeedBadgeArt(resolved)
        publishedPost=resolved[0]
      }catch(error){
        console.error('PAZO badge verification unavailable for newly created post:',error)
        setIsCreatePostOpen(false)
        setActiveTab('inicio')
        if(activePetIdRef.current===petAtCreation)
          void loadFeedForPet(currentPet)
        return
      }
    }
    if(feedLoadVersionRef.current!==versionAtCreation ||
       activePetIdRef.current!==petAtCreation)return
    if(feedPaginationRef.current.petId===petAtCreation &&
       feedPaginationRef.current.socialPetIds.includes(publishedPost.petId))
      feedPaginationRef.current.socialOffset+=1
    setPosts(previous=>[publishedPost,...previous.filter(post=>post.id!==publishedPost.id)])
    setProfilePosts(previous=>publishedPost.petId===petAtCreation
      ?[publishedPost,...previous.filter(post=>post.id!==publishedPost.id)]:previous)
    setIsCreatePostOpen(false)
    setActiveTab('inicio')
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

  const refreshCareAfterMutation = async (petId: string) => {
    if (activePetIdRef.current === petId) {
      await loadCareForPet(petId)
    }
    await refreshCareReminders()
  }

  const handleCreateCare = async (input: CareItemInput) => {
    if (!canUseAccount) { requireAccount(); return }
    const petId = currentPet.id
    await createCareItem(petId, input)
    await refreshCareAfterMutation(petId)
  }

  const handleUpdateCare = async (
    careItemId: string,
    input: CareItemInput
  ) => {
    if (!canUseAccount) { requireAccount(); return }
    const petId = currentPet.id
    await updateCareItem(careItemId, input)
    await refreshCareAfterMutation(petId)
  }

  const handleArchiveCare = async (careItemId: string) => {
    if (!canUseAccount) { requireAccount(); return }
    const petId = currentPet.id
    await archiveCareItem(careItemId)
    await refreshCareAfterMutation(petId)
  }

  const handleCompleteCare = async (item: CareItem) => {
    if (!canUseAccount) { requireAccount(); return }
    await completeCareItem(item)
    await refreshCareAfterMutation(item.petId)
  }

  const handleUndoCareCompletion = async (completion: CareCompletion) => {
    if (!canUseAccount) { requireAccount(); return }
    await undoCareCompletion(completion.id)
    await refreshCareAfterMutation(completion.petId)
  }

  useEffect(() => {
    if (isCareOpen && currentPet?.id) {
      void loadCareForPet(currentPet.id)
    }
  }, [isCareOpen, currentPet?.id])

  useEffect(() => {
    if (user?.id && !isOnboardingActive && pets.length > 0) {
      void refreshCareReminders()
    } else if (!user?.id) {
      setCareReminderItems([])
    }
  }, [user?.id, isOnboardingActive, pets.length])

  const loadDocumentsForPet = async (petId: string) => {
    const loadVersion = ++documentLoadVersionRef.current
    setIsDocumentsLoading(true)
    setDocumentsError('')
    documentOffsetRef.current = 0
    setHasMoreDocuments(false)

    try {
      await recoverPetDocumentOperations(petId)

      const page = await fetchPetDocumentsPage(
        petId,
        0,
        DOCUMENTS_PAGE_SIZE
      )

      if (
        loadVersion !== documentLoadVersionRef.current
        || activePetIdRef.current !== petId
      ) {
        return
      }

      setDocuments(page.items)
      setDocumentCount(page.total)
      documentOffsetRef.current = page.items.length
      setHasMoreDocuments(page.items.length < page.total)
    } catch (error: any) {
      console.error('Error loading private documents:', error)

      if (
        loadVersion === documentLoadVersionRef.current
        && activePetIdRef.current === petId
      ) {
        setDocuments([])
        setDocumentCount(0)
        setHasMoreDocuments(false)
        setDocumentsError(
          error?.message || (lang === 'es'
            ? 'No se pudieron cargar los documentos.'
            : 'Could not load documents.')
        )
      }
    } finally {
      if (loadVersion === documentLoadVersionRef.current) {
        setIsDocumentsLoading(false)
      }
    }
  }

  const loadMoreDocuments = async () => {
    if (
      documentLoadMoreInFlightRef.current
      || !hasMoreDocuments
      || !currentPet?.id
    ) {
      return
    }

    const petId = currentPet.id
    documentLoadMoreInFlightRef.current = true
    setIsDocumentsLoadingMore(true)

    try {
      const page = await fetchPetDocumentsPage(
        petId,
        documentOffsetRef.current,
        DOCUMENTS_PAGE_SIZE
      )

      if (activePetIdRef.current !== petId) return

      setDocumentCount(page.total)
      documentOffsetRef.current += page.items.length
      setHasMoreDocuments(documentOffsetRef.current < page.total)
      setDocuments((previous) => {
        const existing = new Set(previous.map((item) => item.id))
        return [
          ...previous,
          ...page.items.filter((item) => !existing.has(item.id)),
        ]
      })
    } catch (error) {
      console.error('Error loading more private documents:', error)
    } finally {
      documentLoadMoreInFlightRef.current = false
      setIsDocumentsLoadingMore(false)
    }
  }

  const refreshDocumentsAfterMutation = async (petId: string) => {
    if (activePetIdRef.current === petId) {
      await loadDocumentsForPet(petId)
    }
  }

  const handleUploadDocument = async (
    file: File,
    title: string,
    category: DocumentCategory
  ) => {
    if (!canUseAccount) { requireAccount(); return }
    const petId = currentPet.id
    await uploadPetDocument(petId, file, title, category)
    await refreshDocumentsAfterMutation(petId)
  }

  const handleUpdateDocument = async (
    documentId: string,
    title: string,
    category: DocumentCategory
  ) => {
    if (!canUseAccount) { requireAccount(); return }
    const petId = currentPet.id
    await updatePetDocumentMetadata(documentId, title, category)
    await refreshDocumentsAfterMutation(petId)
  }

  const handleDeleteDocument = async (document: PetDocument) => {
    if (!canUseAccount) { requireAccount(); return }
    await deletePetDocument(document)

    if (activePetIdRef.current === document.petId) {
      setDocuments((previous) =>
        previous.filter((item) => item.id !== document.id)
      )
      setDocumentCount((previous) => Math.max(0, previous - 1))
    }

    void refreshDocumentsAfterMutation(document.petId)
  }

  useEffect(() => {
    if (isDocumentsOpen && currentPet?.id) {
      void loadDocumentsForPet(currentPet.id)
    }
  }, [isDocumentsOpen, currentPet?.id])

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
    const sightingId = getNotificationSightingId(notification)
    const joinedCommunityId = getNotificationCommunityId(notification)
    const supporterNotice = isSupporterNotification(notification)
    if (!canUseAccount || (!sightingId && !joinedCommunityId && !supporterNotice)) return

    setIsNotificationsOpen(false)
    if (supporterNotice) {
      window.location.hash = '#/account/supporter'
    } else if (joinedCommunityId) {
      setCommunityTargetId(joinedCommunityId)
      setCommunityTargetKey((value) => value + 1)
      setActiveTab('comunidades')
    } else if (sightingId) {
      setSelectedSightingId(sightingId)
    }

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

  const unreadMessages = isDemoUser && !user
    ? conversations.filter((c) => c.isRequest).length
    : 0
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

  const currentPetCareReminder = careReminderItems.find(
    (item) => item.petId === currentPet.id
  )

  if (publicRescueRoute.token) {
    return (
      <PublicRescueView
        token={publicRescueRoute.token}
        fromPreview={publicRescueRoute.fromPreview}
        onBack={() => window.history.back()}
      />
    )
  }

  if (showSplash) {
    return <PazoSplash buildVersion={pazoBuildVersion} lang={lang} />
  }

  if (loading) {
    return (
      <div role="status" className="min-h-screen bg-[#FAF8F5] text-[#204E4A] flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm font-bold animate-pulse">
          {lang === 'es' ? 'Verificando tu sesión…' : 'Checking your session…'}
        </p>
        <p className="text-xs text-[#5C7470]">
          {lang === 'es' ? 'Tus datos están protegidos.' : 'Your data is protected.'}
        </p>
      </div>
    )
  }

  if (isPasswordRecovery) {
    return (
      <PasswordRecoveryView
        lang={lang}
        sessionReady={Boolean(user) && recoverySessionVerified}
        onUpdatePassword={changePassword}
        onExit={handleExitPasswordRecovery}
      />
    )
  }

  // Accessible to the verified account holder even when pet loading fails
  // or the account has no pets. A subscription must not depend on a pet.
  if (user && isSupporterAccountRoute) {
    return <SupporterAccountManagement lang={lang}
      onClose={() => {
        leaveSupporterAccountRoute(window.location)
        setSupporterAccountRoute(false)
      }} />
  }

  if (user && (petBootstrap?.userId !== user.id || petBootstrap.status === 'loading')) {
    return (
      <div role="status" className="min-h-screen bg-[#FAF8F5] text-[#204E4A] flex flex-col items-center justify-center gap-4 px-6">
        <div aria-hidden="true" className="w-8 h-8 border-3 border-[#204E4A]/20 border-t-[#204E4A] rounded-full animate-spin" />
        <p className="text-sm font-bold">
          {lang === 'es' ? 'Cargando tus mascotas...' : 'Loading your pets...'}
        </p>
      </div>
    )
  }

  if (user && petBootstrap?.status === 'error') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#204E4A] flex items-center justify-center px-5">
        <main className="max-w-sm w-full bg-white p-6 rounded-[2rem] shadow-sm space-y-4">
          <h1 className="text-xl font-black">
            {lang === 'es' ? 'No pudimos cargar tus mascotas' : 'We could not load your pets'}
          </h1>
          <p role="alert" className="text-sm text-[#5C7470]">
            {lang === 'es'
              ? 'Tu sesión sigue activa. Comprueba tu conexión e inténtalo de nuevo; no necesitas crear otra cuenta.'
              : 'You are still signed in. Check your connection and try again; you do not need another account.'}
          </p>
          <button type="button" onClick={() => setPetBootstrapRetry((value) => value + 1)}
            className="w-full rounded-full bg-[#204E4A] text-white py-3 font-extrabold cursor-pointer">
            {lang === 'es' ? 'Reintentar' : 'Try again'}
          </button>
          <a href="#/account/supporter"
            className="block w-full rounded-full bg-[#E1E53F]/50 py-3 text-center text-sm font-bold text-[#204E4A]">
            {lang === 'es' ? 'Gestionar suscripción de apoyo' : 'Manage support subscription'}
          </a>
        </main>
      </div>
    )
  }

  const isAuthenticated = (!!user && !isOnboardingActive) || isDemoUser

  return (
    <div className="h-[100dvh] min-h-0 bg-[#EFECE4] text-[#204E4A] flex items-center justify-center p-0 sm:h-auto sm:min-h-screen sm:p-5 selection:bg-[#E1E53F] selection:text-[#204E4A]">
      <div data-pazo-app-shell className="w-full sm:max-w-[430px] h-full min-h-0 sm:h-[860px] bg-[#FAF8F5] sm:border sm:border-[#204E4A]/10 sm:rounded-[2.8rem] flex flex-col shadow-[0_20px_60px_-15px_rgba(32,78,74,0.18)] overflow-hidden relative transition-all duration-300">

        {/* Pantalla exclusiva de perfil público global (flota sobre todo el contenedor) */}
        {selectedPublicProfileId && (
          <PublicProfileView
            targetPetId={selectedPublicProfileId}
            canReport={Boolean(user?.id) && !isDemoUser}
            currentPetId={currentPet?.id}
            ownedPetIds={pets.map((pet) => pet.id)}
            onClose={() => setSelectedPublicProfileId(null)}
            lang={lang}
          />
        )}

        {isSearchOpen && (
          <GlobalSearchView
            canSearch={Boolean(user?.id) && !isDemoUser}
            onClose={() => setIsSearchOpen(false)}
            onSelectPet={(petId) => {
              setIsSearchOpen(false)
              setSelectedPublicProfileId(petId)
            }}
            onSelectCommunity={(communityId) => {
              setIsSearchOpen(false)
              setCommunityTargetId(communityId)
              setCommunityTargetKey((value) => value + 1)
              setActiveTab('comunidades')
            }}
            onSelectPlace={(placeId) => {
              setIsSearchOpen(false)
              setPlaceTargetId(placeId)
              setPlaceTargetKey((value) => value + 1)
              setActiveTab('mapa')
            }}
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
                setCareItems([])
                setCareHistory([])
                void loadFeedForPet(newPet)
                void loadCareForPet(newPet.id)
                void refreshCareReminders([newPet])
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
                  <h2 className="text-3xl font-black text-[#204E4A]">
                    {forgotPasswordMode
                      ? (lang === 'es' ? 'Recuperar contraseña' : 'Reset your password')
                      : (lang === 'es' ? 'Iniciar Sesión' : 'Log in to Pazo')}
                  </h2>
                  <p className="text-xs text-[#5C7470]">
                    {forgotPasswordMode
                      ? (lang === 'es'
                        ? 'Te enviaremos un enlace para crear una contraseña nueva.'
                        : 'We will send a link so you can set a new password.')
                      : (lang === 'es'
                        ? 'Ingresa tus datos para entrar directamente a tu cuenta.'
                        : 'Enter your credentials to access your account.')}
                  </p>
                </div>

                {forgotPasswordMode ? (
                  <form onSubmit={handleRequestPasswordReset} className="space-y-3.5">
                    <label className="block text-[11px] font-bold text-[#204E4A]">
                      {lang === 'es' ? 'Correo electrónico' : 'Email address'}
                      <input type="email" required autoComplete="email"
                        value={resetEmail} onChange={(event) => setResetEmail(event.target.value)}
                        placeholder="tu@correo.com"
                        className="mt-1 w-full bg-white border-2 border-[#204E4A]/15 rounded-2xl px-4 py-3 text-xs text-[#204E4A]" />
                    </label>
                    <button type="submit" disabled={requestingPasswordReset}
                      className="w-full bg-[#204E4A] text-white font-extrabold py-3.5 rounded-full text-xs disabled:opacity-50">
                      {requestingPasswordReset
                        ? (lang === 'es' ? 'Enviando...' : 'Sending...')
                        : (lang === 'es' ? 'Enviar enlace' : 'Send link')}
                    </button>
                    {resetRequestMessage && (
                      <p role={resetRequestError ? 'alert' : 'status'}
                        className="text-xs text-[#204E4A] leading-relaxed">{resetRequestMessage}</p>
                    )}
                    <button type="button" onClick={() => {
                      setForgotPasswordMode(false)
                      setResetRequestMessage('')
                    }} className="w-full text-xs font-bold text-[#5C7470] underline">
                      {lang === 'es' ? 'Volver a iniciar sesión' : 'Back to log in'}
                    </button>
                  </form>
                ) : (
                <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                  <div>
                    <label htmlFor="pazo-login-email" className="block text-[11px] font-bold text-[#204E4A] mb-1">
                      {lang === 'es' ? 'Correo electrónico' : 'Email address'}
                    </label>
                    <input
                      id="pazo-login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full bg-white border-2 border-[#204E4A]/15 rounded-2xl px-4 py-3 text-xs text-[#204E4A] focus:outline-none focus:border-[#204E4A] focus:ring-2 focus:ring-[#E1E53F]"
                    />
                  </div>

                  <div>
                    <label htmlFor="pazo-login-password" className="block text-[11px] font-bold text-[#204E4A] mb-1">
                      {lang === 'es' ? 'Contraseña' : 'Password'}
                    </label>
                    <div className="relative">
                      <input
                        id="pazo-login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
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
                  <button type="button" onClick={() => {
                    setResetEmail(emailInput)
                    setResetRequestMessage('')
                    setForgotPasswordMode(true)
                  }} className="w-full text-xs font-bold text-[#204E4A] underline cursor-pointer">
                    {lang === 'es' ? '¿Olvidaste tu contraseña?' : 'Forgot your password?'}
                  </button>
                </form>
                )}

                {!forgotPasswordMode && loginMessage && (
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

              <div className="flex shrink-0 flex-col items-center pb-1 text-center">
                {!forgotPasswordMode && <PazoInstallControl lang={lang} placement="welcome" />}
                <p className="text-[11px] text-[#5C7470]">Pazo MVP • Los Ángeles • 2026</p>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col h-full bg-[#FAF8F5] relative overflow-hidden">

            <HeaderBar
              lang={lang}
              onToggleLang={() => setLang((prev) => (prev === 'es' ? 'en' : 'es'))}
              onOpenSearch={() => setIsSearchOpen(true)}
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
              className={activeTab === 'mapa'
                ? 'relative min-h-0 flex-1 overflow-hidden p-0'
                : 'relative min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-[calc(6rem+env(safe-area-inset-bottom))]'}
              onScroll={(event) => {
                const element = event.currentTarget
                tabScrollPositionsRef.current[activeTab] = element.scrollTop

                if (
                  activeTab === 'inicio'
                  && hasMoreFeed
                  && !isFeedLoading
                  && !isFeedLoadingMore
                  && feedError !== 'more'
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
                      {feedError === 'initial' ? (
                        <section role="alert" className="rounded-[2rem] bg-white border border-[#204E4A]/10 p-6 text-center space-y-3">
                          <h2 className="text-lg font-black text-[#204E4A]">
                            {lang === 'es' ? 'No pudimos cargar las publicaciones' : 'Could not load posts'}
                          </h2>
                          <p className="text-xs text-[#5C7470]">
                            {lang === 'es'
                              ? 'Puede ser un problema de conexión. Inténtalo de nuevo; tus publicaciones no se han borrado.'
                              : 'It might be a connection issue. Try again; your posts were not deleted.'}
                          </p>
                          <button type="button" onClick={() => void loadFeedForPet(currentPet)}
                            className="rounded-full px-5 py-3 bg-[#204E4A] text-white font-extrabold text-xs cursor-pointer">
                            {lang === 'es' ? 'Reintentar' : 'Try again'}
                          </button>
                        </section>
                      ) : (
                      <HomeView
                        posts={posts}
                        canReport={Boolean(user?.id) && !isDemoUser}
                        onLikePost={handleLikePost}
                        onSavePost={handleSavePost}
                        onAddComment={handleAddComment}
                        onLoadComments={loadCommentsForPost}
                        lang={lang}
                        currentPetId={currentPet?.id}
                        ownedPetIds={pets.map((pet) => pet.id)}
                        onSelectPetProfile={(petId) => setSelectedPublicProfileId(petId)}
                      />
                      )}
                      {feedError === 'more' && (
                        <div role="alert" className="mt-4 rounded-2xl bg-white p-4 text-center space-y-3">
                          <p className="text-xs text-[#5C7470]">
                            {lang === 'es' ? 'No pudimos cargar más publicaciones.' : 'Could not load more posts.'}
                          </p>
                          <button type="button" onClick={() => void loadMoreFeed()}
                            className="rounded-full bg-[#204E4A] px-5 py-2.5 text-white font-bold text-xs cursor-pointer">
                            {lang === 'es' ? 'Reintentar' : 'Try again'}
                          </button>
                        </div>
                      )}
                      {isFeedLoadingMore && (
                        <div className="py-5 flex justify-center">
                          <div className="w-6 h-6 border-2 border-[#204E4A]/20 border-t-[#204E4A] rounded-full animate-spin" />
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'comunidades' && (
                    <CommunitiesView
                      currentPet={currentPet}
                      canUseCommunities={Boolean(user?.id) && !isDemoUser}
                      createCommunityRequestKey={communityCreateRequestKey}
                      requestedCommunityId={communityTargetId}
                      requestedCommunityKey={communityTargetKey}
                      lang={lang}
                    />
                  )}

                  {activeTab === 'mapa' && (
                    <MapView
                      currentPet={currentPet}
                      canUsePlaces={Boolean(user?.id) && !isDemoUser}
                      suggestPlaceRequestKey={placeSuggestionRequestKey}
                      requestedPlaceId={placeTargetId}
                      requestedPlaceKey={placeTargetKey}
                      lang={lang}
                    />
                  )}

                  {activeTab === 'mascota' && (
                    <PetView
                      currentPet={currentPet}
                      canManagePet={canUseAccount}
                      onRequireAccount={requireAccount}
                      canModerate={Boolean(user?.id) && !isDemoUser}
                      availablePets={pets}
                      onSelectPet={selectActivePet}
                      onPetUpdated={(updatedPet) => {
                        setCurrentPet(updatedPet)
                        setPets((prevPets) =>
                          prevPets.map((pet) => pet.id === updatedPet.id ? updatedPet : pet)
                        )
                      }}
                      onAddPet={() => openAccountAction(() => setIsAddPetOpen(true))}
                      careItems={careItems}
                      careReminderItem={currentPetCareReminder}
                      onCompleteCare={handleCompleteCare}
                      onOpenQRPassport={() => openAccountAction(() => setIsPassportOpen(true))}
                      onOpenCareAgenda={() => openAccountAction(() => setIsCareOpen(true))}
                      documentCount={documentCount}
                      onOpenDocuments={() => openAccountAction(() => setIsDocumentsOpen(true))}
                      onOpenLostAlert={() => openAccountAction(() => setIsAlertOpen(true))}
                      lang={lang}
                      userPosts={profilePosts}
                    />
                  )}
                </>
              )}
            </main>

            {(activeTab === 'inicio' || activeTab === 'comunidades' || activeTab === 'mascota') && (
              <div
                data-pazo-scroll-soft-edge="true"
                aria-hidden="true"
                className="pazo-scroll-soft-edge"
              />
            )}

            <BottomNav
              activeTab={activeTab}
              onSelectTab={(tab) => {
                const scrollContainer = mainScrollRef.current
                if (scrollContainer) {
                  tabScrollPositionsRef.current[activeTab] = scrollContainer.scrollTop
                }

                if (tab === 'comunidades') {
                  setCommunityTargetId(null)
                }

                if (tab === 'mapa') {
                  setPlaceTargetId(null)
                }

                if (tab !== activeTab) {
                  setActiveTab(tab)
                }
              }}
              onOpenCreate={() => setIsCreateMenuOpen(true)}
              labels={{
                inicio: lang === 'es' ? 'Inicio' : 'Home',
                comunidades: lang === 'es' ? 'Comunidades' : 'Communities',
                crear: lang === 'es' ? 'Crear' : 'Create',
                mapa: lang === 'es' ? 'Mapa' : 'Map',
                mascota: lang === 'es' ? 'Mi mascota' : 'My Pet',
              }}
            />

            <CreateModal
              isOpen={isCreateMenuOpen}
              onClose={() => setIsCreateMenuOpen(false)}
              activePetName={canUseAccount ? currentPet.name : (lang === 'es' ? 'una mascota de ejemplo' : 'a sample pet')}
              activePetSpecies={currentPet.species}
              canCreate={canUseAccount}
              onRequireAccount={requireAccount}
              onSelectOption={(type) => {
                if (!canUseAccount) { requireAccount(); return }
                setIsCreateMenuOpen(false)
                if (type === 'post') setIsCreatePostOpen(true)
                if (type === 'alerta') setIsAlertOpen(true)
                if (type === 'lugar') {
                  setPlaceTargetId(null)
                  setActiveTab('mapa')
                  setPlaceSuggestionRequestKey((value) => value + 1)
                }
                if (type === 'comunidad') {
                  setCommunityTargetId(null)
                  setActiveTab('comunidades')
                  setCommunityCreateRequestKey((value) => value + 1)
                }
              }}
              lang={lang}
            />

            <CreatePostModal
              isOpen={canUseAccount && isCreatePostOpen}
              onClose={() => setIsCreatePostOpen(false)}
              currentPet={currentPet}
              onPostCreated={handlePostCreated}
              lang={lang}
            />

            <AddPetModal
              isOpen={canUseAccount && isAddPetOpen}
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
              isOpen={canUseAccount && isCareOpen}
              onClose={() => setIsCareOpen(false)}
              petName={currentPet.name}
              careItems={careItems}
              careHistory={careHistory}
              isLoading={isCareLoading}
              error={careError}
              isHistoryLoading={isCareHistoryLoading}
              hasMoreHistory={hasMoreCareHistory}
              onLoadMoreHistory={() => void loadMoreCareHistory()}
              onRetry={() => void loadCareForPet(currentPet.id)}
              onCreateCare={handleCreateCare}
              onUpdateCare={handleUpdateCare}
              onArchiveCare={handleArchiveCare}
              onCompleteCare={handleCompleteCare}
              onUndoCompletion={handleUndoCareCompletion}
              lang={lang}
            />

            <DocumentsModal
              isOpen={canUseAccount && isDocumentsOpen}
              onClose={() => setIsDocumentsOpen(false)}
              petName={currentPet.name}
              documents={documents}
              total={documentCount}
              isLoading={isDocumentsLoading}
              error={documentsError}
              isLoadingMore={isDocumentsLoadingMore}
              hasMore={hasMoreDocuments}
              onLoadMore={() => void loadMoreDocuments()}
              onRetry={() => void loadDocumentsForPet(currentPet.id)}
              onUpload={handleUploadDocument}
              onUpdate={handleUpdateDocument}
              onDelete={handleDeleteDocument}
              onGetBlob={downloadPetDocumentBlob}
              lang={lang}
            />

            <AlertModal
              isOpen={canUseAccount && isAlertOpen}
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
              conversations={isDemoUser && !user ? conversations : []}
              isDemo={isDemoUser && !user}
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
