import { useState, useEffect, useRef } from 'react'
import type { Post, SupporterBadgeEvidence } from '../../types/pazo'
import { IconBookmark, IconPaw } from '../icons/PazoIcons'
import { PazoMotifIcon } from '../icons/PazoMotifIcons'
import { DEMO_POST_MOTIFS, DEMO_COMMENT_MOTIFS } from '../../data/mockData'
import { supabase } from '../../services/supabaseClient'
import { FollowButton } from '../shared/FollowButton'
import { ReportDialog } from '../../features/moderation/ReportDialog'
import type { ReportTarget } from '../../features/moderation/reportingService'
import { describeReportSubject } from '../../features/moderation/reportSubject'
import { SupporterBadge } from '../../features/supporter/components/SupporterBadge'
import {supporterBenefitsUiEnabled} from '../../features/supporter/supporterUiRelease'

const supporterBadgesEnabled = supporterBenefitsUiEnabled
interface HomeViewProps {
  posts: Post[]
  canReport: boolean
  onLikePost: (postId: string) => void
  onSavePost: (postId: string) => void
  onAddComment: (postId: string, text: string) => Promise<boolean>
  onLoadComments: (postId: string) => Promise<boolean>
  lang: 'es' | 'en'
  currentPetId?: string
  ownedPetIds: string[]
  onSelectPetProfile: (petId: string) => void
}

// Hook de observacion de visibilidad por tarjeta de post
const usePostTracking = (postId: string, actorPetId: string) => {
  const elementRef = useRef<HTMLElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasImpressionRef = useRef(false)
  const hasViewRef = useRef(false)

  useEffect(() => {
    if (!postId || !actorPetId) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!hasImpressionRef.current && actorPetId && postId) {
              hasImpressionRef.current = true
              supabase.rpc('register_interaction_signal', {
                p_actor_pet_id: actorPetId,
                p_target_id: postId,
                p_action_type: 'impression'
              }).then(({ error }) => {
                if (error) console.error('Error tracking impression:', error)
              })
            }
            if (!hasViewRef.current && !timerRef.current && actorPetId && postId) {
              timerRef.current = setTimeout(() => {
                hasViewRef.current = true
                supabase.rpc('register_interaction_signal', {
                  p_actor_pet_id: actorPetId,
                  p_target_id: postId,
                  p_action_type: 'view'
                }).then(({ error }) => {
                  if (error) console.error('Error tracking view:', error)
                })
              }, 3000)
            }
          } else {
            if (timerRef.current) {
              clearTimeout(timerRef.current)
              timerRef.current = null
            }
          }
        })
      },
      { threshold: 0.6 }
    )

    const currentElement = elementRef.current
    if (currentElement) observer.observe(currentElement)

    return () => {
      if (currentElement) observer.unobserve(currentElement)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [postId, actorPetId])

  return elementRef
}

const formatTimeAgo = (createdAt: string | undefined, fallback: string, lang: 'es' | 'en') => {
  if (!createdAt) return fallback
  const postDate = new Date(createdAt)
  const now = new Date()
  const diffInMs = now.getTime() - postDate.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  if (diffInMinutes < 5) return lang === 'es' ? 'Hace un momento' : 'Just now'
  if (diffInHours < 24) {
    if (diffInHours < 1) return lang === 'es' ? `Hace ${diffInMinutes} min` : `${diffInMinutes} mins ago`
    return lang === 'es' ? `Hace ${diffInHours} h` : `${diffInHours} h ago`
  }
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  if (postDate.getFullYear() !== now.getFullYear()) options.year = 'numeric'
  return postDate.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', options)
}

/**
 * PAZO's decorative preview for the unreleased nearby feed.
 * Buildings, pets and pins are illustrations only; no location or nearby-user data.
 */
