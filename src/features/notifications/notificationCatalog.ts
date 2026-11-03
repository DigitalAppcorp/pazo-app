import type { PazoNotification } from '../../types/pazo'
import {
  adminNotificationCopy,
  careNotificationTitle,
  getNotificationAdminPetId,
  getNotificationCareId,
  getNotificationCommunityId,
  getNotificationFollowerId,
  getNotificationSightingId,
} from './notificationSource.ts'
import { isSupporterNotification, supporterNotificationCopy } from './supporterNotification.ts'
import { VACCINE_LABELS } from '../care/vaccineTypes.ts'

// One entry per notification type. The bell and the app read every decision about a
// notice from here, so adding a type means adding one entry, and the contract test
// fails when the database or the push worker knows a type this catalog does not.

// The card family a type uses. 'respond' and 'alert' are reserved for the Vigilante.
export type NotificationTemplate = 'info' | 'open' | 'respond' | 'alert'
export type NotificationIcon = 'bell' | 'calendar' | 'chat' | 'community' | 'paw'
export type NotificationTone = 'highlight' | 'care' | 'neutral'

// Where a notice leads. Every reference comes from a typed getter, never from a bare UUID.
export type NotificationTarget =
  | { kind: 'supporter' }
  | { kind: 'community'; communityId: string }
  | { kind: 'sighting'; sightingId: string }
  | { kind: 'care'; careId: string }
  | { kind: 'pet_profile'; petId: string }
  | { kind: 'pet_edit'; petId: string }
  | { kind: 'official_post'; postId: string }
  | { kind: 'admin_vigilante' }

// Data the app already holds that a notice may show inside the app (never on a lock screen).
export interface NotificationContext {
  petName?: (petId: string) => string | undefined
}

// Answers a health alert offers; the server records only these three.
export type NotificationAnswer = 'has_it' | 'not_yet' | 'unsure'
export interface NotificationResponse {
  answer: NotificationAnswer
  label: string
}

interface NotificationCopy {
  title: string
  subtitle: string
}

interface NotificationKind {
  template: NotificationTemplate
  icon: NotificationIcon
  tone: NotificationTone
  // Icon and tone only apply while the notice can be opened; otherwise it shows as a plain notice.
  styleNeedsTarget?: boolean
  copy: (item: PazoNotification, lang: 'es' | 'en', context: NotificationContext) => NotificationCopy
  action?: (item: PazoNotification, lang: 'es' | 'en', context: NotificationContext) => string | null
  target: (item: PazoNotification) => NotificationTarget | null
  responses?: (item: PazoNotification, lang: 'es' | 'en', context: NotificationContext) => NotificationResponse[]
}

const storedCopy = (item: PazoNotification): NotificationCopy => ({ title: item.title, subtitle: item.subtitle })

const adminCopy = (item: PazoNotification, lang: 'es' | 'en') =>
  adminNotificationCopy(item.sourceType, lang) ?? storedCopy(item)

const petProfile = (petId: string | null): NotificationTarget | null =>
  petId ? { kind: 'pet_profile', petId } : null

const supporterKind: NotificationKind = {
  template: 'open',
  icon: 'bell',
  tone: 'neutral',
  copy: (item, lang) => supporterNotificationCopy(item, lang),
  action: (item, lang) => {
    if (!isSupporterNotification(item)) return null
    if (item.sourceType === 'supporter_verified') return lang === 'es' ? 'Revisar mis beneficios' : 'Review my benefits'
    return lang === 'es' ? 'Ver mi participación' : 'View my participation'
  },
  target: (item) => (isSupporterNotification(item) ? { kind: 'supporter' } : null),
}

const plainKind: NotificationKind = {
  template: 'info',
  icon: 'bell',
  tone: 'neutral',
  copy: storedCopy,
  target: () => null,
}

