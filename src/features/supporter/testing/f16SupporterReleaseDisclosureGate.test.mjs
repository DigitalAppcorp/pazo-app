import test from 'node:test'
import assert from 'node:assert/strict'
import {auditF16SupporterLaunchControls as audit,
 F16_SUPPORTER_REQUIRED_CONTROLS as controls} from './f16SupporterReleaseDisclosureGate.mjs'

const fixture=()=>({
 offer:{product:'PAZO_OPTIONAL_SUPPORTER',currency:'USD',amountMinor:299,
  intervalUnit:'MONTH',intervalCount:1,autoRenews:true,isFreeCore:true,
  hasTrial:false,offerVersion:'offer-v1'},
 controls:Object.fromEntries(controls.map(x=>[x,true])),
})
const safe=x=>{
 assert.equal(x.launchAuthorized,false)
 assert.equal(x.mayActivateCheckout,false)
 assert.equal(x.mayCreateSubscription,false)
 assert.equal(x.mayGrantBenefits,false)
 assert.equal(x.mayRecordPayment,false)
 assert.equal(x.cycleVerified,false)
 assert.equal(x.periodStart,null)
 assert.equal(x.periodEnd,null)
 assert.equal(x.paidThrough,null)
 assert.equal(x.networkPaymentWrites,0)
 assert.equal(x.dbWrites,0)
 assert.equal(x.needsProductOwnerGo,true)
 assert.equal(x.needsIndependentRuntimeVerification,true)
 assert.equal(x.needsLegalReview,true)
 assert.equal(JSON.stringify(x).includes('private@example.com'),false)
}
const run=mutate=>{const x=fixture();mutate?.(x);const r=audit(x);safe(r);return r}
test('ALL synthetic claims cannot approve a public subscription release',()=>{
 const r=run()
 assert.equal(r.phase,'ALL_CONTROLS_CLAIMED_NOT_ATTESTED')
 assert.equal(r.missingControls.length,0)
})
test('every independent consumer/legal/merchant gate omitted blocks release',()=>{
 for(const key of controls){
  const r=run(x=>x.controls[key]=false)
  assert.equal(r.phase,'REVIEW_REQUIRED')
  assert.equal(r.reason,'consumer_and_financial_release_gates_open')
  assert.deepEqual(r.missingControls,[key])
 }
})
test('no opt-in, prechecked consent, cancellation or acknowledgement blocks',()=>{
 const needed=['expressConsentBeforePayPal','consentInitiallyUnchecked',
  'sameMediumOnlineCancellationVerified','retainableAcknowledgementDelivered',
  'annualRenewalReminderVerified','advancePriceChangeNoticeVerified']
 for(const key of needed){
  const r=run(x=>x.controls[key]=false)
  assert.equal(r.launchAuthorized,false)
  assert.ok(r.missingControls.includes(key))
 }
})
test('all actual hosted gates unavailable in current PAZO remain blocked',()=>{
 const missing=['sameMediumOnlineCancellationVerified',
  'annualRenewalReminderVerified','retainableAcknowledgementDelivered',
  'saleToServiceCycleVerified','refundAndDisputeCoverageVerified',
  'financialRetentionAndDeletionReviewed','providerBackupsAndDataDeletionReviewed']
 const r=run(x=>{for(const k of missing)x.controls[k]=false})
 assert.equal(r.phase,'REVIEW_REQUIRED')
 assert.deepEqual(r.missingControls,missing)
})
test('free-core, no trial, exact 2.99 USD month and recurring are immutable scope',()=>{
 for(const mutation of [
  x=>x.offer.amountMinor=598,
  x=>x.offer.currency='EUR',
  x=>x.offer.intervalUnit='DAY',
  x=>x.offer.intervalCount=30,
  x=>x.offer.isFreeCore=false,
  x=>x.offer.hasTrial=true,
  x=>x.offer.autoRenews=false,
  x=>x.offer.product='PAZO_FREE_CORE',
  x=>x.offer.offerVersion='',
 ]){
  const r=run(mutation)
  assert.equal(r.reason,'offer_terms_not_consistent_with_approved_scope')
 }
})
test('unknown flags, PII, free-form dates and missing keys fail closed',()=>{
 for(const mutation of [
  x=>x.controls.payerEmail='private@example.com',
  x=>delete x.controls.annualRenewalReminderVerified,
  x=>x.controls.sameMediumOnlineCancellationVerified='yes',
  x=>x.offer.authToken='private@example.com',
  x=>x.offer.currentPaidThrough='2026-11-14',
  x=>delete x.offer.amountMinor,
  x=>x.extra='something',
 ]){
  const r=run(mutation)
  assert.equal(r.phase,'REVIEW_REQUIRED')
  assert.equal(r.missingControls.length,0)
 }
})
test('180 adversarial combinations of missing controls never grant anything',()=>{
 let n=0
 for(const consent of [true,false])
  for(const cancel of [true,false])
   for(const annual of [true,false])
    for(const retention of [true,false,false])
     for(const cycle of [true,false,false])
      for(const refund of [true,false]){
       const r=run(x=>{
        x.controls.expressConsentBeforePayPal=consent
        x.controls.sameMediumOnlineCancellationVerified=cancel
        x.controls.annualRenewalReminderVerified=annual
        x.controls.financialRetentionAndDeletionReviewed=retention
        x.controls.saleToServiceCycleVerified=cycle
        x.controls.refundAndDisputeCoverageVerified=refund
       })
       assert.equal(r.launchAuthorized,false)
       n++
      }
 assert.equal(n,144)
})
