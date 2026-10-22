import test from 'node:test'
import assert from 'node:assert/strict'
import {assessP30LedgerCandidate as assess} from '../../../../supabase/functions/f16-paypal-webhook/p30LedgerCandidateLab.mjs'
const base={saleId:'SALE-P30-ORIGINAL',subscriptionId:'I-P30-OWNER',intentId:'intent-ABCDEFGHIJKLMNOP'}
test('clean candidate never produces a financial write',()=>{
 const r=assess(base)
 assert.equal(r.reason,'candidate_not_financially_attested')
 assert.equal(r.ledgerWrites,0);assert.equal(r.mayRecordPayment,false)
 assert.equal(r.mayCreatePaidPeriod,false);assert.equal(r.paidThrough,null)
})
test('cross-owner sale and conflicting first obligation denied',()=>{
 assert.equal(assess({...base,reviewReservations:[{saleId:base.saleId,subscriptionId:'I-OTHER',intentId:'intent-OTHERABCDEFGHI'}]}).reason,'sale_cross_owner_conflict')
 assert.equal(assess({...base,reviewReservations:[{saleId:'SALE-DIFFERENT',subscriptionId:base.subscriptionId,intentId:base.intentId}]}).reason,'first_obligation_already_reserved')
})
test('refund and duplicate IDs require manual reconciliation',()=>{
 const refund={refundId:'REFUND-ONE',saleId:base.saleId,amountMinor:100}
 assert.equal(assess({...base,refunds:[refund]}).reason,'refunded_sale_requires_reconciliation')
 assert.equal(assess({...base,refunds:[refund,refund]}).reason,'refund_lineage_invalid')
 assert.equal(assess({...base,refunds:[{...refund,amountMinor:200},{...refund,refundId:'REFUND-TWO'}]}).reason,'refund_total_exceeds_sale')
})
