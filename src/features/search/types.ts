export type SearchEntityType = 'pet' | 'community' | 'place'

export interface GlobalSearchResult {
  ownerUserId?: string
  type: SearchEntityType
  id: string
  title: string
  subtitle?: string
  imageUrl?: string
  meta?: string[]
}

export interface GlobalSearchResponse {
  pets: GlobalSearchResult[]
  communities: GlobalSearchResult[]
  places: GlobalSearchResult[]
  failedTypes: SearchEntityType[]
}

export type SearchFilter = 'all' | SearchEntityType
