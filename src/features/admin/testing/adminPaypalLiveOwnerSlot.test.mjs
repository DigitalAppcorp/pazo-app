import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveHostedCheckout} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveHostedCheckout.mjs'
import {getPazoLiveOffer} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveOfferRegistry.mjs'

const api='https://mrybvqdebbgcayuvgkkr.supabase.co'
const origin='https://pazo-app-t83r.vercel.app'
const owner='12345678-1234-4234-8234-123456789abc'
const requestKey='23456789-1234-4234-8234-123456789abc'
const version=getPazoLiveOffer('es')
const input=()=>new Request(api+'/functions/v1/pazo-paypal-live-checkout',{
 method:'POST',headers:{origin,'content-type':'application/json',
 authorization:'Bearer e30.eyJzdWIiOiIxMjM0In0.dGVzdA'},
 body:JSON.stringify({action:'subscribe',consent:{
 requestKey,locale:'es',affirmativeConsent:true,
 termsVersion:version.version,termsDigest:version.termsDigest}})})
const json=(d)=>new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})
function mock(slot){
 const calls=[]
 const handler=createPazoLiveHostedCheckout({released:true,
 getEnv:name=>({SUPABASE_URL:api,
  SUPABASE_ANON_KEY:'TEST_ANON_KEY_1234567890123456789',
  SUPABASE_SERVICE_ROLE_KEY:'TEST_SERVICE_ROLE_KEY_123456789012345'}[name]),
 fetchImpl:async (uri,opts)=>{
  calls.push({uri,method:opts?.method,payload:opts?.body})
  if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_active_route'))
   return json({sourceEnvironment:'live',credentialSource:'vault',
    merchantGeneration:1,planId:'P-9BR88240215654528NLL3I4I',
    returnOrigin:origin})
  if(uri.endsWith('/auth/v1/user'))return json({id:owner,aud:'authenticated'})
  if(uri.includes('/rest/v1/profiles?'))return json([{id:owner,onboarding_completed:true}])
  if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_owner_slot'))return json(slot)
  throw Error('network beyond admission is forbidden')
 }})
 return {handler,calls}
}
test('pending provider creation with unknown outcome never creates another subscription',async()=>{
 for(const slot of [
  {state:'pending_claimed_review',intentId:'intent-23456789-1234-4234-8234-123456789abc',merchantGeneration:1},
  {state:'bound_requires_owner_management',merchantGeneration:1,providerStatus:'ACTIVE'},
  {state:'review_required'},
  {state:'pending_unclaimed',requestKey:'34567890-1234-4234-8234-123456789abc',merchantGeneration:1},
  {state:'pending_unclaimed',requestKey,merchantGeneration:2},
  null
 ]){
  const m=mock(slot)
  const response=await m.handler(input())
  assert.equal(response.status,409)
  const body=await response.json()
  assert.equal(body.code,'checkout_admission_denied')
  assert.equal(m.calls.filter(c=>c.uri.includes('api-m.paypal.com')).length,0)
  assert.equal(m.calls.filter(c=>c.uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_owner_slot')).length,1)
 }
})
test('first attempt needs an explicit server-confirmed empty slot before Vault/PayPal',async()=>{
 const m=mock({state:'none'})
 const response=await m.handler(input())
 assert.equal(response.status,503) // private Vault absent in isolated fixture
 assert.notEqual((await response.json()).code,'checkout_admission_denied')
 assert.equal(m.calls.filter(c=>c.uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_owner_slot')).length,1)
 assert.equal(m.calls.filter(c=>c.uri.includes('api-m.paypal.com')).length,0)
})
test('concurrent owner requests are serialized in database before inserting second request key',()=>{
 const sql=readFileSync(new URL('../../../../supabase/migrations/20261021172500_pazo_f16_live_owner_slot_readonly.sql',import.meta.url),'utf8')
 assert.match(sql,/pg_advisory_xact_lock/)
 assert.match(sql,/old\.request_key IS DISTINCT FROM NEW\.request_key/)
 assert.match(sql,/BEFORE INSERT ON supporter_private\.pazo_paypal_live_checkout_intents/)
 assert.match(sql,/state','pending_claimed_review'/)
 assert.match(sql,/provider_status/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.pazo_f16_live_service_owner_slot\(uuid,bigint\)\s+TO service_role/)
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.pazo_f16_live_service_owner_slot\(uuid,bigint\)/)
 assert.doesNotMatch(sql,/INSERT INTO supporter_private\.pazo_paypal_live_paid_periods/)
})
