export type Species = 'gato' | 'perro' | 'conejo' | 'ave' | 'otro'

export interface Pet {
  id: string
  name: string
  species: Species
  breed: string
  age: string
  photoUrl: string
  gender: 'macho' | 'hembra'
  weight?: string
  dietPlan?: string
  bio?: string
  isLost?: boolean
  qrId: string
  lastSeenLocation?: string
}

export interface PostComment {
  id: string
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
  photoUrl: string
  likes: number
  isLiked?: boolean
  isSaved?: boolean
  comments: PostComment[]
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

export interface CareItem {
  id: string
  title: string
  type: 'veterinaria' | 'vacuna' | 'alimentacion' | 'medicamento' | 'higiene'
  date: string
  time: string
  completed: boolean
  repeat: string
  reminder: string
  notes?: string
}

export interface PrivateDoc {
  id: string
  title: string
  fileName: string
  fileSize: string
  dateUploaded: string
  category: 'vacunas' | 'historial' | 'identificacion'
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
}