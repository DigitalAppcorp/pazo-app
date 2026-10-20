import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveVerifiedAdmin}
 from '../../../../supabase/functions/pazo-admin-paypal-provision/liveVerifiedAdmin.mjs'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const key='TEST_PUBLIC_SUPABASE_KEY_1234567890'
const actor='12345678-1234-4234-8234-123456789abc'
const token='e30.eyJzdWIiOiJ0ZXN0In0.ZmFrZXNpZw'
const request=auth=>new Request(url+'/functions/v1/pazo-admin-paypal-provision',{
 method:'POST',headers:{authorization:auth??'Bearer '+token}})
const json=(status,body)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json'}})
const make=(args={})=>{
 const calls=[]
 const verifier=createPazoLiveVerifiedAdmin({
  supabaseUrl:url,publishableKey:key,
  proveFreshReauthentication:async({actorId})=>actorId===actor,
  fetchImpl:async(uri,options)=>{
   calls.push({uri,auth:options.headers.Authorization})
   if(uri.endsWith('/auth/v1/user'))return json(200,{id:actor,aud:'authenticated'})
   if(uri.endsWith('/rest/v1/rpc/pazo_is_admin'))return json(200,true)
   throw Error('unknown')
  },...args
 })
 return {verifier,calls}
}
test('admin identity only passes GoTrue, authenticated admin RPC and fresh challenge',async()=>{
 const {verifier,calls}=make()
 const result=await verifier(request())
 assert.deepEqual(result,{id:actor,isAdmin:true,freshSession:true})
 assert.deepEqual(calls.map(x=>x.uri),[
  url+'/auth/v1/user',url+'/rest/v1/rpc/pazo_is_admin'])
 assert.ok(calls.every(x=>x.auth==='Bearer '+token))
})
test('no fresh reauthentication means no access to any financial secret operation',async()=>{
 for(const callback of [undefined,async()=>false,async()=>{throw Error('private')}]){
  const {verifier}=make({proveFreshReauthentication:callback})
  assert.equal(await verifier(request()),null)
 }
})
test('unsigned bearer, anonymous user, and non-admin user are denied',async()=>{
 const invalid=make()
 for(const auth of ['Bearer forged','Basic abc','Bearer 1.2.3 extra']){
  assert.equal(await invalid.verifier(request(auth)),null)
 }
 assert.equal(invalid.calls.length,0)
 const anon=make({fetchImpl:async()=>json(200,{id:actor,is_anonymous:true})})
 assert.equal(await anon.verifier(request()),null)
 const denied=make({fetchImpl:async uri=>
  uri.endsWith('/user')?json(200,{id:actor}):json(200,false)})
 assert.equal(await denied.verifier(request()),null)
})
test('provider errors are sanitized and never surface JWT or management keys',async()=>{
 const {verifier}=make({fetchImpl:async()=>{throw Error('secret_not_for_logs')}})
 assert.equal(await verifier(request()),null)
 assert.throws(()=>createPazoLiveVerifiedAdmin({supabaseUrl:'https://fake.example',publishableKey:key}),
  /privileged_admin_config_unavailable/)
})
