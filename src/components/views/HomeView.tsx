import { useState } from 'react'
import type { Post } from '../../types/pazo'
import { IconBookmark } from '../icons/PazoIcons'

interface HomeViewProps {
  posts: Post[]
  onLikePost: (postId: string) => void
  onSavePost: (postId: string) => void
  onAddComment: (postId: string, text: string) => void
  lang: 'es' | 'en'
}

const formatTimeAgo = (createdAt: string | undefined, fallback: string, lang: 'es' | 'en') => {
  if (!createdAt) return fallback

  const postDate = new Date(createdAt)
  const now = new Date()
  const diffInMs = now.getTime() - postDate.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))

  if (diffInMinutes < 5) {
    return lang === 'es' ? 'Hace un momento' : 'Just now'
  }
  if (diffInHours < 24) {
    if (diffInHours < 1) {
      return lang === 'es' ? `Hace ${diffInMinutes} min` : `${diffInMinutes} mins ago`
    }
    return lang === 'es' ? `Hace ${diffInHours} h` : `${diffInHours} h ago`
  }

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  if (postDate.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric'
  }
  return postDate.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', options)
}

export const HomeView = ({
  posts,
  onLikePost,
  onSavePost,
  onAddComment,
  lang,
}: HomeViewProps) => {
  const [feedFilter, setFeedFilter] = useState<'following' | 'nearby'>('following')
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState('')

  const handleSendComment = (postId: string) => {
    if (!newCommentText.trim()) return
    onAddComment(postId, newCommentText.trim())
    setNewCommentText('')
  }

  const displayedPosts = posts.filter((post) =>
    feedFilter === 'following' ? true : !post.isRecommended
  )

  return (
    <div className="space-y-4 animate-slide-up pb-6">
      {/* Subtítulo y selector de feed */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl font-black text-[#204E4A] tracking-tight">
            {lang === 'es' ? 'Su pequeño mundo.' : 'Their little world.'}
          </h2>
          <p className="text-[11px] text-[#5C7470]">
            {lang === 'es' ? 'Historias y momentos de tu comunidad' : 'Stories and moments from your community'}
          </p>
        </div>

        {/* Tabs: Siguiendo / Cerca de mí */}
        <div className="bg-[#FAF8F5] p-1 rounded-full flex gap-1 shadow-xs">
          <button
            onClick={() => setFeedFilter('following')}
            className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${feedFilter === 'following'
                ? 'bg-white text-[#204E4A] shadow-sm'
                : 'text-[#5C7470] hover:text-[#204E4A]'
              }`}
          >
            {lang === 'es' ? 'Siguiendo' : 'Following'}
          </button>
          <button
            onClick={() => setFeedFilter('nearby')}
            className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${feedFilter === 'nearby'
                ? 'bg-white text-[#204E4A] shadow-sm'
                : 'text-[#5C7470] hover:text-[#204E4A]'
              }`}
          >
            {lang === 'es' ? 'Cerca de mí' : 'Nearby'}
          </button>
        </div>
      </div>

      {/* Lista de Publicaciones */}
      <div className="space-y-4">
        {displayedPosts.map((post) => {
          const isCommentsOpen = activeCommentsPostId === post.id
          const displayTime = formatTimeAgo(post.createdAt, post.timeAgo, lang)

          return (
            <article
              key={post.id}
              className="bg-white rounded-[2.2rem] shadow-[0_4px_20px_rgba(32,78,74,0.05)] overflow-hidden transition-all"
            >
              {/* Encabezado del post */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full overflow-hidden shadow-xs shrink-0 ${post.isRecommended && feedFilter === 'following' ? 'p-0.5 bg-gradient-to-tr from-[#E1E53F] to-[#204E4A]' : ''}`}>
                    <img
                      src={post.petAvatar}
                      alt={post.petName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#204E4A] leading-tight flex items-center gap-1.5">
                      <span>{post.petName}</span>
                      {post.isRecommended && feedFilter === 'following' ? (
                        <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-[#E1E53F]/20 text-[#204E4A] rounded-md">
                          {lang === 'es' ? 'Sugerencia' : 'Suggested'}
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-[#FAF8F5] text-[#5C7470] rounded-full shadow-xs">
                          {post.petSpecies}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-[#5C7470]">
                      {post.location} • {displayTime}
                    </p>
                  </div>
                </div>

                <button
                  className="text-[#5C7470] hover:text-[#204E4A] p-1.5 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer text-xs font-bold"
                  title="Opciones"
                >
                  •••
                </button>
              </div>

              {/* Fotografía del post */}
              <div className="w-full aspect-[4/3] bg-neutral-100 overflow-hidden relative">
                <img
                  src={post.photoUrl}
                  alt={post.text}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Acciones de interacción */}
              <div className="p-4 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Botón Me Gusta */}
                    <button
                      onClick={() => onLikePost(post.id)}
                      className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${post.isLiked ? 'text-[#EC7357]' : 'text-[#5C7470] hover:text-[#204E4A]'
                        }`}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 11.5c-2.4 0-4.2 1.6-4.2 3.8 0 2.2 1.8 3.7 4.2 3.7s4.2-1.5 4.2-3.7c0-2.2-1.8-3.8-4.2-3.8z" />
                        <circle cx="7.5" cy="8.5" r="2" />
                        <circle cx="10.5" cy="6" r="1.8" />
                        <circle cx="13.5" cy="6" r="1.8" />
                        <circle cx="16.5" cy="8.5" r="2" />
                      </svg>
                      <span>{post.likes}</span>
                    </button>

                    {/* Botón Comentarios */}
                    <button
                      onClick={() => setActiveCommentsPostId(isCommentsOpen ? null : post.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#5C7470] hover:text-[#204E4A] transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 9c0-1.7 1.3-3 3-3 1.1 0 2 .6 2.5 1.5C9.5 8.2 8.5 9.8 8.5 12v1C6.5 13 5 11.3 5 9z" />
                        <path d="M19 9c0-1.7-1.3-3-3-3-1.1 0-2 .6-2.5 1.5 1 0.7 2 2.3 2 4.5v1c2 0 3.5-1.7 3.5-3.5z" />
                        <path d="M8 10c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5v3c0 3-1.8 5.5-4 5.5s-4-2.5-4-5.5v-3z" />
                        <circle cx="12" cy="13" r="1.8" fill="white" />
                        <circle cx="12" cy="12.2" r="0.6" fill="currentColor" />
                        <path d="M21 10l2-.5m-.5 3l2 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      </svg>
                      <span>{post.comments.length}</span>
                    </button>
                  </div>

                  {/* Guardar post */}
                  <button
                    onClick={() => onSavePost(post.id)}
                    className="text-[#5C7470] hover:text-[#204E4A] transition-colors cursor-pointer"
                    title={post.isSaved ? 'Guardado' : 'Guardar publicación'}
                  >
                    <IconBookmark filled={post.isSaved} size={18} />
                  </button>
                </div>

                {/* Texto del post */}
                <p className="text-xs text-[#204E4A] leading-relaxed font-normal">
                  <span className="font-extrabold mr-1.5">{post.petName}:</span>
                  {post.text}
                </p>

                {/* Botón expandir comentarios */}
                {post.comments.length > 0 && !isCommentsOpen && (
                  <button
                    onClick={() => setActiveCommentsPostId(post.id)}
                    className="text-[11px] font-semibold text-[#5C7470] hover:text-[#204E4A] transition-colors cursor-pointer block pt-1"
                  >
                    {lang === 'es'
                      ? `Ver ${post.comments.length} comentario${post.comments.length > 1 ? 's' : ''}...`
                      : `View all ${post.comments.length} comment${post.comments.length > 1 ? 's' : ''}...`}
                  </button>
                )}

                {/* Sección interactiva de comentarios */}
                {isCommentsOpen && (
                  <div className="pt-3 space-y-2.5 animate-slide-up">
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="text-xs flex gap-2 items-start">
                          <img
                            src={comment.authorAvatar}
                            alt={comment.authorPet}
                            className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                          />
                          <div className="flex-1 bg-[#FAF8F5] p-2.5 rounded-2xl shadow-xs">
                            <span className="font-bold text-[#204E4A] mr-1.5">
                              {comment.authorName} ({comment.authorPet}):
                            </span>
                            <span className="text-[#5C7470]">{comment.text}</span>
                            <span className="block text-[9px] text-[#5C7470]/60 mt-0.5">
                              {comment.timeAgo}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Input para agregar comentario */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendComment(post.id)
                        }}
                        placeholder={
                          lang === 'es' ? 'Añadir un comentario...' : 'Add a comment...'
                        }
                        className="flex-1 text-xs bg-[#FAF8F5] rounded-full px-4 py-2.5 text-[#204E4A] shadow-xs focus:bg-white"
                      />
                      <button
                        onClick={() => handleSendComment(post.id)}
                        disabled={!newCommentText.trim()}
                        className="bg-[#204E4A] hover:bg-[#183d3a] disabled:opacity-40 text-[#E1E53F] px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-colors shadow-xs"
                      >
                        {lang === 'es' ? 'Enviar' : 'Send'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}