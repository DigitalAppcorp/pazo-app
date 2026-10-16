import test from 'node:test'
import assert from 'node:assert/strict'
import {createP28LeaseAttestationAdapter as create} from '../../../../supabase/functions/f16-paypal-webhook/p28LeaseAttestationAdapter.mjs'
const eventId='WH-P28-LEASE-001',claimToken='22222222-2222-4222-8222-222222222222'
const verifiedAt='2026-10-15T20:00:00Z'
const proof=()=>({id:eventId,type:'PAYMENT.SALE.COMPLETED',
 verifiedAt,processingState:'processing'})
test('only trusted P21 RPC maps to live prospective claim',async()=>{
 let name,args
 const adapter=create({callServiceRpc:async(n,a)=>{name=n;args=a;return proof()}})
 const r=await adapter({eventId,claimToken})
 assert.equal(name,'f16_p05_draft_read_claimed_event')
 assert.deepEqual(args,{p_event_id:eventId,p_claim_token:claimToken})
 assert.equal(r.liveLease,true);assert.equal(r.prospective,true)
 assert.equal(r.id,eventId)
})
test('null, foreign, stale and wrongly shaped proof fails closed',async()=>{
 for(const value of [null,{}, {...proof(),id:'WH-FOREIGN'},
   {...proof(),type:'PAYMENT.SALE.REFUNDED'},
   {...proof(),processingState:'pending'},
   {...proof(),verifiedAt:'bad'}]){
  const r=await create({callServiceRpc:async()=>value})({eventId,claimToken})
  assert.equal(r,null)
 }
})
test('untrusted claim parameters or RPC exception never attest',async()=>{
 let calls=0
 const adapter=create({callServiceRpc:async()=>{calls++;throw Error('unavailable')}})
 assert.equal(await adapter({eventId:'invalid!',claimToken}),null)
 assert.equal(calls,0)
 assert.equal(await adapter({eventId,claimToken}),null)
 assert.equal(calls,1)
})
