import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveHostedGenerationReader} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveHostedGenerationRead.mjs'
const host='https://mrybvqdebbgcayuvgkkr.supabase.co'
const key='service_role_opaque_dummy_only_not_real'
const data={provider:'paypal',environment:'live',generation:7,
 planId:'P-ABCDEFGHIJKLMN',webhookId:'WH-ABCDEFGHIJKLMNO',
 merchantFingerprint:'a'.repeat(64),clientId:'CLIENT_TEST_ABCDEFG',
 clientSecret:'SECRET_TEST_ABCDEFG',arbitrarySensitive:'PRIVATE_DONT_SHOW'}
function fixture(value=data,status=200){
 const calls=[]
 const read=createPazoLiveHostedGenerationReader({
  supabaseUrl:host,serviceRoleKey:key,
  fetchImpl:async(url,args)=>{
   calls.push({url,body:JSON.parse(args.body),method:args.method,
    headers:args.headers})
   return {ok:status===200,status,headers:{get:()=> 'application/json'},
    text:async()=>JSON.stringify(value)}
  }
 })
 return {read,calls}
}
test('read-only original generation RPC keeps no unexpected Vault fields',async()=>{
 const {read,calls}=fixture()
 const out=await read({merchantGeneration:7,sourceEnvironment:'live'})
 assert.equal(out.generation,7)
 assert.equal(out.clientSecret,data.clientSecret)
 assert.equal(out.arbitrarySensitive,undefined)
 assert.equal(calls.length,1)
 assert.equal(calls[0].method,'POST')
 assert.equal(calls[0].url,host+'/rest/v1/rpc/pazo_f16_live_historical_merchant_secrets')
 assert.deepEqual(calls[0].body,{p_generation:7})
 assert.equal(calls[0].headers.apikey,key)
 assert.ok(!JSON.stringify(out).includes('PRIVATE_DONT_SHOW'))
})
test('no live merchant fallback or arbitrary generation for retired Sandbox',async()=>{
 const {read,calls}=fixture()
 for(const bad of [
  {merchantGeneration:7,sourceEnvironment:'sandbox'},
  {merchantGeneration:0,sourceEnvironment:'live'},
  {merchantGeneration:NaN,sourceEnvironment:'live'},
  {merchantGeneration:undefined,sourceEnvironment:'live'}
 ])await assert.rejects(()=>read(bad),/live_generation_vault_read_unavailable/)
 assert.equal(calls.length,0)
})
test('missing RPC, mismatched merchant, plan or missing secret fails closed',async()=>{
 for(const [d,status] of [
  [data,401],[data,403],[data,404],
  [{...data,generation:8},200],
  [{...data,environment:'sandbox'},200],
  [{...data,clientSecret:''},200],
  [{...data,merchantFingerprint:'NOT_HASH'},200],
  [null,200]
 ]){
  await assert.rejects(()=>fixture(d,status).read({merchantGeneration:7,sourceEnvironment:'live'}),
   /live_generation_vault_read_unavailable/)
 }
})
