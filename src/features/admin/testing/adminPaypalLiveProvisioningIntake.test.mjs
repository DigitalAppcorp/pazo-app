import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveProvisioningIntake} from '../../../../supabase/functions/pazo-admin-paypal-provision/intake.mjs'
import {readFileSync} from 'node:fs'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-admin-paypal-provision'
const body={merchantGeneration:7,clientId:'CLIENT_TEST_123456789',
 clientSecret:'SECRET_TEST_123456789',
 confirmation:'PREPARAR CREDENCIALES LIVE',expectedRevision:0}
const request=(data=body,headers={})=>new Request(url,{method:'POST',
 headers:{authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.dGVzdHNpZw','content-type':'application/json',...headers},
 body:JSON.stringify(data)})
test('inert new Edge endpoint is OFF, never reads sensitive POST body or calls backend',async()=>{
 let count=0
 const ingress=createPazoLiveProvisioningIntake({provision:async()=>{count++}})
 const res=await ingress(request())
 assert.equal(res.status,503)
 assert.equal(count,0)
 assert.equal((await res.json()).code,'live_provisioning_not_released')
 const index=readFileSync(new URL('../../../../supabase/functions/pazo-admin-paypal-provision/index.ts',import.meta.url),'utf8')
 assert.match(index,/const RELEASE_APPROVED=false/)
 assert.doesNotMatch(index,/getScopedManagementToken|Deno\.env\.get/)
})
test('released simulation routes only strict authorized JSON and sanitizes response',async()=>{
 let calls=0
 const ingress=createPazoLiveProvisioningIntake({released:true,provision:async input=>{
  calls++
  assert.equal(input.clientSecret,body.clientSecret)
  return {ok:true,code:'generation_secret_names_confirmed',
   liveActivated:false,mayCharge:false,credentialsExposed:false}
 }})
 const res=await ingress(request())
 assert.equal(res.status,202)
 assert.deepEqual(await res.json(),{ok:true,code:'generation_secret_names_confirmed',
  liveActivated:false,mayCharge:false})
 assert.equal(calls,1)
})
test('bad body, extra fields, missing JWT and query injection never reach backend',async()=>{
 let calls=0
 const ingress=createPazoLiveProvisioningIntake({released:true,provision:async()=>{calls++}})
 const variants=[
  request({...body,action:'activate'}),
  request({...body,clientSecret:undefined}),
  request(body,{authorization:''}),
  request(body,{'content-type':'application/x-www-form-urlencoded'}),
  new Request(url+'?generation=7',{method:'POST',headers:{
   authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.dGVzdHNpZw','content-type':'application/json'},
   body:JSON.stringify(body)})
 ]
 for(const v of variants){const response=await ingress(v);assert.ok(response.status>=400)}
 assert.equal(calls,0)
})
test('backend failure never reflects PayPal tokens, credentials or full error',async()=>{
 const ingress=createPazoLiveProvisioningIntake({released:true,
  provision:async()=>{throw Error('SENSITIVE_CLIENT_SECRET')}})
 const response=await ingress(request())
 assert.equal(response.status,503)
 const r=await response.text()
 assert.ok(!r.includes('SENSITIVE'))
 assert.ok(!r.includes(body.clientSecret))
})

test('reject malformed bearer, extraneous content type, and UTF-8 byte overflow',async()=>{
 let calls=0
 const ingress=createPazoLiveProvisioningIntake({released:true,provision:async()=>{calls++}})
 const variants=[
  request(body,{authorization:'Bearer not-a-jwt'}),
  request(body,{authorization:'Bearer x.y.z extra'}),
  request(body,{'content-type':'application/json; charset=latin1'}),
  request(body,{'content-type':'application/json; garbage=1'}),
  request({...body,clientSecret:'é'.repeat(1050)})
 ]
 for(const v of variants){const res=await ingress(v);assert.ok(res.status>=400)}
 assert.equal(calls,0)
})

test('Supabase routed internal URL and allowed browser Origin use the same strict handler',async()=>{
 let calls=0
 const ingress=createPazoLiveProvisioningIntake({released:true,provision:async()=>{calls++;return {
  ok:true,code:'generation_secret_names_confirmed',
  liveActivated:false,mayCharge:false,credentialsExposed:false
 }}})
 const routed=new Request('http://edge-runtime.internal/pazo-admin-paypal-provision',{
  method:'POST',headers:{
   authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.dGVzdHNpZw',
   'content-type':'application/json',origin:'http://localhost:5173'
  },body:JSON.stringify(body)
 })
 const result=await ingress(routed)
 assert.equal(result.status,202)
 assert.equal(result.headers.get('access-control-allow-origin'),'http://localhost:5173')
 assert.equal(result.headers.get('vary'),'Origin')
 assert.equal(calls,1)
})
test('preflight accepts only explicit PAZO origins and POST, with zero secret/body reads',async()=>{
 let calls=0
 const ingress=createPazoLiveProvisioningIntake({released:true,provision:async()=>{calls++}})
 for(const origin of ['http://localhost:5173','http://127.0.0.1:5173','https://pazo-app-t83r.vercel.app']){
  const preflight=new Request('http://edge-runtime.internal/pazo-admin-paypal-provision',{
   method:'OPTIONS',headers:{origin,'access-control-request-method':'POST'}
  })
  const result=await ingress(preflight)
  assert.equal(result.status,204)
  assert.equal(result.headers.get('access-control-allow-origin'),origin)
  assert.ok(result.headers.get('access-control-allow-headers').includes('authorization'))
 }
 for(const input of [
  {url:'http://edge-runtime.internal/pazo-admin-paypal-provision',origin:'https://attacker.example',method:'POST'},
  {url:'http://edge-runtime.internal/pazo-admin-paypal-provision?generation=1',origin:'http://localhost:5173',method:'POST'},
  {url:'http://edge-runtime.internal/other-endpoint',origin:'http://localhost:5173',method:'POST'},
  {url:'http://edge-runtime.internal/pazo-admin-paypal-provision',origin:'http://localhost:5173',method:'DELETE'},
  {url:'http://edge-runtime.internal/pazo-admin-paypal-provision',origin:'',method:'POST'}
 ]){
  const result=await ingress(new Request(input.url,{method:'OPTIONS',headers:{
   ...(input.origin?{origin:input.origin}:{}),
   'access-control-request-method':input.method
  }}))
  assert.ok(result.status>=400)
  if(input.origin==='https://attacker.example')
   assert.equal(result.headers.get('access-control-allow-origin'),null)
 }
 assert.equal(calls,0)
})
test('unreleased provisioning preflight does not expose an enabled write channel',async()=>{
 const ingress=createPazoLiveProvisioningIntake({released:false,
  provision:async()=>{throw Error('must_not_run')}})
 const res=await ingress(new Request(url,{method:'OPTIONS',headers:{
  origin:'http://localhost:5173','access-control-request-method':'POST'
 }}))
 assert.equal(res.status,503)
 assert.equal((await res.json()).code,'live_provisioning_not_released')
})
test('cross-origin POST is denied before backend and never returns credentials',async()=>{
 let count=0
 const ingress=createPazoLiveProvisioningIntake({released:true,
  provision:async()=>{count++;throw Error('PRIVATE_TOKEN')}})
 const res=await ingress(request(body,{origin:'https://attacker.example'}))
 assert.equal(res.status,403)
 assert.equal(res.headers.get('access-control-allow-origin'),null)
 assert.equal(count,0)
 const text=await res.text()
 assert.ok(!text.includes('PRIVATE_TOKEN'))
 assert.ok(!text.includes(body.clientSecret))
})

test('origin prefix confusion and path suffix bypass are refused before privileged backend',async()=>{
 let calls=0
 const ingress=createPazoLiveProvisioningIntake({released:true,
  provision:async()=>{calls++;throw Error('must never be reached')}})
 for(const [target,origin] of [
  ['https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-admin-paypal-provision','https://pazo-app-t83r.vercel.app.evil.invalid'],
  ['http://edge-runtime.internal/pazo-admin-paypal-provision/','http://localhost:5173'],
  ['http://edge-runtime.internal/pazo-admin-paypal-provision%2F','http://localhost:5173']
 ]){
  const res=await ingress(new Request(target,{method:'POST',headers:{
   origin,'content-type':'application/json',
   authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.dGVzdHNpZw'
  },body:JSON.stringify(body)}))
  assert.ok(res.status>=400)
  assert.equal(res.headers.get('access-control-allow-origin'),
   origin==='http://localhost:5173'?'http://localhost:5173':null)
 }
 assert.equal(calls,0)
})
