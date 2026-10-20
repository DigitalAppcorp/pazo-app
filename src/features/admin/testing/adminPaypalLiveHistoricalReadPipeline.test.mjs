import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveHistoricalReadPipeline} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveHistoricalReadPipeline.mjs'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const service='opaque_service_role_key_very_long_for_testing'
const sub='I-SUBSCRIPTION123'
const intent='intent-12345678-1234-4234-8234-123456789abc'
const plan='P-ABCDEFGHIJKLMN'
const config={provider:'paypal',environment:'live',generation:7,planId:plan,
 webhookId:'WH-ABCDEFGHIJ',merchantFingerprint:'a'.repeat(64),
 clientId:'CLIENT_TEST_LIVE_0123456789',clientSecret:'SECRET_TEST_LIVE_0123456789',
 retiredAt:'2026-10-01T00:00:00Z'}
const bound={provider:'paypal',sourceEnvironment:'live',subscriptionId:sub,
 ownerId:'12345678-1234-4234-8234-123456789abc',intentId:intent,
 planId:plan,merchantGeneration:7,state:'bound',consentVerified:true}
function mock(change={},generation=config){
 const calls=[]
 const fetchImpl=async(endpoint,options)=>{
  calls.push({endpoint,method:options.method})
  if(endpoint.includes('/rest/v1/rpc/')){
   return {ok:true,status:200,headers:{get:()=> 'application/json'},
    text:async()=>JSON.stringify({...bound,...change})}
  }
  if(endpoint.endsWith('/oauth2/token'))return {
   ok:true,status:200,headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify({token_type:'Bearer',
    access_token:'OPAQUE_ACCESS_TOKEN_123456'})}
  if(endpoint.includes('/billing/subscriptions/'+sub))return {
   ok:true,status:200,headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify({id:sub,plan_id:plan,custom_id:intent,status:'ACTIVE'})}
  throw Error('unplanned_provider_request')
 }
 const pipeline=createPazoLiveHistoricalReadPipeline({
  supabaseUrl:url,serviceRoleKey:service,fetchImpl,
  fetchPrivateGeneration:async({merchantGeneration})=>
   ({...generation,generation:merchantGeneration===7?generation.generation:99})
 })
 return {pipeline,calls}
}
test('historical owner proof pins original merchant even after retirement, no payment access',async()=>{
 const {pipeline,calls}=mock()
 const scope=await pipeline.provePazoScope({
  eventId:'WH-EVENT-123',eventType:'PAYMENT.SALE.COMPLETED',
  resource:{id:'SALE-123',billing_agreement_id:sub},sourceEnvironment:'live'
 })
 assert.equal(scope.confirmed,true)
 assert.equal(scope.ownerId,bound.ownerId)
 assert.equal(scope.merchantGeneration,7)
 assert.equal(scope.mayRecordPayment,false)
 assert.equal(scope.mayGrantBenefits,false)
 assert.deepEqual(calls.map(x=>x.method),['POST','POST','GET'])
 assert.ok(calls.every(x=>x.endpoint.startsWith(url)||x.endpoint.startsWith('https://api-m.paypal.com/')))
 assert.ok(!JSON.stringify(scope).includes(config.clientSecret))
})
test('Live historical read rejects any cross environment, generation swap or plan ambiguity',async()=>{
 for(const gen of [
  {...config,environment:'sandbox'},
  {...config,generation:8},
  {...config,planId:'P-WRONG'},
  {...config,clientSecret:''},
  {...config,webhookId:'invalid'}
 ]){
  const {pipeline,calls}=mock({},gen)
  await assert.rejects(()=>pipeline.provePazoScope({
   eventId:'WH-EVENT-123',eventType:'PAYMENT.SALE.COMPLETED',
   resource:{id:'SALE-123',billing_agreement_id:sub},sourceEnvironment:'live'
  }),/live_owner_merchant_scope_unavailable/)
  assert.ok(!calls.some(x=>x.endpoint.includes('paypal.com')))
 }
})
test('untrusted request cannot dynamically choose a different merchant generation',async()=>{
 const {pipeline,calls}=mock()
 await assert.rejects(()=>pipeline.readerForGeneration({
  merchantGeneration:8,sourceEnvironment:'live'
 }),/live_historical_merchant_unavailable/)
 await assert.rejects(()=>pipeline.readerForGeneration({
  merchantGeneration:7,sourceEnvironment:'sandbox'
 }),/live_historical_merchant_unavailable/)
 assert.equal(calls.length,0)
})
test('signature verifier can use original merchant webhook id without showing keys',async()=>{
 const {pipeline,calls}=mock()
 const validator=await pipeline.verifierForGeneration({
  merchantGeneration:7,sourceEnvironment:'live'
 })
 assert.equal(validator.webhookId,config.webhookId)
 assert.equal(typeof validator.verifySignature,'function')
 assert.equal(JSON.stringify(validator).includes(config.clientSecret),false)
 assert.equal(calls.length,0)
})