const NearbyNeighborhoodArtwork = () => (
  <svg
    viewBox="0 0 340 178"
    aria-hidden="true"
    focusable="false"
    className="mx-auto block h-auto w-full max-w-[340px]"
    fill="none"
  >
    <path d="M10 147c17-12 50-11 72-5 23-17 60-19 87-8 25-17 63-15 85-1 32-7 56 1 76 16v17H10z" fill="#DDEBD9" />
    <ellipse cx="171" cy="165" rx="142" ry="8" fill="#B8D6CA" opacity=".45"/>
    {/* A small neighborhood, not a live location map. */}
    <rect x="55" y="63" width="68" height="74" rx="6" fill="#FFFCF6"/>
    <path d="m46 67 42-36 44 36c4 4 1 9-4 9H50c-6 0-8-5-4-9Z" fill="#E7AA88"/>
    <rect x="78" y="91" width="21" height="46" rx="10.5" fill="#90BCAF"/>
    <rect x="62" y="85" width="13" height="17" rx="4" fill="#D4EAE4"/>
    <rect x="101" y="85" width="13" height="17" rx="4" fill="#D4EAE4"/>
    <rect x="155" y="51" width="78" height="87" rx="7" fill="#F8F1DD"/>
    <path d="m146 55 47-38 47 38c4 4 2 9-4 9h-86c-6 0-8-5-4-9Z" fill="#204E4A"/>
    <rect x="188" y="94" width="23" height="44" rx="11" fill="#DCA981"/>
    <rect x="163" y="79" width="17" height="18" rx="5" fill="#BBDAD0"/>
    <rect x="213" y="79" width="14" height="18" rx="5" fill="#BBDAD0"/>
    <path d="M265 120V81" stroke="#6D9E83" strokeWidth="8" strokeLinecap="round"/>
    <circle cx="253" cy="76" r="22" fill="#B8D4A2"/>
    <circle cx="274" cy="65" r="23" fill="#C8DFB1"/>
    <circle cx="289" cy="83" r="18" fill="#ACCCA0"/>
    <path d="M30 137V106" stroke="#82A487" strokeWidth="6" strokeLinecap="round"/>
    <circle cx="26" cy="99" r="17" fill="#C5DDAE"/>
    <circle cx="41" cy="97" r="15" fill="#B0CE9C"/>
    {/* Dog peeking in front of the house. */}
    <path d="M102 131c-11-11-22-6-21 7 0 8 7 13 14 10Z" fill="#A56E57"/>
    <ellipse cx="117" cy="135" rx="29" ry="25" fill="#DFB18B"/>
    <path d="M98 115c-9-4-17 2-17 14 0 9 6 15 13 12l10-14Z" fill="#9C6853"/>
    <path d="M134 116c9-4 16 4 16 15 0 9-6 14-13 11l-7-15Z" fill="#A57355"/>
    <ellipse cx="107" cy="131" rx="3.5" ry="4.3" fill="#204E4A"/>
    <ellipse cx="128" cy="131" rx="3.5" ry="4.3" fill="#204E4A"/>
    <ellipse cx="118" cy="144" rx="12" ry="9" fill="#F7DEBF"/>
    <path d="M114 140c2-3 7-3 9 0 1 2-2 5-5 5s-6-3-4-5Z" fill="#204E4A"/>
    <path d="M118 145c-2 4-6 4-8 2m8-2c2 4 6 4 8 2" stroke="#204E4A" strokeWidth="1.7" strokeLinecap="round"/>
    {/* Cat with little paws. */}
    <path d="m226 132 3-25 17 12 14-1 17-12 3 26Z" fill="#8FB6A6"/>
    <ellipse cx="253" cy="139" rx="29" ry="25" fill="#A6CDBA"/>
    <path d="m231 118 3-14 13 13m15 0 13-13 3 14" fill="#8FB6A6"/>
    <ellipse cx="242" cy="134" rx="3" ry="4" fill="#204E4A"/>
    <ellipse cx="265" cy="134" rx="3" ry="4" fill="#204E4A"/>
    <path d="M250 145c2-2 5-2 7 0-1 3-2 4-4 4-2 0-3-1-3-4Z" fill="#EC7357"/>
    <path d="M253 150c-2 3-5 3-7 2m7-2c2 3 5 3 7 2" stroke="#204E4A" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="m230 145 16 3m-17 4 16-1m35-6-16 3m17 4-16-1" stroke="#204E4A" strokeWidth="1.4" strokeLinecap="round" opacity=".6"/>
    {/* Future nearby markers: aesthetic, not actual GPS pins. */}
    <path d="M82 5c-13 0-23 10-23 22 0 17 23 34 23 34s23-17 23-34C105 15 95 5 82 5Z" fill="#204E4A"/>
    <circle cx="82" cy="27" r="8.5" fill="#E1E53F"/>
    <path d="M285 12c-12 0-21 9-21 21 0 15 21 30 21 30s21-15 21-30c0-12-9-21-21-21Z" fill="#E1E53F"/>
    <circle cx="285" cy="33" r="7.5" fill="#204E4A"/>
    <circle cx="312" cy="111" r="4" fill="#EC7357" opacity=".65"/>
    <circle cx="28" cy="67" r="4" fill="#E1E53F"/>
    <path d="M305 128c4-5 7-5 11 0m-6-8c3-3 5-3 7 0" stroke="#204E4A" strokeWidth="2.5" strokeLinecap="round" opacity=".45"/>
  </svg>
)

