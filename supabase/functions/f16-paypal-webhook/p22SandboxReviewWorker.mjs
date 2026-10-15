// PAZO F16-P22: prospective server-only composition, INACTIVE by default.
// No scheduler or Edge import, no permanent writes, no financial credits.
// This module runs at most once ONLY in controlled offline simulations.
import {createP05OfflineInboxOrchestrator}
 from './p05OfflineInboxOrchestrator.mjs'
import {createP05SandboxClaimScopedMerchantReaders}
 from './p05SandboxClaimScopedMerchantReaders.mjs'
import {createP05OfflineMerchantClaimBridge}
 from './p05OfflineMerchantClaimBridge.mjs'
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
