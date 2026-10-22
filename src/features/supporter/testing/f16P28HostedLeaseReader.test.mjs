import test from 'node:test'
import assert from 'node:assert/strict'
import {createP28HostedLeaseReader as create} from '../../../../supabase/functions/f16-paypal-webhook/p28HostedLeaseReader.mjs'
const projectUrl='https://mrybvqdebbgcayuvgkkr.supabase.co'
const key='k'.repeat(48),eventId='WH-P28-001',claimToken='22222222-2222-4222-8222-222222222222'
test('disabled transport makes zero calls',async()=>{
 let calls=0;const reader=create({projectUrl,serviceRoleKey:key,fetchImpl:async()=>{calls++}})
 assert.equal(await reader({eventId,claimToken}),null);assert.equal(calls,0)
})
test('only service scoped P21 RPC is queried, not provider or ledger',async()=>{
 let calls=0
 const reader=create({scope:'SERVER_ONLY_READ_GATE',projectUrl,serviceRoleKey:key,
  fetchImpl:async(url,options)=>{
   calls++;assert.equal(url,projectUrl+'/rest/v1/rpc/f16_p05_draft_read_claimed_event')
   assert.equal(options.method,'POST')
   assert.deepEqual(JSON.parse(options.body),{p_event_id:eventId,p_claim_token:claimToken})
   return {ok:true,json:async()=>({id:eventId,type:'PAYMENT.SALE.COMPLETED',
    processingState:'processing',verifiedAt:'2026-10-15T20:00:00Z'})}
  }})
 const out=await reader({eventId,claimToken});assert.equal(calls,1)
 assert.equal(out.liveLease,true);assert.equal(out.prospective,true)
})
test('unauthorized or empty RPC reply never authorizes a lease',async()=>{
 for(const reply of [{ok:false},{ok:true,json:async()=>null}]){
  const reader=create({scope:'SERVER_ONLY_READ_GATE',projectUrl,serviceRoleKey:key,
   fetchImpl:async()=>reply})
  assert.equal(await reader({eventId,claimToken}),null)
 }
})
