import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaypalLiveSubscriptionProvider,publicBetaOrigin}
 from '../../../../supabase/functions/pazo-paypal-live-checkout/liveSubscriptionProvider.mjs'
const planId='P-ABCDEFGHIJKLMN'
const temporary='https://pazo-app-t83r.vercel.app'
const future='https://pazo.example.com'
const intentId='intent-23456789-1234-4234-8234-123456789abc'
const requestKey='12345678-1234-4234-8234-123456789abc'
const json=(code,data)=>({
 status:code,ok:true,
 headers:{get:()=> 'application/json'},
 text:async()=>JSON.stringify(data)
})
test('PayPal Live creates relative PWA return and cancel paths from the authenticated-admin origin only',async()=>{
 for(const origin of [temporary,future]){
  const calls=[]
  const provider=createPaypalLiveSubscriptionProvider({
   clientId:'CLIENTABCDEFGH123',
   clientSecret:'SECRETABCDEFGH123',
   planId,origin,
   fetchImpl:async (url,opts)=>{
    if(url.endsWith('/v1/oauth2/token')){
     assert.equal(opts.method,'POST')
     return json(200,{token_type:'Bearer',access_token:'OPAQUE_TOKEN_12345'})
    }
    assert.equal(url,'https://api-m.paypal.com/v1/billing/subscriptions')
    assert.equal(opts.method,'POST')
    calls.push(JSON.parse(opts.body))
    return json(201,{
     id:'I-SUBSCRIPTION123456',
     status:'APPROVAL_PENDING',
     links:[{rel:'approve',href:'https://www.paypal.com/webapps/billing/subscriptions?ba_token=BA-TEST123'}]
    })
   }
  })
  const result=await provider.createSubscription({intentId,requestKey})
  assert.equal(result.entitlement,false)
  assert.equal(result.status,'APPROVAL_PENDING')
  assert.equal(calls.length,1)
  assert.equal(calls[0].plan_id,planId)
  assert.equal(calls[0].custom_id,intentId)
  assert.equal(calls[0].application_context.return_url,origin+'/paypal/return')
  assert.equal(calls[0].application_context.cancel_url,origin+'/paypal/cancel')
 }
})
test('a temporary host is never a hardcoded provider default or an unvalidated redirect',()=>{
 assert.equal(publicBetaOrigin(temporary),true)
 assert.equal(publicBetaOrigin(future),true)
 for(const bad of [
  'http://pazo-app-t83r.vercel.app',
  temporary+'/paypal/return',
  temporary+'?redirect=https://evil.example',
  'https://evil.example@pazo-app-t83r.vercel.app'
 ]){
  assert.equal(publicBetaOrigin(bad),false)
  assert.throws(()=>createPaypalLiveSubscriptionProvider({
   clientId:'CLIENTABCDEFGH123',clientSecret:'SECRETABCDEFGH123',
   planId,origin:bad
  }),/live_provider_configuration_unavailable/)
 }
})
