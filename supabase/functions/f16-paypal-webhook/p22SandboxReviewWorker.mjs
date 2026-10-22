// PAZO F16-P22: prospective server-only composition, INACTIVE by default.
// No scheduler or Edge import, no permanent writes, no financial credits.
// This module runs at most once ONLY in controlled offline simulations.
import {createP05OfflineInboxOrchestrator}
 from './p05OfflineInboxOrchestrator.mjs'
import {createP05SandboxClaimScopedMerchantReaders}
 from './p05SandboxClaimScopedMerchantReaders.mjs'
import {createP05OfflineMerchantClaimBridge}
 from './p05OfflineMerchantClaimBridge.mjs'
import {createP22PrivateLeaseRpcAdapter}
 from './p22PrivateLeaseRpcAdapter.mjs'
export function createP22SandboxReviewWorker({
 scope='DISABLED',leaseStore,merchantReader,
}={}){
 if(scope!=='OFFLINE_SYNTHETIC_TEST_ONLY')
  return Object.freeze({runOnce:async()=>Object.freeze({
   phase:'DISABLED',environment:'sandbox',mayRecordPayment:false,
   mayGrantBenefits:false,paidThrough:null,dbWrites:0,networkPaymentWrites:0,
  })})
 if(!leaseStore||
  ['claimNextVerifiedEvent','readClaimedEvent',
   'resolveClaimedSubscription','finishClaimedEvent']
   .some(k=>typeof leaseStore[k]!=='function')||
  !merchantReader||['getMerchantEvent','getMerchantSubscription',
   'getIndependentMerchantSale']
   .some(k=>typeof merchantReader[k]!=='function'))
  throw Error('p22_synthetic_worker_missing_adapters')
 const bridge=createP05OfflineMerchantClaimBridge({
  getMerchantEvent:params=>merchantReader.getMerchantEvent(params),
  getMerchantSubscription:params=>merchantReader.getMerchantSubscription(params),
  getIndependentMerchantSale:params=>merchantReader.getIndependentMerchantSale(params),
  resolveClaimedSubscription:params=>leaseStore.resolveClaimedSubscription(params),
 })
 const worker=createP05OfflineInboxOrchestrator({
  claimNextVerifiedEvent:()=>leaseStore.claimNextVerifiedEvent(),
  readClaimedEvent:params=>leaseStore.readClaimedEvent(params),
  inspectMerchantEvidence:params=>bridge.inspectMerchantEvidence(params),
  finishClaimedEvent:params=>leaseStore.finishClaimedEvent(params),
 })
 return Object.freeze({runOnce:()=>worker.runOnce()})
}
export function createP22SandboxOfflineMockComposer({leaseStore,
 clientId,clientSecret,fetchImpl}={}){
 if(typeof fetchImpl!=='function')
  throw Error('p22_offline_mock_fetch_required')
 const merchantReader=createP05SandboxClaimScopedMerchantReaders({
  clientId,clientSecret,fetchImpl,
  readClaimedEvent:params=>leaseStore.readClaimedEvent(params),
 })
 return createP22SandboxReviewWorker({
  scope:'OFFLINE_SYNTHETIC_TEST_ONLY',leaseStore,merchantReader})
}

// F16 closure: connect the EXISTING P21/P22 privileged RPC adapter to the
// EXISTING claimed PayPal Sandbox merchant GET reader and review-only worker.
// NOT IMPORTED by any active Edge function, cron, frontend or billing writer.
// This is an assembly seam for disposable, network-mocked validation ONLY.
// An actual hosted activation requires separately approved server entry point,
// external authorization, secret custody, cutoff and audit. Never pass live
// service-role or merchant secrets through frontend/request data.
export function createP22SandboxPrivilegedReviewComposition({
 scope='DISABLED',projectUrl,serviceRoleKey,
 clientId,clientSecret,fetchImpl,
}={}){
 if(scope!=='OFFLINE_SYNTHETIC_TEST_ONLY')
  return createP22SandboxReviewWorker()
 // Require a deliberately injected network transport: there is no default
 // global fetch path for this test composition.
 if(typeof fetchImpl!=='function')
  throw Error('p22_privileged_composition_requires_test_transport')
 const leaseStore=createP22PrivateLeaseRpcAdapter({
  projectUrl,serviceRoleKey,fetchImpl,
 })
 const merchantReader=createP05SandboxClaimScopedMerchantReaders({
  clientId,clientSecret,fetchImpl,
  readClaimedEvent:params=>leaseStore.readClaimedEvent(params),
 })
 return createP22SandboxReviewWorker({
  scope:'OFFLINE_SYNTHETIC_TEST_ONLY',leaseStore,merchantReader,
 })
}

