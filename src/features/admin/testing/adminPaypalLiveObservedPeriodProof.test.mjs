import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveObservedPeriodProof} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveObservedPeriodProof.mjs'
const gen=7,sub='I-PERIOD-TEST',saleId='SALE-PERIOD-TEST',eventId='WH-SALE-PERIOD-TEST'
const ownerId='12345678-1234-4234-8234-123456789abc',intentId='intent-23456789-1234-4234-8234-123456789abc'
const start='2026-10-01T00:00:00.000Z',paid='2026-10-01T00:00:01.000Z',end='2026-11-01T00:00:00.000Z'
const clock=Date.parse('2026-10-01T00:02:00.000Z')
const binding={ownerId,intentId,subscriptionId:sub,merchantGeneration:gen,planId:'P-ABCDEFGHIJKLMN'}
const event={eventId,saleId,signatureVerified:true}
const lease={claimed:true,eventId,ownerId,intentId,leaseToken:'34567890-1234-4234-8234-123456789abc'}
const sale={verified:true,originVerified:true,originSource:'original_generation_subscription_transactions',
 saleId,subscriptionId:sub,merchantGeneration:gen,paidAt:paid}
const activation={eventId:'WH-ACTIVATION-TEST',activationAt:start,nextBillingAt:end,signedBodySha256:'a'.repeat(64)}
const context={...binding,source:'original_bound_live_financial_context',eventId,affirmativeConsent:true,
 consentedAt:'2026-09-30T23:59:00.000Z',termsVersion:'pazo-supporter-live.test',termsDigest:'b'.repeat(64),
 paidPeriodCount:0,lastPaidPeriod:null,activeHold:false,unreconciledFinancialRisk:false,activationReceipts:[activation]}
const snapshot={...binding,verifiedProviderRead:true,proofSource:'paypal_live_original_generation_get',sourceEnvironment:'live',
 planTermsVerified:true,status:'ACTIVE',observedAt:'2026-10-01T00:01:00.000Z',lastPaymentAt:paid,
 lastPaymentMinor:299,currency:'USD',cyclesCompleted:1,failedPaymentsCount:0,outstandingBalanceZero:true,
 lastFailedPaymentPresent:false,nextBillingAt:end}
const original={...activation,verifiedProviderRead:true,provider:'paypal',sourceEnvironment:'live',merchantGeneration:gen,
 eventType:'BILLING.SUBSCRIPTION.ACTIVATED',subscriptionId:sub,subjectId:sub}
const setup=(over={})=>createPazoLiveObservedPeriodProof({rpc:async()=>context,
 readerForGeneration:async()=>({readBillingSnapshot:async()=>snapshot}),
 eventReaderForGeneration:async()=>async()=>original,verifyAcceptedConsent:async c=>
  c.termsVersion===context.termsVersion&&c.termsDigest===context.termsDigest,
 now:()=>clock,...over})
const input={binding,event,lease,sale}
test('first contract uses signed/corroborated activation and observed boundary, without granting',async()=>{
 const r=await setup()(input)
 assert.equal(r.ready,true);assert.equal(r.period.serviceStart,start);assert.equal(r.period.serviceEnd,end)
 assert.equal(r.period.cycleKey,'regular_000001');assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.period.periodSource,'prospective_observed_billing_boundary')
})
test('normal renewal joins the previously paid end to a new observed end and next exact obligation',async()=>{
 const previous={saleId:'SALE-PREVIOUS',cycleKey:'regular_000001',serviceStart:start,serviceEnd:end}
 const secondPaid='2026-11-01T00:00:01.000Z',next='2026-12-01T00:00:00.000Z'
 const r=await setup({rpc:async()=>({...context,paidPeriodCount:1,lastPaidPeriod:previous}),
  readerForGeneration:async()=>({readBillingSnapshot:async()=>({...snapshot,cyclesCompleted:2,
   lastPaymentAt:secondPaid,observedAt:'2026-11-01T00:01:00.000Z',nextBillingAt:next})}),
  now:()=>Date.parse('2026-11-01T00:02:00.000Z')})({...input,sale:{...sale,paidAt:secondPaid}})
 assert.equal(r.ready,true);assert.equal(r.period.serviceStart,end);assert.equal(r.period.serviceEnd,next)
 assert.equal(r.period.cycleKey,'regular_000002')
})
test('out-of-order arrival waits for signed activation; untrusted caller date cannot supply it',async()=>{
 const r=await setup({rpc:async()=>({...context,activationReceipts:[]})})({...input,
  event:{...event,activationAt:start,nextBillingAt:end}})
 assert.equal(r.code,'signed_activation_receipt_pending');assert.equal(r.retryable,true);assert.equal(r.ready,false)
})
test('same application hash, wrong origin, owner, consent or pending reversal cannot prove a period',async()=>{
 for(const c of [{...context,ownerId:'other'}, {...context,termsDigest:'c'.repeat(64)},
  {...context,activeHold:true},{...context,unreconciledFinancialRisk:true},{...context,affirmativeConsent:false}]){
  assert.equal((await setup({rpc:async()=>c})(input)).ready,false)
 }
 assert.equal((await setup()({...input,sale:{...sale,originVerified:false,merchantFingerprint:'a'.repeat(64)}})).ready,false)
})
test('missing interval, accumulated debt, failed charge or skipped cycle remains review without inferred month',async()=>{
 for(const bad of [{nextBillingAt:null},{outstandingBalanceZero:false},{lastFailedPaymentPresent:true},
  {failedPaymentsCount:1},{cyclesCompleted:2},{status:'SUSPENDED'},{lastPaymentAt:'2026-10-01T00:00:02.000Z'},
  {nextBillingAt:'2026-12-01T00:00:00.000Z'},{observedAt:'2026-09-01T00:00:00.000Z'}]){
  const r=await setup({readerForGeneration:async()=>({readBillingSnapshot:async()=>({...snapshot,...bad})})})(input)
  assert.equal(r.ready,false)
 }
})
test('contradictory activation GET or multiple original activations do not credit first payment',async()=>{
 for(const over of [{eventReaderForGeneration:async()=>async()=>({...original,nextBillingAt:'2026-11-02T00:00:00.000Z'})},
  {rpc:async()=>({...context,activationReceipts:[activation,activation]})}])
  assert.equal((await setup(over)(input)).ready,false)
})
test('delayed confirmation and retries cannot manufacture a new service month',async()=>{
 const r=await setup({now:()=>clock+2*86400000})(input)
 assert.equal(r.code,'late_or_invalid_payment_requires_review');assert.equal(r.retryable,false)
 const latePaid='2026-10-02T00:00:01.000Z'
 const late=await setup({now:()=>Date.parse(latePaid),
  readerForGeneration:async()=>({readBillingSnapshot:async()=>({...snapshot,
   lastPaymentAt:latePaid,observedAt:latePaid})})})({...input,sale:{...sale,paidAt:latePaid}})
 assert.equal(late.code,'obligation_dates_require_review')
})
test('temporary provider failure is retryable but never payment proof',async()=>{
 const r=await setup({readerForGeneration:async()=>{throw Error('PRIVATE')}})(input)
 assert.equal(r.retryable,true);assert.equal(r.ready,false);assert.ok(!JSON.stringify(r).includes('PRIVATE'))
})
