import test from 'node:test'
import assert from 'node:assert/strict'
import {createP37ActivationEventReader} from '../../../../supabase/functions/f16-paypal-webhook/p37ActivationEventReader.mjs'
const args={activationEventId:'WH-P37-ACT',activationClaimToken:'11111111-1111-4111-8111-111111111111',subscriptionId:'I-P37-TEST'}
const claim={id:args.activationEventId,type:'BILLING.SUBSCRIPTION.ACTIVATED',processingState:'processing',subscriptionId:args.subscriptionId,signatureVerified:true}
test('disabled-by-default activation reader has no side effects',async()=>{
 let calls=0
 const read=createP37ActivationEventReader({readClaimedActivation:async()=>{calls++},getAccessToken:async()=>{calls++}})
 assert.equal(await read(args),null);assert.equal(calls,0)
})
test('isolated merchant GET requires independently claimed activation',async()=>{
 let fetched=0
 const read=createP37ActivationEventReader({enabled:true,readClaimedActivation:async()=>claim,getAccessToken:async()=> 'synthetic-access-token',
 fetchImpl:async(url,opts)=>{fetched++;assert.match(url,/\/v1\/notifications\/webhooks-events\/WH-P37-ACT$/);assert.equal(opts.method,'GET');return {ok:true,json:async()=>({id:args.activationEventId,event_type:claim.type,create_time:'2026-10-15T10:00:00Z',resource:{id:args.subscriptionId,payer:{email:'ignored'}}})}}})
 assert.deepEqual(await read(args),{event_type:claim.type,create_time:'2026-10-15T10:00:00Z',resource:{id:args.subscriptionId}})
 assert.equal(fetched,1)
})
test('unsigned, mismatched or stale activation claim denies before merchant GET',async()=>{
 for(const bad of [{...claim,signatureVerified:false},{...claim,subscriptionId:'I-OTHER'},{...claim,processingState:'pending'}]){
  let called=0
  const read=createP37ActivationEventReader({enabled:true,readClaimedActivation:async()=>bad,getAccessToken:async()=>{called++},fetchImpl:async()=>{called++}})
  assert.equal(await read(args),null);assert.equal(called,0)
 }
})
