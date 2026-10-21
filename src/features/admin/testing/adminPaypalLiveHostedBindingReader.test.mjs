import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveHostedBindingReader} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveHostedBindingRead.mjs'
const host='https://mrybvqdebbgcayuvgkkr.supabase.co'
const key='secret_service_role_test_key_opaque_000000'
const sub='I-OWNER-SUB1234'
const result={provider:'paypal',sourceEnvironment:'live',subscriptionId:sub,
 ownerId:'12345678-1234-4234-8234-123456789abc',
 intentId:'intent-12345678-1234-4234-8234-123456789abc',
 planId:'P-ABCDEFGHIJKLMN',merchantGeneration:7,
 state:'bound',consentVerified:true,unexpectedPrivateToken:'PRIVATE_NEVER_RETURN'}
const build=(data=result,status=200)=>{
 const requests=[]
 return {requests,reader:createPazoLiveHostedBindingReader({
  supabaseUrl:host,serviceRoleKey:key,
  fetchImpl:async(url,options)=>{
   requests.push({url,method:options.method,headers:options.headers,
    body:JSON.parse(options.body)})
   return {ok:status===200,status,
    headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(data)}
  }
 })}
}
test('actual PostgREST read-only RPC adapter returns only immutable owner binding',async()=>{
 const {reader,requests}=build()
 const binding=await reader({subscriptionId:sub})
 assert.equal(binding.ownerId,result.ownerId)
 assert.equal(binding.merchantGeneration,7)
 assert.deepEqual(Object.keys(binding).sort(),Object.keys(result).filter(k=>k!=='unexpectedPrivateToken').sort())
 assert.equal(requests.length,1)
 assert.equal(requests[0].url,host+'/rest/v1/rpc/pazo_f16_live_service_binding_read')
 assert.equal(requests[0].method,'POST')
 assert.deepEqual(requests[0].body,{p_subscription_id:sub})
 assert.equal(requests[0].headers.apikey,key)
 assert.ok(!JSON.stringify(binding).includes('PRIVATE_NEVER_RETURN'))
 assert.ok(!JSON.stringify(binding).includes(key))
})
test('unknown subscription exposes no binding and no private state',async()=>{
 const {reader}=build(null)
 assert.equal(await reader({subscriptionId:sub}),null)
})
test('unauthorized provider response or forged merchant/owner is blocked generically',async()=>{
 for(const [data,status] of [
  [{...result,ownerId:'not-uuid'},200],
  [{...result,sourceEnvironment:'sandbox'},200],
  [{...result,merchantGeneration:0},200],
  [{...result,subscriptionId:'I-WRONG'},200],
  [{...result,consentVerified:false},200],
  [{...result,planId:'P-WRONG'},200],
  [result,401],[result,403],[result,500]
 ]){
  await assert.rejects(()=>build(data,status).reader({subscriptionId:sub}),
   /live_private_binding_unavailable/)
 }
})
test('service call rejects untrusted URLs and malformed IDs before fetch',async()=>{
 for(const url of [
  'http://localhost:54321','https://project.supabase.co.evil.invalid',
  'https://mrybvqdebbgcayuvgkkr.supabase.co/extra','https://example.com'
 ]){
  assert.throws(()=>createPazoLiveHostedBindingReader({
   supabaseUrl:url,serviceRoleKey:key
  }),/live_binding_service_configuration_unavailable/)
 }
 const {reader,requests}=build()
 await assert.rejects(()=>reader({subscriptionId:'I-??'}),
  /live_private_binding_unavailable/)
 assert.equal(requests.length,0)
})
