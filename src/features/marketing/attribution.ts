/**
 * PAZO marketing attribution: first-party, allowlisted campaign metadata only.
 * No IP, GPS, email, account IDs, external IDs or full URLs.
 *
 * Prepared behind a CLOSED release gate; client only stages sanitized UTM.
 * This state is NOT a source of truth for paid conversions.
 */
/**
 * Minimal first-party payload for internal verified registration only.
 * No checkbox or externally shared conversion, no email/UID/JWT/URL/click ID.
 * Server uses independently verified Auth to bind the account.
 */
export function prepareAutomaticCampaignIntake(state: AttributionState | null): {
  utm_source: 'meta'
  utm_medium: 'paid_social'
  utm_campaign: typeof PAZO_CAMPAIGN
  utm_content: string
  first_touch_at: string
} | null {
  if (!state || !state.steps.includes('signup_verified')) return null
  return {
    utm_source: state.attribution.source,
    utm_medium: state.attribution.medium,
    utm_campaign: PAZO_CAMPAIGN,
    utm_content: state.attribution.creative,
    first_touch_at: new Date(state.attribution.firstTouchAt).toISOString(),
  }
}

export const MARKETING_ATTRIBUTION_TTL_MS = 72 * 60 * 60 * 1000
const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000

export const PAZO_CAMPAIGN = 'pazo_beta_local_202610'
const CREATIVE_CODES = new Set([
  'perfil_es', 'perfil_en', 'qr_es', 'qr_en', 'comunidad_es', 'comunidad_en',
])
const STEPS = ['landing', 'signup_requested', 'signup_verified', 'first_pet_created'] as const
export type MarketingStep = typeof STEPS[number]

export interface CampaignAttribution {
  source: 'meta'
  medium: 'paid_social'
  campaign: typeof PAZO_CAMPAIGN
  creative: string
  firstTouchAt: number
}

export interface AttributionState {
  version: 1
  attribution: CampaignAttribution
  steps: MarketingStep[]
  signupRequestedAt?: number
  /** Local account boundary only; never included in the analytics body. */
  signupOwnerId?: string
}

export interface MarketingStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const safeTime = (value: number) => Number.isFinite(value) && value >= 0

/** Unknown/ad hoc UTM, click IDs, duplicate keys and PII are rejected entirely. */
export function parsePazoCampaign(search: string, now: number): CampaignAttribution | null {
  if (!safeTime(now) || search.length > 1024) return null
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
    if (keys.some((key) => params.getAll(key).length !== 1)) return null
    if (params.get('utm_source') !== 'meta') return null
    if (params.get('utm_medium') !== 'paid_social') return null
    if (params.get('utm_campaign') !== PAZO_CAMPAIGN) return null
    const creative = params.get('utm_content')
    if (!creative || !CREATIVE_CODES.has(creative)) return null
    return {
      source: 'meta',
      medium: 'paid_social',
      campaign: PAZO_CAMPAIGN,
      creative,
      firstTouchAt: now,
    }
  } catch {
    return null
  }
}

function validState(value: unknown, now: number): value is AttributionState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<AttributionState>
  const attr = state.attribution
  if (state.version !== 1 || !attr || !safeTime(attr.firstTouchAt)) return false
  if (attr.source !== 'meta' || attr.medium !== 'paid_social'
    || attr.campaign !== PAZO_CAMPAIGN || !CREATIVE_CODES.has(attr.creative)) return false
  if (now < attr.firstTouchAt - MAX_TIMESTAMP_SKEW_MS
    || now - attr.firstTouchAt > MARKETING_ATTRIBUTION_TTL_MS) return false
  if (!Array.isArray(state.steps)
    || state.steps.length > STEPS.length
    || state.steps.some((s) => !STEPS.includes(s))) return false
  if (new Set(state.steps).size !== state.steps.length) return false
  if (state.steps[0] !== 'landing') return false
  if (state.steps.includes('signup_verified') && !state.steps.includes('signup_requested')) return false
  if (state.steps.includes('first_pet_created') && !state.steps.includes('signup_verified')) return false
  if (state.signupRequestedAt !== undefined
    && (!safeTime(state.signupRequestedAt)
      || state.signupRequestedAt < attr.firstTouchAt - MAX_TIMESTAMP_SKEW_MS
      || state.signupRequestedAt > now + MAX_TIMESTAMP_SKEW_MS)) return false
  if (state.steps.includes('signup_requested') && state.signupRequestedAt === undefined) return false
  return true
}

/** Storage is injected for unit tests; production may use same-origin localStorage (TTL 72h, across tabs). */
export function createPazoMarketingRecorder(
  storage: MarketingStorage,
  options: { enabled: boolean; now?: () => number; key?: string },
) {
  const now = options.now || (() => Date.now())
  const key = options.key || 'pazo_marketing_firstparty_v1'

  const load = (): AttributionState | null => {
    if (!options.enabled) return null
    try {
      const raw = storage.getItem(key)
      if (!raw) return null
      const value: unknown = JSON.parse(raw)
      if (!validState(value, now())) {
        storage.removeItem(key)
        return null
      }
      return value
    } catch {
      return null
    }
  }

  const save = (state: AttributionState) => {
    if (!options.enabled) return
    try {
      storage.setItem(key, JSON.stringify(state))
    } catch {
      // User-disabled browser storage must not break the app or auth flow.
    }
  }

  return {
    read: load,
    captureLanding: (search: string) => {
      if (!options.enabled || load()) return
      const attr = parsePazoCampaign(search, now())
      if (!attr) return
      save({ version: 1, attribution: attr, steps: ['landing'] })
    },
    signupRequested: (ownerId?: string) => {
      const state = load()
      if (!state || state.steps.includes('signup_requested')) return
      save({ ...state, steps: [...state.steps, 'signup_requested'], signupRequestedAt: now(), signupOwnerId: ownerId })
    },
    signupVerified: (accountCreatedAt: string | null | undefined, emailConfirmedAt: string | null | undefined) => {
      const state = load()
      if (!state || !state.steps.includes('signup_requested')
        || state.steps.includes('signup_verified') || !emailConfirmedAt
        || !accountCreatedAt || state.signupRequestedAt === undefined) return
      const created = Date.parse(accountCreatedAt)
      const confirmed = Date.parse(emailConfirmedAt)
      if (!safeTime(created) || !safeTime(confirmed) || !safeTime(now())) return
      // Existing login after a signup attempt is not a new customer.
      if (created < state.signupRequestedAt - MAX_TIMESTAMP_SKEW_MS
        || created > now() + MAX_TIMESTAMP_SKEW_MS
        || confirmed < created || confirmed > now() + MAX_TIMESTAMP_SKEW_MS) return
      save({ ...state, steps: [...state.steps, 'signup_verified'] })
    },
    firstPetCreated: () => {
      const state = load()
      if (!state || !state.steps.includes('signup_verified')
        || state.steps.includes('first_pet_created')) return
      save({ ...state, steps: [...state.steps, 'first_pet_created'] })
    },
    clear: () => {
      if (!options.enabled) return
      try { storage.removeItem(key) } catch { /* storage denied */ }
    },
  }
}
