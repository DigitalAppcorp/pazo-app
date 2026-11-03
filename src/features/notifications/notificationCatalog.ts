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

// One entry per notification type. The bell and the app read every decision about a
// notice from here, so adding a type means adding one entry, and the contract test
// fails when the database or the push worker knows a type this catalog does not.

// The card family a type uses. 'respond' and 'alert' are reserved for the Vigilante.
export type NotificationTemplate = 'info' | 'open' | 'respond' | 'alert'
export type NotificationIcon = 'bell' | 'calendar' | 'chat' | 'community'
export type NotificationTone = 'highlight' | 'care' | 'neutral'

// Where a notice leads. Every reference comes from a typed getter, never from a bare UUID.
export type NotificationTarget =
  | { kind: 'supporter' }
  | { kind: 'community'; communityId: string }
  | { kind: 'sighting'; sightingId: string }
  | { kind: 'care'; careId: string }
  | { kind: 'pet_profile'; petId: string }

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
  copy: (item: PazoNotification, lang: 'es' | 'en') => NotificationCopy
  action?: (item: PazoNotification, lang: 'es' | 'en') => string | null
  target: (item: PazoNotification) => NotificationTarget | null
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
}

const kindOf = (sourceType: string | undefined): NotificationKind =>
  sourceType && Object.prototype.hasOwnProperty.call(NOTIFICATION_KINDS, sourceType)
    ? NOTIFICATION_KINDS[sourceType as NotificationType]
    : plainKind

// An unknown type or an invalid reference falls back to a plain notice that cannot be opened.
export const describeNotification = (item: PazoNotification, lang: 'es' | 'en'): NotificationView => {
  const kind = kindOf(item.sourceType)
  const target = kind.target(item)
  const styled = !kind.styleNeedsTarget || target !== null
  return {
    ...kind.copy(item, lang),
    template: kind.template,
    icon: styled ? kind.icon : 'bell',
    tone: styled ? kind.tone : 'neutral',
    action: kind.action?.(item, lang) ?? null,
    target,
  }
}
