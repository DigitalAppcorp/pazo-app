import { createPazoMarketingRecorder } from './attribution'

/**
 * Explicit launch gate: OFF in this implementation. No provider SDK, Pixel,
 * external transport, cookie or database writer is active. A separate
 * privacy review, backend contract and Product Owner GO are required.
 */
export const PAZO_MARKETING_COLLECTION_ENABLED = false

const recorder = () => {
  if (!PAZO_MARKETING_COLLECTION_ENABLED || typeof window === 'undefined') return null
  try {
    return createPazoMarketingRecorder(window.sessionStorage, { enabled: true })
  } catch {
    return null
  }
}

/** Record only a tightly validated paid-social UTM; never store a full URL. */
export function stageMarketingLanding(search?: string): void {
  recorder()?.captureLanding(search ?? window.location.search)
}

/** A successful signUp request is NOT a verified registration. */
export function stageMarketingSignupRequested(): void {
  recorder()?.signupRequested()
}

/** Only a recently created, email-confirmed user can advance a local funnel. */
export function stageMarketingSignupVerified(
  createdAt: string | null | undefined,
  confirmedAt: string | null | undefined,
): void {
  recorder()?.signupVerified(createdAt, confirmedAt)
}

/** Only after a successful createPetProfile call; once per funnel. */
export function stageMarketingFirstPetCreated(): void {
  recorder()?.firstPetCreated()
}
