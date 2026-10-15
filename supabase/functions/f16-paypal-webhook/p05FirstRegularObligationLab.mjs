// PAZO F16-P05 — Contractual FIRST obligation attribution, OFFLINE only.
// No PayPal-provided cycle ID is invented. "Candidate" only means a clean,
// unambiguous first charge UNDER PAZO's proposed allocation conditions.
// Caller evidence assertions do not authenticate PayPal, webhook ingress,
// completeness of an event journal, or absence of refunds/disputes.
// MUST NOT be imported into a hosted writer, payment flow or entitlement gate.
const REF=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const DIGEST=/^[a-f0-9]{64}$/
const UTC=/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/
const isDate=s=>typeof s==='string'&&UTC.test(s)&&Number.isFinite(Date.parse(s))&&
  [new Date(s).toISOString(),new Date(s).toISOString().replace(/\.000Z$/,'Z')].includes(s)
const exact=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
  Object.keys(o).sort().join('|')===keys.slice().sort().join('|')
const K={
 contract:['scope','subscriptionId','saleId','intentId','termsDigest','termsAcceptedAt',
  'createdAt','activatedAt','observedNextBillingAt'],
 plan:['source','regularFrequency','priceMinor','currency','quantity','hasTrial',
  'setupFeeMinor','planOverridden','regularCyclesCompleted','failedPaymentsCount',
  'outstandingMinor','autoBillOutstanding'],
 tx:['id','status','amountMinor','currency','processedAt'],
 history:['startAt','endAt','totalItems','totalPages','hasNext','transactions','source'],
 journal:['startAt','endAt','coverage','events','source'],
 event:['type','at'],
 financial:['refunds','disputes','reversals','coverage'],
}
const base=Object.freeze({
 environment:'sandbox',step:'p05_first_regular_obligation_allocation_lab',
 firstObligationMethod:'PAZO_PROSPECTIVE_CONTRACT',
 sourceAttestedByThisCode:false,
 regularChargeAttributedByThisCode:false,
 cycleVerified:false,periodStart:null,periodEnd:null,paidThrough:null,
 mayRecordPayment:false,mayCreatePaidPeriod:false,mayGrantBenefits:false,
 mayEnableCheckout:false,financialHistoryComplete:false,
 dbWrites:0,networkPaymentWrites:0,
})
const reject=reason=>Object.freeze({...base,phase:'REVIEW_REQUIRED',reason})
const candidate=()=>Object.freeze({...base,
 phase:'CLEAN_FIRST_CHARGE_CANDIDATE_ONLY',
 reason:'prospective_first_obligation_consistent_but_sources_and_reversals_not_attested',
 proposedObligationOrdinal:0,
 requiresTrustedProviderAndJournalAttestation:true,
 requiresIdempotentLedgerAndLegalRelease:true,
})
const FAILURE_EVENTS=new Set([
 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
 'BILLING.SUBSCRIPTION.SUSPENDED',
 'BILLING.SUBSCRIPTION.RE-ACTIVATED',
 'PAYMENT.SALE.REFUNDED',
 'PAYMENT.SALE.REVERSED',
 'CUSTOMER.DISPUTE.CREATED',
 'CUSTOMER.DISPUTE.UPDATED',
 'CUSTOMER.DISPUTE.RESOLVED',
 'PAYMENT.SALE.PENDING',
])
const ALLOWED_EVENTS=new Set([
 ...FAILURE_EVENTS,'BILLING.SUBSCRIPTION.CREATED',
 'BILLING.SUBSCRIPTION.ACTIVATED','PAYMENT.SALE.COMPLETED',
 'BILLING.SUBSCRIPTION.CANCELLED',
])
export function assessF16P05FirstRegularObligation(input={}){
 if(!exact(input,['contract','plan','transactionHistory','webhookJournal','financialReview']))
  return reject('input_shape_or_privacy_violation')
 const {contract:c,plan:p,transactionHistory:h,webhookJournal:j,financialReview:f}=input
 if(!exact(c,K.contract)||c.scope!=='PAZO_PROSPECTIVE_ACCEPTED'||
  !SUB.test(c.subscriptionId||'')||!REF.test(c.saleId||'')||
  !REF.test(c.intentId||'')||!DIGEST.test(c.termsDigest||'')||
  ![c.termsAcceptedAt,c.createdAt,c.activatedAt,c.observedNextBillingAt].every(isDate))
  return reject('prospective_contract_and_owner_binding_unproven')
 const time=x=>Date.parse(x)
 if(!(time(c.termsAcceptedAt)<=time(c.createdAt)&&
  time(c.createdAt)<=time(c.activatedAt)&&
  time(c.activatedAt)<time(c.observedNextBillingAt)))
  return reject('contractual_first_interval_invalid')
 if(!exact(p,K.plan)||p.source!=='MERCHANT_SUBSCRIPTION_PLAN_GET'||
  p.regularFrequency!=='MONTH_1'||p.priceMinor!==299||p.currency!=='USD'||
  p.quantity!==1||p.hasTrial!==false||p.planOverridden!==false||
  p.setupFeeMinor!==0||p.regularCyclesCompleted!==1||
  !Number.isInteger(p.failedPaymentsCount)||p.failedPaymentsCount<0||
  p.outstandingMinor!==0||typeof p.autoBillOutstanding!=='boolean')
  return reject('merchant_monthly_plan_or_original_regular_charge_unverified')
 // A successful later payment resets failedPaymentsCount; ZERO is only a
 // snapshot signal, not a history of failed attempts or debt recovery.
 if(p.failedPaymentsCount!==0)
  return reject('current_failed_payment_or_recovered_debt_signal')
 if(!exact(h,K.history)||h.source!=='MERCHANT_SUBSCRIPTION_TRANSACTIONS_GET'||
  ![h.startAt,h.endAt].every(isDate)||
  h.startAt!==c.createdAt||time(h.endAt)<time(c.activatedAt)||
  h.totalPages!==1||h.totalItems!==1||h.hasNext!==false||
  !Array.isArray(h.transactions)||h.transactions.length!==1)
  return reject('merchant_transaction_history_not_exhaustive')
 const t=h.transactions[0]
 if(!exact(t,K.tx)||t.id!==c.saleId||t.status!=='COMPLETED'||
  t.amountMinor!==299||t.currency!=='USD'||!isDate(t.processedAt)||
  time(t.processedAt)<time(c.createdAt)||time(t.processedAt)>time(h.endAt)||
  time(t.processedAt)>=time(c.observedNextBillingAt))
  return reject('single_completed_sale_not_consistent_with_first_obligation')
 if(!exact(j,K.journal)||j.source!=='VERIFIED_WEBHOOK_INBOX_AND_MERCHANT_EVENT_GET'||
  j.coverage!=='complete'||j.startAt!==c.createdAt||
  !isDate(j.endAt)||time(j.endAt)<time(h.endAt)||
  !Array.isArray(j.events)||j.events.length>80)
  return reject('signed_lifecycle_history_not_attested')
 const seen=new Set()
 for(const e of j.events){
  if(!exact(e,K.event)||!ALLOWED_EVENTS.has(e.type)||!isDate(e.at)||
   time(e.at)<time(j.startAt)||time(e.at)>time(j.endAt))
   return reject('unknown_or_malformed_lifecycle_event')
  const k=e.type+'\u0000'+e.at
  if(seen.has(k))return reject('duplicate_lifecycle_event')
  seen.add(k)
 }
 // Exact signed-event content correlation and provenance are checked in the
 // separate source-correlation lab; this does not merge untrusted booleans
 // into a trusted proof. Even a clean journal cannot prove future reversals.
 if(j.events.some(e=>FAILURE_EVENTS.has(e.type)))
  return reject('retry_debt_or_reversal_history_requires_original_cycle_review')
 if(!j.events.some(e=>e.type==='BILLING.SUBSCRIPTION.ACTIVATED')||
  !j.events.some(e=>e.type==='PAYMENT.SALE.COMPLETED'))
  return reject('initial_sale_or_activation_event_not_accounted_for')
 if(!exact(f,K.financial)||f.coverage!=='complete'||
  f.refunds!=='clear'||f.disputes!=='clear'||f.reversals!=='clear')
  return reject('refund_dispute_or_reversal_coverage_incomplete')
 return candidate()
}
