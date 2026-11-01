import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaReceiptProvider}
  from '../supabase/functions/pazo-meta-receipt/receiptAdapter.mjs'
import {createMetaReceiptHandler}
  from '../supabase/functions/pazo-meta-receipt/receiptCore.mjs'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const owner='16900000-0000-4000-8000-000000000001'
const eventId='11111111-2222-4333-8444-555555555555'
const datasetId='1438916858347709'
const anonKey='synthetic_anon_key_never_real_123456'
const serviceKey='synthetic_service_role_key_never_real_123456'
const timestamp=new Date(Date.now()-60000).toISOString()
const makeReq=(headers={})=>new Request('https://example.invalid',{
 method:'POST',headers:{origin:'https://pazo-app.vercel.app',
 'content-type':'application/json','authorization':'Bearer synthetic-test-token-long',
 ...headers},body:'{}'})
const createFake=({autoconfirm=false,receipt=true}={})=>{
 const calls=[]
 let taken=false
 const provider=createMetaReceiptProvider({
  url,anonKey,serviceKey,datasetId,
  fetchImpl:async(path,init)=>{
    calls.push({path,init})
    if(path.endsWith('/auth/v1/user'))return new Response(JSON.stringify({
      id:owner,is_anonymous:false,email_confirmed_at:timestamp
    }),{status:200})
    if(path.endsWith('/auth/v1/settings'))return new Response(JSON.stringify({
      mailer_autoconfirm:autoconfirm
    }),{status:200})
    if(path.endsWith('/rpc/pazo_meta_withdraw_candidate'))
      return new Response('true',{status:200})
    if(path.endsWith('/rpc/pazo_meta_take_pixel_receipt_candidate')){
      if(!receipt||taken)return new Response('[]',{status:200})
      taken=true
      return new Response(JSON.stringify([{event_id:eventId,event_time:timestamp}]),
        {status:200})
    }
    throw Error('unexpected URL')
  },
 })
 return {provider,calls}
}
test('receipt adapter never configures against a foreign project or dataset',()=>{
 for(const patch of [
  {url:'https://other.supabase.co'},{datasetId:'123456789012345'},
  {serviceKey:''},{anonKey:''}
 ]) assert.throws(()=>createMetaReceiptProvider({
  url,anonKey,serviceKey,datasetId,...patch,fetchImpl:async()=>null
 }))
})
test('authenticated verified owner gets one server-claimed receipt, not two',async()=>{
 const f=createFake()
 const handler=createMetaReceiptHandler({released:true,privacyReviewed:true,
  ...f.provider})
 const first=await handler(makeReq())
 assert.equal(first.status,200)
 assert.deepEqual(await first.json(),{
  status:'verified',eventName:'CompleteRegistration',eventId,datasetId
 })
 const second=await handler(makeReq())
 assert.equal(second.status,404)
 assert.deepEqual(await second.json(),{status:'not_available'})
 assert.equal(f.calls.length,6)
 assert.equal(f.calls[0].path,url+'/auth/v1/user')
 assert.equal(f.calls[1].path,url+'/auth/v1/settings')
 assert.equal(f.calls[2].path,url+'/rest/v1/rpc/pazo_meta_take_pixel_receipt_candidate')
 assert.equal(f.calls[2].init.headers.authorization,'Bearer '+serviceKey)
 assert.deepEqual(JSON.parse(f.calls[2].init.body),{p_owner:owner})
 assert.equal(f.calls[2].init.body.includes(serviceKey),false)
})
test('unverified email blocks receipt; GPC persists opt-out instead of claiming Pixel',async()=>{
 const f=createFake({autoconfirm:true})
 const handler=createMetaReceiptHandler({released:true,privacyReviewed:true,...f.provider})
 assert.equal((await handler(makeReq())).status,403)
 assert.equal(f.calls.filter(x=>x.path.includes('/rpc/')).length,0)
 const normal=createFake()
 const h=createMetaReceiptHandler({released:true,privacyReviewed:true,...normal.provider})
 assert.equal((await h(makeReq({'sec-gpc':'1'}))).status,403)
 assert.deepEqual(normal.calls.map(x=>x.path),[
   url+'/auth/v1/user',url+'/rest/v1/rpc/pazo_meta_withdraw_candidate',
 ],'durable GPC opt-out must not require email confirmation settings')
 assert.deepEqual(JSON.parse(normal.calls[1].init.body),{p_owner:owner})
 assert.equal(normal.calls.some(x=>x.path.includes('take_pixel_receipt')),false)
})
test('replay, absent claim and disabled release fail closed',async()=>{
 const f=createFake({receipt:false})
 const handler=createMetaReceiptHandler({released:true,privacyReviewed:true,...f.provider})
 assert.equal((await handler(makeReq())).status,404)
 const disabled=createMetaReceiptHandler(f.provider)
 assert.equal((await disabled(makeReq())).status,503)
 assert.equal(f.calls.length,3,'disabled handler must not call provider')
})