export const HomeView = ({
  posts, canReport, onLikePost, onSavePost, onAddComment, onLoadComments, lang, currentPetId = '', ownedPetIds, onSelectPetProfile,
}: HomeViewProps) => {
  const [reportTarget, setReportTarget] = useState<{kind: ReportTarget; id: string; label?: string} | null>(null)
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(() => new Set())
  const [lastHiddenPostId, setLastHiddenPostId] = useState<string | null>(null)
  const [feedFilter, setFeedFilter] = useState<'following' | 'nearby'>('following')
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null)
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [hasVotedNearby, setHasVotedNearby] = useState(false)
  const [isSubmittingNearby, setIsSubmittingNearby] = useState(false)

  const handleToggleComments = async (postId: string) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null)
      return
    }

    if (loadingCommentsPostId) return

    setLoadingCommentsPostId(postId)
    try {
      const loaded = await onLoadComments(postId)
      if (loaded) setActiveCommentsPostId(postId)
    } finally {
      setLoadingCommentsPostId(null)
    }
  }

  const handleSendComment = async (postId: string) => {
    const trimmedText = newCommentText.trim()
    if (!trimmedText || isSubmittingComment) return

    setIsSubmittingComment(true)
    try {
      const success = await onAddComment(postId, trimmedText)
      if (success) setNewCommentText('')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleSelectNearby = async () => {
    setFeedFilter('nearby')
    if (!canReport) return
    try {
      await supabase.from('interactions').insert({ target_id: 'feature_nearby_tab', target_type: 'place', action_type: 'view' })
    } catch (err) { console.error('Error tracking nearby view:', err) }
  }

  const handleNearbyInterest = async () => {
    if (!canReport) return
    setIsSubmittingNearby(true)
    try {
      await supabase.from('interactions').insert({ target_id: 'feature_nearby_interested', target_type: 'place', action_type: 'join' })
      setHasVotedNearby(true)
    } catch (err) { console.error('Error tracking nearby interest:', err) }
    finally { setIsSubmittingNearby(false) }
  }

  const handleHidePost = (postId: string) => {
    setHiddenPostIds((previous) => new Set(previous).add(postId))
    setLastHiddenPostId(postId)
  }

  const handleUndoHide = () => {
    if (!lastHiddenPostId) return
    setHiddenPostIds((previous) => {
      const next = new Set(previous)
      next.delete(lastHiddenPostId)
      return next
    })
    setLastHiddenPostId(null)
  }

  const displayedPosts = posts.filter((post) => !hiddenPostIds.has(post.id) && (feedFilter === 'following' || !post.isRecommended))

  return (
    <div className="space-y-3 animate-slide-up pb-6">
      {/* F13: título y filtros en la misma fila; en pantallas estrechas se apilan juntos sin espacio muerto. */}
      <div className="px-1">
        <div className="grid grid-cols-[minmax(0,1fr)_170px] items-center gap-x-2 gap-y-2 max-[360px]:grid-cols-1">
          <h2 className="min-w-0 text-[clamp(16px,4vw,20px)] font-black leading-tight tracking-tight text-[#204E4A]">
            {lang === 'es' ? 'Su pequeño mundo.' : 'Their little world.'}
          </h2>
          <div
            className="flex h-[42px] w-[170px] max-w-full items-stretch gap-0.5 rounded-full bg-white/30 p-0.5 backdrop-blur-sm max-[360px]:ml-auto"
            role="group"
            aria-label={lang === 'es' ? 'Filtrar publicaciones' : 'Filter posts'}
          >
            <button
              type="button"
              aria-pressed={feedFilter === 'following'}
              onClick={() => setFeedFilter('following')}
              className={`min-w-0 flex-[1_1_40%] rounded-full px-1 text-[9.5px] font-bold leading-tight transition-colors ${feedFilter === 'following' ? 'bg-white text-[#204E4A] shadow-[0_3px_8px_rgba(32,78,74,0.12)]' : 'text-[#5C7470] hover:bg-white/60'}`}
            >
              {lang === 'es' ? 'Para ti' : 'For you'}
            </button>
            <button
              type="button"
              aria-pressed={feedFilter === 'nearby'}
              onClick={handleSelectNearby}
              className={`min-w-0 flex-[1_1_60%] rounded-full px-0.5 text-center text-[8.5px] font-bold leading-[1.2] transition-colors ${feedFilter === 'nearby' ? 'bg-white text-[#204E4A] shadow-[0_3px_8px_rgba(32,78,74,0.12)]' : 'text-[#5C7470] hover:bg-white/60'}`}
            >
              {lang === 'es' ? <>Cerca ·<span className="block">Próximamente</span></> : <>Nearby ·<span className="block">Coming soon</span></>}
            </button>
          </div>
        </div>
      </div>
      {feedFilter === 'nearby' ? (
        <section
          aria-label={lang === 'es' ? 'Vista previa de comunidad cercana' : 'Nearby community preview'}
          className="my-5 overflow-hidden rounded-[2.25rem] bg-white/80 px-5 pb-6 pt-4 text-center shadow-[0_8px_30px_rgba(32,78,74,0.06)] backdrop-blur-xl animate-fade-in sm:px-7"
        >
          <div className="mx-auto max-w-[340px] rounded-[1.6rem] bg-gradient-to-b from-[#F4F5E9] via-[#F6F7EF] to-[#E8F1E8] px-1 pt-1">
            <NearbyNeighborhoodArtwork />
          </div>

          <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#628079]">
            {lang === 'es' ? 'Próximamente en PAZO' : 'Coming soon to PAZO'}
          </p>
          <h3 className="mx-auto mt-1.5 max-w-[285px] text-[clamp(19px,5.3vw,23px)] font-black leading-tight text-[#204E4A]">
            {lang === 'es' ? 'Un mundo de mascotas a tu alrededor' : 'A world of pets around you'}
          </h3>
          <p className="mx-auto mt-2 max-w-[280px] text-[13px] font-medium leading-relaxed text-[#5C7470]">
            {lang === 'es'
              ? 'Imagina descubrir publicaciones de mascotas y personas de tu comunidad cercana.'
              : 'Imagine discovering posts from pets and people in your nearby community.'}
          </p>
          <div className="mt-5">
            {hasVotedNearby ? (
              <div role="status" className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#E5EFE6] px-4 py-3 text-[13px] font-extrabold text-[#204E4A]">
                <span aria-hidden="true">✓</span>
                <span>{lang === 'es' ? '¡Gracias por ayudarnos a priorizar!' : 'Thanks for helping us prioritize!'}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleNearbyInterest}
                disabled={isSubmittingNearby || !canReport}
                className="inline-flex min-h-[46px] max-w-full items-center justify-center rounded-full bg-[#204E4A] px-5 py-3 text-center text-[13px] font-extrabold leading-snug text-[#E1E53F] shadow-[0_5px_15px_rgba(32,78,74,0.14)] transition-colors hover:bg-[#183d3a] focus-visible:bg-[#346C62] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {!canReport
                  ? (lang === 'es' ? 'Inicia sesión para expresar interés' : 'Sign in to express interest')
                  : isSubmittingNearby
                    ? (lang === 'es' ? 'Registrando...' : 'Saving...')
                    : (lang === 'es' ? 'Me interesa esta función' : 'I am interested')}
              </button>
            )}
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {lastHiddenPostId && (
            <div role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-white/75 px-4 py-2.5 text-[13px] font-semibold text-[#5C7470] backdrop-blur-sm">
              <span>{lang === 'es' ? 'Publicación oculta en este feed' : 'Post hidden from this feed'}</span>
              <button type="button" onClick={handleUndoHide} className="shrink-0 rounded-full px-2 py-1 font-extrabold text-[#204E4A] underline underline-offset-2">
                {lang === 'es' ? 'Deshacer' : 'Undo'}
              </button>
            </div>
          )}
          {displayedPosts.length === 0 && !lastHiddenPostId && (
            <div className="rounded-[2rem] pazo-glass-card p-7 text-center space-y-2 border border-[#204E4A]/10">
              <h3 className="text-base font-black text-[#204E4A]">
                {lang === 'es' ? 'Todavía no hay publicaciones' : 'No posts yet'}
              </h3>
              <p className="text-xs text-[#5C7470]">
                {lang === 'es'
                  ? 'Comparte un momento de tu mascota o explora las comunidades.'
                  : 'Share a moment with your pet or explore communities.'}
              </p>
            </div>
          )}
          {displayedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              supporterBadge={post.supporterBadge}
              canReport={canReport}
              onReport={(kind,id,label) => setReportTarget({kind,id,label})}
              onHidePost={handleHidePost}
              currentPetId={canReport ? currentPetId : ''}
              ownedPetIds={ownedPetIds}
              lang={lang}
              isCommentsOpen={activeCommentsPostId === post.id}
              newCommentText={newCommentText}
              onLikePost={onLikePost}
              onSavePost={onSavePost}
              onSelectPetProfile={onSelectPetProfile}
              onToggleComments={handleToggleComments}
              isCommentsLoading={loadingCommentsPostId === post.id}
              isSubmittingComment={isSubmittingComment}
              onCommentTextChange={setNewCommentText}
              onSendComment={handleSendComment}
            />
          ))}
        </div>
      )}
      {reportTarget && <ReportDialog key={reportTarget.kind + reportTarget.id} target={reportTarget} lang={lang} onClose={() => setReportTarget(null)} />}
    </div>
  )
}

