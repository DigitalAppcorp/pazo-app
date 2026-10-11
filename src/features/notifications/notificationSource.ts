import type { PazoNotification } from '../../types/pazo'

interface NotificationRow {
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
