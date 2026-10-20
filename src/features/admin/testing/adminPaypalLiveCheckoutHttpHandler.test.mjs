import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveCheckoutHttpHandler} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveCheckoutHttpHandler.mjs'
const owner='12345678-1234-4234-8234-123456789abc'
const key='23456789-1234-4234-8234-123456789abc'
const intent='intent-34567890-1234-4234-8234-123456789abc'
const plan='P-ABCDEFGHIJKLMN'
const consent={requestKey:key,locale:'es',termsVersion:'pazo-supporter-live.offer-v1',
 termsDigest:'a'.repeat(64),affirmativeConsent:true}
const req=(body={action:'subscribe',consent})=>new Request('https://pazo.example.com/paypal/begin',{
 method:'POST',headers:{'content-type':'application/json',authorization:'Bearer QA_USER_JWT'},
 body:JSON.stringify(body)})
const routes={sourceEnvironment:'live',credentialSource:'edge_secrets',merchantGeneration:7,planId:plan}
const reply=(code,body)=>new Response(JSON.stringify(body),{
 status:code,headers:{'content-type':'application/json'}})
function fixtures(overrides={}){
 const calls={provider:[],sql:[],secret:[]}
 const handler=createPazoLiveCheckoutHttpHandler({
  released:true,resolveAuthenticatedOwner:async()=>owner,readActiveRoute:async()=>routes,
  verifyConsent:async()=>true,publicOrigin:'https://pazo.example.com',
  getSecret:async name=>{calls.secret.push(name);return name.endsWith('READ_ENABLED')?'1':
    name.endsWith('PLAN_ID')?plan:name.endsWith('CLIENT_ID')?
    'LIVE_CLIENT_1234567890':'LIVE_SECRET_1234567890'},
  admit:async()=>true,
  rpc:async(name,params)=>{
   calls.sql.push(name)
   if(name==='begin')return {
    ok:true,ownerId:owner,requestKey:key,intentId:intent,planId:plan,
    merchantGeneration:7,sourceEnvironment:'live',locale:'es',
    termsVersion:consent.termsVersion,termsDigest:consent.termsDigest,
    createdAt:new Date().toISOString(),state:'pending'}
   if(name==='claim')return true
   if(name==='bind')return 'bound'
   throw Error('unexpected_sql_'+name)
  },
  fetchImpl:async(url,options)=>{
   calls.provider.push({url,method:options.method})
   if(url.endsWith('/v1/oauth2/token'))return reply(200,{
    token_type:'Bearer',access_token:'SAMPLE_OAUTH_TOKEN_123456789'})
   if(url.endsWith('/v1/billing/subscriptions')&&options.method==='POST')
    return reply(201,{id:'I-ABCDEFGHIJKLMN',status:'APPROVAL_PENDING',
      links:[{rel:'approve',href:'https://www.paypal.com/webapps/billing/subscriptions?ba_token=BA-12345'}]})
   if(url.includes('/v1/billing/subscriptions/I-ABCDEFGHIJKLMN'))
    return reply(200,{id:'I-ABCDEFGHIJKLMN',plan_id:plan,custom_id:intent,status:'APPROVAL_PENDING'})
   throw Error('wrong_provider_api')
  },
  ...overrides
 })
 return {handler,calls}
}
test('default Live OFF rejects all requests without dependencies or effects',async()=>{
 const response=await createPazoLiveCheckoutHttpHandler()(req())
 assert.equal(response.status,503)
 assert.equal((await response.json()).code,'live_checkout_not_released')
})
test('approved owner consent and pinned Live merchant produce provider approval only',async()=>{
 const {handler,calls}=fixtures()
 const response=await handler(req())
 assert.equal(response.status,200)
 const result=await response.json()
 assert.equal(result.phase,'APPROVAL_PENDING')
 assert.equal(result.entitlement,false)
 assert.ok(result.approvalUrl.startsWith('https://www.paypal.com/'))
 assert.deepEqual(calls.sql,['begin','claim','bind'])
 assert.equal(calls.provider.filter(x=>x.url.endsWith('/v1/billing/subscriptions')).length,1)
 assert.ok(calls.provider.every(x=>x.url.startsWith('https://api-m.paypal.com/')))
 assert.ok(!JSON.stringify(result).includes('LIVE_SECRET'))
})
test('inactive merchant, invalid consent and forged JWT cannot create any purchase',async()=>{
 const cases=[
  {readActiveRoute:async()=>null,code:'live_route_inactive'},
  {readActiveRoute:async()=>({...routes,sourceEnvironment:'sandbox'}),code:'live_route_inactive'},
  {getSecret:async()=>null,code:'live_generation_unavailable'},
  {verifyConsent:async()=>false,code:'published_terms_mismatch'},
  {resolveAuthenticatedOwner:async()=>null,code:'authentication_required'}
 ]
 for(const c of cases){
  const {code,...changes}=c
  const {handler,calls}=fixtures(changes)
  const response=await handler(req())
  assert.equal((await response.json()).code,code)
  assert.equal(calls.provider.length,0)
  assert.equal(calls.sql.length,0)
 }
})
test('invalid request body and wrong content type block before calling provider',async()=>{
 const {handler,calls}=fixtures()
 assert.equal((await handler(req({action:'pay',consent}))).status,400)
 assert.equal((await handler(new Request('https://pazo.example.com',{
   method:'POST',headers:{'content-type':'text/plain'},body:'x'}))).status,415)
 assert.equal(calls.provider.length,0)
})
