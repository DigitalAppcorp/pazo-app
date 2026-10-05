import { useState, useEffect, useRef } from 'react'
import type { Post } from '../../types/pazo'
import { IconBookmark, IconPaw } from '../icons/PazoIcons'
import { supabase } from '../../services/supabaseClient'
import { FollowButton } from '../shared/FollowButton'

interface HomeViewProps {
  posts: Post[]
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
    if (diffInHours < 1) return lang === 'es' ? `Hace ${diffInMinutes} min` : ` mins ago`
    return lang === 'es' ? `Hace ${diffInHours} h` : ` h ago`
  }
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  if (postDate.getFullYear() !== now.getFullYear()) options.year = 'numeric'
  return postDate.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', options)
}

export const HomeView = ({
  posts, onLikePost, onSavePost, onAddComment, onLoadComments, lang, currentPetId = '', ownedPetIds, onSelectPetProfile,
}: HomeViewProps) => {
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
    try {
      await supabase.from('interactions').insert({ target_id: 'feature_nearby_tab', target_type: 'place', action_type: 'view' })
    } catch (err) { console.error('Error tracking nearby view:', err) }
  }

  const handleNearbyInterest = async () => {
    setIsSubmittingNearby(true)
    try {
      await supabase.from('interactions').insert({ target_id: 'feature_nearby_interested', target_type: 'place', action_type: 'join' })
      setHasVotedNearby(true)
    } catch (err) { console.error('Error tracking nearby interest:', err) }
    finally { setIsSubmittingNearby(false) }
  }

  const displayedPosts = posts.filter((post) => feedFilter === 'following' ? true : !post.isRecommended)

  return (
    <div className="space-y-4 animate-slide-up pb-6">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl font-black text-[#204E4A] tracking-tight">
            {lang === 'es' ? 'Su pequeno mundo.' : 'Their little world.'}
          </h2>
          <p className="text-[11px] text-[#5C7470]">
            {lang === 'es' ? 'Historias y momentos de tu comunidad' : 'Stories and moments from your community'}
          </p>
        </div>
        <div className="bg-[#FAF8F5] p-1 rounded-full flex gap-1 shadow-xs">
          <button onClick={() => setFeedFilter('following')} className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${feedFilter === 'following' ? 'bg-white text-[#204E4A] shadow-sm' : 'text-[#5C7470] hover:text-[#204E4A]'}`}>
            {lang === 'es' ? 'Siguiendo' : 'Following'}
          </button>
          <button onClick={handleSelectNearby} className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${feedFilter === 'nearby' ? 'bg-white text-[#204E4A] shadow-sm' : 'text-[#5C7470] hover:text-[#204E4A]'}`}>
            {lang === 'es' ? 'Cerca de mi' : 'Nearby'}
          </button>
        </div>
      </div>
      {feedFilter === 'nearby' ? (
        <div className="bg-white rounded-[2.2rem] p-8 text-center border border-[#204E4A]/10 shadow-[0_4px_20px_rgba(32,78,74,0.05)] my-6 space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-[#E1E53F]/30 text-[#204E4A] flex items-center justify-center mx-auto mb-2">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-black text-[#204E4A]">{lang === 'es' ? 'Comunidad en tu vecindario' : 'Neighborhood community'}</h3>
          <p className="text-xs text-[#5C7470] leading-relaxed max-w-[260px] mx-auto font-medium">
            {lang === 'es' ? 'Estamos trabajando fuertemente para construir el feed basado en geolocalizacion que te conecte al instante con mascotas y duenos cercanos.' : 'Estamos trabajando fuertemente para construir el feed basado en geolocalizacion que te conecte al instante con mascotas y duenos cercanos.'}
          </p>
          {hasVotedNearby ? (
            <div className="bg-[#204E4A] text-[#E1E53F] p-3.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2">
              <span>&#x2713; {lang === 'es' ? 'Gracias por ayudarnos a priorizar!' : 'Thanks for your support!'}</span>
            </div>
          ) : (
            <button onClick={handleNearbyInterest} disabled={isSubmittingNearby} className="bg-[#204E4A] hover:bg-[#183d3a] text-[#E1E53F] font-black px-6 py-3 rounded-full text-xs shadow-md transition-all cursor-pointer active:scale-95">
              {isSubmittingNearby ? 'Registrando...' : (lang === 'es' ? 'Me interesa esta funcion' : 'I am interested')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentPetId={currentPetId}
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
    </div>
  )
}

interface PostCardProps {
  post: Post
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

const PostCard = ({ post, currentPetId, ownedPetIds, lang, isCommentsOpen, newCommentText, onLikePost, onSavePost, onSelectPetProfile, onToggleComments, isCommentsLoading, isSubmittingComment, onCommentTextChange, onSendComment }: PostCardProps) => {
  const displayTime = formatTimeAgo(post.createdAt, post.timeAgo, lang)
  const displayCommentsCount = post.commentsCount ?? post.comments.length
  const elementRef = usePostTracking(post.id, currentPetId)

  return (
    <article ref={elementRef as React.RefObject<HTMLElement>} className="bg-white rounded-[2.2rem] shadow-[0_4px_20px_rgba(32,78,74,0.05)] overflow-hidden transition-all">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div onClick={() => onSelectPetProfile(post.petId)} className={`w-10 h-10 rounded-full overflow-hidden shadow-xs shrink-0 cursor-pointer ${post.isRecommended ? 'p-0.5 bg-gradient-to-tr from-[#E1E53F] to-[#204E4A]' : ''}`}>
            <img src={post.petAvatar} alt={post.petName} className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 onClick={() => onSelectPetProfile(post.petId)} className="font-extrabold text-sm text-[#204E4A] leading-tight flex items-center gap-1.5 cursor-pointer hover:underline">
              <span>{post.petName}</span>
              {post.isRecommended ? (
                <span className="text-[9px] uppercase font-black px-2 py-0.5 bg-[#E1E53F]/40 text-[#204E4A] rounded-md flex items-center gap-1 shadow-xs">
                  <span className="w-2.5 h-2.5 flex items-center justify-center"><IconPaw size={10} /></span>
                  <span>{lang === 'es' ? 'Sugerencia' : 'Suggested'}</span>
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-[#FAF8F5] text-[#5C7470] rounded-full shadow-xs">{post.petSpecies}</span>
              )}
            </h3>
            <p className="text-[11px] text-[#5C7470]">{post.location} &bull; {displayTime}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FollowButton
            currentPetId={currentPetId}
            targetPetId={post.petId}
            canFollow={!ownedPetIds.includes(post.petId)}
            lang={lang}
          />
          <button className="text-[#5C7470] hover:text-[#204E4A] p-1.5 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer text-xs font-bold" title="Opciones">&bull;&bull;&bull;</button>
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
        </p>
        {displayCommentsCount > 0 && !isCommentsOpen && (
          <button onClick={() => onToggleComments(post.id)} disabled={isCommentsLoading} className="text-[11px] font-semibold text-[#5C7470] hover:text-[#204E4A] disabled:opacity-50 transition-colors cursor-pointer block pt-1">
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
                    <span className="text-[#5C7470]">{comment.text}</span>
                    <span className="block text-[9px] text-[#5C7470]/60 mt-0.5">{formatTimeAgo(comment.createdAt, comment.timeAgo, lang)}</span>
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