interface PostCardProps {
  supporterBadge?: SupporterBadgeEvidence
  post: Post
  canReport: boolean
  onReport: (kind: 'feed_post' | 'feed_comment', id: string, label?: string) => void
  onHidePost: (postId: string) => void
  currentPetId: string
  ownedPetIds: string[]
  lang: 'es' | 'en'
  isCommentsOpen: boolean
  newCommentText: string
  onLikePost: (postId: string) => void
  onSavePost: (postId: string) => void
  onSelectPetProfile: (petId: string) => void
  onToggleComments: (postId: string) => void
  isCommentsLoading: boolean
  isSubmittingComment: boolean
  onCommentTextChange: (text: string) => void
  onSendComment: (postId: string) => void
}

const PostCard = ({ post, supporterBadge, canReport, onReport, onHidePost, currentPetId, ownedPetIds, lang, isCommentsOpen, newCommentText, onLikePost, onSavePost, onSelectPetProfile, onToggleComments, isCommentsLoading, isSubmittingComment, onCommentTextChange, onSendComment }: PostCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen || typeof document === 'undefined') return
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const displayTime = formatTimeAgo(post.createdAt, post.timeAgo, lang)
  const displayCommentsCount = post.commentsCount ?? post.comments.length
  const elementRef = usePostTracking(post.id, post.isAuthorDeleted ? '' : currentPetId)


  if (post.isAuthorDeleted) return (
    <article ref={elementRef as React.RefObject<HTMLElement>} className="rounded-[2.2rem] pazo-glass-card p-5 shadow-[0_4px_20px_rgba(32,78,74,0.05)]">
      <div className="flex items-center gap-3 text-[#204E4A]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF8F5]"><IconPaw size={18}/></div>
        <p className="text-sm font-extrabold">{lang === 'es' ? 'Autor eliminado' : 'Deleted author'}</p>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[#5C7470]">
        {lang === 'es'
          ? 'El autor eliminó su cuenta. Su contenido personal se retiró, pero se conservaron los comentarios de otras personas.'
          : 'The author deleted their account. Their personal content was removed, but other people’s comments were preserved.'}
      </p>
      <button type="button" onClick={() => onToggleComments(post.id)} disabled={isCommentsLoading}
        className="mt-3 rounded-full bg-[#FAF8F5] px-4 py-2 text-xs font-bold text-[#204E4A] disabled:opacity-40">
        {lang === 'es' ? 'Ver comentarios' : 'View comments'} ({displayCommentsCount})
      </button>
      {isCommentsOpen && <div className="mt-3 space-y-2">
        {post.comments.map(comment => <div key={comment.id} className="flex items-start gap-2 rounded-2xl bg-[#FAF8F5] p-3 text-xs">
          <div className="relative h-8 w-8 shrink-0">
            <img src={comment.authorAvatar} alt="" className="h-full w-full rounded-full object-cover"/>
            {supporterBadgesEnabled&&comment.supporterBadge?.badge&&(
              <span className="pointer-events-none absolute -bottom-1 -right-1 z-10">
                <SupporterBadge active milestone={comment.supporterBadge.milestone} lang={lang} size="mini"/>
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[#204E4A]">{comment.authorName}</p>
            <p className="mt-1 text-[#5C7470]">{comment.text}</p>
          </div>
        </div>)}
      </div>}
    </article>
  )

  return (
    <article ref={elementRef as React.RefObject<HTMLElement>} className="pazo-glass-card relative rounded-[2.2rem] shadow-[0_4px_20px_rgba(32,78,74,0.05)] transition-all">
      <div className="relative z-10 flex min-w-0 items-start gap-2 p-3.5 sm:p-4">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <div className="relative h-10 w-10 shrink-0">
            <button type="button" onClick={() => onSelectPetProfile(post.petId)} aria-label={lang === 'es' ? `Ver perfil de ${post.petName}` : `View ${post.petName}'s profile`} className={`h-10 w-10 overflow-hidden rounded-full shadow-xs ${post.isRecommended ? 'bg-gradient-to-tr from-[#E1E53F] to-[#204E4A] p-0.5' : ''}`}>
              <img src={post.petAvatar} alt="" className="h-full w-full rounded-full object-cover" />
            </button>
            {supporterBadgesEnabled && supporterBadge?.badge && (
              <span className="pointer-events-none absolute -bottom-1 -right-1 z-10 block h-[20px] w-[20px]" aria-label={lang === 'es' ? 'Insignia de Amigo de PAZO verificada' : 'Verified PAZO Friend badge'}>
                <SupporterBadge active milestone={supporterBadge.milestone} lang={lang} size="mini"/>
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
              <button type="button" onClick={() => onSelectPetProfile(post.petId)} className="max-w-full truncate text-left text-[16px] font-extrabold leading-tight text-[#204E4A] hover:underline">
                {post.petName}
              </button>
              {post.isRecommended ? (
                <span className="inline-flex max-w-full shrink-0 items-center gap-1 rounded-lg bg-[#E1E53F]/40 px-1.5 py-0.5 text-[10px] font-black uppercase text-[#204E4A]">
                  <IconPaw size={10} />
                  <span>{lang === 'es' ? 'Sugerencia' : 'Suggested'}</span>
                </span>
              ) : (
                <span className="max-w-full truncate rounded-full bg-[#FAF8F5] px-1.5 py-0.5 text-[11px] font-bold uppercase text-[#5C7470]">
                  {post.petSpecies}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[12px] text-[#5C7470]">{post.location ? <>{post.location} &bull; </> : null}{displayTime}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-1">
          {Boolean(currentPetId) && !ownedPetIds.includes(post.petId) && (
            <div className="shrink-0">
              <FollowButton
                currentPetId={currentPetId}
                targetPetId={post.petId}
                canFollow={true}
                lang={lang}
                variant="feed"
              />
            </div>
          )}
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              aria-label={lang === 'es' ? `Más opciones de ${post.petName}` : `More options for ${post.petName}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((previous) => !previous)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAF8F5]/90 text-[#204E4A] transition-colors hover:bg-[#E1E53F]/30"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <circle cx="5" cy="12" r="1.7" />
                <circle cx="12" cy="12" r="1.7" />
                <circle cx="19" cy="12" r="1.7" />
              </svg>
            </button>
            {menuOpen && (
              <div role="menu" aria-label={lang === 'es' ? 'Opciones de publicación' : 'Post options'} className="absolute right-0 top-full z-40 mt-1.5 w-[180px] rounded-2xl bg-white/95 p-1.5 shadow-[0_10px_30px_rgba(32,78,74,0.17)] backdrop-blur-xl">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onHidePost(post.id)
                  }}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-bold text-[#204E4A] hover:bg-[#FAF8F5]"
                >
                  {lang === 'es' ? 'Ocultar publicación' : 'Hide post'}
                </button>
                {canReport && !ownedPetIds.includes(post.petId) && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      onReport('feed_post', post.id, describeReportSubject('feed_post', post.petName, post.text, lang))
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-bold text-[#5C7470] hover:bg-[#FAF8F5]"
                  >
                    {lang === 'es' ? 'Denunciar' : 'Report'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {post.photoUrl && (
        <div className="w-full aspect-[4/3] bg-neutral-100 overflow-hidden relative">
          <img src={post.photoUrl} alt={post.text} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => onLikePost(post.id)}
              aria-pressed={post.isLiked}
              aria-label={lang === 'es' ? `Me gusta: ${post.likes}` : `Like: ${post.likes}`}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full pr-2 text-[13px] font-extrabold transition-colors ${post.isLiked ? 'text-[#D56554]' : 'text-[#204E4A]'}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${post.isLiked ? 'bg-[#FCE6E2]' : 'bg-[#EEF4E7] hover:bg-[#E2EDD8]'}`}>
                <IconPaw size={20}/>
              </span>
              <span>{post.likes}</span>
            </button>
            <button type="button" onClick={() => onToggleComments(post.id)} disabled={isCommentsLoading}
              aria-label={lang === 'es' ? `Comentarios: ${displayCommentsCount}` : `Comments: ${displayCommentsCount}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full pr-2 text-[13px] font-extrabold text-[#204E4A] transition-colors disabled:opacity-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF4E7] transition-colors hover:bg-[#E2EDD8]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.3 11.4a8.3 8.3 0 0 1-8.3 8.3c-1.4 0-2.7-.3-3.9-.9l-4.4 1.4 1.2-4.4A8.3 8.3 0 1 1 20.3 11.4Z"/>
                  <path d="M8.2 11.6h.1m3.6 0h.1m3.6 0h.1" strokeWidth="2.8"/>
                </svg>
              </span>
              <span>{isCommentsLoading ? '...' : displayCommentsCount}</span>
            </button>
          </div>
          <button type="button" onClick={() => onSavePost(post.id)}
            aria-pressed={post.isSaved}
            aria-label={post.isSaved ? (lang === 'es' ? 'Quitar de guardados' : 'Remove saved post') : (lang === 'es' ? 'Guardar publicación' : 'Save post')}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#204E4A] transition-colors hover:bg-[#E8EFD9] focus-visible:bg-[#E8EFD9]"
            title={post.isSaved ? 'Guardado' : 'Guardar publicación'}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF4E7]">
              <IconBookmark filled={post.isSaved} size={19} />
            </span>
          </button>
        </div>
        <p className="text-xs text-[#204E4A] leading-relaxed font-normal">
          <span onClick={() => onSelectPetProfile(post.petId)} className="font-extrabold mr-1.5 cursor-pointer hover:underline">{post.petName}:</span>
          {post.text}
          {DEMO_POST_MOTIFS[post.id] && (
            <span className="ml-1 inline-flex items-center gap-0.5 align-middle" aria-hidden="true">
              {DEMO_POST_MOTIFS[post.id].map((kind, index) => (
                <PazoMotifIcon key={`${kind}-${index}`} kind={kind} size={15} />
              ))}
            </span>
          )}
        </p>
        {displayCommentsCount > 0 && !isCommentsOpen && (
          <button onClick={() => onToggleComments(post.id)} disabled={isCommentsLoading} className="text-[14px] font-semibold text-[#5C7470] hover:text-[#204E4A] disabled:opacity-50 transition-colors cursor-pointer block pt-1">
            {lang === 'es' ? `Ver ${displayCommentsCount} comentario${displayCommentsCount > 1 ? 's' : ''}...` : `View all ${displayCommentsCount} comment${displayCommentsCount > 1 ? 's' : ''}...`}
          </button>
        )}
        {isCommentsOpen && (
          <div className="pt-3 space-y-2.5 animate-slide-up">
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {post.comments.map((comment) => (
                <div key={comment.id} className="text-xs flex gap-2 items-start">
                  <div className="relative mt-0.5 h-8 w-8 shrink-0">
                    <img src={comment.authorAvatar} alt={comment.authorPet} className="h-full w-full rounded-full object-cover"/>
                    {supporterBadgesEnabled && comment.supporterBadge?.badge && (
                      <span className="pointer-events-none absolute -bottom-1 -right-1 z-10" aria-label={lang==='es'?'Insignia verificada de Amigo de PAZO':'Verified PAZO Friend badge'}>
                        <SupporterBadge active milestone={comment.supporterBadge.milestone} lang={lang} size="mini"/>
                      </span>
                    )}
                  </div>
                  <div className="flex-1 bg-[#FAF8F5] p-2.5 rounded-2xl shadow-xs">
                    <span className="font-bold text-[#204E4A] mr-1.5">{comment.authorName} ({comment.authorPet}):</span>
                    <span className="text-[#5C7470]">{comment.text}
                      {DEMO_COMMENT_MOTIFS[comment.id] && (
                        <span className="ml-1 inline-flex items-center align-middle" aria-hidden="true">
                          {DEMO_COMMENT_MOTIFS[comment.id].map((kind, index) => (
                            <PazoMotifIcon key={`${kind}-${index}`} kind={kind} size={14} />
                          ))}
                        </span>
                      )}
                    </span>
                    <span className="block text-[12px] text-[#5C7470]/60 mt-0.5">{formatTimeAgo(comment.createdAt, comment.timeAgo, lang)}</span>
                    {canReport && (!comment.authorPetId || !ownedPetIds.includes(comment.authorPetId)) && <button type="button"
                      onClick={() => onReport('feed_comment', comment.id, describeReportSubject('feed_comment', comment.authorName, comment.text, lang))}
                      className="mt-1 text-[13px] font-bold text-[#5C7470] underline">{lang === 'es' ? 'Denunciar' : 'Report'}</button>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <input type="text" value={newCommentText} disabled={isSubmittingComment} onChange={(e) => onCommentTextChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !isSubmittingComment) onSendComment(post.id) }}
                placeholder={lang === 'es' ? 'Anadir un comentario...' : 'Add a comment...'}
                className="flex-1 text-xs bg-[#FAF8F5] disabled:opacity-60 rounded-full px-4 py-2.5 text-[#204E4A] shadow-xs focus:bg-white" />
              <button onClick={() => onSendComment(post.id)} disabled={!newCommentText.trim() || isSubmittingComment} className="bg-[#204E4A] hover:bg-[#183d3a] disabled:opacity-40 text-[#E1E53F] px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-colors shadow-xs">
                {isSubmittingComment ? (lang === 'es' ? 'Enviando...' : 'Sending...') : (lang === 'es' ? 'Enviar' : 'Send')}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
