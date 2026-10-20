import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaypalLiveMerchantBootstrap} from '../../../../supabase/functions/pazo-admin-paypal-validate/liveMerchantBootstrap.mjs'
import {liveWebhookUrlForGeneration,REQUIRED_EVENTS} from '../../../../supabase/functions/pazo-admin-paypal-validate/liveProviderReadOnly.mjs'
const clientId='TEST_LIVE_ID_12345678901234',clientSecret='TEST_LIVE_SECRET_12345678901234'
const mk=(status,data)=>new Response(status===204?null:JSON.stringify(data),{
 status,headers:status===204?{}:{'content-type':'application/json'}
})
function setup(){
 const calls=[]
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method,body:options.body,
   requestId:options.headers['PayPal-Request-Id']})
  if(url.endsWith('/v1/oauth2/token'))
   return mk(200,{token_type:'Bearer',access_token:'OAUTH_SAMPLE_TOKEN_12345678'})
  if(url.endsWith('/v1/catalogs/products'))return mk(201,{id:'PROD-ABCDEFGHIJKLMN'})
  if(url.endsWith('/v1/billing/plans'))return mk(201,{id:'P-ABCDEFGHIJKLMN'})
  if(url.endsWith('/activate'))return mk(204)
  if(url.endsWith('/v1/notifications/webhooks'))return mk(201,{id:'WH-ABCDEFGHIJKL'})
  throw Error('Unexpected URL')
 }
 return {calls,manager:createPaypalLiveMerchantBootstrap({clientId,clientSecret,fetchImpl})}
}
test('Live resource bootstrap creates only merchant setup resources, not a charge',async()=>{
 const x=setup()
 const product=await x.manager.createProduct({requestId:'product-123456789'})
 const plan=await x.manager.createPlan({productId:product.productId,requestId:'plan-123456789'})
 const activated=await x.manager.activatePlan({planId:plan.planId,requestId:'activate-123456789'})
 const webhook=await x.manager.createWebhook({requestId:'webhook-123456789',merchantGeneration:7})
 assert.equal(product.mayCharge,false)
 assert.equal(plan.mayCharge,false)
 assert.equal(activated.mayCharge,false)
 assert.equal(webhook.mayCharge,false)
 const posts=x.calls.filter(x=>x.requestId)
 assert.deepEqual(posts.map(x=>x.method),['POST','POST','POST','POST'])
 assert.ok(x.calls.every(c=>c.url.startsWith('https://api-m.paypal.com/')))
 assert.ok(!x.calls.some(c=>/billing\/subscriptions|payments\/sale/.test(c.url)))
 const planBody=JSON.parse(posts[1].body)
 assert.equal(planBody.billing_cycles.length,1)
 assert.equal(planBody.billing_cycles[0].pricing_scheme.fixed_price.value,'2.99')
 assert.equal(planBody.billing_cycles[0].frequency.interval_unit,'MONTH')
 assert.equal(planBody.billing_cycles[0].total_cycles,0)
 assert.equal(planBody.payment_preferences.auto_bill_outstanding,false)
 assert.equal(planBody.payment_preferences.setup_fee.value,'0.00')
 const webhookBody=JSON.parse(posts[3].body)
 assert.equal(webhookBody.url,liveWebhookUrlForGeneration(7))
 assert.deepEqual(webhookBody.event_types,REQUIRED_EVENTS.map(name=>({name})))
 assert.equal(JSON.stringify([product,plan,activated,webhook]).includes(clientSecret),false)
})
test('reject malformed credentials and identifiers before provider side effects',async()=>{
 assert.throws(()=>createPaypalLiveMerchantBootstrap({clientId:'bad',clientSecret}),/not_ready/)
 const x=setup()
 await assert.rejects(x.manager.createPlan({productId:'unknown',requestId:'plan-123456789'}))
 await assert.rejects(x.manager.activatePlan({planId:'wrong',requestId:'activate-123456789'}))
 await assert.rejects(x.manager.createWebhook({requestId:'bad',merchantGeneration:7}))
 await assert.rejects(x.manager.createWebhook({requestId:'webhook-123456789',merchantGeneration:0}))
 assert.equal(x.calls.length,0)
})
test('uncertain provider POST is not retried and no result is considered active',async()=>{
 let postCount=0
 const fetchImpl=async(url)=>{
  if(url.endsWith('/token'))return mk(200,{token_type:'Bearer',access_token:'OAUTH_SAMPLE_TOKEN_12345678'})
  postCount++
  throw Error('network_timeout_secret_123')
 }
 const adapter=createPaypalLiveMerchantBootstrap({clientId,clientSecret,fetchImpl})
 await assert.rejects(adapter.createWebhook({requestId:'webhook-123456789'}),/paypal_live_resource_review_required/)
 assert.equal(postCount,1)
})
