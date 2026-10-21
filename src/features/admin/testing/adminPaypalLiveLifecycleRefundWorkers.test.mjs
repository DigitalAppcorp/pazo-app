import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveOwnerScopeResolver} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveOwnerScope.mjs'
import {createPazoLiveSignedEventReceipt} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveSignedEventReceipt.mjs'
import {createPazoLiveDurableRefundWorker} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveDurableRefundWorker.mjs'
import {createPazoLiveDurableLifecycleWorker} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveDurableLifecycleWorker.mjs'
import {createPaypalLiveMerchantEvidenceReader} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveMerchantEvidence.mjs'
import {createPazoLiveOriginalRefundSaleReader} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveOriginalRefundSale.mjs'
const gen=7,sub='I-LIFECYCLE-TEST',saleId='SALE-ORIGINAL-TEST',eventId='WH-REFUND-NEW',subjectId='REFUND-NEW-TEST'
const paid='2026-10-01T00:01:00.000Z',refundAt='2026-12-01T00:01:00.000Z'
const binding={provider:'paypal',sourceEnvironment:'live',merchantGeneration:gen,subscriptionId:sub,
 ownerId:'12345678-1234-4234-8234-123456789abc',intentId:'intent-23456789-1234-4234-8234-123456789abc',
 planId:'P-ABCDEFGHIJKLMN',state:'bound',consentVerified:true}
const original={...binding,recorded:true,saleId,originalPaymentAt:paid,amountMinor:299,currency:'USD'}
const subscription={id:sub,plan_id:binding.planId,custom_id:binding.intentId,status:'CANCELLED',
 merchantGeneration:gen,sourceEnvironment:'live',statusUpdatedAt:'2026-11-15T00:00:00.000Z'}