export const NOTIFICATION_KINDS = {
  sighting: {
    template: 'open',
    icon: 'chat',
    tone: 'highlight',
    styleNeedsTarget: true,
    copy: storedCopy,
    target: (item) => {
      const sightingId = getNotificationSightingId(item)
      return sightingId ? { kind: 'sighting', sightingId } : null
    },
  },
  community_join: {
    template: 'open',
    icon: 'community',
    tone: 'highlight',
    styleNeedsTarget: true,
    copy: storedCopy,
    target: (item) => {
      const communityId = getNotificationCommunityId(item)
      return communityId ? { kind: 'community', communityId } : null
    },
  },
  care_reminder: {
    template: 'open',
    icon: 'calendar',
    tone: 'care',
    copy: (item, lang) => ({ title: careNotificationTitle(lang), subtitle: item.subtitle }),
    target: (item) => {
      const careId = getNotificationCareId(item)
      return careId ? { kind: 'care', careId } : null
    },
  },
  new_follower: {
    template: 'open',
    icon: 'bell',
    tone: 'neutral',
    copy: adminCopy,
    target: (item) => petProfile(getNotificationFollowerId(item)),
  },
  admin_new_pet: {
    template: 'open',
    icon: 'bell',
    tone: 'neutral',
    copy: adminCopy,
    target: (item) => petProfile(getNotificationAdminPetId(item)),
  },
  admin_new_account: { ...plainKind, copy: adminCopy },
  welcome: {
    template: 'open',
    icon: 'paw',
    tone: 'highlight',
    copy: (item, lang, context) => {
      const name = (item.petId && context.petName?.(item.petId)) || (lang === 'es' ? 'tu mascota' : 'your pet')
      return lang === 'es'
        ? { title: 'Te damos la bienvenida a PAZO', subtitle: `En PAZO trabajamos todos los días por ti y por tu mascota, y te avisamos de cualquier noticia según la información de ${name}. Cuéntanos más de ${name} para darte la mejor atención.` }
        : { title: 'Welcome to PAZO', subtitle: `At PAZO we work every day for you and your pet, and we alert you to any news based on ${name}'s information. Tell us more about ${name} so we can give you the best care.` }
    },
    action: (item, lang, context) => {
      const name = item.petId ? context.petName?.(item.petId) : undefined
      if (lang === 'es') return name ? `Completar el perfil de ${name}` : 'Completar su perfil'
      return name ? `Complete ${name}'s profile` : 'Complete the profile'
    },
    target: (item) => (item.petId ? { kind: 'pet_edit', petId: item.petId } : null),
  },
  health_alert: {
    template: 'alert',
    icon: 'bell',
    tone: 'highlight',
    copy: (item, lang, context) => {
      const name = (item.petId && context.petName?.(item.petId)) || (lang === 'es' ? 'tu mascota' : 'your pet')
      const vaccine = item.alertVaccineType ? VACCINE_LABELS[item.alertVaccineType][lang].toLowerCase() : ''
      const personal = item.alertReason === 'expired'
        ? (lang === 'es' ? `Esto aplica a ${name}: su vacuna${vaccine ? ' de ' + vaccine : ''} venció.` : `This applies to ${name}: their ${vaccine ? vaccine + ' ' : ''}vaccine expired.`)
        : item.alertReason === 'unregistered'
          ? (lang === 'es' ? `¿${name} ya tiene esta vacuna?` : `Does ${name} already have this vaccine?`)
          : (lang === 'es' ? `Esto aplica a ${name}.` : `This applies to ${name}.`)
      const title = lang === 'en' && item.titleEn ? item.titleEn : item.title
      const body = lang === 'en' && item.bodyEn ? item.bodyEn : item.subtitle
      return { title, subtitle: `${personal} ${body}`.trim() }
    },
    target: (item) => (item.sourceId ? { kind: 'official_post', postId: item.sourceId } : null),
    responses: (item, lang, context) => {
      if (item.alertAnswer || (item.alertReason !== 'expired' && item.alertReason !== 'unregistered')) return []
      const name = item.petId ? context.petName?.(item.petId) : undefined
      return [
        { answer: 'has_it', label: lang === 'es' ? (name ? `${name} ya la tiene` : 'Ya la tiene') : (name ? `${name} has it` : 'Has it') },
        { answer: 'not_yet', label: lang === 'es' ? 'No la tiene' : 'Not yet' },
        { answer: 'unsure', label: lang === 'es' ? 'No sé' : 'Not sure' },
      ]
    },
  },
  admin_vigilante_pending: {
    template: 'open',
    icon: 'bell',
    tone: 'highlight',
    copy: (_item, lang) => lang === 'es'
      ? { title: 'Hay una alerta esperando tu aprobación', subtitle: 'Abre la bandeja del Vigilante.' }
      : { title: 'An alert is waiting for your approval', subtitle: 'Open the Vigilante inbox.' },
    target: () => ({ kind: 'admin_vigilante' }),
  },
  admin_vigilante_approved: {
    template: 'open',
    icon: 'bell',
    tone: 'neutral',
    copy: (item, lang) => lang === 'es'
      ? { title: 'Se aprobó una alerta del Vigilante', subtitle: `${item.subtitle} Si no fuiste tú, cancélala en la bandeja.` }
      : { title: 'A Vigilante alert was approved', subtitle: `${item.subtitle} If it was not you, cancel it in the inbox.` },
    target: () => ({ kind: 'admin_vigilante' }),
  },
  supporter_campaign: supporterKind,
  supporter_verified: supporterKind,
  system: plainKind,
} satisfies Record<string, NotificationKind>

export type NotificationType = keyof typeof NOTIFICATION_KINDS

export interface NotificationView extends NotificationCopy {
  template: NotificationTemplate
  icon: NotificationIcon
  tone: NotificationTone
  action: string | null
  target: NotificationTarget | null
  responses: NotificationResponse[]
}

const kindOf = (sourceType: string | undefined): NotificationKind =>
  sourceType && Object.prototype.hasOwnProperty.call(NOTIFICATION_KINDS, sourceType)
    ? NOTIFICATION_KINDS[sourceType as NotificationType]
    : plainKind

// An unknown type or an invalid reference falls back to a plain notice that cannot be opened.
export const describeNotification = (item: PazoNotification, lang: 'es' | 'en', context: NotificationContext = {}): NotificationView => {
  const kind = kindOf(item.sourceType)
  const target = kind.target(item)
  const styled = !kind.styleNeedsTarget || target !== null
  return {
    ...kind.copy(item, lang, context),
    template: kind.template,
    icon: styled ? kind.icon : 'bell',
    tone: styled ? kind.tone : 'neutral',
    action: kind.action?.(item, lang, context) ?? null,
    target,
    responses: kind.responses?.(item, lang, context) ?? [],
  }
}
