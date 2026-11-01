// #169: isolated server-only Meta CAPI transport; no production import or sender.
// Caller must obtain an already-authorized one-time event from a trusted, durable
// server claim, never from a browser assertion. No secrets or user data in logs.
import {META_EVENT_NAME,META_CANONICAL_URL} from './metaConversion.mjs'
const API_VERSION = /^v(?:[2-9][0-9]|[1-9][0-9]{2,})\.0$/
const DATASET = /^[1-9][0-9]{5,24}$/
const HASH = /^[a-f0-9]{64}$/
const TEST_EVENT_CODE=/^TEST[A-Za-z0-9]{4,32}$/
export function validMetaTestConfiguration({
  testModeEnabled=false,testEventCode=null,nonProduction=false,
}={}) {
  if(testModeEnabled===false && testEventCode===null)return true
  return testModeEnabled===true && nonProduction===true
    && typeof testEventCode==='string' && TEST_EVENT_CODE.test(testEventCode)
}
const USER_AGENT = /^[\x20-\x7E]{20,512}$/
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function validMetaServerEvent(event,datasetId) {
  return !!event && typeof event==='object' && !Array.isArray(event)
    && Object.keys(event).sort().join(',') ===
       'action_source,event_id,event_name,event_source_url,event_time,user_data'
    && event.event_name===META_EVENT_NAME && UUID4.test(event.event_id)
    && event.action_source==='website' && event.event_source_url===META_CANONICAL_URL
    && Number.isSafeInteger(event.event_time) && event.event_time > 0
    && event.user_data && !Array.isArray(event.user_data)
    && Object.keys(event.user_data).sort().join(',')==='client_user_agent,em'
    && Array.isArray(event.user_data.em) && event.user_data.em.length===1
    && typeof event.user_data.em[0]==='string' && HASH.test(event.user_data.em[0])
    && typeof event.user_data.client_user_agent==='string'
    && USER_AGENT.test(event.user_data.client_user_agent)
    && typeof datasetId==='string' && DATASET.test(datasetId)
}
/** Never call this sender for an unverified/replayed signup. The 'authorized'
 * callback must check the server's current durable consent + GPC/optout + QA
 * exclusions immediately before the request. Passing browser flags is invalid.
 */
export async function sendMetaCapi({
  releaseEnabled=false, privacyGateApproved=false, claimWasInserted=false,
  event=null, datasetId=null, apiVersion=null, serverToken=null,
  // Test Events code is never accepted from a browser and never automatic.
  testModeEnabled=false,testEventCode=null,nonProduction=false,
  authorized=async()=>false, fetchImpl=fetch,
}={}) {
  if (releaseEnabled!==true || privacyGateApproved!==true || claimWasInserted!==true)
    return {status:'disabled'}
  if (!validMetaServerEvent(event,datasetId)
    || typeof apiVersion!=='string' || !API_VERSION.test(apiVersion)
    || typeof serverToken!=='string' || serverToken.length<24
    || typeof authorized!=='function') return {status:'not_configured'}
  // Supplying a test code without all independent test controls is a
  // misconfiguration, NOT permission to silently send a live conversion.
  const testRequested=testModeEnabled===true || testEventCode!==null
  if(!validMetaTestConfiguration({testModeEnabled,testEventCode,nonProduction}))
    return {status:'not_configured'}
  let allowed=false
  try {allowed=await authorized()} catch {return {status:'unavailable'}}
  if (allowed!==true) return {status:'suppressed'}
  // Authorization header, never put the access token in a URL or query string.
  try {
    const response=await fetchImpl(
      `https://graph.facebook.com/${apiVersion}/${datasetId}/events`,{
      method:'POST',redirect:'error',cache:'no-store',
      signal:AbortSignal.timeout(6000),
      headers:{authorization:'Bearer '+serverToken,'content-type':'application/json',
        accept:'application/json'},
      body:JSON.stringify(testRequested
        ?{data:[event],test_event_code:testEventCode}
        :{data:[event]}),
    })
    if (!response?.ok) return {status:'provider_error'}
    const receipt=await response.json()
    if (receipt?.events_received!==1) return {status:'provider_error'}
    // Meta can return events_received=1 AND report a rejected/inactive
    // test_event_code in messages. That is API acceptance, NOT verified
    // Test Events visibility. Never echo provider messages (which are
    // untrusted and can include arbitrary strings) or claim clean success.
    // A received event is terminal: retries could duplicate a conversion.
    const notices=receipt.messages
    if (notices!==undefined && notices!==null &&
        (!Array.isArray(notices) ||
          notices.some(m=>typeof m!=='string'||m.trim()!=='')))
      return {status:'accepted_with_warnings'}
    return {status:'accepted'}
  } catch {return {status:'unavailable'}}
}
