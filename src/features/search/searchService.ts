import { supabase } from '../../services/supabaseClient'
import type {
  GlobalSearchResponse,
  GlobalSearchResult,
  SearchEntityType,
} from './types'

const PROVIDER_LIMIT = 20
const MAX_QUERY_LENGTH = 80

const sanitizeSearchTerm = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUERY_LENGTH)

const normalizeForRank = (value: string) =>
  value.normalize('NFKC').trim().toLocaleLowerCase()

const rank = (
  name: string,
  secondaryValues: Array<string | null | undefined>,
  query: string
) => {
  const normalizedName = normalizeForRank(name)
  const normalizedQuery = normalizeForRank(query)

  if (normalizedName === normalizedQuery) return 0
  if (normalizedName.startsWith(normalizedQuery)) return 1
  if (normalizedName.includes(normalizedQuery)) return 2

  const secondary = secondaryValues
    .filter(Boolean)
    .map((value) => normalizeForRank(String(value)))

  return secondary.some((value) => value.includes(normalizedQuery)) ? 3 : 4
}

const sortByRank = <T>(
  rows: T[],
  query: string,
  getName: (row: T) => string,
  getSecondary: (row: T) => Array<string | null | undefined>
) =>
  [...rows].sort((a, b) => {
    const scoreDiff =
      rank(getName(a), getSecondary(a), query) -
      rank(getName(b), getSecondary(b), query)

    if (scoreDiff !== 0) return scoreDiff

    return getName(a).localeCompare(getName(b), undefined, {
      sensitivity: 'base',
    })
  })

export const searchPublicPets = async (
  rawQuery: string
): Promise<GlobalSearchResult[]> => {
  const query = sanitizeSearchTerm(rawQuery)
  if (!query) return []

  const { data, error } = await supabase
    .from('pets')
    .select('id,name,species,breed,photo_url')
    .or(
      `name.ilike.%${query}%,species.ilike.%${query}%,breed.ilike.%${query}%`
    )
    .limit(PROVIDER_LIMIT)

  if (error) throw error

  const rows = sortByRank(
    data || [],
    query,
    (row: any) => row.name,
    (row: any) => [row.species, row.breed]
  )

  return rows.map((row: any) => ({
    type: 'pet' as const,
    id: row.id,
    title: row.name,
    subtitle: [row.species, row.breed].filter(Boolean).join(' · '),
    imageUrl: row.photo_url || undefined,
  }))
}

export const searchCommunities = async (
  rawQuery: string
): Promise<GlobalSearchResult[]> => {
  const query = sanitizeSearchTerm(rawQuery)
  if (!query) return []

  const { data, error } = await supabase
    .from('communities')
    .select(
      'id,name,description,category,species,zone,image_url,members_count'
    )
    .eq('status', 'active')
    .or(
      `name.ilike.%${query}%,category.ilike.%${query}%,species.ilike.%${query}%,zone.ilike.%${query}%`
    )
    .limit(PROVIDER_LIMIT)

  if (error) throw error

  const rows = sortByRank(
    data || [],
    query,
    (row: any) => row.name,
    (row: any) => [row.category, row.species, row.zone]
  )

  return rows.map((row: any) => ({
    type: 'community' as const,
    id: row.id,
    title: row.name,
    subtitle: row.description || undefined,
    imageUrl: row.image_url || undefined,
    meta: [
      row.species,
      row.zone,
      typeof row.members_count === 'number'
        ? String(row.members_count)
        : undefined,
    ].filter(Boolean) as string[],
  }))
}

export const searchPlaces = async (
  rawQuery: string
): Promise<GlobalSearchResult[]> => {
  const query = sanitizeSearchTerm(rawQuery)
  if (!query) return []

  const { data, error } = await supabase
    .from('pet_places')
    .select('id,name,category,zone,address,photo_url')
    .eq('status', 'active')
    .or(
      `name.ilike.%${query}%,zone.ilike.%${query}%,address.ilike.%${query}%`
    )
    .limit(PROVIDER_LIMIT)

  if (error) throw error

  const rows = sortByRank(
    data || [],
    query,
    (row: any) => row.name,
    (row: any) => [row.zone, row.address, row.category]
  )

  return rows.map((row: any) => ({
    type: 'place' as const,
    id: row.id,
    title: row.name,
    subtitle: row.address,
    imageUrl: row.photo_url || undefined,
    meta: [row.category, row.zone].filter(Boolean),
  }))
}

export const searchGlobal = async (
  rawQuery: string
): Promise<GlobalSearchResponse> => {
  const query = sanitizeSearchTerm(rawQuery)

  if (!query) {
    return {
      pets: [],
      communities: [],
      places: [],
      failedTypes: [],
    }
  }

  const providerTypes: SearchEntityType[] = ['pet', 'community', 'place']
  const settled = await Promise.allSettled([
    searchPublicPets(query),
    searchCommunities(query),
    searchPlaces(query),
  ])

  const response: GlobalSearchResponse = {
    pets: [],
    communities: [],
    places: [],
    failedTypes: [],
  }

  settled.forEach((result, index) => {
    const type = providerTypes[index]

    if (result.status === 'rejected') {
      response.failedTypes.push(type)
      return
    }

    if (type === 'pet') response.pets = result.value
    if (type === 'community') response.communities = result.value
    if (type === 'place') response.places = result.value
  })

  return response
}
