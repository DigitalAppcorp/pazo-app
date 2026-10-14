import test from 'node:test'
import assert from 'node:assert/strict'
import {createSandboxSaleWorker} from '../../../../supabase/functions/f16-paypal-webhook/sandboxSaleWorker.mjs'
const ref={provider:'paypal',eventId:'WH-SALE-001',eventType:'PAYMENT.SALE.COMPLETED'}
const candidate={provider:'paypal',externalPaymentId:'SALE-123',
 externalSubscriptionId:'I-SANDBOX-AAAA',
 ownerId:'63e812b0-a7e5-49f6-b2dd-c11d2c72af57',
 grossMinorUnits:299,currency:'USD',completedAt:'2026-10-13T19:00:00Z'}
function setup({decision={acceptedForLedger:true,entitlement:false,candidate},
                 commit={result:'inserted_uncredited',entitlement:false}}={}){
 const calls=[]
 const worker=createSandboxSaleWorker({
  reconciler:{inspect:async input=>{calls.push('provider_verified');return decision}},
  financeStore:{commitVerifiedSale:async input=>{calls.push('atomic_commit');return commit}},
 })
 return {worker,calls}
}
test('only provider-verified candidate gets atomically stored, NEVER paid entitlement',async()=>{
 const x=setup()
 const result=await x.worker.process(ref,{startTime:'2026-10-01T00:00:00Z',
   endTime:'2026-10-31T00:00:00Z'})
 assert.deepEqual(x.calls,['provider_verified','atomic_commit'])
 assert.deepEqual(result,{recorded:true,entitlement:false,reason:'inserted_uncredited'})
})
test('unpaid subscription, uncertain refund or invalid owner never reaches finance writer',async()=>{
 for(const reason of ['missing_trusted_owner_binding',
   'reversal_state_unknown','payment_not_completed',
   'subscription_binding_mismatch']){
  const x=setup({decision:{acceptedForLedger:false,entitlement:false,reason}})
  const r=await x.worker.process(ref)
  assert.equal(r.recorded,false)
  assert.deepEqual(x.calls,['provider_verified'])
 }
})
test('refund/reversal events are kept in quarantine, not treated as sale',async()=>{
 const x=setup()
 for(const eventType of ['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED',
    'BILLING.SUBSCRIPTION.ACTIVATED']){
  const r=await x.worker.process({...ref,eventType})
  assert.equal(r.recorded,false)
 }
 assert.deepEqual(x.calls,[])
})
test('a write failure must propagate; cannot acknowledge partial financial processing',async()=>{
 const worker=createSandboxSaleWorker({
  reconciler:{inspect:async()=>({acceptedForLedger:true,entitlement:false,candidate})},
  financeStore:{commitVerifiedSale:async()=>{throw Error('database unavailable')}},
 })
 await assert.rejects(worker.process(ref),/database unavailable/)
})
test('cannot construct worker without private verified adapters',()=>{
 assert.throws(()=>createSandboxSaleWorker({}),/sandbox_sale_worker_not_configured/)
})
