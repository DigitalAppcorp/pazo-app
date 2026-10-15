import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoSandboxCancellationHandler as createHandler}
 from '../../../../supabase/functions/f16-paypal-webhook/p06SandboxCancellationHandler.mjs'
import {createPazoSandboxCancellationProvider as createProvider}
 from '../../../../supabase/functions/f16-paypal-webhook/p06SandboxCancellationProvider.mjs'
const OWNER='11111111-1111-4111-8111-111111111111'
const FOREIGN='22222222-2222-4222-8222-222222222222'
const INTENT='intent-77777777-7777-4777-8777-777777777777'
const SUB='I-SANDBOX-CANCEL222'
const PLAN='P-14V25407JP6850922NLHMDKI'
const HOST='https://api-m.sandbox.paypal.com'
const ORIGIN='https://pazo.example'
const validIntent=()=>({id:INTENT,ownerId:OWNER,externalSubscriptionId:SUB,
 state:'bound',provider:'paypal',planId:PLAN})
function request(action='cancel',changes={},opts={}){
 return new Request('https://api.example/internal/subscription',{method:'POST',
 headers:{'Content-Type':'application/json','Authorization':'Bearer TESTUSER123456789123456789',
  'Origin':ORIGIN,...opts.headers},
 body:JSON.stringify({action,intentId:INTENT,
  ...(action==='cancel'?{confirmCancellation:true}:{}),...changes})})
}
function harness(patches={}){
 let state='ACTIVE'
 const calls=[]
 const provider={
  read:async args=>{calls.push(['read',args]);return {status:state}},
  cancel:async args=>{calls.push(['cancel',args]);state='CANCELLED'
   return {status:state}},
  ...patches.provider,
 }
 const handler=createHandler({
  resolveAuthenticatedOwner:async r=>{
   calls.push(['auth',r.headers.get('authorization')!==null])
   return patches.owner===undefined?OWNER:patches.owner
  },
  privateIntentStore:{load:async id=>{
   calls.push(['intent',id])
   return patches.intent===undefined?validIntent():patches.intent
  }},
  admit:async args=>{calls.push(['admit',args])
   return patches.admit===undefined?true:patches.admit},
  provider,trustedOrigins:[ORIGIN],
 })
 return {handler,calls,provider}
}
const safe=async r=>{
 const body=await r.json()
 assert.equal(body.paidThrough,null)
 assert.equal(body.mayGrantBenefits,false)
 assert.equal(JSON.stringify(body).includes(OWNER),false)
 assert.equal(JSON.stringify(body).includes(SUB),false)
 assert.equal(JSON.stringify(body).includes(INTENT),false)
 return body
}
test('authenticated owner can cancel, paid period remains unknown',async()=>{
 const {handler,calls}=harness()
 const response=await handler(request())
 assert.equal(response.status,200)
 const body=await safe(response)
 assert.equal(body.code,'future_renewals_cancelled')
 assert.equal(body.cancelled,true)
 assert.deepEqual(calls.slice(-2),[
  ['intent',INTENT],['cancel',{intentId:INTENT,subscriptionId:SUB}]
 ])
})
test('provider status does not assert paid entitlement',async()=>{
 const {handler,calls}=harness()
 const r=await handler(request('status'))
 assert.equal(r.status,200)
 const body=await safe(r)
 assert.equal(body.providerStatus,'ACTIVE')
 assert.equal(body.cancelled,false)
 assert.ok(!calls.some(x=>x[0]==='cancel'))
})
test('cross account or missing binding cannot call PayPal',async()=>{
 for(const patches of [
  {owner:FOREIGN},{intent:null},{intent:{...validIntent(),ownerId:FOREIGN}},
  {intent:{...validIntent(),state:'pending'}},
  {intent:{...validIntent(),provider:'other'}},
  {intent:{...validIntent(),externalSubscriptionId:'I-FOREIGN/sub'}},
  {intent:{...validIntent(),planId:'P-OTHER'}},
 ]){
  const {handler,calls}=harness(patches)
  const r=await handler(request())
  assert.equal(r.status,404)
  assert.equal((await safe(r)).code,'subscription_not_found')
  assert.ok(!calls.some(x=>x[0]==='cancel'||x[0]==='read'))
 }
})
test('missing verification or admission blocks before private lookup',async()=>{
 const x=harness({owner:null})
 assert.equal((await x.handler(request())).status,401)
 assert.ok(!x.calls.some(k=>k[0]==='intent'))
 const y=harness({admit:false})
 assert.equal((await y.handler(request())).status,429)
 assert.ok(!y.calls.some(k=>k[0]==='intent'))
})
test('browser cannot select owner, subscription ID, or override confirmation',async()=>{
 for(const change of [
  {ownerId:FOREIGN},{subscriptionId:'I-FOREIGN'},
  {paidThrough:'2099-01-01'},{confirmCancellation:false},
  {confirmCancellation:'true'},
 ]){
  const {handler,calls}=harness()
  const r=await handler(request('cancel',change))
  assert.equal(r.status,400)
  await safe(r)
  assert.ok(!calls.some(x=>x[0]==='intent'))
 }
})
test('HTTP method, Origin and oversized JSON rejected',async()=>{
 const {handler,calls}=harness()
 const get=await handler(new Request('https://api.example',{method:'GET'}))
 assert.equal(get.status,405)
 const evil=await handler(request('status',{}, {headers:{Origin:'https://evil.invalid'}}))
 assert.equal(evil.status,403)
 const huge=await handler(request('status',{noise:'X'.repeat(4096)}))
 assert.equal(huge.status,413)
 assert.ok(!calls.some(x=>x[0]==='intent'||x[0]==='cancel'||x[0]==='read'))
})
test('provider failures and false confirmation never assert cancellation',async()=>{
 for(const fail of [
  {cancel:async()=>{throw Error('PRIVATE bearer token')}},
  {cancel:async()=>({status:'ACTIVE'})},
 ]){
  const {handler}=harness({provider:fail})
  const r=await handler(request())
  assert.equal(r.status,503)
  const b=await safe(r)
  assert.equal(b.code,'paypal_confirmation_required')
 }
})
test('unconfigured owner/auth/rate dependencies prevent route',()=>{
 for(const fields of [
  {},{resolveAuthenticatedOwner:()=>OWNER},
  {resolveAuthenticatedOwner:()=>OWNER,privateIntentStore:{load:()=>null}},
 ]){
  assert.throws(()=>createHandler(fields),/pazo_cancellation_handler_not_configured/)
 }
})
test('PayPal Sandbox: GET -> POST -> GET, repeated cancellation idempotent',async()=>{
 let status='ACTIVE',mutations=0
 const urls=[]
 const fetchImpl=async(url,opts)=>{
  urls.push([url,opts.method,opts])
  assert.ok(url.startsWith(HOST+'/'))
  assert.equal(opts.redirect,'error')
  if(url===HOST+'/v1/oauth2/token')
   return{ok:true,json:async()=>({token_type:'Bearer',access_token:'MOCK_SECRET_OAUTH_TOKEN'})}
  if(url===HOST+'/v1/billing/subscriptions/'+SUB)
   return{ok:true,json:async()=>({
    id:SUB,plan_id:PLAN,custom_id:INTENT,status,
    subscriber:{email_address:'PRIVATE_PAYER@example.invalid'}})}
  if(url===HOST+'/v1/billing/subscriptions/'+SUB+'/cancel'){
   assert.equal(opts.method,'POST')
   assert.equal(opts.headers['PayPal-Request-Id'],'pazo-cancel-'+INTENT.slice(7))
   assert.deepEqual(Object.keys(JSON.parse(opts.body)),['reason'])
   mutations++
   status='CANCELLED'
   return{ok:true,status:204}
  }
  throw Error('UNEXPECTED')
 }
 const provider=createProvider({clientId:'MOCK_CLIENT_ID_123',
  clientSecret:'MOCK_SECRET_ID_123',fetchImpl})
 assert.deepEqual(await provider.cancel({intentId:INTENT,subscriptionId:SUB}),
  {status:'CANCELLED'})
 assert.equal(mutations,1)
 assert.ok(urls.every(x=>x[0].startsWith(HOST+'/')))
 assert.equal(urls.filter(x=>x[1]==='POST'&&!x[0].endsWith('/token')).length,1)
 assert.deepEqual(await provider.cancel({intentId:INTENT,subscriptionId:SUB}),
  {status:'CANCELLED'})
 assert.equal(mutations,1)
 assert.equal(JSON.stringify(await provider.read({intentId:INTENT,
  subscriptionId:SUB})).includes('PRIVATE_PAYER'),false)
})
test('PayPal never cancels mismatched plan/custom ID or pending approval',async()=>{
 for(const change of [
  {id:'I-FOREIGN'}, {plan_id:'P-OTHER'}, {custom_id:'intent-FOREIGN'},
  {status:'APPROVAL_PENDING'},
 ]){
  let cancels=0
  const provider=createProvider({clientId:'MOCK_CLIENT_ID_123',
   clientSecret:'MOCK_SECRET_ID_123',fetchImpl:async(url)=>{
    if(url.endsWith('token'))
     return{ok:true,json:async()=>({token_type:'Bearer',
      access_token:'MOCK_SECRET_OAUTH_TOKEN'})}
    if(url.endsWith('/cancel')){cancels++;return{ok:true,status:204}}
    return{ok:true,json:async()=>({
     id:SUB,plan_id:PLAN,custom_id:INTENT,status:'ACTIVE',...change})}
   }})
  await assert.rejects(provider.cancel({intentId:INTENT,subscriptionId:SUB}))
  assert.equal(cancels,0)
 }
})
test('PayPal ambiguous confirmation never reports cancelled',async()=>{
 const provider=createProvider({clientId:'MOCK_CLIENT_ID_123',
  clientSecret:'MOCK_SECRET_ID_123',fetchImpl:async(url)=>{
   if(url.endsWith('token'))return{ok:true,json:async()=>({
    token_type:'Bearer',access_token:'MOCK_SECRET_OAUTH_TOKEN'})}
   if(url.endsWith('/cancel'))return{ok:true,status:204}
   return{ok:true,json:async()=>({id:SUB,plan_id:PLAN,
    custom_id:INTENT,status:'ACTIVE'})}
  }})
 await assert.rejects(provider.cancel({intentId:INTENT,subscriptionId:SUB}),
  /pazo_cancel_confirmation_pending/)
})
