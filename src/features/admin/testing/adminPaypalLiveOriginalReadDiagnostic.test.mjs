import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoOriginalSubscriptionReadDiagnostic} from
 '../../../../supabase/functions/pazo-paypal-live-account/liveProviderReadDiagnostic.mjs'

const sub='I-SYNTHETIC-123456'
const url='https://api-m.paypal.com/v1/billing/subscriptions/'+sub
const json=(body,status=200)=>new Response(JSON.stringify(body),
 {status,headers:{'content-type':'application/json'}})
const setup=body=>{
 const logs=[],requests=[]
 const fetchImpl=async (u,o)=>{
  requests.push({url:u,method:o.method})
  return typeof body==='function'?body(u,o):body
 }
 const reader=createPazoOriginalSubscriptionReadDiagnostic({fetchImpl,report:v=>logs.push(v)})
 return {reader,logs,requests}
}

test('valid Live APPROVAL_PENDING GET lacking optional status_update_time emits private bounded diagnostic',async()=>{
 const source={id:sub,plan_id:'P-EXAMPLE1234567',status:'APPROVAL_PENDING',
  subscriber:{email_address:'PRIVATE@example.invalid',payer_id:'SENSITIVE_PAYER'},
  custom_id:'intent-PRIVATE'}
 const f=setup(json(source))
 const r=await f.reader(url,{method:'GET',headers:{Authorization:'Bearer SECRET_TOKEN'}})
 assert.equal(r.status,200)
 assert.deepEqual(f.logs,[{kind:'paypal_subscription_read',result:'http_200',
  providerStatus:'APPROVAL_PENDING',statusUpdateTime:'absent'}])
 const text=JSON.stringify(f.logs)
 for(const privateText of ['PRIVATE','SENSITIVE','SECRET_TOKEN',sub,'plan_id','custom_id','subscriber'])
  assert.equal(text.includes(privateText),false,privateText)
 assert.equal((await r.json()).subscriber.email_address,'PRIVATE@example.invalid',
  'diagnostic must not consume or modify the original PayPal response')
 assert.equal(f.requests.length,1)
})

test('PayPal original GET 404 captures only bounded status and provider error enum, never raw body/debug/payer',async()=>{
 const f=setup(json({name:'RESOURCE_NOT_FOUND',message:'PRIVATE_NAME',
  debug_id:'private-debug-id',details:[{description:'CARD-SECRET'}]},404))
 const r=await f.reader(url,{method:'GET'})
 assert.equal(r.status,404)
 assert.deepEqual(f.logs,[{kind:'paypal_subscription_read',result:'http_error',
  httpStatus:404,providerError:'RESOURCE_NOT_FOUND'}])
 assert.doesNotMatch(JSON.stringify(f.logs),/PRIVATE|SECRET|debug_id|CARD/)
})
test('non-merchant host, OAuth POST, subscription CREATE and cancellation do not emit read logs',async()=>{
 const f=setup(json({status:'APPROVAL_PENDING'}))
 const requests=[
 ['https://api-m.paypal.com/v1/oauth2/token','POST'],
 ['https://api-m.paypal.com/v1/billing/subscriptions','POST'],
 [url+'/cancel','POST'],
 ['https://api-m.sandbox.paypal.com/v1/billing/subscriptions/'+sub,'GET'],
 ['https://api-m.paypal.com.evil.test/v1/billing/subscriptions/'+sub,'GET']
 ]
 for(const [url,method] of requests)await f.reader(url,{method})
 assert.equal(f.logs.length,0)
 assert.equal(f.requests.length,requests.length)
})
test('provider 403, invalid JSON and missing date of recognized ACTIVE status are read-only diagnostics',async()=>{
 for(const [response,expected] of [
  [json({name:'PERMISSION_DENIED'},403),
   {kind:'paypal_subscription_read',result:'http_error',httpStatus:403,providerError:'PERMISSION_DENIED'}],
  [new Response('INVALID',{status:200,headers:{'content-type':'application/json'}}),
   {kind:'paypal_subscription_read',result:'invalid_json',providerStatus:'unknown',statusUpdateTime:'unknown'}],
  [json({status:'ACTIVE',status_update_time:'2026-10-25T11:10:10Z'}),
   {kind:'paypal_subscription_read',result:'http_200',providerStatus:'ACTIVE',statusUpdateTime:'present'}]
 ]){
  const f=setup(response)
  await f.reader(url,{method:'GET'})
  assert.deepEqual(f.logs,[expected])
 }
})
test('network errors and throwing reporters never reveal errors or change GET outcome',async()=>{
 const logs=[]
 const read=createPazoOriginalSubscriptionReadDiagnostic({fetchImpl:async()=>{throw Error('SENSITIVE_TOKEN')},
  report:x=>logs.push(x)})
 await assert.rejects(read(url,{method:'GET'}),e=>e.message==='provider_response_unavailable')
 assert.deepEqual(logs,[{kind:'paypal_subscription_read',result:'network_unavailable'}])
 const canRead=createPazoOriginalSubscriptionReadDiagnostic({fetchImpl:async()=>json({status:'APPROVED'}),
  report:()=>{throw Error('REPORT_BROKEN')}})
 assert.equal((await canRead(url,{method:'GET'})).status,200)
})
test('hosted Edge account adapter uses original Vault merchant and does not grant benefits or create checkout',()=>{
 const index=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-account/index.ts',
  import.meta.url),'utf8')
 assert.match(index,/createPazoOriginalSubscriptionReadDiagnostic/)
 assert.match(index,/fetchImpl:originalReadFetch/)
 assert.match(index,/createPazoLiveVaultGenerationSecretReader/)
 assert.doesNotMatch(index,/createSubscription\(/)
 assert.doesNotMatch(index,/pazo_paypal_live_paid_periods|service_role.*benefits/i)
})
