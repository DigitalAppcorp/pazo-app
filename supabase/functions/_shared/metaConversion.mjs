// #169: shared contract for an entirely inactive Meta Ads integration.
// This module makes no requests. No browser or server caller is wired to it.
// Positive consent must be independently persisted and trusted by the server;
// first-party PAZO analytics permission is NOT Meta marketing consent.
export const META_EVENT_NAME = 'CompleteRegistration'
export const META_CANONICAL_URL = 'https://pazo-app.vercel.app/'
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HEX_SHA256 = /^[a-f0-9]{64}$/
const META_DATASET_ID = /^[1-9][0-9]{5,24}$/

export function eligibleMetaRegistration({
  releaseEnabled = false, explicitConsent = false, consentTrusted = false,
  verifiedRegistration = false, excluded = true, globalPrivacyControl = true,
  optedOut = true, qaOrAdmin = true, eventId = null,
} = {}) {
  return releaseEnabled === true && explicitConsent === true
    && consentTrusted === true && verifiedRegistration === true
    && excluded === false && globalPrivacyControl === false
    && optedOut === false && qaOrAdmin === false && typeof eventId === 'string'
    && UUID_V4.test(eventId)
}

/** Proof is server-originated for exactly one newly verified and inserted signup.
 * Never use the Auth UUID, email, name, UTM, click ID or browser session ID here.
 * Until server-side durable issuance/claim exists, no caller may enable release.
 */
export function buildMetaRegistration({
  releaseEnabled = false, explicitConsent = false, consentTrusted = false,
  verifiedRegistration = false, excluded = true, globalPrivacyControl = true,
  optedOut = true, qaOrAdmin = true, eventId = null, eventTime = null,
  datasetId = null, hashedEmail = null,
} = {}) {
  if (!eligibleMetaRegistration({releaseEnabled,explicitConsent,consentTrusted,
    verifiedRegistration,excluded,globalPrivacyControl,optedOut,qaOrAdmin,eventId})) return null
  if (typeof datasetId !== 'string' || !META_DATASET_ID.test(datasetId)
    || typeof hashedEmail !== 'string' || !HEX_SHA256.test(hashedEmail)) return null
  if (!Number.isSafeInteger(eventTime) || eventTime <= 0
    || Math.abs(Math.floor(Date.now()/1000)-eventTime)>7*24*3600) return null
  return Object.freeze({
    eventName:META_EVENT_NAME,
    eventId,
    datasetId,
    browser:{eventName:META_EVENT_NAME,eventID:eventId},
    server:{
      event_name:META_EVENT_NAME,
      event_time:eventTime,
      event_id:eventId,
      action_source:'website',
      event_source_url:META_CANONICAL_URL,
      user_data:{em:[hashedEmail]},
    },
  })
}
