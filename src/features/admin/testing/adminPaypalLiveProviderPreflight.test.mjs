import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectLivePaypalResources,EXPECTED_WEBHOOK,REQUIRED_EVENTS,liveWebhookUrlForGeneration} from '../../../../supabase/functions/pazo-admin-paypal-validate/liveProviderReadOnly.mjs'
const config={environment:'live',clientId:'ABCDEFGHIJKL1234567890',clientSecret:'abcdeFGHIJ1234567890XYZ',
 planId:'P-1234567890ABCDE',webhookId:'WH-12345678900',merchantGeneration:7,expectedWebhookUrl:liveWebhookUrlForGeneration(7)}
const plan={id:config.planId,status:'ACTIVE',quantity_supported:false,
 billing_cycles:[{tenure_type:'REGULAR',sequence:1,total_cycles:0,frequency:{interval_unit:'MONTH',interval_count:1},
  pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}}}],
 payment_preferences:{auto_bill_outstanding:false,setup_fee:{currency_code:'USD',value:'0.00'}}}
const webhook={id:config.webhookId,url:liveWebhookUrlForGeneration(7),
 event_types:REQUIRED_EVENTS.map(name=>({name}))}
const provider=(overrides={})=>{
 const calls=[]
 const fetchImpl=async(url,req)=>{
  calls.push({url,method:req.method})
  assert.equal(req.redirect,'error')
  if(url.endsWith('/v1/oauth2/token')){
   assert.equal(req.method,'POST')
   assert.ok(req.headers.Authorization.startsWith('Basic '))
   return {ok:true,json:async()=>({token_type:'Bearer',access_token:'a_valid_opaque_token_12345'})}
  }
  assert.equal(req.method,'GET')
  assert.ok(req.headers.Authorization.startsWith('Bearer '))
  if(url.endsWith('/v1/billing/plans/'+config.planId))
   return {ok:true,json:async()=>({...plan,...overrides.plan})}
  if(url.endsWith('/v1/notifications/webhooks/'+config.webhookId))
   return {ok:true,json:async()=>({...webhook,...overrides.webhook})}
  throw Error('untrusted endpoint')
 }
 return {fetchImpl,calls}
}
test('reads only live OAuth, plan and webhook with fixed host; never creates a purchase',async()=>{
 const p=provider()
 const r=await inspectLivePaypalResources({...config,fetchImpl:p.fetchImpl})
 assert.equal(r.ok,true)
 assert.equal(r.mayCharge,false)
 assert.equal(r.mayActivate,false)
 assert.equal(r.merchantIdentityVerified,false)
 assert.equal(r.webhookDeliveryVerified,false)
 assert.deepEqual(p.calls.map(v=>v.method),['POST','GET','GET'])
 assert.ok(p.calls.every(v=>v.url.startsWith('https://api-m.paypal.com/')))
 assert.ok(!JSON.stringify(r).includes(config.clientSecret))
 assert.ok(!JSON.stringify(r).includes('a_valid_opaque_token'))
})
test('rejects environment, credentials and webhook URL before network access',async()=>{
 for(const changed of [
  {environment:'sandbox'}, {clientId:''},{clientSecret:''},
  {planId:'P-invalid'}, {webhookId:'fake'},
  {expectedWebhookUrl:'http://localhost:5173/'},
  {merchantGeneration:0},{expectedWebhookUrl:EXPECTED_WEBHOOK},
  {expectedWebhookUrl:'https://evil.invalid/functions/v1/pazo-paypal-live-webhook'}
 ]){
  const r=await inspectLivePaypalResources({...config,...changed,
   fetchImpl:async()=>{throw Error('unexpected request')}})
  assert.equal(r.ok,false)
  assert.equal(r.mayCharge,false)
  assert.equal(r.mayActivate,false)
 }
})
test('live plan must be ACTIVE, one monthly unlimited 2.99 USD cycle, no setup fee',async()=>{
 for(const changed of [
  {status:'CREATED'},
  {billing_cycles:[]},
  {billing_cycles:[{...plan.billing_cycles[0],frequency:{interval_unit:'YEAR',interval_count:1}}]},
  {billing_cycles:[{...plan.billing_cycles[0],pricing_scheme:{fixed_price:{currency_code:'USD',value:'9.99'}}}]},
  {billing_cycles:[{...plan.billing_cycles[0],total_cycles:12}]},
  {payment_preferences:{setup_fee:{currency_code:'USD',value:'10.00'}}},
  {quantity_supported:true},
  {billing_cycles:[{...plan.billing_cycles[0],sequence:2}]},
  {billing_cycles:[{...plan.billing_cycles[0],pricing_scheme:{
    ...plan.billing_cycles[0].pricing_scheme,tiers:[{starting_quantity:'1'}]
  }}]},
  {payment_preferences:{...plan.payment_preferences,auto_bill_outstanding:true}},
  {payment_preferences:undefined},
  {tax_percentage:'5.0'},
  {taxes:{percentage:'5.0',inclusive:true}}
 ]){
  const p=provider({plan:changed});const r=await inspectLivePaypalResources({...config,fetchImpl:p.fetchImpl})
  assert.equal(r.code,changed.status==='CREATED'?'live_plan_unverified':'live_plan_terms_unverified')
  assert.ok(!p.calls.some(v=>v.url.includes('/v1/notifications/webhooks/')))
 }
})
test('webhook must match fixed HTTPS endpoint and subscribe to all required events',async()=>{
 for(const changed of [
  {url:'https://evil.invalid/paypal'}, {id:'other-webhook'},
  {event_types:[]},{event_types:REQUIRED_EVENTS.slice(0,-1).map(name=>({name}))}
 ]){
  const p=provider({webhook:changed})
  const r=await inspectLivePaypalResources({...config,fetchImpl:p.fetchImpl})
  assert.equal(r.ok,false)
  assert.equal(r.mayCharge,false)
  assert.equal(r.mayActivate,false)
 }
})
test('provider rejection and transport failure remain opaque and block charging',async()=>{
 const response=await inspectLivePaypalResources({...config,fetchImpl:async()=>({ok:false})})
 assert.equal(response.code,'live_oauth_unverified')
 assert.equal(response.mayCharge,false)
 const failure=await inspectLivePaypalResources({...config,fetchImpl:async()=>{throw Error('PRIVATE_RESPONSE')}})
 assert.equal(failure.code,'live_provider_unavailable')
 assert.ok(!JSON.stringify(failure).includes('PRIVATE_RESPONSE'))
})

