import { supabase } from '../../services/supabaseClient'
import { isPazoStandalone } from '../pwa/installPromptBridge'
import { bytesToUrlBase64, detectPushEnvironment, urlBase64ToBytes, type PushEnvironment } from './pushSupport'

export interface PushPreferences {
  sightings: boolean
  community: boolean
  care: boolean
  followers: boolean
  healthAlerts: boolean
  isAdmin: boolean
  adminNewPets: boolean
  adminNewAccounts: boolean
  adminVigilante?: boolean
}

const browserHasPush = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const readPushEnvironment = (): PushEnvironment => typeof window === 'undefined' ? 'unsupported' : detectPushEnvironment({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  maxTouchPoints: navigator.maxTouchPoints,
  standalone: isPazoStandalone(),
  hasServiceWorker: 'serviceWorker' in navigator,
  hasPushManager: 'PushManager' in window,
  hasNotification: 'Notification' in window,
  permission: 'Notification' in window ? Notification.permission : null,
})

const registration = async () => {
  const existing = await navigator.serviceWorker.getRegistration('/')
  if (existing) return existing
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => { window.setTimeout(() => resolve(null), 4000) }),
  ])
}

const fetchConfig = async () => {
  const { data, error } = await supabase.rpc('pazo_push_config')
  if (error) throw error
  return data as { enabled: boolean; publicKey: string | null }
}

const saveSubscription = async (subscription: PushSubscription, lang: 'es' | 'en') => {
  const { data, error } = await supabase.rpc('pazo_push_subscribe', {
    p_endpoint: subscription.endpoint,
    p_p256dh: bytesToUrlBase64(subscription.getKey('p256dh')),
    p_auth: bytesToUrlBase64(subscription.getKey('auth')),
    p_lang: lang,
  })
  if (error) throw error
  return data === true
}

const createSubscription = (worker: ServiceWorkerRegistration, publicKey: string) =>
  worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(publicKey) })

export async function readPushStatus() {
  try {
    if (!browserHasPush()) return { active: false, enabled: false }
    const [config, worker] = await Promise.all([fetchConfig(), registration()])
    const subscription = worker ? await worker.pushManager.getSubscription() : null
    return {
      active: Boolean(subscription) && Notification.permission === 'granted',
      enabled: config.enabled && Boolean(config.publicKey) && Boolean(worker),
    }
  } catch {
    return { active: false, enabled: false }
  }
}

export async function enablePush(lang: 'es' | 'en'): Promise<'active' | 'dismissed' | 'failed'> {
  try {
    // Asked first, while the tap is still valid; Safari ignores a later request.
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'dismissed'
    const [config, worker] = await Promise.all([fetchConfig(), registration()])
    if (!config.enabled || !config.publicKey || !worker) return 'failed'
    const subscription = await worker.pushManager.getSubscription() ?? await createSubscription(worker, config.publicKey)
    return await saveSubscription(subscription, lang) ? 'active' : 'failed'
  } catch {
    return 'failed'
  }
}

export async function disablePush() {
  const worker = await registration()
  const subscription = worker ? await worker.pushManager.getSubscription() : null
  if (!subscription) return
  await supabase.rpc('pazo_push_unsubscribe', { p_endpoint: subscription.endpoint })
  await subscription.unsubscribe()
}

/** Keeps this device tied to the signed-in account, its language and the current server key. */
export async function syncPush(lang: 'es' | 'en') {
  try {
    if (!browserHasPush() || Notification.permission !== 'granted') return
    const worker = await registration()
    let subscription = worker ? await worker.pushManager.getSubscription() : null
    if (!worker || !subscription) return
    const config = await fetchConfig()
    if (!config.enabled || !config.publicKey) return
    if (bytesToUrlBase64(subscription.options.applicationServerKey) !== config.publicKey) {
      await subscription.unsubscribe()
      subscription = await createSubscription(worker, config.publicKey)
    }
    await saveSubscription(subscription, lang)
  } catch {
    // Push is optional; the bell keeps working without it.
  }
}

/** A shared phone must stop receiving this account's alerts. Never delays or blocks signing out. */
export async function releasePushForSignOut() {
  if (typeof navigator === 'undefined' || !browserHasPush()) return
  await Promise.race([
    disablePush().catch(() => undefined),
    new Promise((resolve) => { window.setTimeout(resolve, 2500) }),
  ])
}

export async function fetchPushPreferences() {
  const { data, error } = await supabase.rpc('pazo_push_preferences')
  if (error) throw error
  return data as PushPreferences
}

export async function savePushPreferences(value: PushPreferences) {
  const { data, error } = await supabase.rpc('pazo_push_set_preferences', {
    p_sightings: value.sightings,
    p_community: value.community,
    p_care: value.care,
  })
  if (error || data !== true) throw error ?? new Error('Push preferences were not saved.')
  const followers = await supabase.rpc('pazo_push_set_followers_preference', { p_followers: value.followers })
  if (followers.error || followers.data !== true) throw followers.error ?? new Error('Push preferences were not saved.')
  const health = await supabase.rpc('pazo_push_set_health_alerts_preference', { p_health_alerts: value.healthAlerts !== false })
  if (health.error || health.data !== true) throw health.error ?? new Error('Push preferences were not saved.')
  if (!value.isAdmin) return
  const admin = await supabase.rpc('pazo_push_set_admin_preferences', {
    p_pets: value.adminNewPets,
    p_accounts: value.adminNewAccounts,
  })
  if (admin.error || admin.data !== true) throw admin.error ?? new Error('Push preferences were not saved.')
  const vigilante = await supabase.rpc('pazo_push_set_admin_vigilante_preference', { p_enabled: value.adminVigilante !== false })
  if (vigilante.error || vigilante.data !== true) throw vigilante.error ?? new Error('Push preferences were not saved.')
}
