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

export interface Community {
  id: string
  name: string
  species: Species
  tagline: string
  membersCount: number
  photoUrl: string
  isJoined?: boolean
}

export interface PetPlace {
  id: string
  name: string
  type: 'parque' | 'cafeteria' | 'playa' | 'veterinaria'
  zone: string
  address: string
  hours: string
  speciesAllowed: string
  description: string
  photoUrl: string
  activeCheckIns: number
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