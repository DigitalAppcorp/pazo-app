import { supabase } from './supabaseClient'
import { wasAuthorDeleted } from '../features/account/deletedAuthorThread'
import type {
  CommunityCreateInput,
  CommunityMember,
  CommunityPost,
  CommunityPostComment,
  CommunitySummary,
  CommunityUpdateInput,
  Species,
} from '../types/pazo'

const COMMUNITY_AVATAR_BUCKET = 'community-avatars'
const COMMUNITY_POST_BUCKET = 'community-post-photos'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const DEFAULT_COMMUNITY_IMAGE =
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?q=80&w=900&auto=format&fit=crop'
const DEFAULT_PET_AVATAR =
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=300&auto=format&fit=crop'

const getAuthUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) throw new Error('No hay una sesión activa.')
  return user
}

const imageExtension = (file: File) => {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

const validateImage = (file: File) => {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('La imagen debe ser menor a 5MB.')
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Solo se permiten imágenes JPG, PNG o WEBP.')
  }
}

const mapCommunity = (
  row: any,
  membership?: { role?: 'owner' | 'admin' | 'member' } | null
): CommunitySummary => ({
  id: row.id,
  ownerUserId: row.owner_user_id,
  name: row.name,
  description: row.description,
  category: row.category,
  species: row.species as Species | undefined,
  zone: row.zone || undefined,
  imageUrl: row.image_url || DEFAULT_COMMUNITY_IMAGE,
  imageStoragePath: row.image_storage_path || undefined,
  rules: row.rules || undefined,
  status: row.status,
  membersCount: row.members_count || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  isJoined: Boolean(membership),
  role: membership?.role,
})

const fetchMembershipMap = async (communityIds: string[]) => {
  if (communityIds.length === 0) return new Map<string, { role: 'owner' | 'admin' | 'member' }>()

  const user = await getAuthUser()
  const { data, error } = await supabase
    .from('community_memberships')
    .select('community_id,role')
    .eq('user_id', user.id)
    .in('community_id', communityIds)

  if (error) throw error

  return new Map(
    (data || []).map((row: any) => [
      row.community_id,
      { role: row.role as 'owner' | 'admin' | 'member' },
    ])
  )
}

export const fetchCommunitySummaries = async ({
  search = '',
  limit = 20,
  offset = 0,
}: {
  search?: string
  limit?: number
  offset?: number
} = {}): Promise<CommunitySummary[]> => {
  let query = supabase
    .from('communities')
    .select(
      'id,owner_user_id,name,description,category,species,zone,image_url,image_storage_path,rules,status,members_count,created_at,updated_at'
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)

  const trimmed = search.trim()
  if (trimmed) {
    query = query.ilike('name', `%${trimmed}%`)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data || []
  const membershipMap = await fetchMembershipMap(rows.map((row: any) => row.id))

  return rows.map((row: any) =>
    mapCommunity(row, membershipMap.get(row.id))
  )
}

export const fetchCommunityById = async (
  communityId: string
): Promise<CommunitySummary> => {
  const { data, error } = await supabase
    .from('communities')
    .select(
      'id,owner_user_id,name,description,category,species,zone,image_url,image_storage_path,rules,status,members_count,created_at,updated_at'
    )
    .eq('id', communityId)
    .single()

  if (error) throw error

  const membershipMap = await fetchMembershipMap([communityId])
  return mapCommunity(data, membershipMap.get(communityId))
}

export const fetchCommunityMembers = async (
  communityId: string,
  limit = 30,
  offset = 0
): Promise<CommunityMember[]> => {
  const { data, error } = await supabase
    .from('community_memberships')
    .select(
      `
        community_id,
        user_id,
        display_pet_id,
        role,
        joined_at,
        display_pet:pets!community_memberships_display_pet_id_fkey (
          id,
          name,
          species,
          photo_url
        )
      `
    )
    .eq('community_id', communityId)
    .order('joined_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return (data || []).map((row: any) => {
    const pet = Array.isArray(row.display_pet)
      ? row.display_pet[0]
      : row.display_pet

    return {
      userId: row.user_id,
      displayPetId: row.display_pet_id || undefined,
      role: row.role,
      joinedAt: row.joined_at,
      pet: pet
        ? {
            id: pet.id,
            name: pet.name,
            species: pet.species,
            photoUrl: pet.photo_url || DEFAULT_PET_AVATAR,
          }
        : undefined,
    }
  })
}

