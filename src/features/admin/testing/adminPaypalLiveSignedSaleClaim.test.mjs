import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveSignedSaleClaim} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveSignedSaleClaim.mjs'
const args={merchantGeneration:7,eventId:'WH-SIGNED-SALE-TEST'}
const owner='12345678-1234-4234-8234-123456789abc'
const intent='intent-12345678-1234-4234-8234-123456789abc'
const subscriptionId='I-SIGNED-SALE-TEST'
const claim={claimed:true,eventId:args.eventId,eventType:'PAYMENT.SALE.COMPLETED',
 merchantGeneration:7,provider:'paypal',sourceEnvironment:'live',ownerId:owner,intentId:intent,
 leaseToken:'87654321-1234-4234-8234-123456789abc',financialEvidenceVerified:false,mayGrantBenefits:false}
const receipt={signatureVerified:true,proofSource:'paypal_live_postback_success',signedBodySha256:'a'.repeat(64),
 eventId:args.eventId,eventType:claim.eventType,merchantGeneration:7,subscriptionId,subjectId:'SALE-SYNTHETIC',
 providerEventAt:'2026-10-21T06:00:00.000Z',subjectAt:'2026-10-21T05:59:59.000Z'}
const binding={provider:'paypal',sourceEnvironment:'live',subscriptionId,merchantGeneration:7,
 ownerId:owner,intentId:intent,state:'bound',consentVerified:true}
const provider={verifiedProviderRead:true,provider:'paypal',sourceEnvironment:'live',merchantGeneration:7,
 eventId:args.eventId,eventType:claim.eventType,subjectId:receipt.subjectId,subscriptionId,
 providerEventAt:'2026-10-21T06:00:00Z',subjectAt:receipt.subjectAt}
function fixture(extra={}){
 const calls=[]
 const lease={claim:async input=>{calls.push(['claim',input]);return claim},
  readSignedReceipt:async input=>{calls.push(['receipt',input]);return receipt},
  finish:async input=>{calls.push(['finish',input]);return true},...extra.lease}
 const run=createPazoLiveSignedSaleClaim({released:true,lease,
  findOriginalBinding:async input=>{calls.push(['binding',input]);return {...binding,...extra.binding}},
  eventReaderForGeneration:async input=>{calls.push(['merchant',input]);return async event=>{
   calls.push(['provider',event]);if(extra.providerError)throw Error('PRIVATE_PROVIDER_ERROR')
   return {...provider,...extra.provider}}},...extra.dependencies})
 return {run,calls}
}
test('durable signature and immutable binding are corroborated with original-generation provider GET',async()=>{
 const f=fixture();const r=await f.run(args)
 assert.equal(r.state,'CLAIMED');assert.equal(r.event.signatureVerified,receipt.signatureVerified)
 assert.equal(r.event.signatureProofSource,'paypal_live_postback_success')
 assert.equal(r.event.saleId,receipt.subjectId);assert.equal(r.binding.ownerVerified,true)
 assert.equal(r.event.searchStart,'2026-10-19T05:59:59.000Z')
 assert.equal(r.event.searchEnd,'2026-10-23T05:59:59.000Z')
 assert.deepEqual(f.calls.map(c=>c[0]),['claim','receipt','binding','merchant','provider'])
 assert.deepEqual(f.calls[3][1],{merchantGeneration:7,sourceEnvironment:'live'})
 assert.equal(r.paymentRecorded,false);assert.equal(r.entitlementGranted,false)
})
test('no claim or release means no provider or receipt activity',async()=>{
 const f=fixture({dependencies:{released:false}})
 assert.equal((await f.run(args)).code,'signed_sale_claim_not_released');assert.equal(f.calls.length,0)
 const none=fixture({lease:{claim:async()=>null}})
 assert.equal((await none.run(args)).state,'NOT_CLAIMED');assert.equal(none.calls.length,0)
})
test('legacy unsigned metadata cannot be converted into a signature flag',async()=>{
 for(const value of [null,{...receipt,signatureVerified:false},{...receipt,proofSource:'in_memory_claim'}]){
  const f=fixture({lease:{readSignedReceipt:async()=>value}})
  assert.equal((await f.run(args)).code,'persisted_signed_sale_receipt_required')
  assert.equal(f.calls.at(-1)[1].result,'held')
  assert.equal(f.calls.some(c=>c[0]==='merchant'),false)
 }
})
test('wrong owner, original generation, consent or subscription are held without provider access',async()=>{
 for(const change of [{ownerId:'OTHER'},{merchantGeneration:8},{consentVerified:false},{subscriptionId:'I-OTHER'}]){
  const f=fixture({binding:change});assert.equal((await f.run(args)).code,'signed_sale_original_binding_mismatch')
  assert.equal(f.calls.at(-1)[1].result,'held');assert.equal(f.calls.some(c=>c[0]==='merchant'),false)
 }
})
test('provider event mismatch is held; transport failure releases only to bounded pending retry',async()=>{
 for(const change of [{subjectId:'SALE-OTHER'},{subscriptionId:'I-OTHER'},{merchantGeneration:8},
  {providerEventAt:'invalid'},{subjectAt:'2026-10-21T05:58:00.000Z'}]){
  const f=fixture({provider:change});assert.equal((await f.run(args)).code,'signed_sale_provider_event_mismatch')
  assert.equal(f.calls.at(-1)[1].result,'held')
 }
 const f=fixture({providerError:true});const r=await f.run(args)
 assert.equal(r.code,'signed_sale_provider_event_unavailable');assert.equal(r.leaseReleased,true)
 assert.equal(f.calls.at(-1)[1].result,'pending');assert.equal(r.retryable,true)
 assert.ok(!JSON.stringify(r).includes('PRIVATE'))
})
test('uncertain finish remains visible for lease-expiry recovery and never records payment',async()=>{
 const f=fixture({providerError:true,lease:{finish:async()=>{throw Error('UNKNOWN')}}})
 const r=await f.run(args);assert.equal(r.leaseReleased,false);assert.equal(r.retryable,false)
 assert.equal(r.paymentRecorded,false)
})

test('transient signed receipt read failure remains pending and retryable after the lease is released',async()=>{
 const f=fixture({lease:{readSignedReceipt:async()=>{throw Error('PRIVATE_NETWORK_FAILURE')}}})
 const r=await f.run(args)
 assert.equal(r.code,'signed_sale_metadata_unavailable')
 assert.equal(r.retryable,true);assert.equal(r.leaseReleased,true)
 assert.equal(r.paymentRecorded,false);assert.equal(r.entitlementGranted,false)
 assert.equal(f.calls.at(-1)[1].result,'pending')
 assert.equal(f.calls.some(c=>c[0]==='provider'),false)
 assert.ok(!JSON.stringify(r).includes('PRIVATE_NETWORK_FAILURE'))
})
