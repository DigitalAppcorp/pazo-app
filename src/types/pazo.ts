export type Species = 'gato' | 'perro' | 'conejo' | 'ave' | 'otro'

export interface Pet {
  id: string
  name: string
  species: Species
  breed?: string
  age: string
  photoUrl: string
  gender?: 'macho' | 'hembra'
  weight?: string
  dietPlan?: string
  bio?: string
  zone?: string
  interests?: string[]
  isLost?: boolean
  qrId: string
  lastSeenLocation?: string
}

export interface PostComment {
  id: string
  authorPetId?: string
  authorName: string
  authorPet: string
  authorAvatar: string
  text: string
  timeAgo: string
  createdAt?: string // Soporte nativo para timestamp dinámico en comentarios
}

export interface Post {
  id: string
  petId: string
  petName: string
  petSpecies: Species
  petAvatar: string
  location: string
  timeAgo: string
  createdAt?: string      // Soporte nativo para el cálculo inteligente de tiempo
  isRecommended?: boolean // Soporte nativo para el motor algorítmico tipo Instagram
  tags?: string[]         // <--- Añadido para asociar intereses y categorías al post
  text: string
  photoUrl?: string | null
  likes: number
  isLiked?: boolean
  isSaved?: boolean
  comments: PostComment[]
  commentsCount?: number
  commentsLoaded?: boolean
}

export type CommunityRole = 'owner' | 'admin' | 'member'
export type CommunityStatus = 'active' | 'archived'

export interface CommunitySummary {
  id: string
  ownerUserId: string | null
  name: string
  description: string
  category: string
  species?: Species
  zone?: string
  imageUrl?: string
  imageStoragePath?: string
  rules?: string
  status: CommunityStatus
  membersCount: number
  createdAt: string
  updatedAt: string
  isJoined: boolean
  role?: CommunityRole
}

export interface CommunityMember {
  userId: string
  displayPetId?: string
  role: CommunityRole
  joinedAt: string
  pet?: {
    id: string
    name: string
    species: Species
    photoUrl: string
  }
}

export interface CommunityPostComment {
  id: string
  postId: string
  authorPetId: string
  authorName: string
  authorSpecies: Species
  authorAvatar: string
  body: string
  createdAt: string
  canDelete: boolean
}

export interface CommunityPost {
  id: string
  communityId: string
  authorUserId: string
  authorPetId: string
  authorName: string
  authorSpecies: Species
  authorAvatar: string
  body: string
  photoUrl?: string
  photoStoragePath?: string
  likesCount: number
  commentsCount: number
  createdAt: string
  isLiked: boolean
  canDelete: boolean
}

export interface CommunityCreateInput {
  name: string
  description: string
  category: string
  species?: Species
  zone?: string
  rules?: string
  imageFile?: File | null
}

export interface CommunityUpdateInput {
  name?: string
  description?: string
  category?: string
  species?: Species | null
  zone?: string | null
  rules?: string | null
  imageUrl?: string | null
  imageStoragePath?: string | null
  status?: CommunityStatus
}

// Legacy mock shape retained temporarily for non-real demo data only.
export interface Community {
  id: string
  name: string
  species: Species
  tagline: string
  membersCount: number
  photoUrl: string
  isJoined?: boolean
}

export type PlaceCategory =
  | 'park'
  | 'trail'
  | 'food'
  | 'veterinary'
  | 'grooming'
  | 'pet_store'

export type PlaceStatus = 'active' | 'archived'

export interface VisiblePlacePet {
  id: string
  name: string
  species: Species
  photoUrl: string
}

export interface PetPlace {
  id: string
  name: string
  category: PlaceCategory
  zone: string
  address: string
  latitude: number
  longitude: number
  hours?: string
  speciesAllowed?: string
  petRules?: string
  description?: string
  photoUrl?: string
  status: PlaceStatus
  source: string
  createdAt?: string
  updatedAt?: string
  distanceKm?: number
  activePresenceCount?: number
  visiblePets?: VisiblePlacePet[]
}

export interface ActivePlaceCheckin {
  id: string
  placeId: string
  petId: string
  visible: boolean
  checkedInAt: string
  expiresAt: string
}

export interface PlaceSuggestionInput {
  name: string
  category: PlaceCategory
  address: string
  zone?: string
  note?: string
}

export type PlaceUsageEventType =
  | 'map_open'
  | 'use_location'
  | 'place_open'
  | 'search'
  | 'filter'

export interface PlaceBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface EphemeralLocation {
  latitude: number
  longitude: number
}

export type CareCategory =
  | 'veterinarian'
  | 'vaccine'
  | 'medication'
  | 'hygiene'
  | 'feeding'
  | 'other'

export type CareRecurrence =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'

export type CareReminderDays = 0 | 1 | 2 | 7 | null

export interface CareItem {
  id: string
  petId: string
  title: string
  category: CareCategory
  dueDate: string
  dueTime?: string | null
  timezone: string
  recurrence: CareRecurrence
  reminderDaysBefore: CareReminderDays
  notes?: string | null
  status: 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface CareCompletion {
  id: string
  careItemId: string
  petId: string
  scheduledDate: string
  scheduledTime?: string | null
  completedAt: string
  title: string
  category: CareCategory
  notes?: string | null
  recurrence: CareRecurrence
}

export interface CareItemInput {
  title: string
  category: CareCategory
  dueDate: string
  dueTime?: string | null
  timezone: string
  recurrence: CareRecurrence
  reminderDaysBefore: CareReminderDays
  notes?: string | null
}

export type DocumentCategory =
  | 'vaccines'
  | 'medical_history'
  | 'identification'
  | 'results'
  | 'other'

export interface PetDocument {
  id: string
  petId: string
  title: string
  category: DocumentCategory
  originalFileName: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  status: 'uploading' | 'active' | 'deleting'
  createdAt: string
  updatedAt: string
}

export interface MessageItem {
  id: string
  sender: 'me' | 'them'
  text: string
  timestamp: string
}

export interface Conversation {
  id: string
  personName: string
  petName: string
  petSpecies: Species
  petAvatar: string
  lastMessage: string
  timeAgo: string
  isRequest: boolean
  messages: MessageItem[]
}

export interface PazoNotification {
  id: string
  title: string
  subtitle: string
  category: 'todas' | 'cuidados' | 'comunidad'
  timeAgo: string
  read: boolean
  createdAt?: string
  petId?: string | null
  sourceId?: string | null
}