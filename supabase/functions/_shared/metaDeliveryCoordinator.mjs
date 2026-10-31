// #169. Server-side composition for a future *durable database outbox*.
// Not imported by any Edge endpoint. This never trusts a browser-provided
// consent boolean or event ID. The transactional outbox is still NOT BUILT.
import {assessMetaPurpose} from './metaPurposePolicy.mjs'
import {buildMetaRegistration} from './metaConversion.mjs'
import {sendMetaCapi} from './metaCapi.mjs'
const DEFAULTS=Object.freeze({allowed:false})
/** Both repository methods MUST check an authenticated, recently confirmed
 * new account and issue/reuse a DB-stored UUIDv4 atomically.
 * leaseOne(): returns {eventId,eventTime,claimWasInserted,record,
 *  accountExcluded,qaOrAdmin,gpc,sharingOptOut,hashedEmail}
 * or null. IDs and email hashes may NEVER be built by the browser.
 * settle(): acknowledgements must be atomic and idempotent; a lease that fails
 * remains retryable using the SAME event ID, never a fresh conversion.
 */
export async function deliverVerifiedMetaRegistration({
  releaseEnabled=false,privacyGateApproved=false,
  repository=null,datasetId=null,apiVersion=null,serverToken=null,
  fetchImpl=fetch,clock=()=>Date.now(),
}={}) {
  if (releaseEnabled!==true || privacyGateApproved!==true)
    return {status:'disabled'}
  if (!repository || typeof repository.leaseOne!=='function'
      || typeof repository.settle!=='function'
      || typeof repository.checkPrivacy!=='function')
    return {status:'not_configured'}
  let claim
  try { claim=await repository.leaseOne() } catch {return {status:'unavailable'}}
  if (!claim || claim.kind!=='new' || claim.claimWasInserted!==true)
    return {status:'not_eligible'}
  const settle=async status=>{
    try { await repository.settle(claim.eventId,status) } catch { return false }
    return true
  }
  let privacy=DEFAULTS
  try {privacy=await repository.checkPrivacy(claim.eventId)}
  catch {await settle('suppressed');return {status:'suppressed'}}
  const policy=assessMetaPurpose({
    record:privacy?.record,now:clock(),trusted:privacy?.trusted===true,
    gpc:privacy?.gpc,sharingOptOut:privacy?.sharingOptOut,
    accountExcluded:privacy?.accountExcluded,qaOrAdmin:privacy?.qaOrAdmin,
  })
  if (!policy.allowed || privacy?.verifiedRegistration!==true) {
    await settle('suppressed')
    return {status:'suppressed'}
  }
  const event=buildMetaRegistration({
    releaseEnabled,explicitConsent:true,consentTrusted:true,
    verifiedRegistration:true,excluded:false,globalPrivacyControl:false,
    optedOut:false,qaOrAdmin:false,eventId:claim.eventId,
    eventTime:claim.eventTime,datasetId,hashedEmail:claim.hashedEmail,
  })
  if (!event) {await settle('suppressed');return {status:'not_configured'}}
  const response=await sendMetaCapi({
    releaseEnabled,privacyGateApproved,claimWasInserted:true,
    event:event.server,datasetId,apiVersion,serverToken,fetchImpl,
    // Live privacy check after payload creation, before any network call.
    authorized:async()=>{
      const current=await repository.checkPrivacy(claim.eventId)
      return current?.verifiedRegistration===true
        && assessMetaPurpose({
          record:current.record,now:clock(),trusted:current.trusted===true,
          gpc:current.gpc,sharingOptOut:current.sharingOptOut,
          accountExcluded:current.accountExcluded,qaOrAdmin:current.qaOrAdmin,
        }).allowed
    },
  })
  const saved=await settle(response.status==='accepted'?'sent':
    response.status==='suppressed'?'suppressed':'retryable')
  return {status:saved?response.status:'unavailable'}
}
