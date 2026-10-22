import test from 'node:test'
import assert from 'node:assert/strict'
import {assessF16P05FirstRegularObligation as audit}
 from '../../../../supabase/functions/f16-paypal-webhook/p05FirstRegularObligationLab.mjs'

const sub='I-SYNTHETICFIRST123',sale='SALE-FIRST123'
const start='2026-10-15T02:03:31Z',active='2026-10-15T03:20:37.957Z'
const saleAt='2026-10-15T03:20:33Z',next='2026-11-14T10:00:00Z'
const readUntil='2026-10-15T04:00:00Z'
function sample(){
 return {
  contract:{scope:'PAZO_PROSPECTIVE_ACCEPTED',subscriptionId:sub,
   saleId:sale,intentId:'intent-private123',termsDigest:'a'.repeat(64),
   termsAcceptedAt:'2026-10-15T02:00:00Z',createdAt:start,
   activatedAt:active,observedNextBillingAt:next},
  plan:{source:'MERCHANT_SUBSCRIPTION_PLAN_GET',regularFrequency:'MONTH_1',
   priceMinor:299,currency:'USD',quantity:1,hasTrial:false,
   setupFeeMinor:0,planOverridden:false,regularCyclesCompleted:1,
   failedPaymentsCount:0,outstandingMinor:0,autoBillOutstanding:true},
  transactionHistory:{source:'MERCHANT_SUBSCRIPTION_TRANSACTIONS_GET',
   startAt:start,endAt:readUntil,totalPages:1,totalItems:1,hasNext:false,
   transactions:[{id:sale,status:'COMPLETED',amountMinor:299,
    currency:'USD',processedAt:saleAt}]},
  webhookJournal:{source:'VERIFIED_WEBHOOK_INBOX_AND_MERCHANT_EVENT_GET',
   startAt:start,endAt:readUntil,coverage:'complete',
   events:[{type:'BILLING.SUBSCRIPTION.ACTIVATED',at:active},
    {type:'PAYMENT.SALE.COMPLETED',at:saleAt}]},
  financialReview:{coverage:'complete',refunds:'clear',
   disputes:'clear',reversals:'clear'},
 }
}
const safe=o=>{
 for(const k of ['sourceAttestedByThisCode','regularChargeAttributedByThisCode',
  'cycleVerified','mayRecordPayment','mayCreatePaidPeriod','mayGrantBenefits',
  'mayEnableCheckout','financialHistoryComplete'])assert.equal(o[k],false,k)
 for(const k of ['periodStart','periodEnd','paidThrough'])assert.equal(o[k],null)
 assert.equal(o.firstObligationMethod,'PAZO_PROSPECTIVE_CONTRACT')
 assert.equal(o.dbWrites,0);assert.equal(o.networkPaymentWrites,0)
 for(const sensitive of [sub,sale,start,active,saleAt,next,'intent-private123'])
  assert.equal(JSON.stringify(o).includes(sensitive),false)
}
const run=mutate=>{const x=sample();mutate?.(x);const o=audit(x);safe(o);return o}
test('clean first charge produces a CANDIDATE, NEVER a verified service period',()=>{
 const o=run()
 assert.equal(o.phase,'CLEAN_FIRST_CHARGE_CANDIDATE_ONLY')
 assert.equal(o.proposedObligationOrdinal,0)
 assert.equal(o.requiresTrustedProviderAndJournalAttestation,true)
 assert.equal(o.requiresIdempotentLedgerAndLegalRelease,true)
})
test('no retroactive Sandbox; needs prospective terms accepted prior to creation',()=>{
 assert.equal(run(x=>x.contract.scope='HISTORICAL_QA').reason,
  'prospective_contract_and_owner_binding_unproven')
 assert.equal(run(x=>x.contract.termsAcceptedAt='2026-10-15T02:30:00Z').reason,
  'contractual_first_interval_invalid')
})
test('billing calendar cannot be fabricated from a +30 day calculation',()=>{
 for(const mutate of [
  x=>x.contract.observedNextBillingAt=null,
  x=>x.contract.activatedAt='2026-11-14T10:00:00Z',
  x=>x.contract.createdAt='2026-10-16T02:00:00Z',
 ])assert.equal(run(mutate).phase,'REVIEW_REQUIRED')
})
test('snapshot counts alone NEVER erase a recorded failure/recovered debt',()=>{
 for(const type of [
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.RE-ACTIVATED',
  'PAYMENT.SALE.REFUNDED',
  'PAYMENT.SALE.REVERSED',
  'CUSTOMER.DISPUTE.CREATED',
  'CUSTOMER.DISPUTE.UPDATED',
  'CUSTOMER.DISPUTE.RESOLVED',
  'PAYMENT.SALE.PENDING',
 ]){
  const result=run(x=>x.webhookJournal.events.push({type,at:'2026-10-15T03:35:00Z'}))
  assert.equal(result.reason,'retry_debt_or_reversal_history_requires_original_cycle_review')
 }
})
test('PayPal failed_payments_count 0 is a snapshot, no clean journal means no candidate',()=>{
 assert.equal(run(x=>x.webhookJournal.coverage='unknown').reason,
  'signed_lifecycle_history_not_attested')
 assert.equal(run(x=>x.webhookJournal.events=[]).reason,
  'initial_sale_or_activation_event_not_accounted_for')
 assert.equal(run(x=>x.plan.failedPaymentsCount=1).reason,
  'current_failed_payment_or_recovered_debt_signal')
})
test('one initial transaction only, including total_pages and total_items',()=>{
 for(const mutate of [
  x=>x.transactionHistory.totalPages=undefined,
  x=>x.transactionHistory.totalItems=undefined,
  x=>x.transactionHistory.totalPages=2,
  x=>x.transactionHistory.totalItems=2,
  x=>x.transactionHistory.hasNext=true,
  x=>x.transactionHistory.transactions.push({...x.transactionHistory.transactions[0]}),
  x=>x.transactionHistory.startAt='2026-10-15T03:00:00Z',
  x=>x.transactionHistory.endAt='2026-10-15T03:00:00Z',
 ])assert.equal(run(mutate).reason,'merchant_transaction_history_not_exhaustive')
})
test('second sale including a bundled outstanding balance cannot be credited as initial regular',()=>{
 assert.equal(run(x=>x.transactionHistory.transactions[0].amountMinor=598).reason,
  'single_completed_sale_not_consistent_with_first_obligation')
 assert.equal(run(x=>x.plan.outstandingMinor=299).reason,
  'merchant_monthly_plan_or_original_regular_charge_unverified')
})
test('setup_fee omitted is UNKNOWN, and trials/overrides/quantity fail closed',()=>{
 for(const mutate of [
  x=>x.plan.setupFeeMinor=null,
  x=>x.plan.setupFeeMinor=299,
  x=>x.plan.hasTrial=true,
  x=>x.plan.planOverridden=true,
  x=>x.plan.quantity=2,
  x=>x.plan.regularCyclesCompleted=2,
  x=>x.plan.regularFrequency='DAY_30',
  x=>x.plan.priceMinor=598,
 ])assert.equal(run(mutate).reason,'merchant_monthly_plan_or_original_regular_charge_unverified')
})
test('payment must be COMPLETED, in the original merchant range, before first renewal',()=>{
 for(const mutate of [
  x=>x.transactionHistory.transactions[0].status='PENDING',
  x=>x.transactionHistory.transactions[0].status='REFUNDED',
  x=>x.transactionHistory.transactions[0].id='SALE-OTHER',
  x=>x.transactionHistory.transactions[0].currency='EUR',
  x=>x.transactionHistory.transactions[0].processedAt='2026-02-30T00:00:00Z',
  x=>x.transactionHistory.transactions[0].processedAt='2026-11-15T03:20:33Z',
 ])assert.equal(run(mutate).reason,'single_completed_sale_not_consistent_with_first_obligation')
})
test('refund, dispute, reversal or incomplete coverage always require review',()=>{
 for(const mutate of [
  x=>x.financialReview.refunds='unknown',
  x=>x.financialReview.refunds='open',
  x=>x.financialReview.disputes='open',
  x=>x.financialReview.reversals='unknown',
  x=>x.financialReview.coverage='incomplete',
 ])assert.equal(run(mutate).reason,'refund_dispute_or_reversal_coverage_incomplete')
})
test('journal must align with merchant transaction history and have recorded events',()=>{
 for(const mutate of [
  x=>x.webhookJournal.startAt='2026-10-15T03:20:00Z',
  x=>x.webhookJournal.endAt='2026-10-15T03:30:00Z',
  x=>x.webhookJournal.coverage='partial',
  x=>x.webhookJournal.events[0].at='2026-02-30T00:00:00Z',
  x=>x.webhookJournal.events[0].type='UNKNOWN',
  x=>x.webhookJournal.events.push({...x.webhookJournal.events[0]}),
 ])assert.equal(run(mutate).phase,'REVIEW_REQUIRED')
})
test('untrusted payer PII or unexpected fields in any input are denied',()=>{
 for(const mutate of [
  x=>x.contract.ownerEmail='person@example.com',
  x=>x.plan.payer='somebody',
  x=>x.transactionHistory.transactions[0].payerEmail='person@example.com',
  x=>x.webhookJournal.rawPayload={email:'person@example.com'},
  x=>x.financialReview.paypalToken='SECRET',
  x=>x.context='new',
 ])assert.equal(run(mutate).phase,'REVIEW_REQUIRED')
})
test('full lifecycle may show cancellation without revoking a verified prepaid period',()=>{
 const o=run(x=>x.webhookJournal.events.push({
  type:'BILLING.SUBSCRIPTION.CANCELLED',at:'2026-10-15T03:40:00Z'}))
 assert.equal(o.phase,'CLEAN_FIRST_CHARGE_CANDIDATE_ONLY')
 assert.equal(o.mayGrantBenefits,false)
})
test('128 combinations never authorize payment or membership',()=>{
 let n=0
 for(const pages of [1,2])
 for(const failed of [0,1])
 for(const outstanding of [0,299])
 for(const setup of [0,null])
 for(const coverage of ['complete','unknown'])
 for(const reversal of ['clear','open'])
 for(const unique of [true,false]){
  const r=run(x=>{
   x.transactionHistory.totalPages=pages
   x.plan.failedPaymentsCount=failed
   x.plan.outstandingMinor=outstanding
   x.plan.setupFeeMinor=setup
   x.webhookJournal.coverage=coverage
   x.financialReview.reversals=reversal
   if(!unique)x.transactionHistory.transactions[0].id='SALE-FOREIGN'
  })
  assert.equal(r.mayGrantBenefits,false)
  n++
 }
 assert.equal(n,128)
})

test('additional distinct SALE.COMPLETED or activation blocks first obligation',()=>{
 for(const type of ['PAYMENT.SALE.COMPLETED',
  'BILLING.SUBSCRIPTION.ACTIVATED']){
  const r=run(x=>x.webhookJournal.events.push({
   type,at:'2026-10-15T03:45:00Z',
  }))
  assert.equal(r.reason,
   'multiple_activation_or_sale_events_require_manual_reconciliation')
 }
})
test('cancellation alone does not masquerade as a second sale',()=>{
 const r=run(x=>x.webhookJournal.events.push({
  type:'BILLING.SUBSCRIPTION.CANCELLED',at:'2026-10-15T03:50:00Z',
 }))
 assert.equal(r.phase,'CLEAN_FIRST_CHARGE_CANDIDATE_ONLY')
 assert.equal(r.mayRecordPayment,false)
})