test('resource check rejects wildcard, unexpected and duplicate webhook subscriptions',async()=>{
 for(const events of [
  [...REQUIRED_EVENTS,'*'],[...REQUIRED_EVENTS,'PAYMENT.CAPTURE.COMPLETED'],
  [...REQUIRED_EVENTS,REQUIRED_EVENTS[0]]
 ]){
  const p=provider({webhook:{event_types:events.map(name=>({name}))}})
  const result=await inspectLivePaypalResources({...config,fetchImpl:p.fetchImpl})
  assert.equal(result.code,'live_webhook_events_unexpected')
  assert.equal(result.mayCharge,false)
 }
})

test('zero setup fee accepts USD decimal zero representations without rounding',async()=>{
 for(const value of ['0','0.0','0.00']){
  const p=provider({plan:{payment_preferences:{auto_bill_outstanding:false,
   setup_fee:{currency_code:'USD',value}}}})
  const result=await inspectLivePaypalResources({...config,fetchImpl:p.fetchImpl})
  assert.equal(result.ok,true,'Equivalent zero rejected: '+value)
  assert.equal(result.mayCharge,false)
 }
})

test('setup fee cannot hide cents, signs, exponents or an unsupported currency',async()=>{
 for(const setup_fee of [
  ...['0.01','0.001','-0','+0','0e0','0.000',' 0','0 ','','00','00.00',0,null]
   .map(value=>({currency_code:'USD',value})),
  {currency_code:'EUR',value:'0.00'}
 ]){
  const p=provider({plan:{payment_preferences:{auto_bill_outstanding:false,setup_fee}}})
  const result=await inspectLivePaypalResources({...config,fetchImpl:p.fetchImpl})
  assert.equal(result.ok,false)
  assert.equal(result.code,'live_plan_terms_unverified')
  assert.equal(p.calls.some(x=>x.url.includes('/v1/notifications/webhooks/')),false)
 }
})

test('automatic arrears billing must be explicitly false, never inferred from a missing field',async()=>{
 for(const preferences of [{},...['false',0,null,true].map(auto_bill_outstanding=>({auto_bill_outstanding}))]){
  const p=provider({plan:{payment_preferences:preferences}})
  const result=await inspectLivePaypalResources({...config,fetchImpl:p.fetchImpl})
  assert.equal(result.code,'live_plan_terms_unverified')
  assert.equal(p.calls.some(x=>x.url.includes('/v1/notifications/webhooks/')),false)
 }
})
