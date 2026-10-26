import { CommunityMediaPendingError, COMMUNITY_MEDIA_BUCKET } from '../../features/communities/communityMediaCleanup'
import { supabase } from '../../services/supabaseClient'
import { attachVerifiedCommentBadges, preloadVerifiedFeedBadgeArt } from '../../features/supporter/verifiedFeedPostBadges'
import { supporterBenefitsUiEnabled } from '../../features/supporter/supporterUiRelease'
import { SupporterBadge } from '../../features/supporter/components/SupporterBadge'
import { PAZO_PRIVACY_SUPPORT_EMAIL, PAZO_PRIVACY_SUPPORT_MAILTO } from '../../features/legal/supportContact'
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
import { CommunityWorkspace } from '../../features/communities/components/CommunityWorkspace'
import type { CommunityPage } from '../../features/communities/components/CommunityWorkspace'
import { ReportDialog } from '../../features/moderation/ReportDialog'
import type { ReportTarget } from '../../features/moderation/reportingService'
import { describeReportSubject } from '../../features/moderation/reportSubject'
import {
 ownershipUiEnabled,nominateCommunityAdmin,proposeCommunityTransfer,
 fetchCommunityOwnershipOffer,acceptCommunityTransfer,declineCommunityTransfer,
} from '../../features/account/communityOwnershipService'
import type {OwnershipOffer} from '../../features/account/communityOwnershipState'
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
  canReport: boolean
  currentPet: Pet | null
  onBack: () => void
  onCommunityChanged?: () => void
  lang: 'es' | 'en'
}

type DetailTab = CommunityPage

const formatDate = (value: string, lang: 'es' | 'en') =>
  new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))

