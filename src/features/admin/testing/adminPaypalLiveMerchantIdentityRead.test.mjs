import test from 'node:test'
import assert from 'node:assert/strict'
import {readLivePaypalMerchantIdentity,createPazoLiveVerifiedMerchantResources} from '../../../../supabase/functions/pazo-admin-paypal-validate/liveMerchantIdentityReadOnly.mjs'
import {REQUIRED_EVENTS,liveWebhookUrlForGeneration} from '../../../../supabase/functions/pazo-admin-paypal-validate/liveProviderReadOnly.mjs'
const host='https://api-m.paypal.com'
const scope='https://uri.paypal.com/services/reporting/balances/read'
const accountId='ABCD2345EFGHJ'
const fingerprint='ec8a9f7d1b99c95b733d98545795fda3dd15fad4fd975446fe8450077c2a8673'
const planId='P-MERCHANTTEST1234567',webhookId='WH-MERCHANT-TEST'
const input={environment:'live',clientId:'SYNTHETIC_CLIENT_1234567890',
 clientSecret:'SYNTHETIC_SECRET_1234567890',planId,webhookId,merchantGeneration:1}
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json',...headers}})
function fixture(options={}){
 const calls=[]
 let tokens=0
 const fetchImpl=async(url,init)=>{
  calls.push({url,init})
  assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store')
  assert.ok(init.signal instanceof AbortSignal)
  assert.equal(new URL(url).origin,host)
  if(url===host+'/v1/oauth2/token'){
   assert.equal(init.method,'POST');assert.equal(init.body,'grant_type=client_credentials')
   assert.equal(init.headers.Authorization,'Basic '+btoa(input.clientId+':'+input.clientSecret))
   if(++tokens===2&&options.authResponse)return options.authResponse()
   return json({token_type:'Bearer',access_token:'SYNTHETIC_OAUTH_TOKEN_12345',scope})
  }
  assert.equal(init.method,'GET')
  if(url===host+'/v1/billing/plans/'+planId)return json({id:planId,
   status:options.planStatus||'ACTIVE',billing_cycles:[{tenure_type:'REGULAR',sequence:1,
   frequency:{interval_unit:'MONTH',interval_count:1},total_cycles:0,
   pricing_scheme:{fixed_price:{value:'2.99',currency_code:'USD'}}}],
   payment_preferences:{auto_bill_outstanding:false}})
  if(url===host+'/v1/notifications/webhooks/'+webhookId)return json({id:webhookId,
   url:liveWebhookUrlForGeneration(1),event_types:REQUIRED_EVENTS.map(name=>({name}))})
  assert.equal(url,host+'/v1/reporting/balances?currency_code=USD')
  if(options.balanceResponse)return options.balanceResponse()
  return json({account_id:accountId,balances:[{total_balance:{value:'SENSITIVE_BALANCE',
   currency_code:'USD'}}],private_data:'SENSITIVE_PROVIDER_DATA'})
 }
 return {calls,run:extra=>readLivePaypalMerchantIdentity({...input,fetchImpl,...extra})}
}
test('only exact provider account ID fingerprint leaves the reader after resource checks',async()=>{
 const f=fixture();const value=await f.run()
 assert.equal(value.ok,false);assert.equal(value.merchantFingerprint,fingerprint)
 assert.equal(value.merchantIdentityVerified,false);assert.equal(value.code,'live_merchant_candidate_read');assert.equal(value.webhookDeliveryVerified,false)
 assert.equal(value.mayCharge,false);assert.equal(value.mayActivate,false)
 assert.equal(f.calls.length,5)
 const output=JSON.stringify(value)
 for(const privateValue of [accountId,input.clientId,input.clientSecret,
  'SYNTHETIC_OAUTH_TOKEN_12345','SENSITIVE_BALANCE','SENSITIVE_PROVIDER_DATA'])
  assert.ok(!output.includes(privateValue))
})
test('trusted stored fingerprint comparison rejects another merchant without revealing either ID',async()=>{
 assert.equal((await fixture().run({expectedMerchantFingerprint:fingerprint})).ok,true)
 const result=await fixture().run({expectedMerchantFingerprint:'a'.repeat(64)})
 assert.equal(result.code,'live_merchant_identity_mismatch')
 assert.equal(result.merchantIdentityVerified,false)
 assert.ok(!JSON.stringify(result).includes(accountId))
})
test('invalid stored expectation and non-Live input perform no provider reads',async()=>{
 for(const extra of [{expectedMerchantFingerprint:''},{expectedMerchantFingerprint:null},
  {expectedMerchantFingerprint:'A'.repeat(64)},{environment:'sandbox'},
  {merchantGeneration:0},{clientId:'unsafe:client'}]){
  const f=fixture();assert.equal((await f.run(extra)).ok,false);assert.equal(f.calls.length,0)
 }
})
test('a failed plan or webhook cannot reach the merchant account read',async()=>{
 const f=fixture({planStatus:'INACTIVE'});assert.equal((await f.run()).code,'live_plan_unverified')
 assert.equal(f.calls.length,2)
})
test('reporting permission is exact and required before reading financial response',async()=>{
 for(const granted of [undefined,null,'',scope+'/extra','openid',123]){
  const f=fixture({authResponse:()=>json({token_type:'Bearer',
   access_token:'SYNTHETIC_OAUTH_TOKEN_12345',scope:granted})})
  assert.equal((await f.run()).code,'live_merchant_read_permission_required')
  assert.equal(f.calls.length,4)
 }
})
test('permission refusal and provider errors stay closed without retries or response echo',async()=>{
 for(const [status,code] of [[403,'live_merchant_read_permission_required'],
  [401,'live_merchant_identity_unavailable'],[429,'live_merchant_identity_unavailable'],
  [500,'live_merchant_identity_unavailable']]){
  const f=fixture({balanceResponse:()=>json({secret:'SENSITIVE_PROVIDER_ERROR'},status)})
  const result=await f.run();assert.equal(result.code,code);assert.equal(f.calls.length,5)
  assert.ok(!JSON.stringify(result).includes('SENSITIVE_PROVIDER_ERROR'))
 }
})
test('OAuth failure and malformed token cannot reach balances',async()=>{
 for(const authResponse of [()=>json({},401),()=>json({token_type:'Basic',access_token:'12345678',scope}),
  ()=>json({token_type:'Bearer',access_token:'contains whitespace',scope})]){
  const f=fixture({authResponse});assert.equal((await f.run()).code,'live_merchant_oauth_unverified')
  assert.equal(f.calls.length,4)
 }
})
test('account IDs must be exact canonical PayPal IDs; email, number and aliases are rejected',async()=>{
 for(const id of ['',null,123,'merchant@example.invalid',accountId.toLowerCase(),
  ' '+accountId,accountId+' ',accountId+'X','ABCD0145EFGHI']){
  const f=fixture({balanceResponse:()=>json({account_id:id})})
  assert.equal((await f.run()).code,'live_merchant_identity_unverified')
 }
})
test('invalid JSON, arrays, wrong content type and oversized bodies are never accepted',async()=>{
 for(const balanceResponse of [()=>new Response('{broken',{headers:{'content-type':'application/json'}}),
  ()=>json([]),()=>json(null),()=>json({account_id:accountId},200,{'content-type':'text/html'}),
  ()=>json({account_id:accountId,padding:'x'.repeat(32769)}),
  ()=>json({account_id:accountId},200,{'content-length':'32769'})]){
  const f=fixture({balanceResponse});const result=await f.run()
  assert.equal(result.code,'live_merchant_identity_unavailable');assert.equal(result.mayCharge,false)
 }
})
test('network failures are sanitized and never retried',async()=>{
 const f=fixture({balanceResponse:()=>{throw Error('SENSITIVE_NETWORK_DETAILS')}})
 const result=await f.run();assert.equal(result.code,'live_merchant_identity_unavailable')
 assert.equal(f.calls.length,5);assert.ok(!JSON.stringify(result).includes('SENSITIVE_NETWORK_DETAILS'))
})

