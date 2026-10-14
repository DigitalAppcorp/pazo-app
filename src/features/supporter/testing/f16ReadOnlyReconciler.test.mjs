import test from 'node:test'
import assert from 'node:assert/strict'
import {createReadOnlyF16Reconciler} from '../../../../supabase/functions/f16-paypal-webhook/readOnlyReconciler.mjs'
const SUB='I-PAZO12345'
const ID='WH-PAZO12345'
const SALE='SALE-123'
const OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const PLAN='P-14V25407JP6850922NLHMDKI'
const ref={provider:'paypal',eventId:ID,eventType:'PAYMENT.SALE.COMPLETED'}
function setup(patch={}){
 const calls=[]
 const event={eventId:ID,eventType:ref.eventType,externalPaymentId:SALE,
   externalSubscriptionId:SUB,requiresReversalReview:false}
 const intent={id:'intent-correlation-123',provider:'paypal',ownerId:OWNER,
   externalSubscriptionId:SUB,planId:PLAN,state:'bound',verifiedOwnerBinding:true}
 const observed={lookupSubscriptionId:SUB,merchantScopedByPayPalApi:true,
   subscription:{id:SUB,plan_id:PLAN,custom_id:'intent-correlation-123',status:'ACTIVE'},
   transactions:[{id:SALE,status:'COMPLETED',time:'2026-10-13T19:00:00Z',
     amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}}}]}
 const reconciler=createReadOnlyF16Reconciler({
  eventReader:{readEvent:async id=>{calls.push('event');return {...event,...patch.event}}},
  subscriptionReader:{read:async opts=>{calls.push('transactions');return {...observed,...patch.observed}}},
  loadVerifiedIntent:async()=>{calls.push('intent');return patch.intent===undefined?intent:patch.intent},
  loadKnownReversalIds:async()=>{calls.push('reversal');return patch.reversals===undefined?[]:patch.reversals},
 })
 return {reconciler,calls}
}
test('an authentic completed payment remains ONLY ledger candidate after all reads',async()=>{
 const x=setup()
 const r=await x.reconciler.inspect(ref,{startTime:'2026-10-01T00:00:00Z',endTime:'2026-10-31T00:00:00Z'})
 assert.equal(r.acceptedForLedger,true)
 assert.equal(r.entitlement,false)
 assert.deepEqual(x.calls,['event','intent','transactions','reversal'])
 assert.equal(JSON.stringify(r).includes('is_founder'),false)
})
test('a subscribed-but-unpaid event does not even look up payments',async()=>{
 const x=setup({event:{eventType:'BILLING.SUBSCRIPTION.ACTIVATED'}})
 const r=await x.reconciler.inspect({...ref,eventType:'BILLING.SUBSCRIPTION.ACTIVATED'})
 assert.equal(r.entitlement,false)
 assert.equal(r.reason,'no_completed_payment')
 assert.deepEqual(x.calls,['event'])
})
test('refund and reversal notification are quarantined until independent confirmation',async()=>{
 for(const eventType of ['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED']) {
  const x=setup({event:{eventType,requiresReversalReview:true,externalPaymentId:null,
    externalSubscriptionId:null}})
  const r=await x.reconciler.inspect({...ref,eventType})
  assert.equal(r.acceptedForLedger,false)
  assert.equal(r.reason,'reversal_requires_independent_reconciliation')
  assert.deepEqual(x.calls,['event'])
 }
})
test('changed provider event type or ID blocks without consulting private intents',async()=>{
 for(const patch of [{eventType:'BILLING.SUBSCRIPTION.ACTIVATED'},{eventId:'OTHER'}]) {
  const x=setup({event:patch})
  const r=await x.reconciler.inspect(ref)
  assert.equal(r.acceptedForLedger,false)
  assert.equal(r.reason,'provider_event_mismatch')
  assert.deepEqual(x.calls,['event'])
 }
})
test('missing owner or transaction is always blocked',async()=>{
 const a=setup({intent:null})
 assert.equal((await a.reconciler.inspect(ref)).reason,'no_verified_owner_intent')
 assert.deepEqual(a.calls,['event','intent'])
 const b=setup({observed:{transactions:[]}})
 assert.equal((await b.reconciler.inspect(ref)).reason,'payment_not_present_in_provider_history')
})
test('reversals and unavailable reversal state never qualify for ledger',async()=>{
 const a=setup({reversals:[SALE]})
 assert.equal((await a.reconciler.inspect(ref)).reason,'payment_reversed')
 const b=setup({reversals:null})
 assert.equal((await b.reconciler.inspect(ref)).reason,'reversal_state_unknown')
})
test('read-only reconciler has no implicit persistence or founder grant capability',()=>{
 assert.throws(()=>createReadOnlyF16Reconciler({}),/not_configured/)
})

test('Sandbox sale event without durable bound owner cannot become a ledger candidate',async()=>{
 for(const intent of [null,
  {id:'intent-correlation-123',provider:'paypal',ownerId:OWNER,
   externalSubscriptionId:SUB,planId:PLAN,state:'pending',verifiedOwnerBinding:true},
  {id:'intent-correlation-123',provider:'paypal',ownerId:OWNER,
   externalSubscriptionId:SUB,planId:'P-OTHER',state:'bound',verifiedOwnerBinding:true},
 ]) {
  const x=setup({intent})
  const result=await x.reconciler.inspect(ref,{startTime:'2026-10-01T00:00:00Z',endTime:'2026-10-31T00:00:00Z'})
  assert.equal(result.acceptedForLedger,false)
  assert.equal(result.entitlement,false)
  assert.deepEqual(x.calls,['event','intent'])
 }
})
test('ambiguous provider payment IDs fail closed before reversal lookup',async()=>{
 const tx={id:SALE,status:'COMPLETED',time:'2026-10-13T19:00:00Z',
  amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}}}
 const x=setup({observed:{transactions:[tx,{...tx,status:'REFUNDED'}]}})
 const result=await x.reconciler.inspect(ref)
 assert.equal(result.reason,'ambiguous_provider_payment_id')
 assert.equal(result.acceptedForLedger,false)
 assert.deepEqual(x.calls,['event','intent','transactions'])
})
