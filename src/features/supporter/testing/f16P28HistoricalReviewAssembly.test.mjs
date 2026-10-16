import test from 'node:test'
import assert from 'node:assert/strict'
import {webcrypto} from 'node:crypto'
import {createP28HistoricalReviewAssembly as create} from '../../../../supabase/functions/f16-paypal-webhook/p28HistoricalReviewAssembly.mjs'
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co',key='s'.repeat(48),operator='o'.repeat(48),hmac='h'.repeat(48)
const args={eventId:'WH-P28-CASE',requestId:'11111111-1111-4111-8111-111111111111'}
const request=(auth='Bearer '+operator)=>new Request(BASE+'/functions/v1/never-deploy',{
 method:'POST',headers:{authorization:auth,'content-type':'application/json'},body:JSON.stringify(args)})
test('historical review assembly defaults off with no network or crypto activity',async()=>{
 let calls=0
 const h=create({operatorKey:operator,projectUrl:BASE,serviceRoleKey:key,hmacSecret:hmac,cryptoImpl:webcrypto,fetchImpl:async()=>{calls++}})
 const res=await h(request())
 assert.equal(res.status,503);assert.equal(calls,0)
})
test('auth-first and audit-first, with no provider reads and no identifier response',async()=>{
 const calls=[]
 const h=create({enabled:true,operatorKey:operator,projectUrl:BASE,serviceRoleKey:key,hmacSecret:hmac,cryptoImpl:webcrypto,
 fetchImpl:async(url,init)=>{
  calls.push(url)
  if(url.endsWith('/f16_p28_draft_ack_historical_audit')){
   const body=JSON.parse(init.body)
   assert.equal(body.p_request_id,args.requestId)
   assert.match(body.p_event_fingerprint,/^[0-9a-f]{64}$/)
   assert.ok(!init.body.includes(args.eventId))
   return {ok:true,json:async()=>({persisted:true,requestId:args.requestId})}
  }
  if(url.endsWith('/f16_p28_read_historical_candidate_exact'))return {ok:true,json:async()=>({id:args.eventId,processingState:'pending'})}
  throw Error('unexpected transport')
 }})
 assert.equal((await h(request('Bearer invalid'))).status,401);assert.equal(calls.length,0)
 const res=await h(request())
 assert.equal(res.status,200)
 assert.equal((await res.json()).code,'historical_candidate_review_required')
 assert.deepEqual(calls.map(x=>x.split('/').at(-1)),['f16_p28_draft_ack_historical_audit','f16_p28_read_historical_candidate_exact'])
})
test('audit RPC rejection prevents candidate DB read',async()=>{
 const calls=[]
 const h=create({enabled:true,operatorKey:operator,projectUrl:BASE,serviceRoleKey:key,hmacSecret:hmac,cryptoImpl:webcrypto,
 fetchImpl:async(url)=>{calls.push(url);return {ok:false,status:404}}})
 assert.equal((await h(request())).status,404)
 assert.equal(calls.length,1)
})
