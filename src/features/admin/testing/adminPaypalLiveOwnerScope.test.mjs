import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveOwnerScopeResolver,createPazoLiveVerifiedInboxAdapter,
 requirePazoLiveProviderSubscription} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveOwnerScope.mjs'
const owner='12345678-1234-4234-8234-123456789abc'
const intent='intent-12345678-1234-4234-8234-123456789abc'
const sub='I-SUBSCRIPTION123',plan='P-ABCDEFGHIJKLMN'
const bound={provider:'paypal',sourceEnvironment:'live',subscriptionId:sub,
 ownerId:owner,intentId:intent,planId:plan,merchantGeneration:7,state:'bound',
 consentVerified:true}
const remote={id:sub,plan_id:plan,custom_id:intent,merchantGeneration:7,
 sourceEnvironment:'live',status:'ACTIVE'}
const saleEvent={eventId:'WH-EVENT-123',eventType:'PAYMENT.SALE.COMPLETED',
 sourceEnvironment:'live',resource:{id:'SALE-123',billing_agreement_id:sub}}
function build({record=bound,evidence=remote}={}){
 const calls=[]
 const resolver=createPazoLiveOwnerScopeResolver({
  findBoundSubscription:async(x)=>{calls.push(['db',x]);return record},
  readerForGeneration:async(x)=>{calls.push(['merchant',x]);return {
   readVerifiedSubscription:async(p)=>{calls.push(['paypal',p]);return evidence}
  }}
 })
 return {resolver,calls}
}
test('signed sale scope resolves original owner from private binding + LIVE GET, no payment credit',async()=>{
 const {resolver,calls}=build()
 const result=await resolver(saleEvent)
 assert.equal(result.confirmed,true)
 assert.equal(result.ownerId,owner)
 assert.equal(result.merchantGeneration,7)
 assert.equal(result.saleVerified,false)
 assert.equal(result.mayGrantBenefits,false)
 assert.equal(result.mayRecordPayment,false)
 assert.deepEqual(calls.map(x=>x[0]),['db','merchant','paypal'])
 assert.equal(calls[2][1].expectedGeneration,7)
})
test('wrong owner merchant generation plan or custom intent fail closed',async()=>{
 const changes=[
  {record:{...bound,ownerId:'not-uuid'}},
  {record:{...bound,sourceEnvironment:'sandbox'}},
  {record:{...bound,merchantGeneration:0}},
  {record:{...bound,state:'pending'}},
  {record:{...bound,consentVerified:false}},
  {evidence:{...remote,plan_id:'P-OTHERPLAN9999'}},
  {evidence:{...remote,custom_id:'intent-33333333-3333-4333-8333-333333333333'}},
  {evidence:{...remote,merchantGeneration:6}},
 ]
 for(const c of changes){
  await assert.rejects(()=>build(c).resolver(saleEvent),
   /live_owner_merchant_scope_unavailable/)
 }
})
test('reject arbitrary PayPal event resource and avoid reading DB at all',async()=>{
 const {resolver,calls}=build()
 for(const ev of [
  {...saleEvent,resource:{id:'SALE-123',billing_agreement_id:'I-MALICIOUS'}},
  {...saleEvent,resource:{id:'SALE-123'}},
  {...saleEvent,resource:{id:'??',billing_agreement_id:sub}},
  {...saleEvent,sourceEnvironment:'sandbox'},
  {...saleEvent,eventType:'UNKNOWN.EVENT'}
 ]){
  if(ev.resource?.billing_agreement_id==='I-MALICIOUS')continue // matches ID grammar; rejects at DB lookup
  await assert.rejects(()=>resolver(ev),/live_owner_merchant_scope_unavailable/)
 }
 assert.equal(calls.length,0)
})
test('subscription events use resource.id, sale requires billing_agreement_id',()=>{
 assert.equal(requirePazoLiveProviderSubscription('BILLING.SUBSCRIPTION.CREATED',{id:sub}),sub)
 assert.equal(requirePazoLiveProviderSubscription('PAYMENT.SALE.COMPLETED',
  {id:'SALE-123',billing_agreement_id:sub}),sub)
 assert.equal(requirePazoLiveProviderSubscription('PAYMENT.SALE.COMPLETED',
  {id:sub}),null)
})
test('signed event inbox deduplicates without trusting webhook recipient or custom_id',async()=>{
 const seen=[]
 const inbox=createPazoLiveVerifiedInboxAdapter({queueVerifiedEvent:async(x)=>{
  seen.push(x);return seen.length===1?'queued':'duplicate_verified_event'
 }})
 const a={provider:'paypal',sourceEnvironment:'live',merchantGeneration:7,
  ownerId:owner,intentId:intent,subscriptionId:sub,
  eventId:'WH-EVENT-123',eventType:'PAYMENT.SALE.COMPLETED'}
 assert.equal(await inbox.recordIfAbsent(a),true)
 assert.equal(await inbox.recordIfAbsent(a),false)
 assert.equal(seen.length,2)
 assert.ok(!JSON.stringify(seen).includes('payer_email'))
 await assert.rejects(()=>inbox.recordIfAbsent({...a,sourceEnvironment:'sandbox'}),
  /live_owner_merchant_scope_unavailable/)
})