test('private refund sale adapter uses only its fixed RPC and strips unsolicited fields',async()=>{
 const calls=[]
 const read=createPazoLiveOriginalRefundSaleReader({projectUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co',
  serviceRoleKey:'SYNTHETIC-SERVICE-KEY-123456789',fetchImpl:async(url,o)=>{
   calls.push({url,body:JSON.parse(o.body)})
   return new Response(JSON.stringify({...original,payer_email:'PRIVATE'}),{status:200,headers:{'content-type':'application/json'}})
  }})
 const r=await read({merchantGeneration:gen,saleId})
 assert.equal(r.originalPaymentAt,paid);assert.ok(!JSON.stringify(r).includes('PRIVATE'))
 assert.ok(calls[0].url.endsWith('/rpc/pazo_f16_live_service_refund_sale_binding_read'))
 assert.deepEqual(calls[0].body,{p_generation:gen,p_sale_id:saleId})
 await assert.rejects(()=>read({merchantGeneration:gen,saleId:'../other'}),/unavailable/)
 assert.equal(calls.length,1)
})
test('signed refund without subscription ID resolves only the original paid sale and same generation',async()=>{
 const calls=[]
 const resolver=createPazoLiveOwnerScopeResolver({findBoundSubscription:async()=>{throw Error('unexpected lookup')},
  findOriginalSaleBinding:async args=>{calls.push(args);return original},
  readerForGeneration:async()=>({readVerifiedSubscription:async()=>subscription})})
 const resource={id:subjectId,sale_id:saleId,create_time:refundAt}
 const scope=await resolver({eventId,eventType:'PAYMENT.SALE.REFUNDED',resource,sourceEnvironment:'live',merchantGeneration:gen})
 assert.equal(scope.subscriptionId,sub);assert.equal(scope.originalSaleVerified,true)
 assert.deepEqual(calls,[{merchantGeneration:gen,saleId}])
 const receipt=await createPazoLiveSignedEventReceipt({signatureVerified:true,webhookId:'WH-SYNTHETIC-123',scope,
  rawBody:new TextEncoder().encode(JSON.stringify({id:eventId,event_type:'PAYMENT.SALE.REFUNDED',create_time:refundAt,resource}))})
 assert.equal(receipt.subscriptionId,sub);assert.equal(receipt.subjectId,subjectId)
 await assert.rejects(()=>resolver({eventId,eventType:'PAYMENT.SALE.REFUNDED',resource,
  sourceEnvironment:'live',merchantGeneration:gen+1}),/unavailable/)
})
function fixture({type='PAYMENT.SALE.REFUNDED',uncertain=false,partial=false}={}){
 const calls=[]
 const lifecycle=type.startsWith('BILLING.')
 const subject=lifecycle?sub:subjectId
 const lease={claim:async()=>{calls.push('claim');return {...binding,claimed:true,eventId,eventType:type,
  leaseToken:'34567890-1234-4234-8234-123456789abc'}},
  readSignedReceipt:async()=>({signatureVerified:true,proofSource:'paypal_live_postback_success',signedBodySha256:'a'.repeat(64),
   merchantGeneration:gen,eventId,eventType:type,subscriptionId:sub,subjectId:subject,providerEventAt:refundAt,subjectAt:refundAt}),
  finish:async a=>{calls.push('finish:'+a.result);return true}}
 const financial={verified:true,providerReversalVerified:true,sourceEnvironment:'live',merchantGeneration:gen,
  subscriptionId:sub,intentId:binding.intentId,saleId,amountMinor:299,currency:'USD',
  status:partial?'PARTIALLY_REFUNDED':'REFUNDED',refundKind:partial?'partially_refunded':
   type==='PAYMENT.SALE.REVERSED'?'reversed':'refunded',holdReviewRequired:partial,
  originVerified:true,originSource:'original_generation_subscription_transactions'}
 const historical={findBoundSubscription:async()=>binding,findOriginalSaleBinding:async()=>original,
  eventReaderForGeneration:async()=>async()=>({verifiedProviderRead:true,provider:'paypal',sourceEnvironment:'live',
   merchantGeneration:gen,eventId,eventType:type,subjectId:subject,saleId:lifecycle?null:saleId,
   subscriptionId:lifecycle?sub:null,providerEventAt:refundAt,subjectAt:refundAt}),
  readerForGeneration:async()=>({readVerifiedSubscription:async()=>subscription,
   readRefundEvidence:async a=>{calls.push(a);return financial},readReversalEvidence:async a=>{calls.push(a);return financial}})}
 const rpc=async(n,p)=>{calls.push({n,p});if(uncertain)throw Error('PRIVATE');return 'recorded'}
 const worker=lifecycle?createPazoLiveDurableLifecycleWorker({released:true,lease,historical,rpc}):
  createPazoLiveDurableRefundWorker({released:true,lease,historical,rpc})
 return {calls,worker}
}
test('refund months later retrieves the ORIGINAL sale window and commits a hold with its lease',async()=>{
 const {calls,worker}=fixture(),r=await worker({merchantGeneration:gen,eventId})
 assert.equal(r.refundRecorded,true);assert.equal(r.paymentRecorded,false);assert.equal(r.leaseReleased,true)
 const args=calls.find(x=>typeof x==='object'&&'saleId' in x)
 assert.equal(args.startTime,'2026-09-29T00:01:00.000Z')
 assert.equal(args.endTime,'2026-10-03T00:01:00.000Z')
 assert.equal(calls.find(x=>x?.n)?.n,'leasedRefund');assert.ok(!calls.some(x=>typeof x==='string'&&x.startsWith('finish')))
})
test('partial refund goes to held review without silently revoking an entire period',async()=>{
 const {calls,worker}=fixture({partial:true}),r=await worker({merchantGeneration:gen,eventId})
 assert.equal(r.refundRecorded,false);assert.equal(r.code,'partial_refund_requires_manual_review')
 assert.ok(calls.includes('finish:held'));assert.ok(!calls.some(x=>x?.n))
})
test('chargeback uses separate corroboration and records a reversed hold, not a fake sale status',async()=>{
 const {calls,worker}=fixture({type:'PAYMENT.SALE.REVERSED'}),r=await worker({merchantGeneration:gen,eventId})
 assert.equal(r.refundRecorded,true);assert.equal(calls.find(x=>x?.n)?.p.p_kind,'reversed')
})
test('lifecycle follows current merchant status despite an older event and never edits paid coverage',async()=>{
 const {calls,worker}=fixture({type:'BILLING.SUBSCRIPTION.ACTIVATED'}),r=await worker({merchantGeneration:gen,eventId})
 assert.equal(r.state,'RECORDED');assert.equal(r.paidCoverageChanged,false);assert.equal(r.entitlementGranted,false)
 assert.equal(calls.find(x=>x?.n)?.n,'leasedLifecycle');assert.equal(calls.find(x=>x?.n)?.p.p_status,'CANCELLED')
 assert.ok(!calls.some(x=>typeof x==='string'&&x.startsWith('finish')))
})
test('refund or lifecycle uncertain commit has no retry or speculative acknowledgement',async()=>{
 for(const type of ['PAYMENT.SALE.REFUNDED','BILLING.SUBSCRIPTION.PAYMENT.FAILED']){
  const {calls,worker}=fixture({type,uncertain:true}),r=await worker({merchantGeneration:gen,eventId})
  assert.equal(r.outcomeUnknown,true);assert.equal(r.leaseReleased,false)
  assert.equal(calls.filter(x=>x?.n).length,1);assert.ok(!calls.some(x=>typeof x==='string'&&x.startsWith('finish')))
  assert.ok(!JSON.stringify(r).includes('PRIVATE'))
 }
})
test('provider reversal needs REFUNDED transaction plus original sale CHARGEBACK and immutable subscription',async()=>{
 const factory=(override={})=>{
  const calls=[]
  const reader=createPaypalLiveMerchantEvidenceReader({merchantGeneration:gen,planId:binding.planId,
   clientId:'CLIENT-SYNTHETIC-TEST',clientSecret:'SECRET-SYNTHETIC-TEST',fetchImpl:async(url,o)=>{
    calls.push({url,method:o.method})
    const d=url.endsWith('/oauth2/token')?{token_type:'Bearer',access_token:'TOKEN-SYNTHETIC-TEST'}:
     url.includes('/transactions?')?{total_pages:1,total_items:1,transactions:[{id:saleId,status:'REFUNDED',time:paid,
      amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}}}]}:
     url.includes('/payments/sale/')?{id:saleId,billing_agreement_id:sub,state:'refunded',reason_code:'CHARGEBACK',
      amount:{currency:'USD',total:'2.99'},create_time:paid,...override}:subscription
    return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})
   }})
  return {calls,reader}
 }
 const args={subscriptionId:sub,intentId:binding.intentId,saleId,expectedGeneration:gen,
  startTime:'2026-09-29T00:00:00.000Z',endTime:'2026-10-03T00:00:00.000Z'}
 const good=factory(),r=await good.reader.readReversalEvidence(args)
 assert.equal(r.providerReversalVerified,true);assert.equal(r.refundKind,'reversed')
 assert.ok(good.calls.every(c=>c.method==='GET'||c.url.endsWith('/oauth2/token')))
 for(const bad of [{reason_code:'REFUND'},{state:'reversed'},{billing_agreement_id:'I-OTHER-SUB'}])
  await assert.rejects(()=>factory(bad).reader.readReversalEvidence(args),/unavailable/)
})
test('financial workers stay closed without their release',async()=>{
 for(const w of [createPazoLiveDurableRefundWorker(),createPazoLiveDurableLifecycleWorker()])
  assert.equal((await w({merchantGeneration:gen,eventId})).paymentRecorded,false)
})
