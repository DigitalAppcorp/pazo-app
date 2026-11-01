import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaWithdrawalHandler}
  from '../supabase/functions/pazo-meta-consent/withdrawCore.mjs'
const owner='16900000-0000-4000-8000-000000000001'
const makeReq=(body='{"action":"withdraw"}',headers={})=>
  new Request('https://unused.invalid',{method:'POST',headers:{
    origin:'https://pazo-app.vercel.app',
    authorization:'Bearer synthetic-private-user-jwt-token',
    'content-type':'application/json',...headers},body})
test('default OFF never reads body, authenticates or touches private DB',async()=>{
 let calls=0
 const handler=createMetaWithdrawalHandler({
   authenticate:async()=>{calls++},
   withdraw:async()=>{calls++}
 })
 const r=await handler(makeReq())
 assert.equal(r.status,503)
 assert.deepEqual(await r.json(),{status:'disabled'})
 assert.equal(calls,0)
})
test('verified session can withdraw without GPC or first-party analytics permission',async()=>{
 let seen=null
 const handler=createMetaWithdrawalHandler({released:true,
   authenticate:async()=>({id:owner,is_anonymous:false}),
   withdraw:async(id)=>{seen=id;return true}
 })
 const r=await handler(makeReq(undefined,{'sec-gpc':'1'}))
 assert.equal(r.status,200)
 assert.deepEqual(await r.json(),{status:'withdrawn'})
 assert.equal(seen,owner)
 assert.equal(r.headers.get('cache-control'),'no-store, private')
})
test('no grant, no owner spoofing, no unknown fields or oversized bodies',async()=>{
 let auth=0,mutations=0
 const handler=createMetaWithdrawalHandler({released:true,
   authenticate:async()=>{auth++;return {id:owner}},
   withdraw:async()=>{mutations++;return true}
 })
 for(const body of ['{"action":"grant"}','{"action":"deny"}',
   '{"action":"withdraw","ownerId":"123"}','{"action":"withdraw","consent":true}',
   JSON.stringify({ownerId:owner}),'[]','null','{}','',
   '{"action":"withdraw","action":"grant"}']){
   const r=await handler(makeReq(body))
   assert.equal(r.status,400,body)
 }
 assert.equal(auth,0)
 assert.equal(mutations,0)
})
test('cross-origin, bearer missing, wrong method or untrusted Auth fail closed',async()=>{
 let mutations=0
 const handler=createMetaWithdrawalHandler({released:true,
   authenticate:async()=>({id:owner}),withdraw:async()=>{mutations++;return true}
 })
 assert.equal((await handler(makeReq(undefined,{origin:'https://evil.example'}))).status,403)
 assert.equal((await handler(makeReq(undefined,{authorization:''}))).status,401)
 const get=new Request('https://unused.invalid',{method:'GET',
   headers:{origin:'https://pazo-app.vercel.app'}})
 assert.equal((await handler(get)).status,405)
 const noAuth=createMetaWithdrawalHandler({released:true,
   authenticate:async()=>null,withdraw:async()=>{mutations++}})
 assert.equal((await noAuth(makeReq())).status,401)
 const anonymous=createMetaWithdrawalHandler({released:true,
   authenticate:async()=>({id:owner,is_anonymous:true}),
   withdraw:async()=>{mutations++}})
 assert.equal((await anonymous(makeReq())).status,401)
 assert.equal(mutations,0)
})
test('failure to persist opt-out never claims success',async()=>{
 const handler=createMetaWithdrawalHandler({released:true,
   authenticate:async()=>({id:owner}),
   withdraw:async()=>false
 })
 assert.equal((await handler(makeReq())).status,503)
})
