import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectLegacySandboxOAuth} from '../../../../supabase/functions/pazo-admin-paypal-validate/legacySandboxHealth.mjs'

const sample={
 PAZO_F16_PAYPAL_ENV:'sandbox',
 PAZO_F16_PAYPAL_PLAN_ID:'P-14V25407JP6850922NLHMDKI',
 PAZO_F16_PAYPAL_WEBHOOK_ID:'ABCdefghij12',
 PAZO_F16_PAYPAL_CLIENT_ID:'abcdefghijklmnopqrstu',
 PAZO_F16_PAYPAL_CLIENT_SECRET:'abcdefghijklmnopqrstuvwxyz',
}
test('active merchant OAuth diagnostic is read-only and never returns a token',async()=>{
 let calls=0
 const result=await inspectLegacySandboxOAuth({
  get:key=>sample[key],
  fetchImpl:async (url,options)=>{
   calls++
   assert.equal(url,'https://api-m.sandbox.paypal.com/v1/oauth2/token')
   assert.equal(options.method,'POST')
   assert.equal(options.body,'grant_type=client_credentials')
   assert.ok(options.headers.Authorization.startsWith('Basic '))
   return {ok:true,json:async()=>({token_type:'Bearer',access_token:'token_sample_1234567890'})}
  }
 })
 assert.deepEqual(result,{ok:true,code:'legacy_gateway_oauth_valid'})
 assert.equal(calls,1)
 assert.ok(!JSON.stringify(result).includes('token_sample'))
})
test('fail closed before provider request on missing secrets or changed environment/plan',async()=>{
 for(const values of [{PAZO_F16_PAYPAL_CLIENT_SECRET:''},{PAZO_F16_PAYPAL_ENV:'live'},
  {PAZO_F16_PAYPAL_PLAN_ID:'P-CHANGEDPLAN00000000000'},
  {PAZO_F16_PAYPAL_WEBHOOK_ID:''}]){
  const result=await inspectLegacySandboxOAuth({
   get:key=>({...sample,...values})[key],
   fetchImpl:async()=>{throw Error('should not request provider')}
  })
  assert.equal(result.ok,false)
  assert.equal(result.code,'legacy_gateway_unavailable')
 }
})
test('provider rejection and malformed OAuth reply never expose response details',async()=>{
 for(const reply of [{ok:false},{ok:true,json:async()=>({access_token:'x'})}]){
  const result=await inspectLegacySandboxOAuth({get:key=>sample[key],
   fetchImpl:async()=>reply})
  assert.deepEqual(result,{ok:false,code:'legacy_gateway_unavailable'})
 }
})