export const CommunityDetailView = ({
  communityId,
  canReport,
  currentPet,
  onBack,
  onCommunityChanged,
  lang,
}: CommunityDetailViewProps) => {
  const [reportTarget, setReportTarget] = useState<{kind: ReportTarget; id: string; label?: string} | null>(null)
  const [community, setCommunity] = useState<CommunitySummary | null>(null)
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [ownershipOffer,setOwnershipOffer]=useState<{offer:OwnershipOffer;isCandidate:boolean}|null>(null)
  const [ownershipBusy,setOwnershipBusy]=useState(false)
  const [ownershipError,setOwnershipError]=useState('')
  const [ownershipInfo,setOwnershipInfo]=useState('')
  const exitUiEnabled=ownershipUiEnabled()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [activeTab, setActiveTab] = useState<DetailTab>('posts')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isMembershipBusy, setIsMembershipBusy] = useState(false)

  const [composerOpen, setComposerOpen] = useState(false)
  const [postText, setPostText] = useState('')
  const [postImage, setPostImage] = useState<File | null>(null)
  const [postPreview, setPostPreview] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [postMediaReviewPending, setPostMediaReviewPending] = useState(false)
  const [postMediaReviewPath, setPostMediaReviewPath] = useState<string | null>(null)

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
    setLoadError(false)
    try {
      const [nextCommunity, nextMembers, nextPosts] = await Promise.all([
        fetchCommunityById(communityId),
        fetchCommunityMembers(communityId),
        fetchCommunityPosts(communityId, currentPet?.id),
      ])

      let decoratedPosts=nextPosts
      if(supporterBenefitsUiEnabled){
        try{
          decoratedPosts=await attachVerifiedCommentBadges(nextPosts,
            async ids=>await supabase.rpc('pazo_supporter_public_badges_batch',{p_pet_ids:ids}))
          await preloadVerifiedFeedBadgeArt(decoratedPosts)
        }catch(error){
          console.error('PAZO community post badge verification unavailable:',error)
          decoratedPosts=nextPosts
        }
      }
      setCommunity(nextCommunity)
      setMembers(nextMembers)
      setPosts(decoratedPosts)
      if (exitUiEnabled) {
        try { setOwnershipOffer(await fetchCommunityOwnershipOffer(communityId)) }
        catch { setOwnershipOffer(null) }
      }
    } catch (error) {
      setLoadError(true)
      console.error('Error loading community:', error)
    } finally {
      setIsLoading(false)
    }
  }, [communityId, currentPet?.id, exitUiEnabled])

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
    let decoratedPosts=nextPosts
    if(supporterBenefitsUiEnabled){
      try{
        decoratedPosts=await attachVerifiedCommentBadges(nextPosts,
          async ids=>await supabase.rpc('pazo_supporter_public_badges_batch',{p_pet_ids:ids}))
        await preloadVerifiedFeedBadgeArt(decoratedPosts)
      }catch(error){
        console.error('PAZO community post badge verification unavailable:',error)
        decoratedPosts=nextPosts
      }
    }
    setPosts(decoratedPosts)
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
    if (!community?.isJoined || !currentPet?.id || isPosting || postMediaReviewPending) return
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
      setComposerOpen(false)
      setPostText('')
      setPostImage(null)
      setPostPreview('')
      await refreshPosts()
      onCommunityChanged?.()
    } catch (error: any) {
      if (error instanceof CommunityMediaPendingError) {
        setPostMediaReviewPending(true)
        setPostMediaReviewPath(error.storagePath)
        alert(lang === 'es'
          ? `No se pudo confirmar la publicación. No reintentes todavía. La foto requiere revisión: ${COMMUNITY_MEDIA_BUCKET}/${error.storagePath}. Contacta con ${PAZO_PRIVACY_SUPPORT_EMAIL}.`
          : `Publication could not be confirmed. Do not retry yet. The photo needs review: ${COMMUNITY_MEDIA_BUCKET}/${error.storagePath}. Contact ${PAZO_PRIVACY_SUPPORT_EMAIL}.`)
        return
      }
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

  const loadComments = async (postId: string):Promise<boolean> => {
    try {
      const comments = await fetchCommunityPostComments(postId)
      let decoratedComments=comments
      if(supporterBenefitsUiEnabled){
        try{
          decoratedComments=await attachVerifiedCommentBadges(comments,
            async ids=>await supabase.rpc('pazo_supporter_public_badges_batch',{p_pet_ids:ids}))
          await preloadVerifiedFeedBadgeArt(decoratedComments)
        }catch(error){
          // Membership is optional; a badge lookup cannot block a free thread.
          console.error('PAZO community comment badge verification unavailable:',error)
          decoratedComments=comments
        }
      }
      setCommentsByPost((current) => ({ ...current, [postId]: decoratedComments }))
      return true
    } catch (error) {
      console.error('Error loading Community comments:', error)
      return false
    }
  }

  const toggleComments = async (postId: string) => {
    if (openCommentsFor === postId) {
      setOpenCommentsFor(null)
      setCommentDraft('')
      return
    }

    setCommentDraft('')
    // Resolve all membership badges before the first visible comment.
    if(await loadComments(postId))setOpenCommentsFor(postId)
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
      const result = await deleteCommunityPost(post)
      if (result.mediaCleanupPending) {
        alert(lang === 'es'
          ? `Publicación eliminada. La retirada de la foto no está confirmada: ${COMMUNITY_MEDIA_BUCKET}/${result.storagePath}. Contacta con ${PAZO_PRIVACY_SUPPORT_EMAIL}.`
          : `Post deleted. Photo removal is not confirmed: ${COMMUNITY_MEDIA_BUCKET}/${result.storagePath}. Contact ${PAZO_PRIVACY_SUPPORT_EMAIL}.`)
      }
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

  const changeOwnership = async (task: () => Promise<boolean>,message:string)=>{
    if(ownershipBusy || !exitUiEnabled)return
    setOwnershipBusy(true);setOwnershipError('');setOwnershipInfo('')
    try {
      const success=await task()
      if(!success)throw new Error('ownership_check_failed')
      setOwnershipInfo(message)
      await loadCommunity()
      onCommunityChanged?.()
    } catch {
      setOwnershipError(lang==='es'
        ? 'No se pudo confirmar el cambio. Verifica que exista una solicitud de eliminación pendiente y que la persona sea administradora.'
        : 'Could not verify the change. Check for a pending deletion request and an eligible administrator.')
    } finally {setOwnershipBusy(false)}
  }

  const setAdminFor=(member:CommunityMember)=>{
    if(!window.confirm(lang==='es'
      ? '¿Designar a esta persona como administradora candidata? No se transfiere la propiedad todavía.'
      : 'Nominate this person as an administrator? Ownership is not transferred yet.'))return
    void changeOwnership(
      ()=>nominateCommunityAdmin(communityId,member.userId),
      lang==='es'?'Administrador designado.':'Administrator nominated.')
  }
  const offerTo=(member:CommunityMember)=>{
    if(!window.confirm(lang==='es'
      ? '¿Ofrecer la propiedad de la comunidad a esta persona? Solo cambiará si acepta.'
      : 'Offer community ownership? It will only change if this person accepts.'))return
    void changeOwnership(
      ()=>proposeCommunityTransfer(communityId,member.userId),
      lang==='es'?'Oferta enviada; esperando aceptación.':'Offer sent; awaiting acceptance.')
  }
  const answerOffer=(accept:boolean)=>{
    if(accept&&!window.confirm(lang==='es'
      ? '¿Aceptar la propiedad y responsabilidad de esta comunidad?'
      : 'Accept ownership and responsibility for this community?'))return
    void changeOwnership(
      ()=>accept?acceptCommunityTransfer(communityId):declineCommunityTransfer(communityId),
      lang==='es'?(accept?'Transferencia aceptada.':'Oferta rechazada.'):(accept?'Transfer accepted.':'Offer declined.'))
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
        <span role="status" className="flex items-center gap-2 text-sm text-[#204E4A]"><IconPaw size={27} />{lang === 'es' ? 'Cargando comunidad…' : 'Loading community…'}</span>
      </div>
    )
  }

  if (loadError || !community) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-xs font-bold text-[#204E4A]">
          {lang === 'es' ? 'Volver' : 'Back'}
        </button>
        <div className="rounded-[2rem] pazo-glass-card p-5 text-xs text-[#5C7470] shadow-sm">
          {lang === 'es' ? 'No se pudo cargar la comunidad.' : 'Could not load the community.'}
          <button type="button" onClick={() => void loadCommunity()} className="mt-3 rounded-full bg-[#E1E53F] px-4 py-3 font-bold text-[#204E4A]">{lang === 'es' ? 'Reintentar' : 'Retry'}</button>
        </div>
      </div>
    )
  }

  const isOwner = community.role === 'owner'
  const canParticipate = community.isJoined && community.status === 'active'

  const composer = canParticipate && currentPet ? (<form
              onSubmit={handleCreatePost}
              className="space-y-3 rounded-[2rem] bg-white/85 p-4 shadow-[0_9px_25px_rgba(32,78,74,0.055)] backdrop-blur-xl sm:p-5"
            >
              <div className="flex items-center gap-3">
                <img
                  src={currentPet.photoUrl}
                  alt={currentPet.name}
                  className="h-12 w-12 rounded-full bg-[#F0F3E9] object-cover shadow-sm"
                />
                <div>
                  <p className="text-[15px] font-extrabold leading-tight text-[#204E4A]">
                    {lang === 'es'
                      ? `Publicar como ${currentPet.name}`
                      : `Post as ${currentPet.name}`}
                  </p>
                  <p className="text-[13px] text-[#5C7470]">
                    {lang === 'es'
                      ? 'Visible dentro de esta comunidad'
                      : 'Visible inside this community'}
                  </p>
                </div>
              </div>

              <textarea
                aria-label={lang === 'es' ? 'Texto de la publicación' : 'Post text'}
                value={postText}
                onChange={(event) => setPostText(event.target.value)}
                rows={3}
                maxLength={4000}
                className="w-full resize-y rounded-[1.4rem] bg-[#F8F7F2] px-4 py-3 text-[14px] leading-relaxed text-[#204E4A] outline-none placeholder:text-[#93A5A0]"
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
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#F1F4EA] px-4 py-2 text-[13px] font-extrabold text-[#204E4A]">
                  <IconCamera size={15} />
                  {lang === 'es' ? 'Foto' : 'Photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => handlePostImage(event.target.files?.[0])}
                    className="hidden"
                  />
                </label>

                {postMediaReviewPath && <p role="status" className="text-xs text-[#5C7470] break-all">
                  {lang === 'es' ? 'Publicación sin confirmar. Contacta con soporte antes de reenviar. Referencia: '
                    : 'Publication unconfirmed. Contact support before retrying. Reference: '}
                  {COMMUNITY_MEDIA_BUCKET}/{postMediaReviewPath}{' '}
                  <a href={PAZO_PRIVACY_SUPPORT_MAILTO} className="font-bold underline">{PAZO_PRIVACY_SUPPORT_EMAIL}</a>
                </p>}
                <button
                  type="submit"
                  disabled={postMediaReviewPending || isPosting || (!postText.trim() && !postImage)}
                  className="min-h-11 rounded-full bg-[#204E4A] px-5 py-2.5 text-[14px] font-extrabold text-white shadow-[0_4px_12px_rgba(32,78,74,0.12)] disabled:opacity-50"
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
            </form>) : null

  return (
    <div className="relative pb-8">
      {reportTarget && <ReportDialog key={reportTarget.kind + reportTarget.id} lang={lang} target={reportTarget} onClose={() => setReportTarget(null)} />}
      <CommunityWorkspace community={community} currentPet={currentPet} active={activeTab} onChange={setActiveTab}
        lang={lang} onBack={onBack} onMembership={() => void handleMembership()} membershipBusy={isMembershipBusy}
        composer={composer} composerOpen={composerOpen} onCompose={() => setComposerOpen(true)}
        onCloseComposer={() => setComposerOpen(false)} posting={isPosting}>
      {activeTab === 'posts' && (
        <div className="space-y-4">


          {!community.isJoined && community.status === 'active' && (
            <div className="rounded-[2rem] pazo-glass-card p-4 text-center shadow-sm">
              <p className="text-xs font-bold text-[#204E4A]">
                {lang === 'es'
                  ? 'Puedes leer la comunidad sin unirte.'
                  : 'You can read the community without joining.'}
              </p>
              <p className="mt-1 text-[13px] text-[#5C7470]">
                {lang === 'es'
                  ? 'Únete para publicar, comentar y dar Me gusta.'
                  : 'Join to post, comment, and like.'}
              </p>
            </div>
          )}

          {posts.length === 0 ? (
            <div className="rounded-[2rem] bg-white/80 px-5 py-9 text-center shadow-[0_6px_20px_rgba(32,78,74,0.045)] backdrop-blur-xl">
              <IconPaw size={24} className="mx-auto text-[#204E4A]/50" />
              <p className="mt-2 text-xs font-black text-[#204E4A]">
                {lang === 'es'
                  ? 'Todavía no hay publicaciones'
                  : 'No posts yet'}
              </p>
              <p className="mt-1 text-[13px] text-[#5C7470]">
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
            posts.map((post) => post.isAuthorDeleted ? (
              <article key={post.id} className="space-y-3 rounded-[2rem] bg-white/85 p-4 shadow-[0_6px_24px_rgba(32,78,74,0.05)] backdrop-blur-xl">
                <div className="flex items-center gap-3 text-[#204E4A]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FAF8F5]"><IconPaw size={18}/></div>
                  <p className="text-xs font-extrabold">{lang === 'es' ? 'Autor eliminado' : 'Deleted author'}</p>
                </div>
                <p className="text-xs text-[#5C7470]">
                  {lang === 'es'
                    ? 'Se retiró el contenido personal del autor. Los comentarios de otras personas permanecen.'
                    : 'The author’s personal content was removed. Other people’s comments remain.'}
                </p>
                <button type="button" onClick={() => void toggleComments(post.id)}
                  className="rounded-full bg-[#FAF8F5] px-4 py-2 text-xs font-bold text-[#204E4A]">
                  {lang === 'es' ? 'Ver comentarios' : 'View comments'} ({post.commentsCount})
                </button>
                {openCommentsFor === post.id && <div className="space-y-2">
                  {(commentsByPost[post.id] || []).map(comment => <div key={comment.id} className="flex items-start gap-2 rounded-2xl bg-[#FAF8F5] p-3 text-xs">
                    <div className="relative h-8 w-8 shrink-0">
                      <img src={comment.authorAvatar} alt="" className="h-full w-full rounded-full object-cover"/>
                      {supporterBenefitsUiEnabled&&comment.supporterBadge?.badge&&(
                        <span className="pointer-events-none absolute -bottom-1 -right-1 z-10">
                          <SupporterBadge active milestone={comment.supporterBadge.milestone} lang={lang} size="mini"/>
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#204E4A]">{comment.authorName}</p>
                      <p className="mt-1 text-[#5C7470]">{comment.body}</p>
                    </div>
                  </div>)}
                </div>}
              </article>
            ) : (
              <article
                key={post.id}
                className="overflow-hidden rounded-[2rem] bg-white/90 shadow-[0_9px_28px_rgba(32,78,74,0.06)] backdrop-blur-xl"
              >
                <div className="flex min-w-0 items-start justify-between gap-2 px-4 pb-3 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0">
                      <img src={post.authorAvatar} alt={post.authorName} className="h-full w-full rounded-full bg-[#F0F3E9] object-cover shadow-sm"/>
                      {supporterBenefitsUiEnabled&&post.supporterBadge?.badge&&(
                        <span className="pointer-events-none absolute -bottom-1 -right-1 z-10" aria-label={lang==='es'?'Insignia de Amigo de PAZO verificada':'Verified PAZO Friend badge'}>
                          <SupporterBadge active milestone={post.supporterBadge.milestone} lang={lang} size="mini"/>
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[16px] font-black leading-snug text-[#204E4A]">
                          {post.authorName}
                        </p>
                        {post.authorUserId === community.ownerUserId && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E1E53F] px-2 py-0.5 text-[11px] font-extrabold uppercase text-[#204E4A]">
                            <IconShield size={10} />
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#5C7470]">
                        {formatDate(post.createdAt, lang)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                  {canReport && <button type="button" onClick={() => setReportTarget({kind:'community_post',id:post.id,label:describeReportSubject('community_post',post.authorName,post.body,lang)})}
                    className="rounded-full bg-[#F1F4EA] px-2.5 py-2 text-[12px] font-bold text-[#5C7470]">{lang === 'es' ? 'Denunciar' : 'Report'}</button>}
                  {post.canDelete && (
                    <button
                      type="button"
                      onClick={() => void handleDeletePost(post)}
                      className="rounded-full bg-[#F1F4EA] px-2.5 py-2 text-[12px] font-bold text-[#5C7470]"
                    >
                      {lang === 'es' ? 'Eliminar' : 'Delete'}
                    </button>
                  )}
                  </div>
                </div>

                {post.photoUrl && (
                  <div className="max-h-[32rem] w-full overflow-hidden bg-[#ECF0E9]">
                    <img src={post.photoUrl} alt="" className="max-h-[32rem] w-full object-cover" />
                  </div>
                )}
                {post.body && (
                  <p className="whitespace-pre-wrap break-words px-4 pb-2 pt-3 text-[14px] font-medium leading-relaxed text-[#204E4A]">
                    {post.body}
                  </p>
                )}

                <div className="flex items-center gap-5 px-4 pb-4 pt-3">
                  <button
                    type="button"
                    onClick={() => void handleLike(post)}
                    disabled={!canParticipate}
                    className={
                      'flex items-center gap-1.5 text-[13px] font-bold disabled:opacity-45 ' +
                      (post.isLiked ? 'text-[#204E4A]' : 'text-[#5C7470]')
                    }
                  >
                    <IconHeart filled={post.isLiked} size={16} />
                    {post.likesCount}
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggleComments(post.id)}
                    className="flex items-center gap-1.5 text-[13px] font-bold text-[#5C7470]"
                  >
                    <IconChat size={16} />
                    {post.commentsCount}
                  </button>
                </div>

                {openCommentsFor === post.id && (
                  <div className="mx-3 mb-3 space-y-3 rounded-[1.4rem] bg-[#F4F5ED] p-4">
                    {(commentsByPost[post.id] || []).map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2.5">
                        <div className="relative h-9 w-9 shrink-0">
                          <img src={comment.authorAvatar} alt={comment.authorName} className="h-full w-full rounded-full object-cover"/>
                          {supporterBenefitsUiEnabled&&comment.supporterBadge?.badge&&(
                            <span className="pointer-events-none absolute -bottom-1 -right-1 z-10">
                              <SupporterBadge active milestone={comment.supporterBadge.milestone} lang={lang} size="mini"/>
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-black text-[#204E4A]">
                              {comment.authorName}
                            </p>
                            {comment.canDelete && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteComment(post.id, comment.id)
                                }
                                className="text-[12px] font-bold text-[#5C7470]"
                              >
                                {lang === 'es' ? 'Eliminar' : 'Delete'}
                              </button>
                            )}
                          </div>
                          {canReport && <button type="button" onClick={() => setReportTarget({kind:'community_comment',id:comment.id,label:describeReportSubject('community_comment',comment.authorName,comment.body,lang)})}
                            className="text-[13px] font-bold text-[#5C7470] underline">{lang === 'es' ? 'Denunciar' : 'Report'}</button>}
                          <p className="mt-0.5 text-[13px] leading-relaxed text-[#5C7470]">
                            {comment.body}
                          </p>
                        </div>
                      </div>
                    ))}

                    {(commentsByPost[post.id] || []).length === 0 && (
                      <p className="text-[13px] text-[#5C7470]">
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
                          className="min-w-0 flex-1 rounded-full bg-white px-3 py-2 text-[13px] text-[#204E4A] outline-none"
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
                          className="rounded-full bg-[#E1E53F] px-3 py-2 text-[13px] font-black text-[#204E4A] disabled:opacity-50"
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
        <section className="space-y-5 rounded-[2rem] bg-white/80 p-5 shadow-[0_8px_28px_rgba(32,78,74,0.055)] backdrop-blur-xl sm:p-6">
          {!isEditing ? (
            <>
              <dl className="grid grid-cols-2 gap-3 text-[13px] text-[#5C7470]">
                <div><dt>{lang === 'es' ? 'Categoría' : 'Category'}</dt><dd className="font-bold text-[#204E4A]">{community.category}</dd></div>
                <div><dt>{lang === 'es' ? 'Publicaciones' : 'Posts'}</dt><dd className="font-bold text-[#204E4A]">{posts.length}</dd></div>
                {community.species && <div><dt>{lang === 'es' ? 'Especie' : 'Species'}</dt><dd className="font-bold text-[#204E4A]">{community.species}</dd></div>}
                {community.zone && <div><dt>{lang === 'es' ? 'Zona' : 'Area'}</dt><dd className="font-bold text-[#204E4A]">{community.zone}</dd></div>}
              </dl>

              <div>
                <p className="text-[13px] font-extrabold uppercase tracking-wider text-[#5C7470]">
                  {lang === 'es' ? 'Descripción' : 'Description'}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-[14px] font-medium leading-relaxed text-[#204E4A]">
                  {community.description}
                </p>
              </div>

              <div>
                <p className="text-[13px] font-extrabold uppercase tracking-wider text-[#5C7470]">
                  {lang === 'es' ? 'Reglas' : 'Rules'}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#204E4A]">
                  {community.rules ||
                    (lang === 'es'
                      ? 'Esta comunidad todavía no ha publicado reglas adicionales.'
                      : 'This community has not posted additional rules yet.')}
                </p>
              </div>

              {isOwner && (
                <div className="flex flex-wrap gap-2 rounded-[1.6rem] bg-[#F4F5ED] p-4">
                  <button
                    type="button"
                    onClick={beginEdit}
                    className="rounded-full bg-[#E1E53F] px-4 py-2 text-[13px] font-black text-[#204E4A]"
                  >
                    {lang === 'es' ? 'Editar comunidad' : 'Edit community'}
                  </button>
                  {community.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => void handleArchive()}
                      className="rounded-full bg-[#FAF8F5] px-4 py-2 text-[13px] font-bold text-[#5C7470]"
                    >
                      {lang === 'es' ? 'Archivar' : 'Archive'}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="mb-1">
                <h4 className="text-sm font-black text-[#204E4A]">
                  {lang === 'es' ? 'Editar comunidad' : 'Edit community'}
                </h4>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5C7470]">
                  {lang === 'es'
                    ? 'Actualiza la información que las personas verán antes de unirse.'
                    : 'Update the information people will see before joining.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="community-edit-name"
                  className="block text-[14px] font-extrabold text-[#204E4A]"
                >
                  {lang === 'es' ? 'Nombre de la comunidad' : 'Community name'}{' '}
                  <span className="text-[#5C7470]">*</span>
                </label>
                <input
                  id="community-edit-name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  minLength={3}
                  maxLength={80}
                  required
                  placeholder={
                    lang === 'es'
                      ? 'Ej. Perros Senderistas LA'
                      : 'E.g. LA Hiking Dogs'
                  }
                  className="w-full rounded-2xl bg-[#FAF8F5] px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-transparent placeholder:text-[#8FA09D] focus:ring-[#204E4A]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="community-edit-description"
                  className="block text-[14px] font-extrabold text-[#204E4A]"
                >
                  {lang === 'es' ? 'Descripción' : 'Description'}{' '}
                  <span className="text-[#5C7470]">*</span>
                </label>
                <textarea
                  id="community-edit-description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  required
                  placeholder={
                    lang === 'es'
                      ? 'Explica de qué trata la comunidad y qué une a sus miembros.'
                      : 'Explain what the community is about and what brings its members together.'
                  }
                  className="w-full rounded-2xl bg-[#FAF8F5] px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-transparent placeholder:text-[#8FA09D] focus:ring-[#204E4A]/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="community-edit-category"
                    className="block text-[14px] font-extrabold text-[#204E4A]"
                  >
                    {lang === 'es' ? 'Categoría' : 'Category'}{' '}
                    <span className="text-[#5C7470]">*</span>
                  </label>
                  <input
                    id="community-edit-category"
                    value={editCategory}
                    onChange={(event) => setEditCategory(event.target.value)}
                    maxLength={40}
                    required
                    placeholder={
                      lang === 'es'
                        ? 'Ej. Paseos, ayuda, consejos'
                        : 'E.g. Walks, support, advice'
                    }
                    className="w-full rounded-2xl bg-[#FAF8F5] px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-transparent placeholder:text-[#8FA09D] focus:ring-[#204E4A]/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="community-edit-species"
                    className="block text-[14px] font-extrabold text-[#204E4A]"
                  >
                    {lang === 'es' ? 'Especie principal' : 'Main species'}{' '}
                    <span className="font-medium text-[#5C7470]">
                      {lang === 'es' ? '(opcional)' : '(optional)'}
                    </span>
                  </label>
                  <select
                    id="community-edit-species"
                    value={editSpecies}
                    onChange={(event) =>
                      setEditSpecies(event.target.value as Species | '')
                    }
                    className="w-full rounded-2xl bg-[#FAF8F5] px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-transparent focus:ring-[#204E4A]/20"
                  >
                    <option value="">
                      {lang === 'es' ? 'Todas las especies' : 'All species'}
                    </option>
                    <option value="perro">{lang === 'es' ? 'Perro' : 'Dog'}</option>
                    <option value="gato">{lang === 'es' ? 'Gato' : 'Cat'}</option>
                    <option value="conejo">{lang === 'es' ? 'Conejo' : 'Rabbit'}</option>
                    <option value="ave">{lang === 'es' ? 'Ave' : 'Bird'}</option>
                    <option value="otro">{lang === 'es' ? 'Otro' : 'Other'}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="community-edit-zone"
                  className="block text-[14px] font-extrabold text-[#204E4A]"
                >
                  {lang === 'es' ? 'Zona o ubicación' : 'Area or location'}{' '}
                  <span className="font-medium text-[#5C7470]">
                    {lang === 'es' ? '(opcional)' : '(optional)'}
                  </span>
                </label>
                <input
                  id="community-edit-zone"
                  value={editZone}
                  onChange={(event) => setEditZone(event.target.value)}
                  maxLength={100}
                  className="w-full rounded-2xl bg-[#FAF8F5] px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-transparent placeholder:text-[#8FA09D] focus:ring-[#204E4A]/20"
                  placeholder={
                    lang === 'es'
                      ? 'Ej. Los Ángeles, CA'
                      : 'E.g. Los Angeles, CA'
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="community-edit-rules"
                  className="block text-[14px] font-extrabold text-[#204E4A]"
                >
                  {lang === 'es' ? 'Reglas de la comunidad' : 'Community rules'}{' '}
                  <span className="font-medium text-[#5C7470]">
                    {lang === 'es' ? '(opcional)' : '(optional)'}
                  </span>
                </label>
                <textarea
                  id="community-edit-rules"
                  value={editRules}
                  onChange={(event) => setEditRules(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-2xl bg-[#FAF8F5] px-4 py-3 text-xs text-[#204E4A] outline-none ring-1 ring-transparent placeholder:text-[#8FA09D] focus:ring-[#204E4A]/20"
                  placeholder={
                    lang === 'es'
                      ? 'Describe las normas básicas de convivencia y publicaciones.'
                      : 'Describe the basic rules for behavior and posts.'
                  }
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-[14px] font-extrabold text-[#204E4A]">
                  {lang === 'es' ? 'Portada de la comunidad' : 'Community cover'}{' '}
                  <span className="font-medium text-[#5C7470]">
                    {lang === 'es' ? '(opcional)' : '(optional)'}
                  </span>
                </span>
                <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[#FAF8F5] px-4 py-3 text-[13px] font-bold text-[#204E4A] ring-1 ring-transparent transition-all hover:ring-[#204E4A]/15">
                  <IconCamera size={15} />
                  {editImage
                    ? editImage.name
                    : lang === 'es'
                      ? 'Seleccionar una nueva portada'
                      : 'Choose a new cover'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setEditImage(event.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </label>
                <p className="text-[12px] text-[#5C7470]">
                  {lang === 'es'
                    ? 'JPG, PNG o WEBP · máximo 5 MB.'
                    : 'JPG, PNG or WEBP · maximum 5 MB.'}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="rounded-full bg-[#E1E53F] px-4 py-2.5 text-[13px] font-black text-[#204E4A] disabled:opacity-50"
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
                  className="rounded-full bg-[#FAF8F5] px-4 py-2.5 text-[13px] font-bold text-[#5C7470]"
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
          {exitUiEnabled && ownershipOffer && (
            <div className="rounded-[1.8rem] bg-[#E1E53F]/20 p-4">
              <p className="text-xs font-bold text-[#204E4A]">
                {lang==='es'?'Transferencia pendiente de aceptación':'Ownership transfer awaiting acceptance'}
              </p>
              {ownershipOffer.isCandidate && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={ownershipBusy} onClick={()=>answerOffer(true)}
                    className="rounded-full bg-[#204E4A] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
                    {lang==='es'?'Aceptar propiedad':'Accept ownership'}
                  </button>
                  <button type="button" disabled={ownershipBusy} onClick={()=>answerOffer(false)}
                    className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#204E4A] disabled:opacity-40">
                    {lang==='es'?'Rechazar':'Decline'}
                  </button>
                </div>
              )}
            </div>
          )}
          {exitUiEnabled && ownershipError && <p role="alert" className="rounded-2xl bg-white p-3 text-xs text-[#AF3029]">{ownershipError}</p>}
          {exitUiEnabled && ownershipInfo && <p role="status" className="rounded-2xl bg-white p-3 text-xs text-[#204E4A]">{ownershipInfo}</p>}
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between gap-3 rounded-[1.8rem] bg-white/85 p-4 shadow-[0_7px_20px_rgba(32,78,74,0.05)] backdrop-blur-xl"
            >
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={member.pet?.photoUrl}
                  alt={member.pet?.name || ''}
                  className="h-12 w-12 shrink-0 rounded-full bg-[#EAF0E8] object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-black text-[#204E4A]">
                      {member.pet?.name ||
                        (lang === 'es' ? 'Mascota no disponible' : 'Pet unavailable')}
                    </p>
                    {(member.role === 'owner' || member.role === 'admin') && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E1E53F] px-2 py-0.5 text-[11px] font-extrabold uppercase text-[#204E4A]">
                        <IconShield size={10} />
                        {member.role === 'owner' ? 'Propietario' : 'Admin'}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-[#5C7470]">
                    {member.pet?.species || ''}
                    {' · '}
                    {lang === 'es' ? 'desde ' : 'since '}
                    {formatDate(member.joinedAt, lang)}
                  </p>
                </div>
              </div>

              {isOwner && member.role !== 'owner' && (
                <div className="flex flex-wrap justify-end gap-1">
                  {exitUiEnabled && member.role === 'member' && (
                    <button type="button" disabled={ownershipBusy}
                      onClick={()=>setAdminFor(member)}
                      className="rounded-full bg-[#E1E53F]/50 px-3 py-2 text-[12px] font-bold text-[#204E4A] disabled:opacity-40">
                      {lang==='es'?'Designar admin':'Nominate admin'}
                    </button>
                  )}
                  {exitUiEnabled && member.role === 'admin' && !ownershipOffer && (
                    <button type="button" disabled={ownershipBusy}
                      onClick={()=>offerTo(member)}
                      className="rounded-full bg-[#204E4A] px-3 py-2 text-[12px] font-bold text-white disabled:opacity-40">
                      {lang==='es'?'Ofrecer titularidad':'Offer ownership'}
                    </button>
                  )}
                  <button type="button" onClick={() => void handleRemoveMember(member)}
                    className="rounded-full bg-[#FAF8F5] px-3 py-2 text-[12px] font-bold text-[#5C7470]">
                    {lang === 'es' ? 'Retirar' : 'Remove'}
                  </button>
                </div>
              )}
            </div>
          ))}

          {members.length === 0 && (
            <div className="rounded-[2rem] pazo-glass-card p-5 text-xs text-[#5C7470] shadow-sm">
              {lang === 'es' ? 'No hay miembros para mostrar.' : 'No members to show.'}
            </div>
          )}
        </section>
      )}
      </CommunityWorkspace>
    </div>
  )
}
