import type { PazoNotification } from '../../types/pazo'
import { isVaccineType } from '../care/vaccineTypes.ts'

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
  alert_reason?: string | null
  alert_vaccine_type?: string | null
  alert_answer?: string | null
}

export const mapNotificationRow = (row: NotificationRow): PazoNotification => ({
  id: row.id,
  supporterState: row.supporter_state,
  supporterCopyVersion: row.supporter_copy_version,
  title: row.title,
  subtitle: row.body,
  category: row.type === 'sighting' ? 'comunidad' : row.type === 'care_reminder' ? 'cuidados' : 'todas',
  sourceType: row.type,
  timeAgo: 'Reciente',
  read: Boolean(row.read_at),
  createdAt: row.created_at,
  petId: row.pet_id,
  sourceId: row.source_id,
  alertReason: row.alert_reason === 'expired' || row.alert_reason === 'unregistered' || row.alert_reason === 'applies' ? row.alert_reason : null,
  alertVaccineType: isVaccineType(row.alert_vaccine_type) ? row.alert_vaccine_type : null,
  alertAnswer: row.alert_answer === 'has_it' || row.alert_answer === 'not_yet' || row.alert_answer === 'unsure' ? row.alert_answer : null,
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

export const getNotificationCareId = (notification: PazoNotification) =>
  notification.sourceType === 'care_reminder'
    ? notification.sourceId || null
    : null

// The profile is opened only from this typed notice, whose pet reference the server wrote.
export const getNotificationAdminPetId = (notification: PazoNotification) =>
  notification.sourceType === 'admin_new_pet'
    ? notification.petId || null
    : null

export const getNotificationFollowerId = (notification: PazoNotification) =>
  notification.sourceType === 'new_follower'
    ? notification.sourceId || null
    : null

export const adminNotificationCopy = (sourceType: string | undefined, lang: 'es' | 'en') => {
  if (sourceType === 'new_follower') {
    return lang === 'es'
      ? { title: 'Tienes un nuevo seguidor', subtitle: 'Toca para ver quién es.' }
      : { title: 'You have a new follower', subtitle: 'Tap to see who it is.' }
  }
  if (sourceType === 'admin_new_pet') {
    return lang === 'es'
      ? { title: 'Nueva mascota en PAZO', subtitle: 'Toca para ver su perfil.' }
      : { title: 'New pet on PAZO', subtitle: 'Tap to see its profile.' }
  }
  if (sourceType === 'admin_new_account') {
    return lang === 'es'
      ? { title: 'Nueva cuenta en PAZO', subtitle: 'Alguien confirmó su registro.' }
      : { title: 'New account on PAZO', subtitle: 'Someone confirmed their sign-up.' }
  }
  return null
}

export const careNotificationTitle = (lang: 'es' | 'en') =>
  lang === 'es' ? 'Recordatorio de cuidado' : 'Care reminder'

export const formatNotificationTime = (createdAt: string, lang: 'es' | 'en', now = Date.now()) => {
  const minutes = Math.round((new Date(createdAt).getTime() - now) / 60000)
  if (!Number.isFinite(minutes)) return ''
  const format = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  if (minutes > -60) return format.format(Math.min(minutes, 0), 'minute')
  if (minutes > -1440) return format.format(Math.round(minutes / 60), 'hour')
  return format.format(Math.round(minutes / 1440), 'day')
}
