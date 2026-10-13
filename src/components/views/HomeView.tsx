import { useState, useEffect, useRef } from 'react'
import type { Post } from '../../types/pazo'
import { IconBookmark, IconPaw } from '../icons/PazoIcons'
import { PazoMotifIcon } from '../icons/PazoMotifIcons'
import { DEMO_POST_MOTIFS, DEMO_COMMENT_MOTIFS } from '../../data/mockData'
import { supabase } from '../../services/supabaseClient'
import { FollowButton } from '../shared/FollowButton'
import { ReportDialog } from '../../features/moderation/ReportDialog'
import type { ReportTarget } from '../../features/moderation/reportingService'
import { describeReportSubject } from '../../features/moderation/reportSubject'

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
        <div className="pazo-glass-card rounded-[2.2rem] p-8 text-center border border-[#204E4A]/10 shadow-[0_4px_20px_rgba(32,78,74,0.05)] my-6 space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-[#E1E53F]/30 text-[#204E4A] flex items-center justify-center mx-auto mb-2">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-black text-[#204E4A]">{lang === 'es' ? 'Comunidad en tu vecindario' : 'Neighborhood community'}</h3>
          <p className="text-xs text-[#5C7470] leading-relaxed max-w-[260px] mx-auto font-medium">
            {lang === 'es' ? 'Estamos trabajando fuertemente para construir el feed basado en geolocalizacion que te conecte al instante con mascotas y duenos cercanos.' : 'We are working on a location-based feed to connect you with nearby pets and their people.'}
          </p>
          {hasVotedNearby ? (
            <div className="bg-[#204E4A] text-[#E1E53F] p-3.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2">
              <span>&#x2713; {lang === 'es' ? 'Gracias por ayudarnos a priorizar!' : 'Thanks for your support!'}</span>
            </div>
          ) : (
            <button onClick={handleNearbyInterest} disabled={isSubmittingNearby || !canReport} className="bg-[#204E4A] hover:bg-[#183d3a] text-[#E1E53F] font-black px-6 py-3 rounded-full text-xs shadow-md transition-all cursor-pointer active:scale-95">
              {!canReport ? (lang === 'es' ? 'Inicia sesión para expresar interés' : 'Sign in to express interest') : isSubmittingNearby ? (lang === 'es' ? 'Registrando...' : 'Saving...') : (lang === 'es' ? 'Me interesa esta funcion' : 'I am interested')}
            </button>
          )}
        </div>
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

const PostCard = ({ post, canReport, onReport, onHidePost, currentPetId, ownedPetIds, lang, isCommentsOpen, newCommentText, onLikePost, onSavePost, onSelectPetProfile, onToggleComments, isCommentsLoading, isSubmittingComment, onCommentTextChange, onSendComment }: PostCardProps) => {
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
        {post.comments.map(comment => <div key={comment.id} className="rounded-2xl bg-[#FAF8F5] p-3 text-xs">
          <p className="font-bold text-[#204E4A]">{comment.authorName}</p>
          <p className="mt-1 text-[#5C7470]">{comment.text}</p>
        </div>)}
      </div>}
    </article>
  )

  return (
    <article ref={elementRef as React.RefObject<HTMLElement>} className="pazo-glass-card relative rounded-[2.2rem] shadow-[0_4px_20px_rgba(32,78,74,0.05)] transition-all">
      <div className="relative z-10 flex min-w-0 items-start gap-2 p-3.5 sm:p-4">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <button type="button" onClick={() => onSelectPetProfile(post.petId)} aria-label={lang === 'es' ? `Ver perfil de ${post.petName}` : `View ${post.petName}'s profile`} className={`h-10 w-10 shrink-0 overflow-hidden rounded-full shadow-xs ${post.isRecommended ? 'bg-gradient-to-tr from-[#E1E53F] to-[#204E4A] p-0.5' : ''}`}>
            <img src={post.petAvatar} alt="" className="h-full w-full rounded-full object-cover" />
          </button>
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
            <p className="mt-0.5 truncate text-[12px] text-[#5C7470]">{post.location} &bull; {displayTime}</p>
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
            <button onClick={() => onLikePost(post.id)} className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${post.isLiked ? 'text-[#EC7357]' : 'text-[#5C7470] hover:text-[#204E4A]'}`}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 11.5c-2.4 0-4.2 1.6-4.2 3.8 0 2.2 1.8 3.7 4.2 3.7s4.2-1.5 4.2-3.7c0-2.2-1.8-3.8-4.2-3.8z" />
                <circle cx="7.5" cy="8.5" r="2" /><circle cx="10.5" cy="6" r="1.8" /><circle cx="13.5" cy="6" r="1.8" /><circle cx="16.5" cy="8.5" r="2" />
              </svg>
              <span>{post.likes}</span>
            </button>
            <button onClick={() => onToggleComments(post.id)} disabled={isCommentsLoading} className="flex items-center gap-1.5 text-xs font-bold text-[#5C7470] hover:text-[#204E4A] disabled:opacity-50 transition-colors cursor-pointer">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 9c0-1.7 1.3-3 3-3 1.1 0 2 .6 2.5 1.5C9.5 8.2 8.5 9.8 8.5 12v1C6.5 13 5 11.3 5 9z" />
                <path d="M19 9c0-1.7-1.3-3-3-3-1.1 0-2 .6-2.5 1.5 1 0.7 2 2.3 2 4.5v1c2 0 3.5-1.7 3.5-3.5z" />
                <path d="M8 10c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5v3c0 3-1.8 5.5-4 5.5s-4-2.5-4-5.5v-3z" />
                <circle cx="12" cy="13" r="1.8" fill="white" /><circle cx="12" cy="12.2" r="0.6" fill="currentColor" />
                <path d="M21 10l2-.5m-.5 3l2 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </svg>
              <span>{isCommentsLoading ? '...' : displayCommentsCount}</span>
            </button>
          </div>
          <button onClick={() => onSavePost(post.id)} className="text-[#5C7470] hover:text-[#204E4A] transition-colors cursor-pointer" title={post.isSaved ? 'Guardado' : 'Guardar publicacion'}>
            <IconBookmark filled={post.isSaved} size={18} />
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
                  <img src={comment.authorAvatar} alt={comment.authorPet} className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
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
