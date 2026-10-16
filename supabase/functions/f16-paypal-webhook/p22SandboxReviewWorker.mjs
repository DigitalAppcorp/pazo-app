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
  !merchantReader||['getMerchantEvent','getMerchantSubscription']
   .some(k=>typeof merchantReader[k]!=='function'))
  throw Error('p22_synthetic_worker_missing_adapters')
 const bridge=createP05OfflineMerchantClaimBridge({
  getMerchantEvent:params=>merchantReader.getMerchantEvent(params),
  getMerchantSubscription:params=>merchantReader.getMerchantSubscription(params),
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
