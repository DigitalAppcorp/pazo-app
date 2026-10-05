import { supabase } from './supabaseClient'
import type { PazoNotification } from '../types/pazo'

export interface PublicRescueProfile {
  name: string
  species: string
  breed?: string | null
  photoUrl?: string | null
  bio?: string | null
  isLost: boolean
  lastSeenLocation?: string | null
  alertLastSeenAt?: string | null
  alertDetails?: string | null
}

export interface ActiveLostPetAlert {
  id: string
  petId: string
  lastSeenLocation: string
  lastSeenAt: string
  details?: string | null
  createdAt: string
}

export interface SightingDetail {
  id: string
  petId: string
  petName: string
  petPhotoUrl?: string | null
  reporterName?: string | null
  reporterPhone?: string | null
  message: string
  locationText?: string | null
  createdAt: string
}

export const getPetPublicToken = async (petId: string): Promise<string> => {
  const { data, error } = await supabase
    .from('pet_public_links')
    .select('public_token')
    .eq('pet_id', petId)
    .single()

  if (error) throw error
  return data.public_token
}

export const buildPublicRescueUrl = (
  token: string,
  source?: 'preview'
) =>
  `${window.location.origin}${window.location.pathname}#/rescue/${token}${source === 'preview' ? '?from=preview' : ''}`

export const rotatePetPublicToken = async (petId: string): Promise<string> => {
  const { data, error } = await supabase.rpc('rotate_pet_public_link', {
    p_pet_id: petId,
  })

  if (error) throw error
  return data as string
}

export const fetchPublicRescueProfile = async (token: string): Promise<PublicRescueProfile | null> => {
  const { data, error } = await supabase.rpc('get_public_pet_rescue_profile', {
    p_token: token,
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null

  return {
    name: row.name,
    species: row.species,
    breed: row.breed,
    photoUrl: row.photo_url,
    bio: row.bio,
    isLost: Boolean(row.is_lost),
    lastSeenLocation: row.last_seen_location,
    alertLastSeenAt: row.alert_last_seen_at,
    alertDetails: row.alert_details,
  }
}

export const submitPublicSighting = async (
  token: string,
  reporterName: string,
  reporterPhone: string,
  message: string,
  location?: string
): Promise<string> => {
  const { data, error } = await supabase.rpc('submit_pet_sighting', {
    p_token: token,
    p_reporter_name: reporterName.trim(),
    p_reporter_phone: reporterPhone.trim(),
    p_message: message.trim(),
    p_location: location?.trim() || null,
  })

  if (error) throw error
  return data as string
}

export const fetchActiveLostPetAlert = async (petId: string): Promise<ActiveLostPetAlert | null> => {
  const { data, error } = await supabase
    .from('lost_pet_alerts')
    .select('id,pet_id,last_seen_location,last_seen_at,details,created_at')
    .eq('pet_id', petId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    petId: data.pet_id,
    lastSeenLocation: data.last_seen_location,
    lastSeenAt: data.last_seen_at,
    details: data.details,
    createdAt: data.created_at,
  }
}

export const activateLostPetAlert = async (
  petId: string,
  lastSeenLocation: string,
  lastSeenAt: string,
  details?: string
): Promise<string> => {
  const { data, error } = await supabase.rpc('activate_lost_pet_alert', {
    p_pet_id: petId,
    p_last_seen_location: lastSeenLocation.trim(),
    p_last_seen_at: lastSeenAt,
    p_details: details?.trim() || null,
  })

  if (error) throw error
  return data as string
}

export const resolveLostPetAlert = async (petId: string): Promise<void> => {
  const { error } = await supabase.rpc('resolve_lost_pet_alert', {
    p_pet_id: petId,
  })

  if (error) throw error
}

export const fetchSightingDetail = async (sightingId: string): Promise<SightingDetail> => {
  const { data: sighting, error: sightingError } = await supabase
    .from('pet_sightings')
    .select('id,pet_id,reporter_name,reporter_phone,message,location_text,created_at')
    .eq('id', sightingId)
    .single()

  if (sightingError) throw sightingError

  const { data: pet, error: petError } = await supabase
    .from('pets')
    .select('id,name,photo_url')
    .eq('id', sighting.pet_id)
    .single()

  if (petError) throw petError

  return {
    id: sighting.id,
    petId: sighting.pet_id,
    petName: pet.name,
    petPhotoUrl: pet.photo_url,
    reporterName: sighting.reporter_name,
    reporterPhone: sighting.reporter_phone,
    message: sighting.message,
    locationText: sighting.location_text,
    createdAt: sighting.created_at,
  }
}

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) throw error
}

export const fetchNotifications = async (): Promise<PazoNotification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('id,type,title,body,read_at,created_at,pet_id,source_id')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    subtitle: row.body,
    category: row.type === 'sighting' ? 'comunidad' : 'todas',
    timeAgo: 'Reciente',
    read: Boolean(row.read_at),
    createdAt: row.created_at,
    petId: row.pet_id,
    sourceId: row.source_id,
  }))
}

