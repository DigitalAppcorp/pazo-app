import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveBootstrapSqlStore}
 from '../../../../supabase/functions/pazo-admin-paypal-provision/liveBootstrapSqlStore.mjs'
const project='https://mrybvqdebbgcayuvgkkr.supabase.co'
const key='SERVICE_TEST_NONSECRET_SAMPLE_0123456789'
const actor='12345678-1234-4234-8234-123456789abc'
const planId='P-9BR88240215654528NLL3I4I'
const webhookId='WH-123456789ABC'
const hash='a'.repeat(64)
const g=9
function build(json){
 const calls=[]
 const s=createPazoLiveBootstrapSqlStore({projectUrl:project,
  serviceRoleKey:key,fetchImpl:async(url,opts)=>{
   calls.push({url,opts})
   return new Response(JSON.stringify(json),{status:200,
    headers:{'content-type':'application/json'}})
  }})
 return {s,calls}
}
test('reserve uses privileged DB identity and cannot write payments',async()=>{
 const {s,calls}=build({reserved:true,generation:g,planId,
  environment:'live',mayCharge:false})
 const r=await s.reserveGeneration({actorId:actor,planId})
 assert.deepEqual(r,{generation:g,planId,environment:'live',mayCharge:false})
 assert.equal(calls.length,1)
 assert.equal(calls[0].url,project+'/rest/v1/rpc/pazo_f16_live_service_bootstrap_reserve')
 assert.equal(calls[0].opts.method,'POST')
 assert.equal(calls[0].opts.headers.Authorization,'Bearer '+key)
 assert.deepEqual(JSON.parse(calls[0].opts.body),{p_actor:actor,p_plan:planId})
})
test('finalize only returns exact immutable provider metadata, never secrets',async()=>{
 const {s,calls}=build({finalized:true,generation:g,planId,
  webhookId,merchantFingerprint:hash,environment:'live',mayCharge:false})
 const r=await s.finalizeGeneration({actorId:actor,merchantGeneration:g,
  planId,webhookId,merchantFingerprint:hash})
 assert.equal(r.generation,g)
 assert.equal(r.mayCharge,false)
 assert.deepEqual(JSON.parse(calls[0].opts.body),{
  p_actor:actor,p_generation:g,p_plan:planId,p_webhook:webhookId,p_fingerprint:hash
 })
 assert.equal(JSON.stringify(r).includes(key),false)
})
test('bad input cannot access backend or choose fake generation',async()=>{
 const {s,calls}=build({reserved:true,generation:g,planId,
  environment:'live',mayCharge:false})
 for(const p of [
  {actorId:'not-an-actor',planId},
  {actorId:actor,planId:'bad'},
 ]){
  await assert.rejects(s.reserveGeneration(p),/unavailable/)
 }
 for(const p of [
  {actorId:actor,merchantGeneration:0,planId,webhookId,merchantFingerprint:hash},
  {actorId:actor,merchantGeneration:g,planId,webhookId:'bad',merchantFingerprint:hash},
  {actorId:actor,merchantGeneration:g,planId,webhookId,merchantFingerprint:'bad'}
 ]){
  await assert.rejects(s.finalizeGeneration(p),/unavailable/)
 }
 assert.equal(calls.length,0)
})
test('missing, mismatched, or uncertain database outcomes never imply creation',async()=>{
 const {s}=build({reserved:false})
 await assert.rejects(s.reserveGeneration({actorId:actor,planId}),/unavailable/)
 const {s:wrong}=build({finalized:true,generation:12,planId,
  webhookId,merchantFingerprint:hash,environment:'live',mayCharge:false})
 await assert.rejects(wrong.finalizeGeneration({actorId:actor,merchantGeneration:g,
  planId,webhookId,merchantFingerprint:hash}),/unavailable/)
 const broken=createPazoLiveBootstrapSqlStore({projectUrl:project,
  serviceRoleKey:key,fetchImpl:async()=>{throw Error('private test detail')}})
 await assert.rejects(broken.reserveGeneration({actorId:actor,planId}),
  e=>e.message==='live_generation_bootstrap_unavailable')
})
test('draft SQL is server-only, sequential, inert and disallows a second bootstrap',()=>{
 const sql=readFileSync(new URL('../../../../supabase/drafts/f16_live_bootstrap_generation_REVIEW_REQUIRED.sql',import.meta.url),'utf8')
 assert.match(sql,/REVIEW REQUIRED, NOT HOSTED/)
 assert.match(sql,/pg_get_serial_sequence/)
 assert.match(sql,/OVERRIDING SYSTEM VALUE/)
 assert.match(sql,/UNIQUE CHECK\(plan_id|plan_id text NOT NULL UNIQUE/)
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/current_setting\('request.jwt.claim.role',true\)/)
 assert.match(sql,/NOT EXISTS \(SELECT 1 FROM admin_private.admin_grants/)
 assert.match(sql,/REVOKE ALL ON FUNCTION/)
 assert.match(sql,/TO service_role;/)
 assert.match(sql,/environment='sandbox' AND live_enabled=false/)
 assert.match(sql,/kill_switch=true AND active_generation IS NULL/)
 assert.doesNotMatch(sql,/insert into supporter_private/i)
 assert.doesNotMatch(sql,/update supporter_private/i)
})
