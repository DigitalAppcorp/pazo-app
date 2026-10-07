import { useCallback, useEffect, useState } from 'react'
import type {
  CommunityMember,
  CommunityPost,
  CommunityPostComment,
  CommunitySummary,
  Pet,
  Species,
} from '../../types/pazo'
import {
  addCommunityPostComment,
  createCommunityPost,
  deleteCommunityPost,
  deleteCommunityPostComment,
  fetchCommunityById,
  fetchCommunityMembers,
  fetchCommunityPostComments,
  fetchCommunityPosts,
  joinCommunity,
  leaveCommunity,
  removeCommunityMember,
  replaceCommunityImage,
  toggleCommunityPostLike,
  updateCommunity,
} from '../../services/communityService'
import {
  IconCamera,
  IconChat,
  IconClose,
  IconHeart,
  IconPaw,
  IconShield,
} from '../icons/PazoIcons'

interface CommunityDetailViewProps {
  communityId: string
  currentPet: Pet | null
  onBack: () => void
  onCommunityChanged?: () => void
  lang: 'es' | 'en'
}

type DetailTab = 'posts' | 'info' | 'members'

const formatDate = (value: string, lang: 'es' | 'en') =>
  new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))

export const CommunityDetailView = ({
  communityId,
  currentPet,
  onBack,
  onCommunityChanged,
  lang,
}: CommunityDetailViewProps) => {
  const [community, setCommunity] = useState<CommunitySummary | null>(null)
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [activeTab, setActiveTab] = useState<DetailTab>('posts')
  const [isLoading, setIsLoading] = useState(true)
  const [isMembershipBusy, setIsMembershipBusy] = useState(false)

  const [postText, setPostText] = useState('')
  const [postImage, setPostImage] = useState<File | null>(null)
  const [postPreview, setPostPreview] = useState('')
  const [isPosting, setIsPosting] = useState(false)

  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, CommunityPostComment[]>
  >({})
  const [commentDraft, setCommentDraft] = useState('')
  const [isCommentBusy, setIsCommentBusy] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSpecies, setEditSpecies] = useState<Species | ''>('')
  const [editZone, setEditZone] = useState('')
  const [editRules, setEditRules] = useState('')
  const [editImage, setEditImage] = useState<File | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const loadCommunity = useCallback(async () => {
    setIsLoading(true)
    try {
      const [nextCommunity, nextMembers, nextPosts] = await Promise.all([
        fetchCommunityById(communityId),
        fetchCommunityMembers(communityId),
        fetchCommunityPosts(communityId, currentPet?.id),
      ])

      setCommunity(nextCommunity)
      setMembers(nextMembers)
      setPosts(nextPosts)
    } catch (error) {
      console.error('Error loading community:', error)
    } finally {
      setIsLoading(false)
    }
  }, [communityId, currentPet?.id])

  useEffect(() => {
    void loadCommunity()
  }, [loadCommunity])

  useEffect(() => {
    return () => {
      if (postPreview.startsWith('blob:')) URL.revokeObjectURL(postPreview)
    }
  }, [postPreview])

  const refreshPosts = async () => {
    const nextPosts = await fetchCommunityPosts(communityId, currentPet?.id)
    setPosts(nextPosts)
  }

  const handleMembership = async () => {
    if (!community || !currentPet?.id || isMembershipBusy) return

    setIsMembershipBusy(true)
    try {
      if (community.isJoined) {
        if (community.role === 'owner') return
        await leaveCommunity(community.id)
      } else {
        await joinCommunity(community.id, currentPet.id)
      }

      await loadCommunity()
      onCommunityChanged?.()
    } catch (error: any) {
      console.error('Error updating membership:', error)
      alert(
        lang === 'es'
          ? `No se pudo actualizar la membresía: ${error?.message || 'error inesperado'}`
          : `Could not update membership: ${error?.message || 'unexpected error'}`
      )
    } finally {
      setIsMembershipBusy(false)
    }
  }

  const handlePostImage = (file?: File) => {
    if (!file) return
    if (postPreview.startsWith('blob:')) URL.revokeObjectURL(postPreview)
    setPostImage(file)
    setPostPreview(URL.createObjectURL(file))
  }

  const handleCreatePost = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!community?.isJoined || !currentPet?.id || isPosting) return
    if (!postText.trim() && !postImage) return

    setIsPosting(true)
    try {
      await createCommunityPost({
        communityId,
        authorPetId: currentPet.id,
        body: postText,
        imageFile: postImage,
      })

      if (postPreview.startsWith('blob:')) URL.revokeObjectURL(postPreview)
      setPostText('')
      setPostImage(null)
      setPostPreview('')
      await refreshPosts()
      onCommunityChanged?.()
    } catch (error: any) {
      console.error('Error creating Community post:', error)
      alert(
        lang === 'es'
          ? `No se pudo publicar: ${error?.message || 'error inesperado'}`
          : `Could not publish: ${error?.message || 'unexpected error'}`
      )
    } finally {
      setIsPosting(false)
    }
  }

  const handleLike = async (post: CommunityPost) => {
    if (!community?.isJoined || !currentPet?.id) return

    const nextLiked = !post.isLiked
    const nextCount = Math.max(
      0,
      post.likesCount + (nextLiked ? 1 : -1)
    )

    setPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? { ...item, isLiked: nextLiked, likesCount: nextCount }
          : item
      )
    )

    try {
      await toggleCommunityPostLike({
        postId: post.id,
        actorPetId: currentPet.id,
        isLiked: post.isLiked,
      })
    } catch (error) {
      console.error('Error toggling Community like:', error)
      setPosts((current) =>
        current.map((item) => (item.id === post.id ? post : item))
      )
    }
  }

  const loadComments = async (postId: string) => {
    try {
      const comments = await fetchCommunityPostComments(postId)
      setCommentsByPost((current) => ({ ...current, [postId]: comments }))
    } catch (error) {
      console.error('Error loading Community comments:', error)
    }
  }

  const toggleComments = async (postId: string) => {
    if (openCommentsFor === postId) {
      setOpenCommentsFor(null)
      setCommentDraft('')
      return
    }

    setOpenCommentsFor(postId)
    setCommentDraft('')
    await loadComments(postId)
  }

  const handleAddComment = async (postId: string) => {
    if (!community?.isJoined || !currentPet?.id || !commentDraft.trim()) return

    setIsCommentBusy(true)
    try {
      await addCommunityPostComment({
        postId,
        authorPetId: currentPet.id,
        body: commentDraft,
      })
      setCommentDraft('')
      await Promise.all([loadComments(postId), refreshPosts()])
    } catch (error: any) {
      console.error('Error adding Community comment:', error)
      alert(
        lang === 'es'
          ? `No se pudo comentar: ${error?.message || 'error inesperado'}`
          : `Could not comment: ${error?.message || 'unexpected error'}`
      )
    } finally {
      setIsCommentBusy(false)
    }
  }

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm(lang === 'es' ? '¿Eliminar este comentario?' : 'Delete this comment?')) {
      return
    }

    try {
      await deleteCommunityPostComment(commentId)
      await Promise.all([loadComments(postId), refreshPosts()])
    } catch (error) {
      console.error('Error deleting Community comment:', error)
    }
  }

  const handleDeletePost = async (post: CommunityPost) => {
    if (!window.confirm(lang === 'es' ? '¿Eliminar esta publicación?' : 'Delete this post?')) {
      return
    }

    try {
      await deleteCommunityPost(post)
      await refreshPosts()
      onCommunityChanged?.()
    } catch (error: any) {
      console.error('Error deleting Community post:', error)
      alert(
        lang === 'es'
          ? `No se pudo eliminar: ${error?.message || 'error inesperado'}`
          : `Could not delete: ${error?.message || 'unexpected error'}`
      )
    }
  }

  const handleRemoveMember = async (member: CommunityMember) => {
    if (
      member.role === 'owner' ||
      !window.confirm(
        lang === 'es'
          ? `¿Retirar a ${member.pet?.name || 'este miembro'} de la comunidad?`
          : `Remove ${member.pet?.name || 'this member'} from the community?`
      )
    ) {
      return
    }

    try {
      await removeCommunityMember(communityId, member.userId)
      await loadCommunity()
      onCommunityChanged?.()
    } catch (error) {
      console.error('Error removing Community member:', error)
    }
  }

  const beginEdit = () => {
    if (!community) return
    setEditName(community.name)
    setEditDescription(community.description)
    setEditCategory(community.category)
    setEditSpecies(community.species || '')
    setEditZone(community.zone || '')
    setEditRules(community.rules || '')
    setEditImage(null)
    setIsEditing(true)
  }

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!community || isSavingEdit) return

    setIsSavingEdit(true)
    try {
      await updateCommunity(community.id, {
        name: editName,
        description: editDescription,
        category: editCategory,
        species: editSpecies || null,
        zone: editZone,
        rules: editRules,
      })

      if (editImage) {
        await replaceCommunityImage(community, editImage)
      }

      setIsEditing(false)
      await loadCommunity()
      onCommunityChanged?.()
    } catch (error: any) {
      console.error('Error updating Community:', error)
      alert(
        lang === 'es'
          ? `No se pudo actualizar: ${error?.message || 'error inesperado'}`
          : `Could not update: ${error?.message || 'unexpected error'}`
      )
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleArchive = async () => {
    if (
      !community ||
      !window.confirm(
        lang === 'es'
          ? '¿Archivar esta comunidad? Dejará de aceptar miembros y actividad nueva.'
          : 'Archive this community? It will stop accepting new members and activity.'
      )
    ) {
      return
    }

    try {
      await updateCommunity(community.id, { status: 'archived' })
      await loadCommunity()
      onCommunityChanged?.()
    } catch (error) {
      console.error('Error archiving Community:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#204E4A]/20 border-t-[#204E4A]" />
      </div>
    )
  }

  if (!community) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-xs font-bold text-[#204E4A]">
          {lang === 'es' ? 'Volver' : 'Back'}
        </button>
        <div className="rounded-[2rem] bg-white p-5 text-xs text-[#5C7470] shadow-sm">
          {lang === 'es' ? 'No se pudo cargar la comunidad.' : 'Could not load the community.'}
        </div>
      </div>
    )
  }

  const isOwner = community.role === 'owner'
  const canParticipate = community.isJoined && community.status === 'active'

  return (
    <div className="space-y-4 animate-slide-up pb-8">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#204E4A] shadow-xs"
      >
        {lang === 'es' ? 'Volver a Explorar' : 'Back to Explore'}
      </button>

      <section className="overflow-hidden rounded-[2.4rem] bg-white shadow-sm">
        <div className="relative h-44 bg-[#DDE7E4]">
          <img
            src={community.imageUrl}
            alt={community.name}
            className="h-full w-full object-cover"
          />
          {community.status === 'archived' && (
            <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#204E4A]">
              {lang === 'es' ? 'Archivada' : 'Archived'}
            </span>
          )}
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-[#204E4A]">
                  {community.name}
                </h2>
                {isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E1E53F] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#204E4A]">
                    <IconShield size={12} />
                    Admin
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-[#5C7470]">
                {community.membersCount} {lang === 'es' ? 'miembros' : 'members'}
                {community.zone ? ` · ${community.zone}` : ''}
              </p>
            </div>

            {community.status === 'active' && (
              <button
                type="button"
                onClick={() => void handleMembership()}
                disabled={isMembershipBusy || !currentPet}
                className={
                  'shrink-0 rounded-full px-4 py-2 text-xs font-extrabold shadow-xs disabled:opacity-50 ' +
                  (community.isJoined
                    ? 'bg-[#FAF8F5] text-[#204E4A]'
                    : 'bg-[#E1E53F] text-[#204E4A]')
                }
              >
                {isMembershipBusy
                  ? '...'
                  : isOwner
                    ? lang === 'es'
                      ? 'Administrador'
                      : 'Admin'
                    : community.isJoined
                      ? lang === 'es'
                        ? 'Salir'
                        : 'Leave'
                      : lang === 'es'
                        ? 'Unirme'
                        : 'Join'}
              </button>
            )}
          </div>

          <p className="text-xs leading-relaxed text-[#5C7470]">
            {community.description}
          </p>

          <div className="flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-wide text-[#5C7470]">
            <span className="rounded-full bg-[#FAF8F5] px-2.5 py-1">
              {community.category}
            </span>
            {community.species && (
              <span className="rounded-full bg-[#FAF8F5] px-2.5 py-1">
                {community.species}
              </span>
            )}
          </div>
        </div>
      </section>

      <nav className="flex gap-2">
        {([
          ['posts', lang === 'es' ? 'Publicaciones' : 'Posts'],
          ['info', lang === 'es' ? 'Información' : 'Info'],
          ['members', lang === 'es' ? 'Miembros' : 'Members'],
        ] as Array<[DetailTab, string]>).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={
              'rounded-full px-4 py-2 text-xs font-bold shadow-xs ' +
              (activeTab === key
                ? 'bg-[#204E4A] text-[#E1E53F]'
                : 'bg-white text-[#5C7470]')
            }
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'posts' && (
        <div className="space-y-4">
          {canParticipate && currentPet && (
            <form
              onSubmit={handleCreatePost}
              className="space-y-3 rounded-[2rem] bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <img
                  src={currentPet.photoUrl}
                  alt={currentPet.name}
                  className="h-10 w-10 rounded-2xl object-cover"
                />
                <div>
                  <p className="text-xs font-black text-[#204E4A]">
                    {lang === 'es'
                      ? `Publicar como ${currentPet.name}`
                      : `Post as ${currentPet.name}`}
                  </p>
                  <p className="text-[10px] text-[#5C7470]">
                    {lang === 'es'
                      ? 'Visible dentro de esta comunidad'
                      : 'Visible inside this community'}
                  </p>
                </div>
              </div>

              <textarea
                value={postText}
                onChange={(event) => setPostText(event.target.value)}
                rows={3}
                maxLength={4000}
                className="w-full rounded-2xl bg-[#FAF8F5] p-3 text-xs text-[#204E4A] outline-none"
                placeholder={
                  lang === 'es'
                    ? 'Comparte algo con la comunidad...'
                    : 'Share something with the community...'
                }
              />

              {postPreview && (
                <div className="relative overflow-hidden rounded-2xl">
                  <img
                    src={postPreview}
                    alt=""
                    className="max-h-72 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (postPreview.startsWith('blob:')) {
                        URL.revokeObjectURL(postPreview)
                      }
                      setPostPreview('')
                      setPostImage(null)
                    }}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#204E4A]"
                  >
                    <IconClose size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-full bg-[#FAF8F5] px-3 py-2 text-[10px] font-bold text-[#204E4A]">
                  <IconCamera size={15} />
                  {lang === 'es' ? 'Foto' : 'Photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => handlePostImage(event.target.files?.[0])}
                    className="hidden"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isPosting || (!postText.trim() && !postImage)}
                  className="rounded-full bg-[#E1E53F] px-5 py-2.5 text-[11px] font-black text-[#204E4A] disabled:opacity-50"
                >
                  {isPosting
                    ? lang === 'es'
                      ? 'Publicando...'
                      : 'Publishing...'
                    : lang === 'es'
                      ? 'Publicar'
                      : 'Post'}
                </button>
              </div>
            </form>
          )}

          {!community.isJoined && community.status === 'active' && (
            <div className="rounded-[2rem] bg-white p-4 text-center shadow-sm">
              <p className="text-xs font-bold text-[#204E4A]">
                {lang === 'es'
                  ? 'Puedes leer la comunidad sin unirte.'
                  : 'You can read the community without joining.'}
              </p>
              <p className="mt-1 text-[10px] text-[#5C7470]">
                {lang === 'es'
                  ? 'Únete para publicar, comentar y dar Me gusta.'
                  : 'Join to post, comment, and like.'}
              </p>
            </div>
          )}

          {posts.length === 0 ? (
            <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
              <IconPaw size={24} className="mx-auto text-[#204E4A]/50" />
              <p className="mt-2 text-xs font-black text-[#204E4A]">
                {lang === 'es'
                  ? 'Todavía no hay publicaciones'
                  : 'No posts yet'}
              </p>
              <p className="mt-1 text-[10px] text-[#5C7470]">
                {canParticipate
                  ? lang === 'es'
                    ? 'Puedes ser el primero en compartir algo.'
                    : 'You can be the first to share something.'
                  : lang === 'es'
                    ? 'La actividad aparecerá aquí.'
                    : 'Activity will appear here.'}
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <article
                key={post.id}
                className="space-y-3 rounded-[2rem] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.authorAvatar}
                      alt={post.authorName}
                      className="h-10 w-10 rounded-2xl object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-[#204E4A]">
                          {post.authorName}
                        </p>
                        {post.authorUserId === community.ownerUserId && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E1E53F] px-2 py-0.5 text-[8px] font-extrabold uppercase text-[#204E4A]">
                            <IconShield size={10} />
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-[#5C7470]">
                        {formatDate(post.createdAt, lang)}
                      </p>
                    </div>
                  </div>

                  {post.canDelete && (
                    <button
                      type="button"
                      onClick={() => void handleDeletePost(post)}
                      className="rounded-full bg-[#FAF8F5] px-3 py-1.5 text-[9px] font-bold text-[#5C7470]"
                    >
                      {lang === 'es' ? 'Eliminar' : 'Delete'}
                    </button>
                  )}
                </div>

                {post.body && (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#204E4A]">
                    {post.body}
                  </p>
                )}

                {post.photoUrl && (
                  <img
                    src={post.photoUrl}
                    alt=""
                    className="max-h-[28rem] w-full rounded-[1.6rem] object-cover"
                  />
                )}

                <div className="flex items-center gap-3 border-t border-[#204E4A]/8 pt-3">
                  <button
                    type="button"
                    onClick={() => void handleLike(post)}
                    disabled={!canParticipate}
                    className={
                      'flex items-center gap-1.5 text-[10px] font-bold disabled:opacity-45 ' +
                      (post.isLiked ? 'text-[#204E4A]' : 'text-[#5C7470]')
                    }
                  >
                    <IconHeart filled={post.isLiked} size={16} />
                    {post.likesCount}
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggleComments(post.id)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-[#5C7470]"
                  >
                    <IconChat size={16} />
                    {post.commentsCount}
                  </button>
                </div>

                {openCommentsFor === post.id && (
                  <div className="space-y-3 rounded-2xl bg-[#FAF8F5] p-3">
                    {(commentsByPost[post.id] || []).map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2.5">
                        <img
                          src={comment.authorAvatar}
                          alt={comment.authorName}
                          className="h-8 w-8 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-black text-[#204E4A]">
                              {comment.authorName}
                            </p>
                            {comment.canDelete && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteComment(post.id, comment.id)
                                }
                                className="text-[9px] font-bold text-[#5C7470]"
                              >
                                {lang === 'es' ? 'Eliminar' : 'Delete'}
                              </button>
                            )}
                          </div>
                          <p className="mt-0.5 text-[10px] leading-relaxed text-[#5C7470]">
                            {comment.body}
                          </p>
                        </div>
                      </div>
                    ))}

                    {(commentsByPost[post.id] || []).length === 0 && (
                      <p className="text-[10px] text-[#5C7470]">
                        {lang === 'es'
                          ? 'Aún no hay comentarios.'
                          : 'No comments yet.'}
                      </p>
                    )}

                    {canParticipate && (
                      <div className="flex gap-2">
                        <input
                          value={commentDraft}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          maxLength={1000}
                          className="min-w-0 flex-1 rounded-full bg-white px-3 py-2 text-[10px] text-[#204E4A] outline-none"
                          placeholder={
                            lang === 'es'
                              ? 'Escribe un comentario...'
                              : 'Write a comment...'
                          }
                        />
                        <button
                          type="button"
                          disabled={isCommentBusy || !commentDraft.trim()}
                          onClick={() => void handleAddComment(post.id)}
                          className="rounded-full bg-[#E1E53F] px-3 py-2 text-[10px] font-black text-[#204E4A] disabled:opacity-50"
                        >
                          {lang === 'es' ? 'Enviar' : 'Send'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}

      {activeTab === 'info' && (
        <section className="space-y-4 rounded-[2rem] bg-white p-5 shadow-sm">
          {!isEditing ? (
            <>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#5C7470]">
                  {lang === 'es' ? 'Descripción' : 'Description'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#204E4A]">
                  {community.description}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#5C7470]">
                  {lang === 'es' ? 'Reglas' : 'Rules'}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-[#204E4A]">
                  {community.rules ||
                    (lang === 'es'
                      ? 'Esta comunidad todavía no ha publicado reglas adicionales.'
                      : 'This community has not posted additional rules yet.')}
                </p>
              </div>

              {isOwner && (
                <div className="flex flex-wrap gap-2 border-t border-[#204E4A]/8 pt-4">
                  <button
                    type="button"
                    onClick={beginEdit}
                    className="rounded-full bg-[#E1E53F] px-4 py-2 text-[10px] font-black text-[#204E4A]"
                  >
                    {lang === 'es' ? 'Editar comunidad' : 'Edit community'}
                  </button>
                  {community.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => void handleArchive()}
                      className="rounded-full bg-[#FAF8F5] px-4 py-2 text-[10px] font-bold text-[#5C7470]"
                    >
                      {lang === 'es' ? 'Archivar' : 'Archive'}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                minLength={3}
                maxLength={80}
                required
                className="w-full rounded-2xl bg-[#FAF8F5] px-3 py-2.5 text-xs text-[#204E4A]"
              />
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={4}
                maxLength={1000}
                required
                className="w-full rounded-2xl bg-[#FAF8F5] px-3 py-2.5 text-xs text-[#204E4A]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value)}
                  maxLength={40}
                  required
                  className="rounded-2xl bg-[#FAF8F5] px-3 py-2.5 text-xs text-[#204E4A]"
                />
                <select
                  value={editSpecies}
                  onChange={(event) =>
                    setEditSpecies(event.target.value as Species | '')
                  }
                  className="rounded-2xl bg-[#FAF8F5] px-3 py-2.5 text-xs text-[#204E4A]"
                >
                  <option value="">{lang === 'es' ? 'Todas' : 'All'}</option>
                  <option value="perro">{lang === 'es' ? 'Perro' : 'Dog'}</option>
                  <option value="gato">{lang === 'es' ? 'Gato' : 'Cat'}</option>
                  <option value="conejo">{lang === 'es' ? 'Conejo' : 'Rabbit'}</option>
                  <option value="ave">{lang === 'es' ? 'Ave' : 'Bird'}</option>
                  <option value="otro">{lang === 'es' ? 'Otro' : 'Other'}</option>
                </select>
              </div>
              <input
                value={editZone}
                onChange={(event) => setEditZone(event.target.value)}
                maxLength={100}
                className="w-full rounded-2xl bg-[#FAF8F5] px-3 py-2.5 text-xs text-[#204E4A]"
                placeholder={lang === 'es' ? 'Zona' : 'Area'}
              />
              <textarea
                value={editRules}
                onChange={(event) => setEditRules(event.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full rounded-2xl bg-[#FAF8F5] px-3 py-2.5 text-xs text-[#204E4A]"
                placeholder={lang === 'es' ? 'Reglas' : 'Rules'}
              />

              <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[#FAF8F5] px-3 py-2.5 text-[10px] font-bold text-[#204E4A]">
                <IconCamera size={15} />
                {editImage
                  ? editImage.name
                  : lang === 'es'
                    ? 'Cambiar portada'
                    : 'Change cover'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setEditImage(event.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="rounded-full bg-[#E1E53F] px-4 py-2.5 text-[10px] font-black text-[#204E4A] disabled:opacity-50"
                >
                  {isSavingEdit
                    ? lang === 'es'
                      ? 'Guardando...'
                      : 'Saving...'
                    : lang === 'es'
                      ? 'Guardar'
                      : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-full bg-[#FAF8F5] px-4 py-2.5 text-[10px] font-bold text-[#5C7470]"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {activeTab === 'members' && (
        <section className="space-y-3">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between gap-3 rounded-[1.8rem] bg-white p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={member.pet?.photoUrl}
                  alt={member.pet?.name || ''}
                  className="h-11 w-11 rounded-2xl bg-[#FAF8F5] object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-black text-[#204E4A]">
                      {member.pet?.name ||
                        (lang === 'es' ? 'Mascota no disponible' : 'Pet unavailable')}
                    </p>
                    {member.role === 'owner' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E1E53F] px-2 py-0.5 text-[8px] font-extrabold uppercase text-[#204E4A]">
                        <IconShield size={10} />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[9px] text-[#5C7470]">
                    {member.pet?.species || ''}
                    {' · '}
                    {lang === 'es' ? 'desde ' : 'since '}
                    {formatDate(member.joinedAt, lang)}
                  </p>
                </div>
              </div>

              {isOwner && member.role !== 'owner' && (
                <button
                  type="button"
                  onClick={() => void handleRemoveMember(member)}
                  className="rounded-full bg-[#FAF8F5] px-3 py-2 text-[9px] font-bold text-[#5C7470]"
                >
                  {lang === 'es' ? 'Retirar' : 'Remove'}
                </button>
              )}
            </div>
          ))}

          {members.length === 0 && (
            <div className="rounded-[2rem] bg-white p-5 text-xs text-[#5C7470] shadow-sm">
              {lang === 'es' ? 'No hay miembros para mostrar.' : 'No members to show.'}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