export const createCommunity = async (
  input: CommunityCreateInput,
  displayPetId: string
): Promise<string> => {
  const user = await getAuthUser()

  const { data, error } = await supabase.rpc('create_community', {
    p_name: input.name.trim(),
    p_description: input.description.trim(),
    p_category: input.category.trim(),
    p_species: input.species || null,
    p_zone: input.zone?.trim() || null,
    p_rules: input.rules?.trim() || null,
    p_display_pet_id: displayPetId,
  })

  if (error) throw error

  const communityId = data as string
  if (!communityId) throw new Error('No se recibió el ID de la comunidad.')

  if (input.imageFile) {
    try {
      validateImage(input.imageFile)
      const path = `${communityId}/${user.id}/${crypto.randomUUID()}.${imageExtension(
        input.imageFile
      )}`

      const { error: uploadError } = await supabase.storage
        .from(COMMUNITY_AVATAR_BUCKET)
        .upload(path, input.imageFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: input.imageFile.type,
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from(COMMUNITY_AVATAR_BUCKET)
        .getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('communities')
        .update({ image_url: publicUrlData.publicUrl, image_storage_path: path })
        .eq('id', communityId)

      if (updateError) {
        await supabase.storage.from(COMMUNITY_AVATAR_BUCKET).remove([path])
        throw updateError
      }
    } catch (imageError) {
      console.error(
        'La comunidad se creó, pero no se pudo guardar su imagen:',
        imageError
      )
    }
  }

  return communityId
}

export const updateCommunity = async (
  communityId: string,
  input: CommunityUpdateInput
) => {
  const payload: Record<string, unknown> = {}

  if (input.name !== undefined) payload.name = input.name.trim()
  if (input.description !== undefined) payload.description = input.description.trim()
  if (input.category !== undefined) payload.category = input.category.trim()
  if (input.species !== undefined) payload.species = input.species
  if (input.zone !== undefined) payload.zone = input.zone?.trim() || null
  if (input.rules !== undefined) payload.rules = input.rules?.trim() || null
  if (input.imageUrl !== undefined) payload.image_url = input.imageUrl
  if (input.imageStoragePath !== undefined) payload.image_storage_path = input.imageStoragePath
  if (input.status !== undefined) payload.status = input.status

  const { error } = await supabase
    .from('communities')
    .update(payload)
    .eq('id', communityId)

  if (error) throw error
}

export const joinCommunity = async (
  communityId: string,
  displayPetId: string
) => {
  const { error } = await supabase.from('community_memberships').insert({
    community_id: communityId,
    display_pet_id: displayPetId,
  })

  if (error && error.code !== '23505') throw error
}

export const leaveCommunity = async (communityId: string) => {
  const user = await getAuthUser()
  const { error } = await supabase
    .from('community_memberships')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', user.id)

  if (error) throw error
}

export const removeCommunityMember = async (
  communityId: string,
  userId: string
) => {
  const { error } = await supabase
    .from('community_memberships')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId)

  if (error) throw error
}

const fetchCommunityOwnerUserId = async (communityId: string) => {
  const { data, error } = await supabase
    .from('communities')
    .select('owner_user_id')
    .eq('id', communityId)
    .single()

  if (error) throw error
  return data.owner_user_id as string
}

export const fetchCommunityPosts = async (
  communityId: string,
  actorPetId: string | undefined,
  limit = 20,
  offset = 0
): Promise<CommunityPost[]> => {
  const user = await getAuthUser()
  const ownerUserId = await fetchCommunityOwnerUserId(communityId)

  const { data, error } = await supabase
    .from('community_posts')
    .select(
      `
        id,
        community_id,
        author_user_id,
        author_pet_id,
        body,
        photo_url,
        photo_storage_path,
        likes_count,
        comments_count,
        created_at,
        ${import.meta.env.VITE_F14_DELETED_AUTHOR_THREADS_ENABLED === 'true' ? 'author_deleted_at,' : ''}
        author:pets!community_posts_author_pet_id_fkey (
          id,
          name,
          species,
          photo_url
        )
      `
    )
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  const rows = data || []
  const likedPostIds = new Set<string>()

  if (actorPetId && rows.length > 0) {
    const { data: likes, error: likesError } = await supabase
      .from('community_post_likes')
      .select('post_id')
      .eq('actor_pet_id', actorPetId)
      .in(
        'post_id',
        rows.map((row: any) => row.id)
      )

    if (likesError) throw likesError
    ;(likes || []).forEach((row: any) => likedPostIds.add(row.post_id))
  }

  return rows.map((row: any) => {
    const author = Array.isArray(row.author) ? row.author[0] : row.author
    const deleted = wasAuthorDeleted(row)

    return {
      id: row.id,
      communityId: row.community_id,
      authorUserId: deleted ? '' : (row.author_user_id || ''),
      authorPetId: deleted ? '' : (row.author_pet_id || ''),
      isAuthorDeleted: deleted,
      authorName: deleted ? 'Autor eliminado' : (author?.name || 'Mascota'),
      authorSpecies: deleted ? 'otro' : ((author?.species || 'otro') as Species),
      authorAvatar: deleted ? '' : (author?.photo_url || DEFAULT_PET_AVATAR),
      body: deleted ? '' : row.body,
      photoUrl: deleted ? undefined : (row.photo_url || undefined),
      photoStoragePath: deleted ? undefined : (row.photo_storage_path || undefined),
      likesCount: row.likes_count || 0,
      commentsCount: row.comments_count || 0,
      createdAt: row.created_at,
      isLiked: likedPostIds.has(row.id),
      canDelete: !deleted && (row.author_user_id === user.id || ownerUserId === user.id),
    }
  })
}