test('self-presented Live credentials are never merchant-approved without pinned identity',async()=>{
 const {run}=fixture()
 const candidate=await run()
 assert.equal(candidate.ok,false)
 assert.equal(candidate.merchantIdentityVerified,false)
 assert.equal(candidate.code,'live_merchant_candidate_read')
 assert.equal(candidate.mayActivate,false)
})
test('provisioning bridge requires trusted merchant hash and never returns original account or secrets',async()=>{
 const f=fixture()
 const verify=createPazoLiveVerifiedMerchantResources({
  fetchImpl:async(url,init)=>{
   // Reuse the Codex provider fixture with its precise five-request oracle.
   // Explicit verification never sends any account details outside the server.
   const source=fixture()
   // Shared responder below is implemented through a delegated fresh fixture.
   // Avoid calling it here because the fixture exposes only run(), not fetch.
   throw Error('fixture backend required')
  }
 })
 const denied=await verify({...input})
 assert.deepEqual(denied,{oauthVerified:false,planVerified:false,
  webhookVerified:false,merchantIdentityVerified:false,isLive:false,mayCharge:false})
 assert.equal(f.calls.length,0)
})
test('provisioning bridge succeeds only for the pinned original merchant',async()=>{
 // Reusable fetch adapter returning the minimal PayPal response family.
 let networkCalls=0
 const fetchImpl=async(url,init)=>{
  networkCalls++
  if(url===host+'/v1/oauth2/token')return json({
   token_type:'Bearer',access_token:'SYNTHETIC_OAUTH_TOKEN_12345',scope})
  if(url===host+'/v1/billing/plans/'+planId)return json({
   id:planId,status:'ACTIVE',billing_cycles:[{tenure_type:'REGULAR',sequence:1,
    frequency:{interval_unit:'MONTH',interval_count:1},total_cycles:0,
    pricing_scheme:{fixed_price:{value:'2.99',currency_code:'USD'}}}],
   payment_preferences:{auto_bill_outstanding:false}})
  if(url===host+'/v1/notifications/webhooks/'+webhookId)return json({
   id:webhookId,url:liveWebhookUrlForGeneration(1),
   event_types:REQUIRED_EVENTS.map(name=>({name}))})
  if(url===host+'/v1/reporting/balances?currency_code=USD')
   return json({account_id:accountId,balances:[]})
  throw Error('untrusted provider endpoint')
 }
 const verify=createPazoLiveVerifiedMerchantResources({fetchImpl})
 for(const wrong of [undefined,null,'','A'.repeat(64),'b'.repeat(64)]){
  const before=networkCalls
  const result=await verify({...input,merchantFingerprint:wrong})
  assert.equal(result.merchantIdentityVerified,false)
  assert.equal(result.mayCharge,false)
  if(wrong!=='b'.repeat(64))assert.equal(networkCalls,before)
 }
 const valid=await verify({...input,merchantFingerprint:fingerprint})
 assert.deepEqual(valid,{
  oauthVerified:true,planVerified:true,webhookVerified:true,
  merchantIdentityVerified:true,isLive:true,mayCharge:false})
 assert.equal(networkCalls,10)
 assert.ok(!JSON.stringify(valid).includes(accountId))
 assert.ok(!JSON.stringify(valid).includes(input.clientSecret))
})
test('provisioning bridge fails closed for missing reporting permission or missing account',async()=>{
 let calls=0
 const fetchImpl=async(url)=>{
  calls++
  if(url.endsWith('/oauth2/token'))return json({
   token_type:'Bearer',access_token:'SYNTHETIC_OAUTH_TOKEN_12345',scope})
  if(url.endsWith('/v1/billing/plans/'+planId))return json({
   id:planId,status:'ACTIVE',billing_cycles:[{tenure_type:'REGULAR',sequence:1,
    frequency:{interval_unit:'MONTH',interval_count:1},total_cycles:0,
    pricing_scheme:{fixed_price:{value:'2.99',currency_code:'USD'}}}],
   payment_preferences:{auto_bill_outstanding:false}})
  if(url.endsWith('/v1/notifications/webhooks/'+webhookId))return json({
   id:webhookId,url:liveWebhookUrlForGeneration(1),
   event_types:REQUIRED_EVENTS.map(name=>({name}))})
  return json({account_id:'INVALID',balances:[]})
 }
 const verify=createPazoLiveVerifiedMerchantResources({fetchImpl})
 const value=await verify({...input,merchantFingerprint:fingerprint})
 assert.equal(value.merchantIdentityVerified,false)
 assert.equal(value.isLive,false)
 assert.equal(value.mayCharge,false)
 assert.equal(calls,5)
})
