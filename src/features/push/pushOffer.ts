import type { PushEnvironment } from './pushSupport'

export type PushOfferKind = 'offer' | 'install'

// Closing the invitation is remembered on this device only, with no account or identity in it.
const OFFER_CLOSED_KEY = 'pazo_push_offer_closed_v1'

/**
 * Re-engagement point 1: the invitation only appears where alerts can really work and are not on.
 * On an iPhone outside the Home Screen it explains how to install instead of asking.
 */
export function pushOfferKind(input: {
  environment: PushEnvironment
  active: boolean
  enabled: boolean
  closed: boolean
}): PushOfferKind | null {
  if (input.closed || input.active) return null
  if (input.environment === 'ios-needs-install') return 'install'
  return input.environment === 'available' && input.enabled ? 'offer' : null
}

export function pushOfferClosedHere(): boolean {
  try { return window.localStorage.getItem(OFFER_CLOSED_KEY) === '1' } catch { return false }
}

export function rememberPushOfferClosed() {
  try { window.localStorage.setItem(OFFER_CLOSED_KEY, '1') } catch { /* Without storage it may show once more. */ }
}
