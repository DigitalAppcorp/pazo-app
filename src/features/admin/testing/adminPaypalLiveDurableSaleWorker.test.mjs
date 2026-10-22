import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveDurableSaleWorker} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveDurableSaleWorker.mjs'
const eventId='WH-DURABLE-SALE',saleId='SALE-DURABLE-123',sub='I-DURABLE-TEST'
const ownerId='12345678-1234-4234-8234-123456789abc',intentId='intent-23456789-1234-4234-8234-123456789abc'
const start='2026-10-01T00:00:00.000Z',paid='2026-10-01T00:00:01.000Z',end='2026-11-01T00:00:00.000Z'
const binding={provider:'paypal',sourceEnvironment:'live',ownerId,intentId,subscriptionId:sub,merchantGeneration:7,
 state:'bound',consentVerified:true,ownerVerified:true,merchantGenerationVerified:true,planId:'P-ABCDEFGHIJKLMN'}
const leaseData={...binding,claimed:true,eventId,eventType:'PAYMENT.SALE.COMPLETED',leaseToken:'34567890-1234-4234-8234-123456789abc'}
const activation={eventId:'WH-DURABLE-ACTIVATION',activationAt:start,nextBillingAt:end,signedBodySha256:'a'.repeat(64)}
function fixture({write='recorded',uncertain=false,activationMissing=false}={}){
 const calls=[]
 const lease={claim:async()=>{calls.push('claim');return leaseData},
  readSignedReceipt:async()=>({signatureVerified:true,proofSource:'paypal_live_postback_success',signedBodySha256:'a'.repeat(64),
   eventId,eventType:'PAYMENT.SALE.COMPLETED',merchantGeneration:7,subscriptionId:sub,subjectId:saleId,
   providerEventAt:paid,subjectAt:paid}),
  finish:async args=>{calls.push('finish:'+args.result);return true}}
 const historical={findBoundSubscription:async()=>binding,eventReaderForGeneration:async()=>async arg=>
  arg.eventId===eventId?{provider:'paypal',sourceEnvironment:'live',verifiedProviderRead:true,
   merchantGeneration:7,eventId,eventType:'PAYMENT.SALE.COMPLETED',subjectId:saleId,subscriptionId:sub,
   providerEventAt:paid,subjectAt:paid}:{...activation,provider:'paypal',sourceEnvironment:'live',verifiedProviderRead:true,
    merchantGeneration:7,eventType:'BILLING.SUBSCRIPTION.ACTIVATED',subjectId:sub,subscriptionId:sub},
  readerForGeneration:async()=>({readCompletedSale:async()=>({verified:true,sourceEnvironment:'live',merchantGeneration:7,
   subscriptionId:sub,saleId,amountMinor:299,currency:'USD',paidAt:paid,originVerified:true,
   originSource:'original_generation_subscription_transactions'}),readBillingSnapshot:async()=>({...binding,
    verifiedProviderRead:true,proofSource:'paypal_live_original_generation_get',planTermsVerified:true,status:'ACTIVE',
    observedAt:'2026-10-01T00:01:00.000Z',lastPaymentAt:paid,lastPaymentMinor:299,currency:'USD',cyclesCompleted:1,
    failedPaymentsCount:0,outstandingBalanceZero:true,lastFailedPaymentPresent:false,nextBillingAt:end})})}
 const rpc=async(name)=>{
  calls.push(name)
  if(name==='financialContext')return {...binding,source:'original_bound_live_financial_context',eventId,affirmativeConsent:true,
   consentedAt:'2026-09-30T23:59:00.000Z',termsVersion:'pazo-supporter-live.test',termsDigest:'a'.repeat(64),
   paidPeriodCount:0,lastPaidPeriod:null,activeHold:false,unreconciledFinancialRisk:false,
   activationReceipts:activationMissing?[]:[activation]}
  if(uncertain)throw Error('PRIVATE')
  return write
 }
 return {calls,worker:createPazoLiveDurableSaleWorker({released:true,lease,rpc,historical,
  verifyAcceptedConsent:async c=>c.termsVersion==='pazo-supporter-live.test',now:()=>Date.parse('2026-10-01T00:02:00.000Z')})}
}
test('durable sale claims once and commits financial record plus lease without a second finish',async()=>{
 const {calls,worker}=fixture(),r=await worker({merchantGeneration:7,eventId})
 assert.equal(r.state,'RECORDED');assert.equal(r.leaseReleased,true);assert.equal(r.paymentRecorded,true)
 assert.deepEqual(calls,['claim','financialContext','leasedSale'])
})
test('uncertain commit leaves recovery to durable state, no retry or speculative finish',async()=>{
 const {calls,worker}=fixture({uncertain:true}),r=await worker({merchantGeneration:7,eventId})
 assert.equal(r.outcomeUnknown,true);assert.equal(r.leaseReleased,false)
 assert.deepEqual(calls,['claim','financialContext','leasedSale']);assert.ok(!JSON.stringify(r).includes('PRIVATE'))
})
test('out-of-order activation releases a pending lease without recording a payment',async()=>{
 const {calls,worker}=fixture({activationMissing:true}),r=await worker({merchantGeneration:7,eventId})
 assert.equal(r.code,'signed_activation_receipt_pending');assert.equal(r.paymentRecorded,false)
 assert.deepEqual(calls,['claim','financialContext','finish:pending'])
})
test('worker remains closed without release or complete private dependencies',async()=>{
 for(const worker of [createPazoLiveDurableSaleWorker(),createPazoLiveDurableSaleWorker({released:true})])
  assert.equal((await worker({merchantGeneration:7,eventId})).paymentRecorded,false)
})
