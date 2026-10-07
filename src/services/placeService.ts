import { supabase } from './supabaseClient'
import type {
  PetPlace,
  PlaceBounds,
  PlaceCategory,
  PlaceSuggestionInput,
  VisiblePlacePet,
} from '../types/pazo'

const DEFAULT_PLACE_PHOTO =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=900&auto=format&fit=crop'

const mapPlace = (row: any): PetPlace => ({
  id: row.id,
  name: row.name,
  category: row.category as PlaceCategory,
  zone: row.zone,
  address: row.address,
  latitude: Number(row.latitude),
  longitude: Number(row.longitude),
  hours: row.hours || undefined,
  speciesAllowed: row.species_allowed || undefined,
  petRules: row.pet_rules || undefined,
  description: row.description || undefined,
  photoUrl: row.photo_url || DEFAULT_PLACE_PHOTO,
  status: row.status,
  source: row.source,
  createdAt: row.created_at || undefined,
  updatedAt: row.updated_at || undefined,
})

export const fetchPlaces = async ({
  category,
  search = '',
  bounds,
  limit = 120,
}: {
  category?: PlaceCategory
  search?: string
  bounds?: PlaceBounds
  limit?: number
} = {}): Promise<PetPlace[]> => {
  let query = supabase
    .from('pet_places')
    .select(
      'id,name,category,zone,address,latitude,longitude,hours,species_allowed,pet_rules,description,photo_url,status,source,created_at,updated_at'
    )
    .eq('status', 'active')
    .order('name', { ascending: true })
    .limit(limit)

  if (category) {
    query = query.eq('category', category)
  }

  const trimmed = search.trim()
  if (trimmed) {
    const safe = trimmed.replace(/[%_,]/g, ' ')
    query = query.or(
      `name.ilike.%${safe}%,zone.ilike.%${safe}%,address.ilike.%${safe}%`
    )
  }

  if (bounds) {
    query = query
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east)
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []).map(mapPlace)
}

export const fetchPlacePresence = async (
  placeIds: string[]
): Promise<
  Map<
    string,
    {
      count: number
      visiblePets: VisiblePlacePet[]
    }
  >
> => {
  const result = new Map<
    string,
    {
      count: number
      visiblePets: VisiblePlacePet[]
    }
  >()

  if (placeIds.length === 0) return result

  const { data, error } = await supabase
    .from('pet_place_presence')
    .select(
      `
        place_id,
        visible_pet_id,
        expires_at,
        visible_pet:pets!pet_place_presence_visible_pet_id_fkey (
          id,
          name,
          species,
          photo_url
        )
      `
    )
    .in('place_id', placeIds)

  if (error) throw error

  for (const row of data || []) {
    const current = result.get(row.place_id) || {
      count: 0,
      visiblePets: [],
    }

    current.count += 1

    const rawPet = Array.isArray((row as any).visible_pet)
      ? (row as any).visible_pet[0]
      : (row as any).visible_pet

    if (row.visible_pet_id && rawPet) {
      current.visiblePets.push({
        id: rawPet.id,
        name: rawPet.name,
        species: rawPet.species,
        photoUrl: rawPet.photo_url || DEFAULT_PLACE_PHOTO,
      })
    }

    result.set(row.place_id, current)
  }

  return result
}

export const enrichPlacesWithPresence = async (
  places: PetPlace[]
): Promise<PetPlace[]> => {
  const presence = await fetchPlacePresence(places.map((place) => place.id))

  return places.map((place) => {
    const current = presence.get(place.id)
    return {
      ...place,
      activePresenceCount: current?.count || 0,
      visiblePets: current?.visiblePets || [],
    }
  })
}

export const submitPlaceSuggestion = async (
  input: PlaceSuggestionInput
) => {
  const { error } = await supabase.from('place_suggestions').insert({
    name: input.name.trim(),
    category: input.category,
    address: input.address.trim(),
    zone: input.zone?.trim() || null,
    note: input.note?.trim() || null,
  })

  if (error) throw error
}

export const haversineDistanceKm = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) => {
  const radiusKm = 6371
  const toRadians = (value: number) => (value * Math.PI) / 180

  const dLat = toRadians(to.latitude - from.latitude)
  const dLon = toRadians(to.longitude - from.longitude)
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const addDistances = (
  places: PetPlace[],
  location?: { latitude: number; longitude: number } | null
): PetPlace[] => {
  if (!location) return places

  return places
    .map((place) => ({
      ...place,
      distanceKm: haversineDistanceKm(location, {
        latitude: place.latitude,
        longitude: place.longitude,
      }),
    }))
    .sort(
      (a, b) =>
        (a.distanceKm ?? Number.POSITIVE_INFINITY) -
        (b.distanceKm ?? Number.POSITIVE_INFINITY)
    )
}
