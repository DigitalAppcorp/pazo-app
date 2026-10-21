import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveInboxLease}
 from '../../../../supabase/functions/pazo-paypal-live-webhook/liveInboxLease.mjs'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const key='TEST_ONLY_NONPRODUCTION_SERVICE_ROLE_KEY_123456'
const ownerId='12345678-1234-4234-8234-123456789abc'
const leaseToken='23456789-1234-4234-8234-123456789abc'
const intentId='intent-12345678-1234-4234-8234-123456789abc'
const eventId='EVT-1234567890'
const merchantGeneration=7
function store(result){
 const calls=[]
 const x=createPazoLiveInboxLease({projectUrl:url,serviceRoleKey:key,
  fetchImpl:async(uri,opts)=>{
   calls.push({uri,opts})
   return new Response(JSON.stringify(result),{status:200,
    headers:{'content-type':'application/json'}})
  }})
 return {x,calls}
}
test('exclusive durable claim never constitutes evidence of payment',async()=>{
 const {x,calls}=store({claimed:true,leaseToken,eventId,
  merchantGeneration,sourceEnvironment:'live',provider:'paypal',
  ownerId,intentId,eventType:'PAYMENT.SALE.COMPLETED',
  financialEvidenceVerified:false,mayGrantBenefits:false})
 const v=await x.claim({merchantGeneration,eventId})
 assert.equal(v.financialEvidenceVerified,false)
 assert.equal(v.mayGrantBenefits,false)
 assert.equal(calls[0].uri,url+'/rest/v1/rpc/pazo_f16_live_service_inbox_claim')
 assert.equal(calls[0].opts.headers.Authorization,'Bearer '+key)
 assert.deepEqual(JSON.parse(calls[0].opts.body),{
  p_generation:merchantGeneration,p_event_id:eventId
 })
 assert.equal(JSON.stringify(v).includes(key),false)
})
test('completion requires a valid lease token and explicit state',async()=>{
 const {x,calls}=store(true)
 assert.equal(await x.finish({merchantGeneration,eventId,leaseToken,
  result:'held'}),true)
 assert.equal(calls.length,1)
 assert.deepEqual(JSON.parse(calls[0].opts.body),{
  p_generation:merchantGeneration,p_event_id:eventId,
  p_lease:leaseToken,p_result:'held'
 })
})
test('invalid or fabricated proof cannot be surfaced',async()=>{
 const {x}=store({claimed:true,leaseToken,eventId,merchantGeneration,
  provider:'paypal',sourceEnvironment:'live',ownerId,intentId,
  eventType:'PAYMENT.SALE.COMPLETED',financialEvidenceVerified:true,
  mayGrantBenefits:true})
 await assert.rejects(x.claim({merchantGeneration,eventId}),/unavailable/)
 const {x:no}=store(null)
 assert.equal(await no.claim({merchantGeneration,eventId}),null)
 const {x:bad}=store(true)
 await assert.rejects(bad.finish({merchantGeneration,eventId,
  leaseToken:'wrong',result:'processed'}),/unavailable/)
})
test('SQL stage uses service-only lease with crash recovery, no payment shortcuts',()=>{
 const s=readFileSync(new URL('../../../../supabase/drafts/f16_live_durable_inbox_lease_REVIEW_REQUIRED.sql',import.meta.url),'utf8')
 assert.match(s,/REVIEW DRAFT ONLY/)
 assert.match(s,/FOR UPDATE SKIP LOCKED/)
 assert.match(s,/claim_attempts<3/)
 assert.match(s,/lease_expires_at<pg_catalog.clock_timestamp\(\)/)
 assert.match(s,/lease_token=p_lease/)
 assert.match(s,/processing_state='processing'/)
 const foundation=readFileSync(new URL('../../../../supabase/migrations/20261019235351_pazo_f16_live_gateway_inert_private_staging.sql',import.meta.url),'utf8')
 assert.match(foundation,/ALTER TABLE supporter_private\.pazo_paypal_live_event_inbox FORCE ROW LEVEL SECURITY/)
 assert.match(s,/current_setting\('request.jwt.claim.role',true\)/)
 assert.match(s,/TO service_role;/)
 assert.match(s,/pazo_paypal_live_paid_periods/)
 assert.match(s,/pazo_paypal_live_period_holds/)
 assert.doesNotMatch(s,/INSERT INTO supporter_private\.pazo_paypal_live_paid_periods/i)
})
