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
