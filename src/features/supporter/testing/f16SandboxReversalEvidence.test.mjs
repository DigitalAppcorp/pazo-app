import test from 'node:test'
import assert from 'node:assert/strict'
import {assessPaypalSandboxReversalEvidence as assess} from '../../../../supabase/functions/f16-paypal-webhook/sandboxReversalEvidence.mjs'
const EVENT='WH-PAZO-REVERSAL'
const PAYMENT='9A2B3C4D5E6F'
const SUB='I-PAZO-SUB123'
const REFUND='PAYMENT.SALE.REFUNDED'
const REVERSED='PAYMENT.SALE.REVERSED'
function ready(overrides={}){
 const eventType=overrides.type??REFUND
 const s=overrides.status??'REFUNDED'
 const args={
  environment:'sandbox',
  inbox:{ready:true,entitlement:false,handling:'reversal_requires_independent_original_payment_proof'},
  event:{eventId:EVENT,eventType},
  merchantScopedByPayPalApi:true,
  independentlyVerifiedReversal:{
   eventId:EVENT,eventType,verifiedByMerchantApi:true,
   originalSaleId:PAYMENT,subscriptionId:SUB,status:s,
   verifiedAt:'2026-10-14T11:16:00Z',
  },
  independentlyVerifiedOriginalSale:{
   verifiedByMerchantApi:true,id:PAYMENT,subscriptionId:SUB,
   planId:'P-14V25407JP6850922NLHMDKI',grossMinorUnits:299,currency:'USD',
  },
 }
 return {...args,...overrides}
}
test('merchant-confirmed refund yields only a minimal tombstone candidate',()=>{
 const out=assess(ready())
 assert.equal(out.candidateForTombstone,true)
 assert.equal(out.entitlement,false)
 assert.deepEqual(out.candidate,{
  provider:'paypal',externalPaymentId:PAYMENT,kind:'refunded',
  verifiedAt:'2026-10-14T11:16:00Z',
 })
})
test('merchant-confirmed reversed or partially refunded original payment blocks full credit',()=>{
 for(const [type,status,kind] of [
  [REFUND,'PARTIALLY_REFUNDED','partially_refunded'],
  [REVERSED,'REVERSED','reversed'],
 ]){
  const x=ready({type,status})
  x.independentlyVerifiedReversal.eventType=type
  x.independentlyVerifiedReversal.status=status
  const out=assess(x)
  assert.equal(out.candidateForTombstone,true)
  assert.equal(out.candidate.kind,kind)
  assert.equal(out.entitlement,false)
 }
})
test('independent proof can precede ledger payment; no existing sale row is assumed',()=>{
 const a=ready()
 assert.equal('existingPaymentLedgerRow' in a,false)
 assert.equal(assess(a).candidateForTombstone,true)
})
test('unverified event, wrong environment, inactive inbox or merchant mismatch blocks',()=>{
 for(const patch of [
  {environment:'live'}, {merchantScopedByPayPalApi:false},
  {inbox:{ready:false,reason:'not_pending'}},
  {event:{eventId:EVENT,eventType:'BILLING.SUBSCRIPTION.CANCELLED'}},
  {event:{eventId:'../secret',eventType:REFUND}},
 ]){
  const out=assess({...ready(),...patch})
  assert.equal(out.candidateForTombstone,false)
  assert.equal(out.entitlement,false)
 }
})
test('original sale must be independently correlated; no refund-id shortcut',()=>{
 const x=ready()
 for(const changes of [
  {verifiedByMerchantApi:false},{id:'OTHER_PAYMENT'},
  {subscriptionId:'I-UNRELATED'}, {planId:'P-UNRELATED'},
  {grossMinorUnits:300}, {currency:'EUR'},
  {id:'https://evil.example'},
 ]){
  const out=assess({...x,independentlyVerifiedOriginalSale:{
   ...x.independentlyVerifiedOriginalSale,...changes}})
  assert.equal(out.candidateForTombstone,false)
 }
})
test('provider refund must match event ID/type, sale reference and status',()=>{
 const x=ready()
 for(const changes of [
  {eventId:'WH-DIFFERENT'},{eventType:REVERSED},{originalSaleId:'REFUND-ID'},
  {subscriptionId:'I-DIFFERENT'}, {status:'PENDING'}, {verifiedByMerchantApi:false},
  {verifiedAt:'2026-02-30T00:00:00Z'}, {verifiedAt:'yesterday'},
 ]){
  const out=assess({...x,independentlyVerifiedReversal:{
   ...x.independentlyVerifiedReversal,...changes}})
  assert.equal(out.candidateForTombstone,false)
 }
})
test('PII in provider inputs is never propagated to the candidate',()=>{
 const x=ready()
 x.independentlyVerifiedOriginalSale.payer_email='secret@example.com'
 x.independentlyVerifiedReversal.payer={email:'secret@example.com'}
 const out=assess(x)
 assert.equal(out.candidateForTombstone,true)
 assert.equal(JSON.stringify(out).includes('secret@example.com'),false)
})
