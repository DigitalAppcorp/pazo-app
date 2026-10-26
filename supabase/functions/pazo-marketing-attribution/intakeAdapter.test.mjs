import test from 'node:test'
import assert from 'node:assert/strict'
import {createMarketingProvider} from './intakeAdapter.mjs'
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const anonKey='sb_publishable_only_synthetic_12345'
const serviceKey='service_role_synthetic_12345'
test('wrong project origin, missing credentials and empty adapters rejected',()=>{
  for(const url of ['https://example.com',URL+'/path',URL.replace('https:','http:')])
    assert.throws(()=>createMarketingProvider({url,anonKey,serviceKey,fetchImpl:async()=>{}}))
  assert.throws(()=>createMarketingProvider({url:URL,anonKey,serviceKey:''}))
})
test('Auth derives owner via verified Supabase endpoint; never decode token locally',async()=>{
  const calls=[]
  const client=createMarketingProvider({url:URL,anonKey,serviceKey,fetchImpl:async(u,o)=>{
    calls.push({url:u,method:o.method,headers:o.headers})
    return {status:200,json:async()=>({id:'00000000-0000-0000-0000-000000000101',created_at:'2026-10-24T00:00:00Z',email_confirmed_at:'2026-10-24T00:01:00Z'})}
  }})
  const user=await client.authenticate('synthetic.jwt.only')
  assert.equal(user.id,'00000000-0000-0000-0000-000000000101')
  assert.equal(calls[0].url,URL+'/auth/v1/user')
  assert.equal(calls[0].headers.authorization,'Bearer synthetic.jwt.only')
  assert.equal(calls[0].headers.apikey,anonKey)
})
test('non-200 Auth responses never reach privileged sink',async()=>{
  const client=createMarketingProvider({url:URL,anonKey,serviceKey,fetchImpl:async()=>({
    status:401,json:async()=>{throw Error('should not parse')}
  })})
  assert.equal(await client.authenticate('bad'),null)
})
test('service-only bridge receives allowlisted verified fields, not user JWT',async()=>{
  const calls=[]
  const client=createMarketingProvider({url:URL,anonKey,serviceKey,fetchImpl:async(u,o)=>{
    calls.push({url:u,headers:o.headers,body:o.body})
    return {status:200,json:async()=>true}
  }})
  const ok=await client.submit({
    ownerId:'00000000-0000-0000-0000-000000000101',
    creative:'perfil_es',
    firstTouchAt:'2026-10-23T23:59:00Z',
  })
  assert.equal(ok,true)
  assert.equal(calls[0].url,URL+'/rest/v1/rpc/pazo_marketing_record_verified_v1')
  assert.equal(calls[0].headers.apikey,serviceKey)
  assert.equal(calls[0].headers.authorization,'Bearer '+serviceKey)
  const body=JSON.parse(calls[0].body)
  assert.equal(Object.keys(body).length,3)
  assert.ok(!calls[0].body.includes('email'))
  assert.ok(!calls[0].body.includes('jwt'))
})
