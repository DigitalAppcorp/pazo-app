import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaReceiptHandler} from '../supabase/functions/pazo-meta-receipt/receiptCore.mjs'
const userId='16800000-0000-4000-8000-000000000001'
const eventId='11111111-2222-4333-8444-555555555555'
const datasetId='123456789012345'
const now=Date.now()
const auth={id:userId,is_anonymous:false,email_confirmed_at:new Date(now-60e3).toISOString()}
const receipt={ownerId:userId,authorized:true,verifiedRegistration:true,
 excluded:false,gpc:false,sharingOptOut:false,withdrawn:false,
 metaReleaseEnabled:true,eventId,datasetId,eventTime:Math.floor(now/1000)-60}
const base={released:true,privacyReviewed:true,now:()=>now,authenticate:async()=>auth,
 lookupReceipt:async()=>receipt}
const req=(body='{}',headers={})=>new Request('https://example.invalid',{
 method:'POST',headers:{origin:'https://pazo-app.vercel.app',
 'content-type':'application/json','authorization':'Bearer synthetic-test-token-long',
 ...headers},body})
test('receipt endpoint is OFF without secrets, provider or consent gate',async()=>{
 let calls=0
 const handle=createMetaReceiptHandler({authenticate:async()=>{calls++},
   lookupReceipt:async()=>{calls++}})
 const res=await handle(req())
 assert.equal(res.status,503)
 assert.deepEqual(await res.json(),{status:'disabled'})
 assert.equal(calls,0)
})
test('verified owner receives ONLY attested event ID, dataset ID, name; no PII',async()=>{
 let queried
 const handle=createMetaReceiptHandler({...base,
   lookupReceipt:async owner=>{queried=owner;return receipt}})
 const res=await handle(req())
 assert.equal(res.status,200)
 assert.equal(queried,userId)
 assert.deepEqual(await res.json(),{status:'verified',
   eventName:'CompleteRegistration',eventId,datasetId})
 assert.equal(res.headers.get('cache-control'),'no-store, private')
 assert.equal(res.headers.get('access-control-allow-origin'),'https://pazo-app.vercel.app')
})
test('all browser-provided identity, event or consent fields are rejected',async()=>{
 let authenticates=0,lookups=0
 const handle=createMetaReceiptHandler({...base,
   authenticate:async()=>{authenticates++;return auth},
   lookupReceipt:async()=>{lookups++;return receipt}})
 for(const body of [
   JSON.stringify({ownerId:userId}),JSON.stringify({eventId}),
   JSON.stringify({consent:true}),JSON.stringify({datasetId}),
   '[]','{"gpc":false}','null',''
 ]) {
   const res=await handle(req(body))
   assert.notEqual(res.status,200,body)
 }
 assert.equal(authenticates,0)
 assert.equal(lookups,0)
})
test('origin, GPC, missing authorization, wrong method fail before lookup',async()=>{
 let calls=0
 const handle=createMetaReceiptHandler({...base,lookupReceipt:async()=>{calls++}})
 assert.equal((await handle(req('{}',{origin:'https://evil.example'}))).status,403)
 assert.equal((await handle(req('{}',{'sec-gpc':'1'}))).status,403)
 assert.equal((await handle(req('{}',{authorization:''}))).status,401)
 const get=new Request('https://example.invalid',{method:'GET',headers:{
   origin:'https://pazo-app.vercel.app'
 }})
 assert.equal((await handle(get)).status,405)
 assert.equal(calls,0)
})
test('verified Auth cannot view a different owner conversion',async()=>{
 const handle=createMetaReceiptHandler({...base,lookupReceipt:async()=>({
   ...receipt,ownerId:'22222222-2222-4222-8222-222222222222'
 })})
 const res=await handle(req())
 assert.equal(res.status,404)
 assert.deepEqual(await res.json(),{status:'not_available'})
})
test('privacy revocation, GPC and QA exclusion all prevent receipt',async()=>{
 for(const bad of [
  {authorized:false},{excluded:true},{gpc:true},{sharingOptOut:true},
  {withdrawn:true},{metaReleaseEnabled:false},
  {verifiedRegistration:false},{eventId:'bad'},{datasetId:'Guastayomi'},
  {eventTime:1}
 ]) {
   const handle=createMetaReceiptHandler({...base,
     lookupReceipt:async()=>({...receipt,...bad})})
   assert.equal((await handle(req())).status,404,JSON.stringify(bad))
 }
})
test('unverified/anonymous Auth and failed trusted lookup fail closed',async()=>{
 for(const bad of [{is_anonymous:true},{email_confirmed_at:null},{id:'invalid'}]){
   const handle=createMetaReceiptHandler({...base,
     authenticate:async()=>({...auth,...bad})})
   assert.equal((await handle(req())).status,403)
 }
 const handle=createMetaReceiptHandler({...base,
   lookupReceipt:async()=>{throw Error('test error')}})
 assert.equal((await handle(req())).status,503)
})
