import test from 'node:test'
import assert from 'node:assert/strict'
import { createMarketingIntakeHandler } from './intakeCore.mjs'

const NOW = Date.parse('2026-10-24T01:00:00Z')
const USER = {id:'00000000-0000-0000-0000-000000000101',
  created_at:'2026-10-24T00:00:00Z',email_confirmed_at:'2026-10-24T00:01:00Z',is_anonymous:false}
const TARGET='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-marketing-attribution'
const payload=()=>({
  utm_source:'meta',utm_medium:'paid_social',utm_campaign:'pazo_beta_local_202610',
  utm_content:'perfil_es',first_touch_at:'2026-10-23T23:59:00Z',
})
const req=(body=payload(),overrides={})=>new Request(TARGET,{method:'POST',
  headers:{origin:'https://pazo-app.vercel.app','content-type':'application/json',
    authorization:'Bearer fake-but-valid-jwt-string',...overrides.headers},
  body:JSON.stringify(body)})
const deps=(patch={})=>({released:true,clock:()=>NOW,
  authenticate:async()=>USER, submit:async()=>true,...patch})

test('runtime disabled by default never reads, authenticates or submits',async()=>{
  let called=0
  const h=createMarketingIntakeHandler({authenticate:()=>{called++},submit:()=>{called++}})
  const r=await h(req())
  assert.equal(r.status,503);assert.deepEqual(await r.json(),{status:'collection_disabled'})
  assert.equal(called,0)
})
test('missing backend adapters fail closed even if someone accidentally sets released',async()=>{
  const r=await createMarketingIntakeHandler({released:true})(req())
  assert.equal(r.status,503)
})
test('verified owner is derived from server identity, not an untrusted owner_id',async()=>{
  let entry
  const h=createMarketingIntakeHandler(deps({submit:async x=>{entry=x;return true}}))
  const r=await h(req())
  assert.equal(r.status,202)
  assert.deepEqual(entry,{ownerId:USER.id,creative:'perfil_es',
    firstTouchAt:'2026-10-23T23:59:00.000Z'})
  const invalid=await h(req({...payload(),owner_id:'00000000-0000-0000-0000-000000000102'}))
  assert.equal(invalid.status,400)
})
test('automatic UTM intake rejects unsolicited personal or consent fields',async()=>{
  let auth=0,write=0
  const h=createMarketingIntakeHandler(deps({authenticate:async()=>{auth++;return USER},
    submit:async()=>{write++;return true}}))
  const candidates=[
    {...payload(),consent:{granted:true,version:'pazo-marketing-optin-v1'}},
    {...payload(),consent_recorded_at:'2026-10-24T00:00:00Z'},
    {...payload(),notice_version:'fake-version'},
    {...payload(),utm_content:'em%40example.com'},
    {...payload(),utm_source:'other'},
    {...payload(),email:'test@example.com'},
    {...payload(),click_id:'1234'},
  ]
  for(const body of candidates){const r=await h(req(body));assert.ok([400,403].includes(r.status))}
  assert.equal(auth,0);assert.equal(write,0)
})
test('invalid or stale token cannot invoke internal submit',async()=>{
  let writes=0
  const h=createMarketingIntakeHandler(deps({authenticate:async()=>null,
    submit:async()=>{writes++;return true}}))
  assert.equal((await h(req())).status,401)
  assert.equal(writes,0)
})
test('old account, unconfirmed email, anonymous account are not conversions',async()=>{
  let writes=0
  const invalid=[
    {...USER,created_at:'2026-09-10T00:00:00Z'},
    {...USER,email_confirmed_at:null},
    {...USER,is_anonymous:true},
    {...USER,email_confirmed_at:'2026-10-24T23:00:00Z'},
  ]
  for(const user of invalid){
    const h=createMarketingIntakeHandler(deps({authenticate:async()=>user,submit:()=>{writes++;return true}}))
    assert.equal((await h(req())).status,403)
  }
  assert.equal(writes,0)
})
test('rejects expired first touch, foreign origin, unsafe methods and oversize',async()=>{
  let authCalls=0
  const h=createMarketingIntakeHandler(deps({authenticate:()=>{authCalls++;return USER}}))
  assert.equal((await h(req({...payload(),first_touch_at:'2026-10-10T00:00:00Z'}))).status,400)
  assert.equal((await h(req(payload(),{headers:{origin:'https://evil.test'}}))).status,403)
  assert.equal((await h(req(payload(),{headers:{'content-length':'999999'}}))).status,413)
  assert.equal(authCalls,0)
})
test('replays may not turn a rejected DB insert into an accepted conversion',async()=>{
  let count=0
  const h=createMarketingIntakeHandler(deps({submit:async()=>++count===1}))
  assert.equal((await h(req())).status,202)
  assert.equal((await h(req())).status,409)
})
