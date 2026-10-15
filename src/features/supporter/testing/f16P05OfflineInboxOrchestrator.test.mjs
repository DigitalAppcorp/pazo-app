import test from 'node:test'
import assert from 'node:assert/strict'
import {createP05OfflineInboxOrchestrator as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p05OfflineInboxOrchestrator.mjs'

const EVENT='WH-P05-SYNTHETIC123'
const TOKEN='00000000-0000-4000-8000-000000000001'
const WHEN='2026-10-15T03:20:39Z'
const UNTIL='2026-10-15T03:25:39Z'
const claim=()=>({eventId:EVENT,eventType:'PAYMENT.SALE.COMPLETED',
 verifiedAt:WHEN,processingState:'processing',attemptCount:1,
 leaseToken:TOKEN,leaseExpiresAt:UNTIL})
const read=()=>({id:EVENT,type:'PAYMENT.SALE.COMPLETED',
 verifiedAt:WHEN,processingState:'processing'})
const guard=r=>{
 assert.equal(r.environment,'sandbox')
 for(const k of ['sourceAttestedByThisCode',
  'providerSignatureVerifiedByThisCode','cycleVerified',
  'originalRegularCycleProven','mayRecordPayment','mayGrantBenefits',
  'mayCreatePaidPeriod','mayEnableCheckout','financialHistoryComplete',
  'deployAuthorized'])assert.equal(r[k],false,k)
 for(const k of ['periodStart','periodEnd','paidThrough'])assert.equal(r[k],null,k)
 assert.equal(r.dbWrites,0);assert.equal(r.networkPaymentWrites,0)
 const str=JSON.stringify(r)
 for(const secret of [EVENT,TOKEN,WHEN,UNTIL,
  'buyer@example.invalid','SECRETPAYPAL123456','I-FOREIGN-SUB123'])
  assert.equal(str.includes(secret),false,'leaked private reference: '+secret)
}
function fixture(overrides={}){
 const calls=[]
 const adapters={
  claimNextVerifiedEvent:async()=>{
   calls.push('claim')
   return claim()
  },
  readClaimedEvent:async args=>{
   calls.push(['read',args])
   return read()
  },
  inspectMerchantEvidence:async args=>{
   calls.push(['merchant',args])
   return {kind:'sale_correlated_candidate'}
  },
  finishClaimedEvent:async args=>{
   calls.push(['finish',args])
   return true
  },
 }
 // Record mock adapter invocations even when a test substitutes the function.
 // Test callbacks do not get access to fixture internals during destructuring.
 for(const [name,fn] of Object.entries(overrides)){
  adapters[name]=async (...args)=>{
   calls.push(name==='claimNextVerifiedEvent'?'claim':
    [name==='readClaimedEvent'?'read':
     name==='inspectMerchantEvidence'?'merchant':'finish',args[0]])
   return fn(...args)
  }
 }
 return {calls,worker:create(adapters)}
}
const run=async overrides=>{
 const {worker,calls}=fixture(overrides)
 const r=await worker.runOnce()
 guard(r)
 return {r,calls}
}
test('matching merchant sale is quarantined for cycle review, never paid',async()=>{
 const {r,calls}=await run()
 assert.equal(r.phase,'REVIEW_REQUESTED')
 assert.equal(r.reason,'cycle_unproven')
 assert.equal(r.dispositionConfirmed,true)
 assert.deepEqual(calls,[
  'claim',
  ['read',{eventId:EVENT,claimToken:TOKEN}],
  ['merchant',{eventId:EVENT,eventType:'PAYMENT.SALE.COMPLETED'}],
  ['finish',{eventId:EVENT,claimToken:TOKEN,
   outcome:'review',reasonCode:'cycle_unproven'}],
 ])
})
test('disabled rollout / empty claim has no reads or finishes',async()=>{
 const {r,calls}=await run({claimNextVerifiedEvent:async()=>{
  return null
 }})
 assert.equal(r.phase,'NO_CLAIM');assert.deepEqual(calls,['claim'])
})
test('claim transport failure yields no merchant or finish',async()=>{
 const {r,calls}=await run({claimNextVerifiedEvent:async()=>{
  throw Error('buyer@example.invalid SECRETPAYPAL123456')
 }})
 assert.equal(r.phase,'CLAIM_UNAVAILABLE');assert.deepEqual(calls,['claim'])
})
test('malformed and foreign claims never initiate merchant or finish',async()=>{
 for(const change of [
  x=>x.eventId='../other',
  x=>x.eventType='WHATEVER',
  x=>x.leaseToken='browser-controlled',
  x=>x.processingState='pending',
  x=>x.attemptCount=0,
  x=>x.attemptCount=6,
  x=>x.verifiedAt='2026-02-30T00:00:00Z',
  x=>x.leaseExpiresAt=null,
  x=>x.buyerEmail='buyer@example.invalid',
 ]){
  const {r,calls}=await run({claimNextVerifiedEvent:async()=>{
   const c=claim();change(c);return c
  }})
  assert.equal(r.phase,'CLAIM_REJECTED')
  assert.deepEqual(calls,['claim'])
 }
})
test('wrong or expired read evidence gets review with existing claim token',async()=>{
 for(const change of [
  x=>x.id='WH-FOREIGN123',
  x=>x.type='PAYMENT.SALE.REFUNDED',
  x=>x.verifiedAt='2026-10-15T03:19:39Z',
  x=>x.processingState='pending',
  x=>x.privateContact='buyer@example.invalid',
 ]){
  const {r,calls}=await run({readClaimedEvent:async args=>{
   const value=read();change(value);return value
  }})
  assert.equal(r.phase,'REVIEW_REQUESTED')
  assert.equal(r.reason,'missing_evidence')
  assert.equal(calls.filter(x=>Array.isArray(x)&&x[0]==='merchant').length,0)
 }
})
test('read exceptions are transient retry, with allowlisted reason only',async()=>{
 const {r,calls}=await run({readClaimedEvent:async args=>{
  throw Error('buyer@example.invalid')
 }})
 assert.equal(r.phase,'RETRY_REQUESTED')
 assert.equal(r.reason,'read_unavailable')
 assert.deepEqual(calls.at(-1),['finish',{
  eventId:EVENT,claimToken:TOKEN,
  outcome:'retry',reasonCode:'read_unavailable',
 }])
})
test('dispute/refund/reversal events never become sales, quarantine for review',async()=>{
 for(const type of ['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED',
  'CUSTOMER.DISPUTE.CREATED']){
  const {calls,r}=await run({
   claimNextVerifiedEvent:async()=>{const c=claim();c.eventType=type;return c},
   readClaimedEvent:async()=>{const c=read();c.type=type;return c},
  })
  assert.equal(r.phase,'REVIEW_REQUESTED')
  assert.equal(r.reason,'reversal_possible')
  assert.equal(calls.some(x=>Array.isArray(x)&&x[0]==='merchant'),false)
 }
})
test('payment failure and suspension never imply benefits',async()=>{
 for(const type of ['BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.RE-ACTIVATED']){
  const {calls,r}=await run({
   claimNextVerifiedEvent:async()=>{const c=claim();c.eventType=type;return c},
   readClaimedEvent:async()=>{const c=read();c.type=type;return c},
  })
  assert.equal(r.reason,'cycle_unproven')
  assert.equal(calls.some(x=>Array.isArray(x)&&x[0]==='merchant'),false)
 }
})
test('non-sale lifecycle events require review, not a month of service',async()=>{
 for(const type of ['BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.CANCELLED']){
  const {r}=await run({
   claimNextVerifiedEvent:async()=>{const c=claim();c.eventType=type;return c},
   readClaimedEvent:async()=>{const c=read();c.type=type;return c},
  })
  assert.equal(r.reason,'missing_evidence')
 }
})
test('all merchant classification outcomes are allowlisted and fail closed',async()=>{
 const outcomes=[
  ['sale_correlated_candidate','REVIEW_REQUESTED','cycle_unproven'],
  ['reversal_signal','REVIEW_REQUESTED','reversal_possible'],
  ['foreign_reference','REVIEW_REQUESTED','foreign_reference'],
  ['insufficient_evidence','REVIEW_REQUESTED','missing_evidence'],
  ['retryable_outage','RETRY_REQUESTED','merchant_unavailable'],
  ['read_error','RETRY_REQUESTED','read_unavailable'],
  ['temporarily_incomplete','RETRY_REQUESTED','temporarily_incomplete'],
 ]
 for(const [kind,phase,reason] of outcomes){
  const {r}=await run({inspectMerchantEvidence:async()=>({kind})})
  assert.equal(r.phase,phase);assert.equal(r.reason,reason)
 }
})
test('untrusted merchant response cannot choose a SQL success outcome',async()=>{
 for(const value of [
  {kind:'processed'},
  {kind:'paid',mayGrantBenefits:true},
  {kind:'sale_correlated_candidate',payerEmail:'buyer@example.invalid'},
  {kind:'__proto__'},
  null,
  {kind:null},
 ]){
  const {r,calls}=await run({inspectMerchantEvidence:async()=>value})
  assert.equal(r.phase,'REVIEW_REQUESTED')
  assert.equal(r.reason,'missing_evidence')
  assert.equal(calls.at(-1)[1].outcome,'review')
 }
})
test('merchant adapter error is retry and exception data are never returned',async()=>{
 const {r}=await run({inspectMerchantEvidence:async()=>{
  throw Error('buyer@example.invalid SECRETPAYPAL123456')
 }})
 assert.equal(r.phase,'RETRY_REQUESTED')
 assert.equal(r.reason,'merchant_unavailable')
})
test('false finish means NO acknowledgement, not retry/review success',async()=>{
 for(const result of [false,null,undefined,'true']){
  const {r}=await run({finishClaimedEvent:async()=>result})
  assert.equal(r.phase,'FINISH_UNCONFIRMED')
  assert.equal(r.reason,'stale_lease_or_rollout_disabled')
  assert.equal(r.dispositionConfirmed,undefined)
 }
})
test('finish SQL exception is redacted; may not claim payment or ack',async()=>{
 const {r}=await run({finishClaimedEvent:async()=>{
  throw Error('I-FOREIGN-SUB123 bearer SECRETPAYPAL123456')
 }})
 assert.equal(r.phase,'FINISH_UNCONFIRMED')
 assert.equal(r.reason,'fenced_finish_unavailable')
})
test('no browser event, subscription or claim token argument is usable',async()=>{
 const {worker,calls}=fixture()
 const r=await worker.runOnce({
  eventId:'WH-FOREIGN123',subscriptionId:'I-FOREIGN-SUB123',
  claimToken:'browser-controlled',
 })
 guard(r)
 assert.equal(r.phase,'REVIEW_REQUESTED')
 assert.equal(calls[1][1].eventId,EVENT)
 assert.equal(calls.at(-1)[1].claimToken,TOKEN)
})
test('invalid injected adapter contract cannot instantiate the worker',()=>{
 for(const name of ['claimNextVerifiedEvent','readClaimedEvent',
  'inspectMerchantEvidence','finishClaimedEvent']){
  const adapters={
   claimNextVerifiedEvent:async()=>null,
   readClaimedEvent:async()=>null,
   inspectMerchantEvidence:async()=>null,
   finishClaimedEvent:async()=>false,
  }
  delete adapters[name]
  assert.throws(()=>create(adapters),/p05_offline_worker_adapters_missing/)
 }
})
test('96 varied signals never authorize payment or membership',async()=>{
 let n=0
 for(const kind of ['sale_correlated_candidate','foreign_reference','retryable_outage']){
  for(const readValid of [true,false]){
   for(const finishStatus of [true,false]){
    for(const type of ['PAYMENT.SALE.COMPLETED','PAYMENT.SALE.REFUNDED']){
     for(const foreign of [true,false]){
      for(const allowClaim of [true,false]){
       const {r}=await run({
        claimNextVerifiedEvent:async()=>{
         if(!allowClaim)return null
         const c=claim();c.eventType=type;return c
        },
        readClaimedEvent:async()=>{
         const x=read();x.type=type
         if(!readValid)x.id='WH-FOREIGN123'
         return x
        },
        inspectMerchantEvidence:async()=>({
         kind,...(foreign?{payerEmail:'buyer@example.invalid'}:{})
        }),
        finishClaimedEvent:async()=>finishStatus,
       })
       assert.equal(r.mayGrantBenefits,false)
       n++
      }
     }
    }
   }
  }
 }
 assert.equal(n,96)
})