export const createCommunityPost = async ({
  communityId,
  authorPetId,
  body,
  imageFile,
}: {
  communityId: string
  authorPetId: string
  body: string
  imageFile?: File | null
}) => {
  const user = await getAuthUser()
  let storagePath: string | null = null
  let photoUrl: string | null = null

  try {
    if (imageFile) {
      validateImage(imageFile)
      storagePath = `${communityId}/${user.id}/${crypto.randomUUID()}.${imageExtension(
        imageFile
      )}`

      const { error: uploadError } = await supabase.storage
        .from(COMMUNITY_POST_BUCKET)
        .upload(storagePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: imageFile.type,
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from(COMMUNITY_POST_BUCKET)
        .getPublicUrl(storagePath)

      photoUrl = data.publicUrl
    }

    const { error } = await supabase.from('community_posts').insert({
      community_id: communityId,
      author_pet_id: authorPetId,
      body: body.trim(),
      photo_url: photoUrl,
      photo_storage_path: storagePath,
    })

    if (error) throw error
  } catch (error) {
    if (storagePath) {
      const { error: cleanupError } = await supabase.storage
        .from(COMMUNITY_POST_BUCKET)
        .remove([storagePath])
      if (cleanupError) {
        console.error('No se pudo limpiar la foto del post fallido:', cleanupError)
      }
    }

    throw error
  }
}

export const deleteCommunityPost = async (post: CommunityPost) => {
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', post.id)

  if (error) throw error

  if (post.photoStoragePath) {
    const { error: storageError } = await supabase.storage
      .from(COMMUNITY_POST_BUCKET)
      .remove([post.photoStoragePath])

    if (storageError) {
      console.error('Post eliminado; limpieza de imagen pendiente:', storageError)
    }
  }
}

export const toggleCommunityPostLike = async ({
  postId,
  actorPetId,
  isLiked,
}: {
  postId: string
  actorPetId: string
  isLiked: boolean
}) => {
  if (isLiked) {
    const { error } = await supabase
      .from('community_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('actor_pet_id', actorPetId)

    if (error) throw error
    return
  }

  const { error } = await supabase.from('community_post_likes').insert({
    post_id: postId,
    actor_pet_id: actorPetId,
  })

  if (error && error.code !== '23505') throw error
}

export const fetchCommunityPostComments = async (
  postId: string,
  limit = 20,
  offset = 0
): Promise<CommunityPostComment[]> => {
  const user = await getAuthUser()

  const { data: postRow, error: postError } = await supabase
    .from('community_posts')
    .select(
      `
        community_id,
        community:communities!community_posts_community_id_fkey (
          owner_user_id
        )
      `
    )
    .eq('id', postId)
    .single()

  if (postError) throw postError

  const community = Array.isArray((postRow as any).community)
    ? (postRow as any).community[0]
    : (postRow as any).community
  const isOwner = community?.owner_user_id === user.id

  const { data, error } = await supabase
    .from('community_post_comments')
    .select(
      `
        id,
        post_id,
        author_pet_id,
        body,
        created_at,
        author:pets!community_post_comments_author_pet_id_fkey (
          id,
          owner_id,
          name,
          species,
          photo_url
        )
      `
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return (data || []).map((row: any) => {
    const author = Array.isArray(row.author) ? row.author[0] : row.author

    return {
      id: row.id,
      postId: row.post_id,
      authorPetId: row.author_pet_id,
      authorName: author?.name || 'Mascota',
      authorSpecies: (author?.species || 'otro') as Species,
      authorAvatar: author?.photo_url || DEFAULT_PET_AVATAR,
      body: row.body,
      createdAt: row.created_at,
      canDelete: isOwner || author?.owner_id === user.id,
    }
  })
}

export const addCommunityPostComment = async ({
  postId,
  authorPetId,
  body,
}: {
  postId: string
  authorPetId: string
  body: string
}) => {
  const { error } = await supabase.from('community_post_comments').insert({
    post_id: postId,
    author_pet_id: authorPetId,
    body: body.trim(),
  })

  if (error) throw error
}

export const deleteCommunityPostComment = async (commentId: string) => {
  const { error } = await supabase
    .from('community_post_comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error
}


export const replaceCommunityImage = async (
  community: CommunitySummary,
  file: File
) => {
  validateImage(file)
  const user = await getAuthUser()
  const newPath = `${community.id}/${user.id}/${crypto.randomUUID()}.${imageExtension(file)}`

  const { error: uploadError } = await supabase.storage
    .from(COMMUNITY_AVATAR_BUCKET)
    .upload(newPath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from(COMMUNITY_AVATAR_BUCKET)
    .getPublicUrl(newPath)

  try {
    await updateCommunity(community.id, {
      imageUrl: data.publicUrl,
      imageStoragePath: newPath,
    })
  } catch (error) {
    await supabase.storage.from(COMMUNITY_AVATAR_BUCKET).remove([newPath])
    throw error
  }

  if (community.imageStoragePath) {
    const { error: cleanupError } = await supabase.storage
      .from(COMMUNITY_AVATAR_BUCKET)
      .remove([community.imageStoragePath])

    if (cleanupError) {
      console.error('La portada se actualizó; limpieza anterior pendiente:', cleanupError)
    }
  }
}
