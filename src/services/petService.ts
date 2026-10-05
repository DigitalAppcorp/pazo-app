import { supabase } from './supabaseClient'
import type { Pet, Species } from '../types/pazo'

const DEFAULT_PET_PHOTO =
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=600&auto=format&fit=crop'

const PUBLIC_PET_COLUMNS = [
  'id',
  'owner_id',
  'name',
  'species',
  'age',
  'photo_url',
  'created_at',
  'bio',
  'breed',
  'gender',
  'is_lost',
  'last_seen_location',
].join(',')

const AVATAR_BUCKET = 'pet-avatars'
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

interface PetPrivateRow {
  pet_id: string
  zone: string | null
  interests: string[] | null
  weight: string | null
  diet_plan: string | null
}

export interface CreatePetProfileInput {
  name: string
  species: Species
  age?: string
  photoUrl?: string
  photoFile?: File | null
  zone?: string
  interests?: string[]
  bio?: string
  breed?: string
  gender?: 'macho' | 'hembra'
}

export interface UpdatePetProfileInput {
  petId: string
  name: string
  species: Species
  age?: string
  photoUrl?: string
  photoFile?: File | null
  bio?: string
  breed?: string
  gender?: 'macho' | 'hembra'
  zone?: string
  interests?: string[]
  weight?: string
  dietPlan?: string
}

const normalizeOptional = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

const mapPetRow = (row: any, privateRow?: PetPrivateRow | null): Pet => ({
  id: row.id,
  name: row.name,
  species: row.species as Species,
  breed: normalizeOptional(row.breed),
  age: normalizeOptional(row.age) || 'Desconocida',
  photoUrl: normalizeOptional(row.photo_url) || DEFAULT_PET_PHOTO,
  gender: row.gender === 'macho' || row.gender === 'hembra' ? row.gender : undefined,
  weight: normalizeOptional(privateRow?.weight),
  dietPlan: normalizeOptional(privateRow?.diet_plan),
  bio: normalizeOptional(row.bio),
  zone: normalizeOptional(privateRow?.zone),
  interests: Array.isArray(privateRow?.interests) ? privateRow?.interests ?? [] : [],
  isLost: row.is_lost ?? false,
  qrId: `PAZO-QR-${row.id}`,
  lastSeenLocation: row.is_lost ? normalizeOptional(row.last_seen_location) : undefined,
})

const validateAvatar = (file: File) => {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('La imagen debe ser menor a 5MB.')
  }

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error('Solo se permiten imágenes JPG, PNG o WEBP.')
  }
}

const avatarExtension = (file: File) => {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export const uploadPetAvatar = async (userId: string, file: File) => {
  validateAvatar(file)

  const path = `${userId}/${crypto.randomUUID()}.${avatarExtension(file)}`
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (error) throw error

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

  return {
    path,
    publicUrl: data.publicUrl,
  }
}

export const removePetAvatar = async (path: string) => {
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path])
  if (error) {
    console.error('No se pudo limpiar el avatar recién subido:', error)
  }
}

const fetchPrivateDetails = async (petIds: string[]) => {
  if (petIds.length === 0) return new Map<string, PetPrivateRow>()

  const { data, error } = await supabase
    .from('pet_private_details')
    .select('pet_id,zone,interests,weight,diet_plan')
    .in('pet_id', petIds)

  if (error) throw error

  return new Map(
    ((data || []) as PetPrivateRow[]).map((row) => [row.pet_id, row])
  )
}

export const fetchOwnedPets = async (ownerId: string): Promise<Pet[]> => {
  const { data, error } = await supabase
    .from('pets')
    .select(PUBLIC_PET_COLUMNS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = data || []
  const privateByPetId = await fetchPrivateDetails(rows.map((row: any) => row.id))

  return rows.map((row: any) => mapPetRow(row, privateByPetId.get(row.id)))
}

export const fetchOwnedPet = async (petId: string): Promise<Pet> => {
  const { data, error } = await supabase
    .from('pets')
    .select(PUBLIC_PET_COLUMNS)
    .eq('id', petId)
    .single()

  if (error) throw error

  const privateByPetId = await fetchPrivateDetails([petId])
  return mapPetRow(data, privateByPetId.get(petId))
}

export const createPetProfile = async (input: CreatePetProfileInput): Promise<Pet> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('No se encontró una sesión activa.')

  let uploadedPath: string | null = null
  let finalPhotoUrl = normalizeOptional(input.photoUrl) || DEFAULT_PET_PHOTO

  try {
    if (input.photoFile) {
      const uploaded = await uploadPetAvatar(user.id, input.photoFile)
      uploadedPath = uploaded.path
      finalPhotoUrl = uploaded.publicUrl
    }

    const { data, error } = await supabase.rpc('create_pet_profile', {
      p_name: input.name.trim(),
      p_species: input.species,
      p_age: input.age?.trim() || null,
      p_photo_url: finalPhotoUrl,
      p_zone: input.zone?.trim() || null,
      p_interests: input.interests || [],
      p_bio: input.bio?.trim() || null,
      p_breed: input.breed?.trim() || null,
      p_gender: input.gender || null,
    })

    if (error) throw error
    if (!data) throw new Error('Supabase no devolvió el ID de la mascota creada.')

    return await fetchOwnedPet(data as string)
  } catch (error) {
    if (uploadedPath) await removePetAvatar(uploadedPath)
    throw error
  }
}

export const updatePetProfile = async (input: UpdatePetProfileInput): Promise<Pet> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('No se encontró una sesión activa.')

  let uploadedPath: string | null = null
  let finalPhotoUrl = normalizeOptional(input.photoUrl) || DEFAULT_PET_PHOTO

  try {
    if (input.photoFile) {
      const uploaded = await uploadPetAvatar(user.id, input.photoFile)
      uploadedPath = uploaded.path
      finalPhotoUrl = uploaded.publicUrl
    }

    const { error } = await supabase.rpc('update_pet_profile', {
      p_pet_id: input.petId,
      p_name: input.name.trim(),
      p_species: input.species,
      p_age: input.age?.trim() || null,
      p_photo_url: finalPhotoUrl,
      p_bio: input.bio?.trim() || null,
      p_breed: input.breed?.trim() || null,
      p_gender: input.gender || null,
      p_zone: input.zone?.trim() || null,
      p_interests: input.interests || [],
      p_weight: input.weight?.trim() || null,
      p_diet_plan: input.dietPlan?.trim() || null,
    })

    if (error) throw error

    return await fetchOwnedPet(input.petId)
  } catch (error) {
    if (uploadedPath) await removePetAvatar(uploadedPath)
    throw error
  }
}
