import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16PrivateInboxDecisionGate} from '../../../../supabase/functions/f16-paypal-webhook/privateInboxDecisionGate.mjs'
const ID='WH-TEST-123456'
const base={provider:'paypal',eventId:ID,eventType:'PAYMENT.SALE.COMPLETED'}
const stored={provider_event_id:ID,event_type:base.eventType,
 processing_state:'pending',retention_hold:true}
function setup(row=stored){
 const reads=[]
 const gate=createF16PrivateInboxDecisionGate({loadVerifiedInbox:async id=>{
  reads.push(id)
  return row instanceof Error?Promise.reject(row):row
 }})
 return {gate,reads}
}
test('requires server-loaded, signature-verified, pending inbox row',async()=>{
 const x=setup()
 assert.deepEqual(await x.gate.inspect(base),{
  ready:true,entitlement:false,
  handling:'sale_requires_private_owner_and_provider_reconciliation',
 })
 assert.deepEqual(x.reads,[ID])
})
test('rejects spoofed PayPal provider, event ID or type without touching DB',async()=>{
 const x=setup()
 for(const ref of [{...base,provider:'stripe'},{...base,eventId:'../secret'},
   {...base,eventType:'CUSTOM.EVENT'},{...base,eventId:1},
   {...base,eventType:'PAYMENT.SALE.COMPLETED?foo=bar'}]){
  assert.equal((await x.gate.inspect(ref)).ready,false)
 }
 assert.deepEqual(x.reads,[])
})
test('a private row cannot be spoofed by caller or mismatched event type',async()=>{
 for(const row of [null,{...stored,provider_event_id:'WH-OTHER'},
  {...stored,event_type:'PAYMENT.SALE.REFUNDED'},
  {...stored,processing_state:'processing'},
  {...stored,processing_state:'processed'},
  {...stored,processing_state:'quarantined'},
  {...stored,retention_hold:false},
  new Error('private DB unavailable: hidden message')]){
  const x=setup(row)
  const r=await x.gate.inspect(base)
  assert.equal(r.ready,false)
  assert.equal(r.entitlement,false)
  assert.equal(JSON.stringify(r).includes('hidden message'),false)
 }
})
test('cancellation and failed payment never become a sale',async()=>{
 for(const kind of ['BILLING.SUBSCRIPTION.CREATED',
   'BILLING.SUBSCRIPTION.ACTIVATED','BILLING.SUBSCRIPTION.CANCELLED',
   'BILLING.SUBSCRIPTION.SUSPENDED','BILLING.SUBSCRIPTION.EXPIRED',
   'BILLING.SUBSCRIPTION.UPDATED','BILLING.SUBSCRIPTION.RE-ACTIVATED',
   'BILLING.SUBSCRIPTION.PAYMENT.FAILED']){
  const x=setup({...stored,event_type:kind})
  const result=await x.gate.inspect({...base,eventType:kind})
  assert.equal(result.ready,true)
  assert.equal(result.handling,'subscription_lifecycle_no_payment_credit')
  assert.equal(result.entitlement,false)
 }
})
test('refund and reversal require independent original-payment evidence',async()=>{
 for(const kind of ['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED']){
  const x=setup({...stored,event_type:kind})
  const result=await x.gate.inspect({...base,eventType:kind})
  assert.equal(result.ready,true)
  assert.equal(result.handling,'reversal_requires_independent_original_payment_proof')
  assert.equal(result.entitlement,false)
 }
})
test('cannot create gate without server-only loader',()=>{
 assert.throws(()=>createF16PrivateInboxDecisionGate({}),/private_inbox_reader_required/)
})
