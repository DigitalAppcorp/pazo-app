import test from 'node:test'
import assert from 'node:assert/strict'
import {createMarketingLandingHandler} from './landingCore.mjs'
import {createMarketingLandingSubmit} from './landingAdapter.mjs'
const verified=async()=>true // Synthetic provider boundary, never Origin proof.
const TARGET='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-marketing-landing'
const ORIGIN='https://pazo-app.vercel.app'
const payload=()=>({utm_source:'meta',utm_medium:'paid_social',
  utm_campaign:'pazo_beta_local_202610',utm_content:'perfil_es'})
const req=(body=payload(),origin=ORIGIN)=>new Request(TARGET,{method:'POST',
  headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})
test('disabled public intake never parses body or invokes privileged RPC',async()=>{
  let count=0
  const r=await createMarketingLandingHandler({submit:()=>{count++}})(req())
  assert.equal(r.status,503)
  assert.deepEqual(await r.json(),{status:'collection_disabled'})
  assert.equal(count,0)
  assert.equal((await createMarketingLandingHandler({released:true})(req())).status,503)
})
test('allowlisted aggregate keeps no user fields and counts only a creative',async()=>{
  let value
  const h=createMarketingLandingHandler({released:true,verifyChallenge:verified,submit:async v=>(value=v,true)})
  const r=await h(req())
  assert.equal(r.status,202)
  assert.equal((await r.json()).status,'aggregated')
  assert.equal(value,'perfil_es')
})
test('rejects arbitrary parameters and PII before touching adapter',async()=>{
  let calls=0
  const h=createMarketingLandingHandler({released:true,verifyChallenge:verified,submit:()=>{calls++}})
  const invalid=[
    {...payload(),owner_id:'00000000-0000-0000-0000-000000000101'},
    {...payload(),ip:'127.0.0.1'},
    {...payload(),fbclid:'fake'},
    {...payload(),email:'person@example.org'},
    {...payload(),utm_content:'junk'},
    {...payload(),utm_source:'facebook'},
    {...payload(),utm_campaign:'unapproved'},
    {...payload(),utm_medium:'cpc'},
  ]
  for(const data of invalid)assert.equal((await h(req(data))).status,400)
  assert.equal((await h(req(payload(),'https://other-site.example'))).status,403)
  assert.equal((await h(req({utm_content:'perfil_es'}))).status,400)
  assert.equal(calls,0)
})
test('no false success when DB rejects aggregate; no provider info leaked',async()=>{
  const h=createMarketingLandingHandler({released:true,verifyChallenge:verified,submit:async()=>false})
  const r=await h(req())
  assert.equal(r.status,409)
  assert.deepEqual(await r.json(),{status:'not_accepted'})
})
test('service RPC uses project allowlist and no identity beyond a creative code',async()=>{
  const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
  let call
  const submit=createMarketingLandingSubmit({url:URL,serviceKey:'synthetic_service_role_12345',
    fetchImpl:async(u,o)=>{call={u,o};return {status:200,json:async()=>true}}})
  assert.equal(await submit('perfil_es'),true)
  assert.equal(call.u,URL+'/rest/v1/rpc/pazo_marketing_record_landing_v1')
  assert.deepEqual(JSON.parse(call.o.body),{p_creative:'perfil_es'})
  assert.ok(!/ip|uuid|jwt|cookie|email/.test(call.o.body))
  assert.throws(()=>createMarketingLandingSubmit({url:'https://unknown.example',serviceKey:'synthetic_service_role_12345'}))
})