// F16-P22 one-shot merchant READ ONLY path for an ALREADY leased signed event.
// Distinct from createP22SandboxPrivilegedReviewComposition: NEVER calls the
// claim-next or finish/ACK RPC.  It is not a runnable hosted worker, scheduler,
// browser route or entitlement/ledger integration. P21 remains OFF on hosted.
// Future operator may only supply an existing server-owned lease (not a public
// token); separate authorization is needed for any actual PayPal Sandbox GET.
export function createP22ExistingLeaseReadOnlyComposition({
 scope='DISABLED',projectUrl,serviceRoleKey,
 clientId,clientSecret,fetchImpl,
}={}){
 const safe=(phase,reason)=>Object.freeze({
  environment:'sandbox',step:'f16_p22_existing_lease_readonly',
  phase,reason,merchantCorrelationCandidateOnly:false,
  sourceAttestedByThisCode:false,mayRecordPayment:false,
  mayCreatePaidPeriod:false,mayGrantBenefits:false,
  financialHistoryComplete:false,paidThrough:null,
  dbWrites:0,networkPaymentWrites:0,
 })
 if(scope!=='OFFLINE_SYNTHETIC_TEST_ONLY')
  return Object.freeze({inspect:async()=>safe('DISABLED','scope_disabled')})
 // Explicit injected transport eliminates accidental network requests
 // through global fetch while developing and running synthetic tests.
 if(typeof fetchImpl!=='function')
  throw Error('p22_readonly_requires_test_transport')
 const store=createP22PrivateLeaseRpcAdapter({
  projectUrl,serviceRoleKey,fetchImpl,
 })
 const merchant=createP05SandboxClaimScopedMerchantReaders({
  clientId,clientSecret,fetchImpl,
  readClaimedEvent:params=>store.readClaimedEvent(params),
 })
 const bridge=createP05OfflineMerchantClaimBridge({
  getMerchantEvent:params=>merchant.getMerchantEvent(params),
  getMerchantSubscription:params=>merchant.getMerchantSubscription(params),
  getIndependentMerchantSale:params=>merchant.getIndependentMerchantSale(params),
  resolveClaimedSubscription:params=>store.resolveClaimedSubscription(params),
 })
 return Object.freeze({async inspect({eventId,claimToken}={}){
  // Do not let arbitrary malformed refs reach either Supabase or PayPal.
  // A live, owned, prospective lease is an RPC check, not a caller assertion.
  try{
   const proof=await store.readClaimedEvent({eventId,claimToken})
   if(proof?.id!==eventId||proof?.type!=='PAYMENT.SALE.COMPLETED'||
      proof?.processingState!=='processing')
    return safe('REVIEW_REQUIRED','original_signed_claim_missing')
   const result=await bridge.inspectMerchantEvidence({
    eventId,eventType:'PAYMENT.SALE.COMPLETED',claimToken,
   })
   if(result.kind!=='sale_correlated_candidate')
    return safe('REVIEW_REQUIRED',
     ['retryable_outage','read_error'].includes(result.kind)?
      'merchant_or_private_read_unavailable':'merchant_sale_or_owner_unproven')
   // A second read after asynchronous PayPal GETs detects a stale lease.
   // This remains advisory and is not the atomic SQL write-time lock.
   const after=await store.readClaimedEvent({eventId,claimToken})
   if(after?.id!==proof.id||after?.type!==proof.type||
      after?.verifiedAt!==proof.verifiedAt||
      after?.processingState!=='processing')
    return safe('REVIEW_REQUIRED','existing_lease_changed_during_reads')
   return Object.freeze({
    ...safe('REVIEW_REQUIRED','first_regular_cycle_and_reversals_unproven'),
    merchantCorrelationCandidateOnly:true,
   })
  }catch{return safe('REVIEW_REQUIRED','merchant_or_private_read_unavailable')}
 }})
}
