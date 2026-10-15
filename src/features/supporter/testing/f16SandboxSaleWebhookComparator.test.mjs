import test from 'node:test'
import assert from 'node:assert/strict'
import {compareF16SandboxSaleEvidence as compare} from '../../../../supabase/functions/f16-paypal-webhook/f16SandboxSaleWebhookComparator.mjs'
const sample=()=>({subscription:{id:'I-TEST123',status:'CANCELLED'},
transaction:{id:'SALE123',status:'COMPLETED',amount_with_breakdown:{gross_amount:{value:'2.99',currency_code:'USD'}}},
event:{id:'WH123',event_type:'PAYMENT.SALE.COMPLETED',resource:{id:'SALE123',billing_agreement_id:'I-TEST123',state:'completed',amount:{total:'2.99',currency:'USD'}}},
inboxEventId:'WH123'})
test('matching exact IDs is MATCH but never grants coverage',()=>{const r=compare(sample());assert.equal(r.phase,'MATCH');assert.equal(r.mayGrantBenefits,false);assert.equal(r.mayRecordPayment,false);assert.equal(r.paidThrough,null)})
test('missing or noncanonical evidence is inconclusive',()=>{const a=sample();delete a.event.resource.billing_agreement_id;assert.equal(compare(a).phase,'INCONCLUSIVE');assert.equal(compare({}).phase,'INCONCLUSIVE')})
test('reject webhook event ID mismatch',()=>{const a=sample();a.inboxEventId='WH999';assert.equal(compare(a).phase,'MISMATCH')})
test('reject mismatching sale ID',()=>{const a=sample();a.event.resource.id='SALE999';assert.equal(compare(a).phase,'MISMATCH')})
test('reject mismatching subscription ID',()=>{const a=sample();a.event.resource.billing_agreement_id='I-OTHER';assert.equal(compare(a).phase,'MISMATCH')})
test('reject different type, amount or status',()=>{let a=sample();a.event.event_type='BILLING.SUBSCRIPTION.CANCELLED';assert.equal(compare(a).phase,'MISMATCH');a=sample();a.event.resource.amount.total='4.99';assert.equal(compare(a).phase,'MISMATCH');a=sample();a.transaction.status='PENDING';assert.equal(compare(a).phase,'MISMATCH')})

test('reject modern payment amount shape in legacy SALE webhook',()=>{
 const a=sample();a.event.resource.amount={value:'2.99',currency_code:'USD'}
 assert.equal(compare(a).phase,'MISMATCH')
})
