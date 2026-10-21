import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveGoTrueOwnerResolver} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveGoTrueOwner.mjs'
const origin='https://mrybvqdebbgcayuvgkkr.supabase.co'
const anonKey='TEST_PUBLIC_SUPABASE_ANON_KEY_12345678'
const userId='12345678-1234-4234-8234-123456789abc'
const token='e30.eyJzdWIiOiJ0ZXN0In0.ZmFrZXNpZw'
const req=(authorization='Bearer '+token)=>new Request('https://pazo.example.com/checkout',{
 method:'POST',headers:{authorization}})
const response=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}})
test('GoTrue must verify JWT before a trusted owner ID is accepted',async()=>{
 const calls=[]
 const resolve=createPazoLiveGoTrueOwnerResolver({
  supabaseUrl:origin,anonKey,fetchImpl:async(url,options)=>{
   calls.push({url,method:options.method,authorization:options.headers.authorization,apikey:options.headers.apikey})
   return response(200,{id:userId,aud:'authenticated',is_anonymous:false})
  }
 })
 assert.equal(await resolve(req()),userId)
 assert.equal(calls.length,1)
 assert.equal(calls[0].url,origin+'/auth/v1/user')
 assert.equal(calls[0].method,'GET')
 assert.equal(calls[0].apikey,anonKey)
 assert.equal(calls[0].authorization,'Bearer '+token)
})
test('invalid authorization never triggers network or accepts client IDs',async()=>{
 let calls=0
 const resolve=createPazoLiveGoTrueOwnerResolver({supabaseUrl:origin,anonKey,
  fetchImpl:async()=>{calls++;return response(200,{id:userId})}})
 for(const auth of ['', 'Bearer test', 'Basic abcd', 'Bearer e30.e30.sig additional']){
  assert.equal(await resolve(req(auth)),null)
 }
 assert.equal(calls,0)
})
test('rejected, anonymous or untrusted GoTrue profiles cannot start Live checkout',async()=>{
 for(const payload of [
  {id:userId,is_anonymous:true},{id:userId,aud:'anon'},
  {id:'bad_user',aud:'authenticated'}
 ]){
  const resolve=createPazoLiveGoTrueOwnerResolver({supabaseUrl:origin,anonKey,
   fetchImpl:async()=>response(200,payload)})
  assert.equal(await resolve(req()),null)
 }
 const invalid=createPazoLiveGoTrueOwnerResolver({supabaseUrl:origin,anonKey,
  fetchImpl:async()=>response(401,{id:userId})})
 assert.equal(await invalid(req()),null)
})
test('network/provider errors are sanitized and credentials never appear in output',async()=>{
 const resolve=createPazoLiveGoTrueOwnerResolver({supabaseUrl:origin,anonKey,
  fetchImpl:async()=>{throw Error('secret_connection_987')}})
 assert.equal(await resolve(req()),null)
 assert.throws(()=>createPazoLiveGoTrueOwnerResolver({supabaseUrl:'https://evil.example',anonKey}),/not_configured/)
})
