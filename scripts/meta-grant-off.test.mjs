import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaGrantHandler} from '../supabase/functions/pazo-meta-consent/grantCore.mjs'
import {createMetaGrantProvider} from '../supabase/functions/pazo-meta-consent/grantAdapter.mjs'
const owner='16900000-0000-4000-8000-000000000001'
const notice='pazo-meta-conversions-v1'
const body='{"action":"grant","noticeVersion":"'+notice+'"}'
const makeReq=(bodyValue=body,headers={})=>new Request('https://test.invalid',{
 method:'POST',headers:{origin:'https://pazo-app.vercel.app',
 'content-type':'application/json',authorization:'Bearer synthetic-user-jwt-token-for-test',
 ...headers},body:bodyValue})
const user={id:owner,is_anonymous:false,email_confirmed_at:new Date().toISOString()}
test('grant is OFF by default without any request processing',async()=>{
 let called=0
 const handler=createMetaGrantHandler({authenticate:async()=>{called++},
  grant:async()=>{called++}})
 const res=await handler(makeReq())
 assert.equal(res.status,503)
 assert.deepEqual(await res.json(),{status:'disabled'})
 assert.equal(called,0)
})
test('only deliberate, explicit new Meta purpose choice is accepted',async()=>{
 let authenticated=0,saved=0
 const handler=createMetaGrantHandler({released:true,privacyReviewed:true,
  authenticate:async()=>{authenticated++;return user},
  grant:async(id,v,gpc)=>{saved++;assert.deepEqual([id,v,gpc],[owner,notice,false]);return true},
 })
 const res=await handler(makeReq())
 assert.equal(res.status,200)
 assert.deepEqual(await res.json(),{status:'granted'})
 assert.equal(saved,1)
 assert.equal(authenticated,1)
 assert.equal(res.headers.get('cache-control'),'no-store, private')
})
test('browser cannot grant through first-party analytics, existing cookies or hidden fields',async()=>{
 let auth=0,save=0
 const handler=createMetaGrantHandler({released:true,privacyReviewed:true,
  authenticate:async()=>{auth++;return user},
  grant:async()=>{save++;return true}})
 for(const payload of ['{}','{"analytics":true}', '{"action":"withdraw"}',
  '{"action":"grant"}','{"action":"grant","noticeVersion":"old"}',
  '{"action":"grant","noticeVersion":"'+notice+'","ownerId":"'+owner+'"}',
  '{"action":"grant","noticeVersion":"'+notice+'","checked":true}',
  '{"ownerId":"'+owner+'"}','null','[]','']){
  const res=await handler(makeReq(payload))
  assert.notEqual(res.status,200,payload)
 }
 assert.equal(auth,0)
 assert.equal(save,0)
})
test('GPC is a hard override, wrong Origin, missing Auth and anonymous accounts rejected',async()=>{
 let calls=0
 const handler=createMetaGrantHandler({released:true,privacyReviewed:true,
  authenticate:async()=>{calls++;return user},
  grant:async()=>{calls++;return true}})
 assert.equal((await handler(makeReq(body,{'sec-gpc':'1'}))).status,403)
 assert.equal((await handler(makeReq(body,{origin:'https://example.invalid'}))).status,403)
 assert.equal((await handler(makeReq(body,{authorization:''}))).status,401)
 assert.equal(calls,0)
 const h=createMetaGrantHandler({released:true,privacyReviewed:true,
  authenticate:async()=>({...user,is_anonymous:true}),grant:async()=>true})
 assert.equal((await h(makeReq())).status,403)
})
test('no grant from unverified account or backend failure',async()=>{
 const unverified=createMetaGrantHandler({released:true,privacyReviewed:true,
  authenticate:async()=>({...user,email_confirmed_at:null}),grant:async()=>true})
 assert.equal((await unverified(makeReq())).status,403)
 const failed=createMetaGrantHandler({released:true,privacyReviewed:true,
  authenticate:async()=>user,grant:async()=>false})
 assert.equal((await failed(makeReq())).status,409)
})
test('Supabase adapter verifies Auth via server, then invokes service RPC with owner only',async()=>{
 const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
 const anon='synthetic_anon_access_key_not_real_123'
 const service='synthetic_service_role_key_not_real_123'
 const queries=[]
 const provider=createMetaGrantProvider({url,anonKey:anon,serviceKey:service,
  fetchImpl:async(path,params)=>{
   queries.push({path,params})
   if(path.endsWith('/auth/v1/user'))
     return new Response(JSON.stringify(user),{status:200})
   if(path.endsWith('/auth/v1/settings'))
     return new Response(JSON.stringify({mailer_autoconfirm:false}),{status:200})
   if(path.endsWith('/rpc/pazo_meta_grant_first_session_candidate'))
     return new Response('true',{status:200})
   throw Error('unexpected path')
  }})
 const handler=createMetaGrantHandler({released:true,privacyReviewed:true,...provider})
 const response=await handler(makeReq())
 assert.equal(response.status,200)
 assert.equal(queries.length,3)
 assert.equal(queries[0].path,url+'/auth/v1/user')
 assert.equal(queries[0].params.headers.authorization,'Bearer synthetic-user-jwt-token-for-test')
 assert.equal(queries[1].path,url+'/auth/v1/settings')
 assert.equal(queries[2].path,url+'/rest/v1/rpc/pazo_meta_grant_first_session_candidate')
 assert.equal(queries[2].params.headers.authorization,'Bearer '+service)
 assert.deepEqual(JSON.parse(queries[2].params.body),{
  p_owner:owner,p_notice:notice,p_gpc:false})
 assert.equal(JSON.stringify(queries[2].params.body).includes(service),false)
})
test('auto-confirmed Auth settings block consent grant RPC',async()=>{
 let requests=0
 const provider=createMetaGrantProvider({
  url:'https://mrybvqdebbgcayuvgkkr.supabase.co',
  anonKey:'synthetic_anon_access_key_not_real_123',
  serviceKey:'synthetic_service_role_key_not_real_123',
  fetchImpl:async(path)=>{
   requests++
   if(path.endsWith('/auth/v1/user'))return new Response(JSON.stringify(user),{status:200})
   if(path.endsWith('/auth/v1/settings'))return new Response(JSON.stringify({mailer_autoconfirm:true}),{status:200})
   throw Error('no RPC should be invoked')
  }})
 const handler=createMetaGrantHandler({released:true,privacyReviewed:true,...provider})
 assert.equal((await handler(makeReq())).status,401)
 assert.equal(requests,2)
})
