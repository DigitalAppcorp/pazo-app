import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16P05OfflineCaptureInspector as inspector}
 from '../../../../supabase/functions/f16-paypal-webhook/p05OfflineCapturePreflight.mjs'

const OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const INTENT='intent-test-capture-001'
const SUB='I-EXAMPLEQA123'
const PLAN='P-14V25407JP6850922NLHMDKI'
const DIGEST='a'.repeat(64)
const data=()=>({
 intent:{ownerId:OWNER,id:INTENT,state:'bound',provider:'paypal',
  planId:PLAN,subscriptionId:SUB},
 offer:{version:'offer-v1',sha256:DIGEST,planId:PLAN,monthlyPriceMinor:299,
  currency:'USD',cadence:'MONTH_1',cancelDisclosureVersion:'cancel-v1',
  privacyNoticeVersion:'privacy-v1',publishedAt:'2026-10-14T20:00:00Z',
  product:'PAZO_OPTIONAL_SUPPORTER'},
 ack:{ownerId:OWNER,intentId:INTENT,offerVersion:'offer-v1',offerSha256:DIGEST,
  cancelDisclosureVersion:'cancel-v1',privacyNoticeVersion:'privacy-v1',
  explicitlyAcknowledged:true,acceptedAt:'2026-10-15T02:03:00Z'},
 merchant:{id:SUB,planId:PLAN,customId:INTENT,status:'ACTIVE',
  planOverridden:false,quantity:'1',createdAt:'2026-10-15T02:03:31Z',
  startAt:'2026-10-15T02:03:31Z',nextBillingAt:'2026-11-14T10:00:00Z',
  planStatus:'ACTIVE',planCurrency:'USD',planPriceMinor:299,
  planCadence:'MONTH_1',setupFeeMinor:0},
 event:{id:'WH-ACTIVATE123',eventType:'BILLING.SUBSCRIPTION.ACTIVATED',
  subscriptionId:SUB,planId:PLAN,customId:INTENT,
  eventAt:'2026-10-15T03:20:37.957Z',
  inboxVerifiedAt:'2026-10-15T03:20:39Z',
  nextBillingAt:'2026-11-14T10:00:00Z',
  source:'VERIFIED_SIGNED_INBOX'},
})
function configured(patch){
 const d=data(),calls=[]
 patch?.(d)
 const evaluator=inspector({
  resolveOwnerFromVerifiedSession:async context=>{calls.push('auth');return context?.isValid?OWNER:null},
  readBoundIntent:async scope=>{assert.deepEqual(scope,{ownerId:OWNER,intentId:INTENT});calls.push('intent');return d.intent},
  readPublishedOffer:async scope=>{assert.deepEqual(scope,{planId:PLAN});calls.push('offer');return d.offer},
  readPrivatePurchaseAcknowledgement:async scope=>{assert.deepEqual(scope,{ownerId:OWNER,intentId:INTENT});calls.push('ack');return d.ack},
  readMerchantSubscriptionAndPlan:async scope=>{assert.deepEqual(scope,{subscriptionId:SUB});calls.push('merchant');return d.merchant},
  readVerifiedActivationFromPrivateInbox:async scope=>{assert.deepEqual(scope,{subscriptionId:SUB});calls.push('signed_inbox');return d.event},
 })
 return {evaluator,calls,d}
}
const safe=r=>{
 assert.equal(r.privateSnapshotStored,false)
 assert.equal(r.termsAcceptanceStored,false)
 assert.equal(r.providerSignatureVerifiedByThisCode,false)
 assert.equal(r.ownerVerifiedByThisCode,false)
 assert.equal(r.cycleVerified,false)
 assert.equal(r.saleCycleAllocationVerified,false)
 assert.equal(r.mayCreatePaidPeriod,false)
 assert.equal(r.mayRecordPayment,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.mayCountCommemorativeMonth,false)
 assert.equal(r.paidThrough,null)
 assert.equal(r.periodStart,null)
 assert.equal(r.periodEnd,null)
 assert.equal(r.dbWrites,0)
 assert.equal(r.networkPaymentWrites,0)
 const text=JSON.stringify(r)
 for(const term of [OWNER,INTENT,SUB,PLAN,DIGEST,'WH-ACTIVATE123',
  '2026-11-14T10:00:00Z','private@example.com'])
  assert.equal(text.includes(term),false)
}
const check=async patch=>{
 const x=configured(patch)
 const r=await x.evaluator.inspect({requestContext:{isValid:true},intentId:INTENT})
 safe(r);return {r,calls:x.calls}
}
test('read-only candidate: trusted adapters called, NO actual capture or paid period',async()=>{
 const {r,calls}=await check()
 assert.deepEqual(calls,['auth','intent','offer','ack','merchant','signed_inbox'])
 assert.equal(r.phase,'OFFLINE_CAPTURE_CANDIDATE')
 assert.equal(r.acceptanceVersionAligned,true)
 assert.equal(r.scheduleSnapshotsAligned,true)
 assert.equal(r.requiresTrustedBackendAttestation,true)
 assert.equal(r.requiresRetentionDecision,true)
 assert.equal(r.requiresSaleCycleAllocation,true)
})
test('verified auth is required; browser-provided ownerId is ignored',async()=>{
 const {evaluator,calls}=configured()
 const r=await evaluator.inspect({requestContext:{isValid:false,ownerId:OWNER},
  intentId:INTENT})
 safe(r)
 assert.equal(r.reason,'verified_owner_unavailable')
 assert.deepEqual(calls,['auth'])
})
test('buyer cannot select someone else’s intent and preflight does not proceed',async()=>{
 const {evaluator,calls}=configured(d=>d.intent.ownerId='b1f87879-c8a1-41ca-b43b-c088c0f26a2b')
 const r=await evaluator.inspect({requestContext:{isValid:true},intentId:INTENT})
 safe(r)
 assert.equal(r.reason,'private_bound_intent_not_verified')
 assert.deepEqual(calls,['auth','intent'])
})
test('missing or stale purchase acknowledgement, digest, notice, opt-in held',async()=>{
 for(const patch of [
  d=>{d.ack=null},d=>{d.ack.explicitlyAcknowledged=false},
  d=>{d.ack.offerVersion='offer-v0'},d=>{d.ack.offerSha256='b'.repeat(64)},
  d=>{d.ack.privacyNoticeVersion='old-notice'},
  d=>{d.ack.cancelDisclosureVersion='old-cancel'},
  d=>{d.offer.sha256='wrong'},
 ]){const {r}=await check(patch);assert.equal(r.phase,'REVIEW_REQUIRED')}
})
test('offer must be published before acknowledgement, and acknowledgement before subscription creation',async()=>{
 for(const patch of [
  d=>d.offer.publishedAt='2026-10-15T02:03:10Z',
  d=>d.ack.acceptedAt='2026-10-15T02:04:00Z',
  d=>d.merchant.createdAt='2026-10-15T03:30:00Z',
  d=>d.event.inboxVerifiedAt='2026-10-15T03:00:00Z',
 ])assert.equal((await check(patch)).r.reason,'offer_purchase_merchant_activation_chronology_invalid')
})
test('missing PayPal creation timestamp cannot be replaced by startAt',async()=>{
 const {r}=await check(d=>d.merchant.createdAt=null)
 assert.equal(r.reason,'merchant_subscription_or_plan_snapshot_unverified')
})
test('setup fee absent is UNKNOWN, and positive fee blocks',async()=>{
 for(const v of [null,10]){
  const {r}=await check(d=>d.merchant.setupFeeMinor=v)
  assert.equal(r.phase,'REVIEW_REQUIRED')
  assert.equal(r.reason,v===null?'provider_setup_fee_unknown':'provider_setup_fee_not_zero')
 }
})
test('PayPal merchant agreement identity, plan, status, overrides, quantity must match',async()=>{
 for(const patch of [
  d=>d.merchant.id='I-FOREIGN',
  d=>d.merchant.planId='P-FOREIGN',
  d=>d.merchant.customId='intent-foreign',
  d=>d.merchant.status='CANCELLED',
  d=>d.merchant.planOverridden=true,
  d=>d.merchant.planOverridden=undefined,
  d=>d.merchant.quantity='2',
  d=>d.merchant.planPriceMinor=598,
  d=>d.merchant.planStatus='INACTIVE',
 ])assert.equal((await check(patch)).r.reason,'merchant_subscription_or_plan_snapshot_unverified')
})
test('historical activation event must reference same subscription/intent/plan',async()=>{
 for(const patch of [
  d=>d.event.eventType='BILLING.SUBSCRIPTION.CANCELLED',
  d=>d.event.subscriptionId='I-FOREIGN',
  d=>d.event.customId='intent-foreign',
  d=>d.event.planId='P-FOREIGN',
  d=>d.event.source='BROWSER_CLAIM',
 ])assert.equal((await check(patch)).r.reason,'verified_activation_source_or_identity_missing')
})
test('schedule omitted, mismatch or before activation never silently becomes period',async()=>{
 for(const patch of [
  d=>d.merchant.nextBillingAt=null,
  d=>d.event.nextBillingAt=null,
  d=>d.merchant.nextBillingAt='2026-11-15T10:00:00Z',
  d=>d.event.nextBillingAt='2026-10-14T00:00:00Z',
 ]){const {r}=await check(patch);assert.equal(r.phase,'REVIEW_REQUIRED')}
})
test('reject unanticipated PII from any private source even if mock returns it',async()=>{
 for(const patch of [
  d=>d.offer.payerEmail='private@example.com',
  d=>d.ack.email='private@example.com',
  d=>d.intent.jwt='private',
  d=>d.merchant.subscriber='private@example.com',
  d=>d.event.payload={private:'message'},
 ])assert.equal((await check(patch)).r.phase,'REVIEW_REQUIRED')
})
test('malfunctioning or throwing trusted adapter cannot leak payment data',async()=>{
 const x=configured()
 const y=inspector({
  resolveOwnerFromVerifiedSession:async()=>OWNER,
  readBoundIntent:async()=>x.d.intent,
  readPublishedOffer:async()=>{throw Error('private@example.com MY_SECRET_TOKEN')},
  readPrivatePurchaseAcknowledgement:async()=>x.d.ack,
  readMerchantSubscriptionAndPlan:async()=>x.d.merchant,
  readVerifiedActivationFromPrivateInbox:async()=>x.d.event,
 })
 const r=await y.inspect({requestContext:{isValid:true},intentId:INTENT})
 safe(r);assert.equal(r.reason,'trusted_read_only_adapters_unavailable')
})
test('adapter functions are required; no automatic access to payment or database',()=>{
 assert.throws(()=>inspector(),/not_configured/)
})
test('matrix of 5 opt-in / 3 fee / 3 subscription states never grants',async()=>{
 let n=0
 for(const accepted of [true,false,null,undefined,'true'])
 for(const fee of [0,null,299])
 for(const status of ['ACTIVE','APPROVAL_PENDING','CANCELLED']){
  const {r}=await check(d=>{
   d.ack.explicitlyAcknowledged=accepted
   d.merchant.setupFeeMinor=fee
   d.merchant.status=status
  })
  assert.equal(r.mayGrantBenefits,false)
  n++
 }
 assert.equal(n,45)
})
