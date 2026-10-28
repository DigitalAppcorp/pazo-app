import { createPazoMarketingRecorder, prepareAutomaticCampaignIntake, parsePazoCampaign, MARKETING_ATTRIBUTION_TTL_MS } from './attribution'
import { shouldSendLandingSignal } from './landingSignal'
import { requestLandingChallenge } from './landingChallenge'
import { supabase } from '../../services/supabaseClient'

/**
 * Issue130 release: deploy only after the approved retention evidence and
 * provider/privacy checks. SQL collection and retention health remain separate.
 * First-party measurement only; no Pixel or individual Meta conversion upload.
 */
export const PAZO_MARKETING_COLLECTION_ENABLED = true
/** Independent release control; landing signals never start implicitly. */
export const PAZO_MARKETING_LANDING_ENABLED = true

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
  // A hit is a browser signal, not a unique person. No UUID, IP, fbclid or URL.
  if (!PAZO_MARKETING_LANDING_ENABLED || typeof window === 'undefined') return
  const attr = parsePazoCampaign(search ?? window.location.search, Date.now())
  if (!attr) return
  try {
    const key = 'pazo_marketing_landing_daily_v1'
    const raw = window.sessionStorage.getItem(key)
    const last: unknown = raw ? JSON.parse(raw) : null
    if (!shouldSendLandingSignal(last, attr.creative, Date.now())) return
    // Mark first, so reloads/React re-renders do not cause duplicate requests.
    window.sessionStorage.setItem(key, JSON.stringify({creative:attr.creative, sentAt:Date.now()}))
    void requestLandingChallenge().then(token=>token?supabase.functions.invoke('pazo-marketing-landing', {
      headers:{'x-pazo-challenge':token},
      body:{
        utm_source:attr.source,
        utm_medium:attr.medium,
        utm_campaign:attr.campaign,
        utm_content:attr.creative,
      },
    }):undefined).catch(()=>{})
  } catch {
    // Storage disabled or browser isolation: do not collect or break navigation.
  }
}

/** A successful signUp request is NOT a verified registration. */
export function stageMarketingSignupRequested(ownerId?: string): void {
  if (!ownerId) return
  recorder()?.signupRequested(ownerId)
}

/** Only a recently created, email-confirmed user can advance a local funnel. */
export function stageMarketingSignupVerified(
  createdAt: string | null | undefined,
  confirmedAt: string | null | undefined,
  ownerId?: string,
): void {
  const instance = recorder()
  if (!ownerId || instance?.read()?.signupOwnerId !== ownerId) return
  instance.signupVerified(createdAt, confirmedAt)
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
let submitting=false
let attributionGeneration=0
let verifiedFirstUseIntent: {ownerId:string;intent:'qr'|'neutral';expiresAt:number}|null=null
/** Consume only a server-accepted campaign receipt, never a raw URL guess. */
export function takeVerifiedFirstUseIntent(ownerId:string):'qr'|'neutral' {
  const receipt=verifiedFirstUseIntent
  verifiedFirstUseIntent=null
  return receipt?.ownerId===ownerId&&receipt.expiresAt>=Date.now()?receipt.intent:'neutral'
}
export async function submitAutomaticMarketingAttribution(ownerId?: string, accessToken?: string): Promise<void> {
  const generation=attributionGeneration
  if (!PAZO_MARKETING_COLLECTION_ENABLED) return
  if (!ownerId || !accessToken) return
  if (submitting) return
  const instance = recorder()
  if (!instance) return
  if (instance.read()?.signupOwnerId !== ownerId) return
  const payload = prepareAutomaticCampaignIntake(instance.read())
  if (!payload) return
  submitting=true
  try {
    // Pin the verified Auth session supplied by the event. A later account
    // switch must not replace authorization while the request is pending.
    const {data,error} = await supabase.functions.invoke('pazo-marketing-attribution', {
      headers: { Authorization: `Bearer ${accessToken}` }, body:payload,
    })
    if (generation===attributionGeneration && !error && data?.status === 'accepted' && instance.read()?.signupOwnerId === ownerId
      && JSON.stringify(prepareAutomaticCampaignIntake(instance.read()))===JSON.stringify(payload)) {
      verifiedFirstUseIntent={ownerId,intent:payload.utm_content.startsWith('qr_')?'qr':'neutral',
        expiresAt:Date.parse(payload.first_touch_at)+MARKETING_ATTRIBUTION_TTL_MS}
      instance.clear()
    }
  } catch {
    // A marketing failure never interrupts Auth or signup UX.
  } finally {submitting=false}
}

/** Remove only local campaign staging for logout/withdrawal; no remote writes. */
export function clearLocalMarketingAttribution(): void {
  attributionGeneration++
  verifiedFirstUseIntent=null
  recorder()?.clear()
}
