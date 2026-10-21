import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveInboxLease} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveInboxLease.mjs'
const projectUrl='https://mrybvqdebbgcayuvgkkr.supabase.co'
const leaseToken='12345678-1234-4234-8234-123456789abc'
const args={merchantGeneration:1,eventId:'WH-SIGNED-EVENT',leaseToken}
const value={signatureVerified:true,proofSource:'paypal_live_postback_success',
 signedBodySha256:'a'.repeat(64),webhookId:'WH-SYNTHETIC-WEBHOOK',subscriptionId:'I-SYNTHETIC-SUB',
 subjectId:'SALE-SYNTHETIC',eventId:args.eventId,eventType:'PAYMENT.SALE.COMPLETED',merchantGeneration:1,
 providerEventAt:'2026-10-21T06:00:00.000Z',subjectAt:'2026-10-21T06:00:00.000Z',
 activationAt:null,nextBillingAt:null,financialEvidenceVerified:false,mayGrantBenefits:false}
function reader(result=value){
 const calls=[]
 return {calls,read:createPazoLiveInboxLease({projectUrl,serviceRoleKey:'SYNTHETIC_SERVICE_ROLE_LONG_KEY',
  fetchImpl:async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify(result),{
   status:200,headers:{'content-type':'application/json'}})}}).readSignedReceipt}
}
test('receipt read pins event, original generation and current lease to the private RPC',async()=>{
 const r=reader({...value,private_field:'MUST_NOT_ESCAPE'})
 const actual=await r.read(args)
 assert.deepEqual(actual,value)
 assert.equal(r.calls[0].url,projectUrl+'/rest/v1/rpc/pazo_f16_live_service_signed_receipt_read')
 assert.deepEqual(JSON.parse(r.calls[0].init.body),{p_generation:1,p_event_id:args.eventId,p_lease:leaseToken})
 assert.equal(r.calls[0].init.redirect,'error');assert.equal(r.calls[0].init.cache,'no-store')
})
test('missing persisted signature provenance stays unavailable without inventing a flag',async()=>{
 assert.equal(await reader(null).read(args),null)
 for(const extra of [{signatureVerified:false},{signatureVerified:undefined},
  {proofSource:'claimed_in_memory'},{merchantGeneration:2},{eventId:'WH-OTHER'},
  {signedBodySha256:'BAD'},{subjectId:null},{subscriptionId:'OTHER'},
  {subjectAt:'2026-02-30T06:00:00.000Z'},{financialEvidenceVerified:true}])
  await assert.rejects(reader({...value,...extra}).read(args),/live_event_lease_unavailable/)
})
test('invalid caller references make no private RPC call',async()=>{
 for(const extra of [{merchantGeneration:0},{eventId:'x'},{leaseToken:'guessed'}]){
  const r=reader();await assert.rejects(r.read({...args,...extra}),/live_event_lease_unavailable/)
  assert.equal(r.calls.length,0)
 }
})