test('released receipt binds original browser UA through private matching snapshot, not body',async()=>{
 const ua='Mozilla/5.0 (PAZO synthetic signed-in browser)'
 const calls=[]
 const provider=createMetaReceiptProvider({
  url,anonKey,serviceKey,datasetId,captureOriginalUa:true,
  fetchImpl:async(path,init)=>{
   calls.push({path,init})
   if(path.endsWith('/auth/v1/user'))return new Response(JSON.stringify({
    id:owner,is_anonymous:false,email_confirmed_at:timestamp}),{status:200})
   if(path.endsWith('/auth/v1/settings'))
    return new Response('{"mailer_autoconfirm":false}',{status:200})
   if(path.endsWith('/rpc/pazo_meta_take_pixel_receipt_candidate'))
    return new Response(JSON.stringify([{event_id:eventId,event_time:timestamp}]),{status:200})
   if(path.endsWith('/rpc/pazo_meta_capture_ua_candidate'))
    return new Response('true',{status:200})
   throw Error('unexpected')
  },
 })
 const handle=createMetaReceiptHandler({released:true,privacyReviewed:true,...provider})
 const result=await handle(makeReq({'user-agent':ua}))
 assert.equal(result.status,200)
 assert.equal(calls.length,4)
 assert.deepEqual(JSON.parse(calls[3].init.body),{p_owner:owner,p_agent:ua})
 assert.equal(calls[3].init.headers.authorization,'Bearer '+serviceKey)
 assert.equal(JSON.stringify(await result.json()).includes(ua),false)
})
test('released receipt cannot take claim without valid original UA or confirmed snapshot',async()=>{
 let claims=0
 const make=acceptCapture=>createMetaReceiptProvider({
  url,anonKey,serviceKey,datasetId,captureOriginalUa:true,
  fetchImpl:async(path)=>{
   if(path.endsWith('/auth/v1/user'))return new Response(JSON.stringify({
    id:owner,is_anonymous:false,email_confirmed_at:timestamp}),{status:200})
   if(path.endsWith('/auth/v1/settings'))
    return new Response('{"mailer_autoconfirm":false}',{status:200})
   if(path.endsWith('/rpc/pazo_meta_take_pixel_receipt_candidate')){
    claims++;return new Response(JSON.stringify([{event_id:eventId,event_time:timestamp}]),{status:200})
   }
   if(path.endsWith('/rpc/pazo_meta_capture_ua_candidate'))
    return new Response(acceptCapture?'true':'false',{status:200})
   throw Error('unexpected')
  },
 })
 const missing=createMetaReceiptHandler({released:true,privacyReviewed:true,...make(true)})
 assert.equal((await missing(makeReq({'user-agent':'tiny'}))).status,404)
 assert.equal(claims,0,'invalid header must not consume a one-time receipt')
 const failed=createMetaReceiptHandler({released:true,privacyReviewed:true,...make(false)})
 assert.equal((await failed(makeReq({'user-agent':'Mozilla/5.0 (PAZO synthetic signed-in browser)'}))).status,404)
 assert.equal(claims,1,'valid header can consume claim but failed persistence must block Pixel')
})
