import test from 'node:test'
import assert from 'node:assert/strict'
import {createP28HistoricalHostedReader as create} from '../../../../supabase/functions/f16-paypal-webhook/p28HistoricalHostedReader.mjs'
const base='https://mrybvqdebbgcayuvgkkr.supabase.co'
const key='x'.repeat(48)
const args={eventId:'WH-P28-123',requestId:'11111111-1111-4111-8111-111111111111',eventFingerprint:'a'.repeat(64)}
test('historical RPC reader rejects absent server scope and key with zero network traffic',async()=>{
 let count=0;const fetchImpl=async()=>{count++}
 for(const config of [{},{scope:'DISABLED',serviceRoleKey:key},{scope:'SERVER_ONLY_HISTORICAL_REVIEW',serviceRoleKey:'x'}]){
  assert.equal(await create({projectUrl:base,fetchImpl,...config})(args),null)
 }
 assert.equal(count,0)
})
test('historical exact-ID transport uses private RPC POST and redacts response',async()=>{
 let count=0
 const read=create({projectUrl:base,serviceRoleKey:key,scope:'SERVER_ONLY_HISTORICAL_REVIEW',
  fetchImpl:async(url,options)=>{
   count++;assert.equal(url,base+'/rest/v1/rpc/f16_p28_read_historical_candidate_exact')
   assert.equal(options.method,'POST')
   assert.deepEqual(JSON.parse(options.body),{p_event_id:args.eventId,p_request_id:args.requestId,p_event_fingerprint:args.eventFingerprint})
   return {ok:true,json:async()=>({id:args.eventId,processingState:'pending',ownerId:'secret',amount:299})}
  }})
 assert.deepEqual(await read(args),{id:args.eventId,processingState:'pending'})
 assert.equal(count,1)
 assert.equal(await read({...args,eventId:'*'}),null)
 assert.equal(count,1)
})
test('uninstalled or rejecting RPC fails closed',async()=>{
 const read=create({projectUrl:base,serviceRoleKey:key,scope:'SERVER_ONLY_HISTORICAL_REVIEW',
  fetchImpl:async()=>({ok:false,status:404})})
 assert.equal(await read(args),null)
})
