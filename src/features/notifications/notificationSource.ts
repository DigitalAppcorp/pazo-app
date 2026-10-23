import type { PazoNotification } from '../../types/pazo'

interface NotificationRow {
  supporter_copy_version?: string | null
  supporter_state?: string | null
  id: string
  type: string
  title: string
  body: string
  read_at: string | null
  created_at: string
  pet_id: string | null
  source_id: string | null
}

export const mapNotificationRow = (row: NotificationRow): PazoNotification => ({
  id: row.id,
  supporterState: row.supporter_state,
  supporterCopyVersion: row.supporter_copy_version,
  title: row.title,
  subtitle: row.body,
  category: row.type === 'sighting' ? 'comunidad' : 'todas',
  sourceType: row.type,
  timeAgo: 'Reciente',
  read: Boolean(row.read_at),
  createdAt: row.created_at,
  petId: row.pet_id,
  sourceId: row.source_id,
})

// A UUID by itself does not establish the kind of entity it references.
export const getNotificationSightingId = (notification: PazoNotification) =>
  notification.sourceType === 'sighting' && notification.category === 'comunidad'
    ? notification.sourceId || null
    : null

// A community UUID must be explicitly typed. Never treat arbitrary UUIDs as navigable.
export const getNotificationCommunityId = (notification: PazoNotification) =>
  notification.sourceType === 'community_join'
    ? notification.sourceId || null
    : null
