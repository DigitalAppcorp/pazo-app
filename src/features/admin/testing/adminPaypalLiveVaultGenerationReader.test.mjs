import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveVaultGenerationSecretReader}
 from '../../../../supabase/functions/pazo-paypal-live-webhook/liveVaultGenerationSecrets.mjs'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const key='SERVICE_TEST_KEY_ONLY_VALID_1234567890'
const entry=()=>({generation:1,environment:'live',provider:'paypal',
 sourceEnvironment:'live',credentialSource:'vault',
 merchantFingerprint:'a'.repeat(64),planId:'P-9BR88240215654528NLL3I4I',
 webhookId:'6UA43660E66988355',clientId:'SYNTHETIC_CLIENT_1234567890',
 clientSecret:'SYNTHETIC_SECRET_1234567890',isRetired:false})
const response=x=>new Response(JSON.stringify(x),{
 status:200,headers:{'content-type':'application/json'}})
test('Live checkout can read exactly the verified generation from private Vault RPC',async()=>{
 const calls=[]
 const read=createPazoLiveVaultGenerationSecretReader({
  supabaseUrl:url,serviceRoleKey:key,
  fetchImpl:async(dst,opts)=>{calls.push({dst,opts});return response(entry())}
 })
 const record=await read({merchantGeneration:1,sourceEnvironment:'live'})
 assert.equal(record.generation,1)
 assert.equal(record.clientSecret,entry().clientSecret)
 assert.equal(record.credentialSource,'vault')
 assert.equal(calls.length,1)
 assert.equal(calls[0].dst,url+'/rest/v1/rpc/pazo_f16_live_service_vault_read')
 assert.equal(calls[0].opts.method,'POST')
 assert.deepEqual(JSON.parse(calls[0].opts.body),{p_generation:1})
 assert.equal(calls[0].opts.headers.Authorization,'Bearer '+key)
})
test('cross-environment, wrong generation, malformed credentials and absent records never unlock checkout',async()=>{
 let hits=0
 const read=createPazoLiveVaultGenerationSecretReader({supabaseUrl:url,
  serviceRoleKey:key,fetchImpl:async()=>{hits++;return response(entry())}})
 for(const arg of [{merchantGeneration:1,sourceEnvironment:'sandbox'},
  {merchantGeneration:0,sourceEnvironment:'live'},
  {merchantGeneration:10000,sourceEnvironment:'live'}]){
  await assert.rejects(read(arg),/unavailable/)
 }
 assert.equal(hits,0)
 for(const mismatch of [{generation:2},{credentialSource:'edge_secrets'},
  {planId:'P-OTHER1234567890123'},{clientSecret:'short'},
  {sourceEnvironment:'sandbox'}]){
  const reader=createPazoLiveVaultGenerationSecretReader({supabaseUrl:url,
   serviceRoleKey:key,fetchImpl:async()=>response({...entry(),...mismatch})})
  await assert.rejects(reader({merchantGeneration:1,sourceEnvironment:'live'}),/unavailable/)
 }
})
test('bad service credential and malformed backend response fail closed',async()=>{
 assert.throws(()=>createPazoLiveVaultGenerationSecretReader({
  supabaseUrl:url,serviceRoleKey:'BAD'}),/unavailable/)
 const read=createPazoLiveVaultGenerationSecretReader({supabaseUrl:url,
  serviceRoleKey:key,fetchImpl:async()=>new Response('null',{status:200,
   headers:{'content-type':'application/json'}})})
 await assert.rejects(read({merchantGeneration:1,sourceEnvironment:'live'}),/unavailable/)
})
test('checkout and webhook select per-generation Vault, not browser request or current merchant',()=>{
 const checkout=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-checkout/liveCheckoutHttpHandler.mjs',import.meta.url),'utf8')
 const hosted=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-webhook/liveHostedWebhook.mjs',import.meta.url),'utf8')
 assert.match(checkout,/route\.credentialSource==='vault'/)
 assert.match(checkout,/readGenerationCredentials/)
 assert.match(checkout,/original\.generation!==route\.merchantGeneration/)
 assert.match(hosted,/createPazoLiveVaultHistoricalVerification/)
})
