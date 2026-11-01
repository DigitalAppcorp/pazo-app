// #169: browser-side Pixel dispatch. No import in the PAZO application yet.
// A distinct, explicit Meta-marketing preference is required; PAZO's own
// analytics preference never authorizes this third-party integration.
import {META_EVENT_NAME} from '../../../supabase/functions/_shared/metaConversion.mjs'
const DATASET=/^[1-9][0-9]{5,24}$/
const UUID4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function canUseMetaPixel({
  releaseEnabled=false, privacyGateApproved=false, explicitConsent=false,
  excluded=true, optedOut=true, globalPrivacyControl=true,
  verifiedRegistration=false, qaOrAdmin=true,
}={}) {
  return releaseEnabled===true && privacyGateApproved===true
    && explicitConsent===true && excluded===false
    && optedOut===false && globalPrivacyControl===false
    && verifiedRegistration===true && qaOrAdmin===false
}
/** A one-time, server-attested event ID MUST come from the same trusted
 * claim used by CAPI. Do not generate this identifier in the browser.
 * The SDK is not loaded here: this adapter cannot inject a script/cookie.
 */
export function dispatchMetaPixel({
  authorized=false, eventId=null, datasetId=null, fbq=null,
  browserGpc=true, stillConsented=()=>false,
}={}) {
  if (authorized!==true || browserGpc!==false
    || typeof stillConsented!=='function' || stillConsented()!==true
    || typeof fbq!=='function' || typeof eventId!=='string'
    || !UUID4.test(eventId) || typeof datasetId!=='string'
    || !DATASET.test(datasetId)) return {status:'suppressed'}
  // trackSingle isolates PAZO from other pixels present on the page.
  // 'eventID' must equal Meta CAPI's 'event_id' (case and spelling matter).
  fbq('trackSingle',datasetId,META_EVENT_NAME,{}, {eventID:eventId})
  return {status:'queued'}
}
