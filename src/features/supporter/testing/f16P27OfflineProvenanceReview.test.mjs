import test from 'node:test'
import assert from 'node:assert/strict'
import {createP27OfflineProvenanceReview as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p27OfflineProvenanceReview.mjs'
const token='22222222-2222-4222-8222-222222222222'
const intent='intent-77777777-7777-4777-8777-777777777777'
const owner='11111111-1111-4111-8111-111111111111'
const base=()=>({
 scope:'OFFLINE_SYNTHETIC_TEST_ONLY',
 merchantReader:{
  getMerchantEvent:async()=>({id:'WH-P27-01',event_type:'PAYMENT.SALE.COMPLETED',
   resource:{id:'SALE-P27-01',billing_agreement_id:'I-P27-ONE',
    state:'COMPLETED',amount:{currency:'USD',total:'2.99'}}}),
  getMerchantSubscription:async()=>({id:'I-P27-ONE',custom_id:intent,status:'ACTIVE'})
 },
 readPrivateReviewContext:async()=>({
  claim:{workerEnabled:true,status:'processing',eventId:'WH-P27-01',
   leaseToken:token,leaseValid:true,prospectiveCutoffPassed:true},
  originalEvent:{id:'WH-P27-01',eventType:'PAYMENT.SALE.COMPLETED',
   signatureStatus:'verified',persistedInVerifiedInbox:true},
  privateBinding:{intentId:intent,subscriptionId:'I-P27-ONE',ownerId:owner,state:'bound'},
  consent:{validP06:true,intentId:intent,ownerId:owner,
   immutablePublishedOffer:true,sha256Verified:true,
   offerPurpose:'PAID_SERVICE_PROSPECTIVE',firstPeriodContractAttested:true,
   qaOnly:false,termsVersion:'pazo-supporter-service-p27lab-v1'},
  reviewReservation:{state:'review_required',intentId:intent,ownerId:owner,
   eventId:'WH-P27-01',saleId:'SALE-P27-01',obligationOrdinal:0}
 }),
 inspectHistory:async()=>({phase:'WINDOWS_CHECKED_REVIEW_ONLY'}),
 inspectRefunds:async()=>({phase:'NO_REFUND_REFS_REVIEW_ONLY'}),
 inspectDisputes:async()=>({phase:'DISPUTE_SNAPSHOT_EMPTY_REVIEW_ONLY'})
})
const check=r=>{
 assert.equal(r.mayRecordPayment,false)
 assert.equal(r.mayCreatePaidPeriod,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.sourceAttestedByThisCode,false)
 assert.equal(r.paidThrough,null)
 assert.equal(r.dbWrites,0)
 for(const s of [token,intent,owner,'SALE-P27-01'])
  assert.ok(!JSON.stringify(r).includes(s))
}
test('P27 disabled without network invocation',async()=>{
 let calls=0;const a=base()
 a.merchantReader.getMerchantEvent=async()=>{calls++;throw Error('unexpected')}
 a.scope='DISABLED'
 const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
 check(r);assert.equal(r.phase,'DISABLED');assert.equal(calls,0)
})
test('P27 all synthetic observations remain review only',async()=>{
 const r=await create(base()).inspect({eventId:'WH-P27-01',claimToken:token})
 check(r);assert.equal(r.phase,'REVIEW_REQUIRED')
 assert.equal(r.reason,'merchant_source_cycle_reversals_and_atomic_credit_unproven')
})
test('P27 declines tampered merchant and owner evidence',async()=>{
 for(const alter of [
  a=>{a.merchantReader.getMerchantSubscription=async()=>({id:'I-FOREIGN',custom_id:intent,status:'ACTIVE'})},
  a=>{a.merchantReader.getMerchantEvent=async()=>{throw Error('merchant down')}},
  a=>{a.readPrivateReviewContext=async()=>null},
  a=>{a.inspectDisputes=async()=>({phase:'REVIEW_REQUIRED'})},
  a=>{a.inspectRefunds=async()=>({phase:'REVIEW_REQUIRED'})},
 ]){
  const a=base();alter(a)
  const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
  check(r);assert.ok(['REVIEW_REQUIRED','DENIED'].includes(r.phase))
 }
})

test('P27 rejects malformed event or lease without merchant network calls',async()=>{
 const inputs=[
  {eventId:'../WH-P27-01',claimToken:token},
  {eventId:'WH-P27-01',claimToken:'not-a-lease'},
  {eventId:'',claimToken:token},
  {eventId:'WH-P27-01',claimToken:null},
 ]
 for(const input of inputs){
  let calls=0
  const a=base()
  a.merchantReader.getMerchantEvent=async()=>{calls++;throw Error('unsafe network')}
  a.merchantReader.getMerchantSubscription=async()=>{calls++;throw Error('unsafe network')}
  a.readPrivateReviewContext=async()=>{calls++;throw Error('unsafe private read')}
  const r=await create(a).inspect(input)
  check(r);assert.equal(r.phase,'DENIED')
  assert.equal(r.reason,'invalid_claim_request')
  assert.equal(calls,0)
 }
})
test('P27 fences private event and lease before any history, refund or dispute reads',async()=>{
 for(const alter of [
  x=>{x.claim.eventId='WH-P27-FOREIGN'},
  x=>{x.claim.leaseToken='33333333-3333-4333-8333-333333333333'},
 ]){
  const a=base()
  const baseRead=a.readPrivateReviewContext
  a.readPrivateReviewContext=async args=>{
   const x=await baseRead(args);alter(x);return x
  }
  let inspections=0
  for(const name of ['inspectHistory','inspectRefunds','inspectDisputes'])
   a[name]=async()=>{inspections++;throw Error('downstream inspection forbidden')}
  const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
  check(r);assert.equal(r.phase,'DENIED')
  assert.equal(r.reason,'private_claim_context_mismatch')
  assert.equal(inspections,0)
 }
})
test('P27 reuses P26 owner, P06 and P25 checks before inspecting merchant history',async()=>{
 const invalid=[
  x=>{x.privateBinding.ownerId='33333333-3333-4333-8333-333333333333'},
  x=>{x.consent.validP06=false},
  x=>{x.consent.sha256Verified=false},
  x=>{x.reviewReservation.saleId='SALE-FOREIGN'},
  x=>{x.reviewReservation.obligationOrdinal=1},
  x=>{x.originalEvent.signatureStatus='unverified'},
  x=>{x.claim.prospectiveCutoffPassed=false},
  x=>{x.claim.leaseValid=false},
 ]
 for(const alter of invalid){
  const a=base(),read=a.readPrivateReviewContext
  a.readPrivateReviewContext=async args=>{
   const context=await read(args);alter(context);return context
  }
  let inspected=0
  for(const name of ['inspectHistory','inspectRefunds','inspectDisputes'])
   a[name]=async()=>{inspected++;throw Error('unauthorized inspection')}
  const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
  check(r);assert.equal(r.phase,'DENIED')
  assert.equal(inspected,0)
 }
})
test('P27 valid synthetic P25/P26 path inspects exact sale only and stays review-only',async()=>{
 const a=base(),calls=[]
 a.inspectHistory=async args=>{
  calls.push(['history',args]);return {phase:'WINDOWS_CHECKED_REVIEW_ONLY'}
 }
 a.inspectRefunds=async args=>{
  calls.push(['refund',args]);return {phase:'NO_REFUND_REFS_REVIEW_ONLY'}
 }
 a.inspectDisputes=async args=>{
  calls.push(['dispute',args]);return {phase:'DISPUTE_SNAPSHOT_EMPTY_REVIEW_ONLY'}
 }
 const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
 check(r);assert.equal(r.phase,'REVIEW_REQUIRED')
 assert.equal(r.reason,'merchant_source_cycle_reversals_and_atomic_credit_unproven')
 assert.equal(calls.length,3)
 for(const [category,args] of calls){
  assert.equal(args.eventId,'WH-P27-01')
  assert.equal(args.claimToken,token)
  if(category!=='history')assert.equal(args.saleId,'SALE-P27-01')
  else assert.equal(Object.hasOwn(args,'saleId'),false)
 }
})
test('P27 unavailable downstream evidence does not record payment or grant rights',async()=>{
 const a=base()
 a.inspectDisputes=async()=>{throw Error('merchant unavailable')}
 const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
 check(r);assert.equal(r.phase,'REVIEW_REQUIRED')
 assert.equal(r.reason,'merchant_or_private_evidence_unavailable')
})
