import test from 'node:test'
import assert from 'node:assert/strict'
import {createP28HostedAuditWriter} from '../../../../supabase/functions/f16-paypal-webhook/p28HostedAuditWriter.mjs'
const base='https://mrybvqdebbgcayuvgkkr.supabase.co',secret='s'.repeat(48)
const args={requestId:'11111111-1111-4111-8111-111111111111',eventFingerprint:'a'.repeat(64),action:'historical_candidate_exact_read'}
test('no network on absent secret, wrong scope or invalid fingerprint',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++}
 for(const config of [{},{scope:'DISABLED',serviceRoleKey:secret},{scope:'SERVER_ONLY_HISTORICAL_REVIEW',serviceRoleKey:'short'}]){
  assert.equal(await createP28HostedAuditWriter({projectUrl:base,fetchImpl,...config})(args),null)
 }
 assert.equal(await createP28HostedAuditWriter({projectUrl:base,scope:'SERVER_ONLY_HISTORICAL_REVIEW',serviceRoleKey:secret,fetchImpl})({...args,eventFingerprint:'wrong'}),null)
 assert.equal(calls,0)
})
test('verified persist ack is returned without identifiers and with minimal body',async()=>{
 let calls=0
 const writer=createP28HostedAuditWriter({projectUrl:base,scope:'SERVER_ONLY_HISTORICAL_REVIEW',serviceRoleKey:secret,
  fetchImpl:async(url,init)=>{
   calls++
   assert.equal(url,base+'/rest/v1/rpc/f16_p28_draft_ack_historical_audit')
   assert.equal(init.method,'POST')
   assert.deepEqual(JSON.parse(init.body),{p_request_id:args.requestId,p_event_fingerprint:args.eventFingerprint})
   return {ok:true,json:async()=>({persisted:true,requestId:args.requestId,extra:'not returned'})}
  }})
 assert.deepEqual(await writer(args),{persisted:true,requestId:args.requestId})
 assert.equal(calls,1)
})
test('missing RPC, mismatched response or network error fail closed',async()=>{
 for(const fetchImpl of [async()=>({ok:false,status:404}),async()=>({ok:true,json:async()=>({persisted:true,requestId:'wrong'})}),async()=>{throw Error('network')}])
  assert.equal(await createP28HostedAuditWriter({projectUrl:base,scope:'SERVER_ONLY_HISTORICAL_REVIEW',serviceRoleKey:secret,fetchImpl})(args),null)
})
