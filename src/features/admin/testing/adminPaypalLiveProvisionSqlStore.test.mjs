import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveProvisionSqlStore} from '../../../../supabase/functions/pazo-admin-paypal-provision/liveProvisionSqlStore.mjs'
const project='https://mrybvqdebbgcayuvgkkr.supabase.co'
const key='TEST_SERVER_KEY_WITH_NO_REAL_SECRETS_123'
const actor='12345678-1234-4234-8234-123456789abc'
const attempt='23456789-1234-4234-8234-123456789abc'
const merchantGeneration=7
const gen={generation:7,environment:'live',credentialSource:'edge_secrets',
 isRetired:false,verifiedAdminId:actor,revision:0,liveCheckoutEnabled:false,
 killSwitch:true,planId:'P-ABCDEFGHIJKLMNOP',webhookId:'WH-ABCDEFGHIJKLMNOP',
 merchantFingerprint:'a'.repeat(64)}
const j=v=>new Response(JSON.stringify(v),{status:200,headers:{'content-type':'application/json'}})
function setup(overrides={}){
 const calls=[]
 const fetchImpl=async(url,req)=>{
  calls.push({url,method:req.method,headers:req.headers,body:JSON.parse(req.body)})
  if(url.endsWith('_generation_read'))return j(gen)
  if(url.endsWith('_reserve'))return j({reserved:true,attemptId:attempt})
  if(url.endsWith('_finish'))return j(true)
  throw Error('unknown endpoint')
 }
 return {calls,store:createPazoLiveProvisionSqlStore({
  projectUrl:project,serviceRoleKey:key,fetchImpl,...overrides})}
}
test('reads secret-free generation through service-only route',async()=>{
 const {store,calls}=setup()
 const got=await store.readGeneration({actorId:actor,merchantGeneration})
 assert.deepEqual(got,gen)
 assert.equal(calls[0].url,project+'/rest/v1/rpc/pazo_f16_live_service_provision_generation_read')
 assert.equal(calls[0].method,'POST')
 assert.equal(calls[0].headers.Authorization,'Bearer '+key)
 assert.deepEqual(calls[0].body,{p_actor:actor,p_generation:7})
 assert.equal(JSON.stringify(got).includes(key),false)
})
test('persisted attempts use generation revision and merchant identity but no credentials',async()=>{
 const {store,calls}=setup()
 assert.deepEqual(await store.reserveAttempt({actorId:actor,merchantGeneration,
  expectedRevision:0,planId:gen.planId,webhookId:gen.webhookId,
  merchantFingerprint:gen.merchantFingerprint}),{reserved:true,attemptId:attempt})
 assert.equal(await store.recordAttemptOutcome({actorId:actor,merchantGeneration,
  attemptId:attempt,resultCode:'secret_write_outcome_unknown_manual_review'}),true)
 assert.equal(calls.length,2)
 assert.equal(calls[0].body.p_fingerprint,gen.merchantFingerprint)
 assert.equal(calls[0].body.p_expected_revision,0)
 assert.equal(calls[1].body.p_result,'secret_write_outcome_unknown_manual_review')
 assert.ok(calls.every(x=>!JSON.stringify(x.body).includes('clientSecret')))
})
test('wrong server input and untrusted mutation responses fail closed',async()=>{
 const {store,calls}=setup()
 await assert.rejects(store.reserveAttempt({actorId:'attacker'}),/unavailable/)
 await assert.rejects(store.recordAttemptOutcome({actorId:actor,merchantGeneration,
  attemptId:attempt,resultCode:'arbitrary'}),/unavailable/)
 assert.equal(calls.length,0)
 const broken=setup({fetchImpl:async()=>j({reserved:true,attemptId:'attacker'})})
 await assert.rejects(broken.store.reserveAttempt({actorId:actor,merchantGeneration,
  expectedRevision:0,planId:gen.planId,webhookId:gen.webhookId,
  merchantFingerprint:gen.merchantFingerprint}),/unavailable/)
})
test('network errors reveal no private response and never retry automatically',async()=>{
 let calls=0
 const x=createPazoLiveProvisionSqlStore({projectUrl:project,serviceRoleKey:key,
  fetchImpl:async()=>{calls++;throw Error('VERY_PRIVATE_SECRET')}})
 await assert.rejects(x.readGeneration({actorId:actor,merchantGeneration}),
  e=>e.message==='live_provision_audit_unavailable')
 assert.equal(calls,1)
})
