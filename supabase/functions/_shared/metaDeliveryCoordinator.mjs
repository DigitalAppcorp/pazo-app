// #169. Server-side composition for a future *durable database outbox*.
// Not imported by any Edge endpoint. This never trusts a browser-provided
// consent boolean or event ID. Database outbox exists only in PG17 laboratory.
import {assessMetaPurpose} from './metaPurposePolicy.mjs'
import {buildMetaRegistration} from './metaConversion.mjs'
import {sendMetaCapi} from './metaCapi.mjs'
const DEFAULTS=Object.freeze({allowed:false})
const UUID4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
/** Both repository methods MUST check an authenticated, recently confirmed
 * new account and issue/reuse a DB-stored UUIDv4 atomically.
 * leaseOne(): returns {eventId,leaseId,eventTime,claimWasInserted,record,
 *  accountExcluded,qaOrAdmin,gpc,sharingOptOut,hashedEmail}
 * `kind: retry` is permissible ONLY when it leases the previously inserted,
 * unique verified event row, reusing its original eventId. claimWasInserted
 * attests existence of that original row, NOT an INSERT in this attempt.
 * or null. IDs and email hashes may NEVER be built by the browser.
 * checkPrivacy(eventId, leaseId): reject stale/mismatched leases.
 * settle(eventId, leaseId, status): acknowledgement MUST compare both IDs
 * against the current DB lease. A stale worker may never settle a newer lease.
 * Acknowledgements must be atomic and idempotent; a lease that fails
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
  if (!claim || !['new','retry'].includes(claim.kind) || claim.claimWasInserted!==true
      || typeof claim.eventId!=='string' || !UUID4.test(claim.eventId)
      || typeof claim.leaseId!=='string' || !UUID4.test(claim.leaseId))
    return {status:'not_eligible'}
  const settle=async status=>{
    try { return await repository.settle(claim.eventId,claim.leaseId,status)===true }
    catch { return false }
  }
  let privacy=DEFAULTS
  try {privacy=await repository.checkPrivacy(claim.eventId,claim.leaseId)}
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
  if (!event) {await settle('retryable');return {status:'not_configured'}}
  const response=await sendMetaCapi({
    releaseEnabled,privacyGateApproved,claimWasInserted:true,
    event:event.server,datasetId,apiVersion,serverToken,fetchImpl,
    // Live privacy check after payload creation, before any network call.
    authorized:async()=>{
      const current=await repository.checkPrivacy(claim.eventId,claim.leaseId)
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
