import { createPazoMarketingRecorder, prepareAutomaticCampaignIntake } from './attribution'
import { supabase } from '../../services/supabaseClient'

/**
 * Explicit launch gate: OFF in this implementation. No provider SDK, Pixel,
 * external transport, cookie or database writer is active. A separate
 * privacy notice review, backend contract and Product Owner GO are required.
 */
export const PAZO_MARKETING_COLLECTION_ENABLED = false

const recorder = () => {
  if (!PAZO_MARKETING_COLLECTION_ENABLED || typeof window === 'undefined') return null
  try {
    return createPazoMarketingRecorder(window.localStorage, { enabled: true })
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


/** Automatic, first-party-only conversion after verified Auth.
 * A signup UI checkbox is never required; activation is separately gated OFF.
 * Supabase sends the signed-in user's session authorization to Edge. The
 * browser body contains only vetted UTM identifiers and first-touch timestamp.
 */
export async function submitAutomaticMarketingAttribution(): Promise<void> {
  if (!PAZO_MARKETING_COLLECTION_ENABLED) return
  const instance = recorder()
  if (!instance) return
  const payload = prepareAutomaticCampaignIntake(instance.read())
  if (!payload) return
  try {
    const {data,error} = await supabase.functions.invoke('pazo-marketing-attribution', {body:payload})
    if (!error && data?.status === 'accepted') instance.clear()
  } catch {
    // A marketing failure never interrupts Auth or signup UX.
  }
}

/** Remove only local campaign staging for logout/withdrawal; no remote writes. */
export function clearLocalMarketingAttribution(): void {
  recorder()?.clear()
}
