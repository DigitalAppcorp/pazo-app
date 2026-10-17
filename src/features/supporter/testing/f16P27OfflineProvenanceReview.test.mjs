import test from 'node:test'
import assert from 'node:assert/strict'
import {createP27OfflineProvenanceReview as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p27OfflineProvenanceReview.mjs'
import {createP29MerchantSaleReader}
 from '../../../../supabase/functions/f16-paypal-webhook/p29MerchantSaleReader.mjs'
const token='22222222-2222-4222-8222-222222222222'
const intent='intent-77777777-7777-4777-8777-777777777777'
const owner='11111111-1111-4111-8111-111111111111'
const firstCycle=()=>({
 contract:{scope:'PAZO_PROSPECTIVE_ACCEPTED',subscriptionId:'I-P27-ONE',
  saleId:'SALE-P27-01',intentId:intent,termsDigest:'a'.repeat(64),
  termsAcceptedAt:'2026-10-16T09:00:00Z',
  createdAt:'2026-10-16T09:30:00Z',
  activatedAt:'2026-10-16T10:00:00Z',
  observedNextBillingAt:'2026-11-16T10:00:00Z'},
 plan:{source:'MERCHANT_SUBSCRIPTION_PLAN_GET',regularFrequency:'MONTH_1',
  priceMinor:299,currency:'USD',quantity:1,hasTrial:false,
  setupFeeMinor:0,planOverridden:false,regularCyclesCompleted:1,
  failedPaymentsCount:0,outstandingMinor:0,autoBillOutstanding:true},
 transactionHistory:{source:'MERCHANT_SUBSCRIPTION_TRANSACTIONS_GET',
  startAt:'2026-10-16T09:30:00Z',endAt:'2026-10-16T11:00:00Z',
  totalPages:1,totalItems:1,hasNext:false,
  transactions:[{id:'SALE-P27-01',status:'COMPLETED',
   amountMinor:299,currency:'USD',processedAt:'2026-10-16T09:59:55Z'}]},
 webhookJournal:{source:'VERIFIED_WEBHOOK_INBOX_AND_MERCHANT_EVENT_GET',
  startAt:'2026-10-16T09:30:00Z',endAt:'2026-10-16T11:00:00Z',
  coverage:'complete',events:[
   {type:'BILLING.SUBSCRIPTION.ACTIVATED',at:'2026-10-16T10:00:00Z'},
   {type:'PAYMENT.SALE.COMPLETED',at:'2026-10-16T09:59:55Z'}]},
 financialReview:{coverage:'complete',refunds:'clear',disputes:'clear',
  reversals:'clear'},
})
const refundEvidence=()=>({
 originalSale:{id:'SALE-P27-01',grossMinor:299,currency:'USD',
  completedAt:'2026-10-16T09:59:55Z'},
 signedEvents:[],merchantRefunds:[],
})
const signedRefund=(n,amountMinor)=>({
 event:{id:'WH-REFUND-P27-'+n,type:'PAYMENT.SALE.REFUNDED',
  refundId:'REF-P27-'+n,originalSaleId:'SALE-P27-01',
  verifiedAt:'2026-10-16T11:30:00Z'},
 merchant:{id:'REF-P27-'+n,originalSaleId:'SALE-P27-01',
  state:'completed',amountMinor,currency:'USD',
  updatedAt:'2026-10-16T11:30:00Z',
  source:'PAYPAL_SANDBOX_LEGACY_REFUND_GET'},
})
const base=()=>({
 scope:'OFFLINE_SYNTHETIC_TEST_ONLY',
 merchantReader:{
  getMerchantEvent:async()=>({id:'WH-P27-01',event_type:'PAYMENT.SALE.COMPLETED',
   resource:{id:'SALE-P27-01',billing_agreement_id:'I-P27-ONE',
    state:'COMPLETED',amount:{currency:'USD',total:'2.99'}}}),
  getMerchantSubscription:async()=>({id:'I-P27-ONE',custom_id:intent,status:'ACTIVE'})
 },
 readIndependentMerchantSale:async()=>({id:'SALE-P27-01',
  billing_agreement_id:'I-P27-ONE',state:'completed',
  amount:{currency:'USD',total:'2.99'}}),
 readPrivateReviewContext:async()=>({
  claim:{workerEnabled:true,status:'processing',eventId:'WH-P27-01',
   leaseToken:token,leaseValid:true,prospectiveCutoffPassed:true},
  originalEvent:{id:'WH-P27-01',eventType:'PAYMENT.SALE.COMPLETED',
   signatureStatus:'verified',persistedInVerifiedInbox:true},
  privateBinding:{intentId:intent,subscriptionId:'I-P27-ONE',ownerId:owner,state:'bound'},
  consent:{validP06:true,intentId:intent,ownerId:owner,
   immutablePublishedOffer:true,sha256Verified:true,
   offerPurpose:'PAID_SERVICE_PROSPECTIVE',firstPeriodContractAttested:true,
   qaOnly:false,termsVersion:'pazo-supporter-service-p27lab-v1',
   termsDigest:'a'.repeat(64),acceptedAt:'2026-10-16T09:00:00Z'},
  reviewReservation:{state:'review_required',intentId:intent,ownerId:owner,
   eventId:'WH-P27-01',saleId:'SALE-P27-01',obligationOrdinal:0}
 }),
 inspectHistory:async()=>({phase:'WINDOWS_CHECKED_REVIEW_ONLY'}),
 inspectRefunds:async()=>({phase:'NO_REFUND_REFS_REVIEW_ONLY'}),
 inspectDisputes:async()=>({phase:'DISPUTE_SNAPSHOT_EMPTY_REVIEW_ONLY'}),
 readFirstObligationEvidence:async()=>firstCycle(),
 readRefundLineageEvidence:async()=>refundEvidence(),
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

test('P27 denies QA-only agreement before history, refunds or dispute inspection',async()=>{
 const a=base(),read=a.readPrivateReviewContext
 a.readPrivateReviewContext=async input=>{
  const x=await read(input)
  x.consent.offerPurpose='SANDBOX_QA'
  x.consent.qaOnly=true
  x.consent.termsVersion='pazo-supporter-sandbox.qa20261016-v1'
  return x
 }
 let checks=0
 for(const name of ['inspectHistory','inspectRefunds','inspectDisputes'])
  a[name]=async()=>{checks++;throw Error('QA evidence must not continue')}
 const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
 check(r);assert.equal(r.phase,'DENIED')
 assert.equal(r.reason,'prospective_paid_service_terms_not_attested')
 assert.equal(checks,0)
})

test('P27 requires independent SALE GET before history, refund and dispute checks',async()=>{
 for(const sale of [null,
  {id:'SALE-OTHER',billing_agreement_id:'I-P27-ONE',state:'completed',amount:{currency:'USD',total:'2.99'}},
  {id:'SALE-P27-01',billing_agreement_id:'I-OTHER',state:'completed',amount:{currency:'USD',total:'2.99'}},
  {id:'SALE-P27-01',billing_agreement_id:'I-P27-ONE',state:'refunded',amount:{currency:'USD',total:'2.99'}},
  {id:'SALE-P27-01',billing_agreement_id:'I-P27-ONE',state:'completed',amount:{currency:'USD',total:'5.99'}},
 ]){
  const a=base();a.readIndependentMerchantSale=async()=>sale
  let inspected=0
  for(const k of ['inspectHistory','inspectRefunds','inspectDisputes'])
   a[k]=async()=>{inspected++;throw Error('unverified_sale_must_not_proceed')}
  const result=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
  check(result);assert.equal(result.phase,'REVIEW_REQUIRED')
  assert.equal(result.reason,'independent_merchant_sale_unverified')
  assert.equal(inspected,0)
 }
})
test('P27 P29 reader only receives exact leased original sale ID',async()=>{
 const a=base(),visited=[]
 a.readIndependentMerchantSale=async params=>{
  visited.push(['sale',params])
  return {id:'SALE-P27-01',billing_agreement_id:'I-P27-ONE',
   state:'completed',amount:{currency:'USD',total:'2.99'}}
 }
 a.inspectHistory=async()=>{visited.push(['history']);return {phase:'WINDOWS_CHECKED_REVIEW_ONLY'}}
 a.inspectRefunds=async()=>{visited.push(['refunds']);return {phase:'NO_REFUND_REFS_REVIEW_ONLY'}}
 a.inspectDisputes=async()=>{visited.push(['disputes']);return {phase:'DISPUTE_SNAPSHOT_EMPTY_REVIEW_ONLY'}}
 const result=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
 check(result)
 assert.deepEqual(visited[0],['sale',{saleId:'SALE-P27-01',eventId:'WH-P27-01',claimToken:token}])
 assert.equal(visited.length,4)
 assert.equal(result.reason,'merchant_source_cycle_reversals_and_atomic_credit_unproven')
})
test('P27 denies unsafe P06/lease context before independent SALE GET',async()=>{
 for(const alter of [
  x=>{x.consent.validP06=false},
  x=>{x.claim.leaseValid=false},
  x=>{x.reviewReservation.saleId='SALE-FOREIGN'},
  x=>{x.consent.qaOnly=true},
 ]){
  const a=base(),read=a.readPrivateReviewContext
  a.readPrivateReviewContext=async params=>{const context=await read(params);alter(context);return context}
  let calls=0;a.readIndependentMerchantSale=async()=>{calls++;throw Error('forbidden')}
  const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
  check(r);assert.equal(r.phase,'DENIED');assert.equal(calls,0)
 }
})
test('P27 accepts provider lowercase completed event only for review after P29 match',async()=>{
 const a=base()
 a.merchantReader.getMerchantEvent=async()=>({
  id:'WH-P27-01',event_type:'PAYMENT.SALE.COMPLETED',
  resource:{id:'SALE-P27-01',billing_agreement_id:'I-P27-ONE',
   state:'completed',amount:{currency:'USD',total:'2.99'}}
 })
 const result=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
 check(result);assert.equal(result.phase,'REVIEW_REQUIRED')
 assert.equal(result.reason,'merchant_source_cycle_reversals_and_atomic_credit_unproven')
})
test('P27 disabled or absent independent sale reader cannot authorize finance',async()=>{
 const a=base();delete a.readIndependentMerchantSale
 assert.throws(()=>create(a),/p27_offline_dependencies_required/)
 a.scope='DISABLED'
 const result=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
 check(result);assert.equal(result.phase,'DISABLED')
})

test('P27 integrates existing P29 PayPal SALE reader with exact synthetic original GET',async()=>{
 const a=base(),calls=[]
 a.readIndependentMerchantSale=createP29MerchantSaleReader({
  enabled:true,
  readClaimedMerchantEvent:async scope=>{
   calls.push(['claim',scope])
   return a.merchantReader.getMerchantEvent(scope)
  },
  getAccessToken:async()=> 'SYNTHETIC_TOKEN_NOT_A_CREDENTIAL',
  fetchImpl:async (url,options)=>{
   calls.push(['GET',url])
   assert.equal(options.method,'GET')
   assert.equal(url,'https://api-m.sandbox.paypal.com/v1/payments/sale/SALE-P27-01')
   return {ok:true,json:async()=>({
    id:'SALE-P27-01',billing_agreement_id:'I-P27-ONE',
    state:'completed',amount:{currency:'USD',total:'2.99'},
    payer:{email:'never-return-to-p27@example.invalid'},
   })}
  },
 })
 const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
 check(r)
 assert.equal(r.phase,'REVIEW_REQUIRED')
 assert.equal(r.reason,'merchant_source_cycle_reversals_and_atomic_credit_unproven')
 assert.deepEqual(calls,[['claim',{eventId:'WH-P27-01',claimToken:token}],
  ['GET','https://api-m.sandbox.paypal.com/v1/payments/sale/SALE-P27-01']])
 assert.ok(!JSON.stringify(r).includes('never-return-to-p27'))
})

test('P27 chain P05 clean first obligation plus P24 empty refunds remains review only',async()=>{
 const a=base(),seen=[]
 a.readFirstObligationEvidence=async params=>{seen.push(['first',params]);return firstCycle()}
 a.readRefundLineageEvidence=async params=>{seen.push(['refunds',params]);return refundEvidence()}
 const result=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
 check(result)
 assert.equal(result.reason,'merchant_source_cycle_reversals_and_atomic_credit_unproven')
 assert.deepEqual(seen.map(x=>x[0]),['first','refunds'])
 const scope={eventId:'WH-P27-01',claimToken:token,
  saleId:'SALE-P27-01',subscriptionId:'I-P27-ONE',intentId:intent}
 for(const [,params] of seen)assert.deepEqual(params,scope)
})
test('P27 rejects mismatched service acceptance and original sale at first obligation',async()=>{
 for(const mutate of [
  x=>{x.contract.saleId='SALE-FOREIGN'},
  x=>{x.contract.subscriptionId='I-FOREIGN'},
  x=>{x.contract.intentId='intent-foreign123456'},
  x=>{x.contract.termsDigest='b'.repeat(64)},
  x=>{x.contract.termsAcceptedAt='2026-10-16T09:05:00Z'},
 ]){
  const a=base();a.readFirstObligationEvidence=async()=>{
   const x=firstCycle();mutate(x);return x
  }
  let refundCalls=0;a.readRefundLineageEvidence=async()=>{
   refundCalls++;throw Error('wrong_first_obligation')
  }
  const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
  check(r);assert.equal(r.reason,'first_obligation_contract_binding_missing')
  assert.equal(refundCalls,0)
 }
})
test('P27 sends retry, late charge, duplicate sale and invalid billing window to review',async()=>{
 for(const mutate of [
  x=>{x.webhookJournal.events.push({
   type:'BILLING.SUBSCRIPTION.PAYMENT.FAILED',at:'2026-10-16T10:30:00Z'})},
  x=>{x.webhookJournal.events.push({
   type:'PAYMENT.SALE.COMPLETED',at:'2026-10-16T10:15:00Z'})},
  x=>{x.webhookJournal.events.push({
   type:'BILLING.SUBSCRIPTION.ACTIVATED',at:'2026-10-16T10:20:00Z'})},
  x=>{x.transactionHistory.transactions[0].processedAt='2026-11-17T10:00:00Z'},
  x=>{x.contract.observedNextBillingAt='2026-10-16T09:59:59Z'},
  x=>{x.plan.failedPaymentsCount=1},
  x=>{x.financialReview.disputes='open'},
 ]){
  const a=base();a.readFirstObligationEvidence=async()=>{
   const x=firstCycle();mutate(x);return x
  }
  let refundCalls=0;a.readRefundLineageEvidence=async()=>{
   refundCalls++;throw Error('ambiguous_obligation')
  }
  const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
  check(r);assert.equal(r.reason,'first_regular_obligation_ambiguous')
  assert.equal(refundCalls,0)
 }
})
test('P27 refuses partial/full multiple refunds, never adds another month',async()=>{
 for(const amounts of [[100],[99,200]]){
  const a=base()
  a.inspectRefunds=async()=>({phase:'REFUND_LINEAGE_REVIEW_ONLY'})
  a.readRefundLineageEvidence=async()=>{
   const r=refundEvidence()
   for(let i=0;i<amounts.length;i++){
    const item=signedRefund(i+1,amounts[i])
    r.signedEvents.push(item.event);r.merchantRefunds.push(item.merchant)
   }
   return r
  }
  const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
  check(r);assert.equal(r.phase,'REVIEW_REQUIRED')
  assert.equal(r.reason,'refund_lineage_requires_review')
 }
})
test('P27 rejects mismatched original refund sale/time and disagreement with snapshot',async()=>{
 for(const alter of [
  x=>{x.originalSale.id='SALE-FOREIGN'},
  x=>{x.originalSale.completedAt='2026-10-16T11:00:00Z'},
  x=>{x.originalSale.grossMinor=598},
 ]){
  const a=base();a.readRefundLineageEvidence=async()=>{
   const r=refundEvidence();alter(r);return r
  }
  const result=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
  check(result);assert.equal(result.reason,'refund_lineage_sale_binding_missing')
 }
 const a=base();a.inspectRefunds=async()=>({phase:'REFUND_LINEAGE_REVIEW_ONLY'})
 const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
 check(r);assert.equal(r.reason,'refund_summary_lineage_inconsistent')
})
test('P27 incomplete refund/dispute history skips first-period and refund raw reads',async()=>{
 for(const name of ['inspectHistory','inspectRefunds','inspectDisputes']){
  const a=base()
  a[name]=async()=>({phase:'REVIEW_REQUIRED'})
  let calls=0
  a.readFirstObligationEvidence=async()=>{calls++;throw Error('must_stop')}
  a.readRefundLineageEvidence=async()=>{calls++;throw Error('must_stop')}
  const r=await create(a).inspect({eventId:'WH-P27-01',claimToken:token})
  check(r);assert.equal(r.phase,'REVIEW_REQUIRED')
  assert.equal(calls,0)
 }
})
