// PAZO F16-P05 — OFFLINE RISK AUDIT, no PayPal calls, no DB writes.
// Billing snapshots describe today's debt/retry state, not the specific
// invoice cycle settled by any original sale. NOT a period allocator.
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/
const validUtc=s=>typeof s==='string'&&UTC.test(s)&&
 Number.isFinite(Date.parse(s))&&
 new Date(Date.parse(s)).toISOString().replace(/\.000Z$/,'Z')===s
const minor=s=>{
 if(typeof s!=='string'||!/^\d+\.\d{2}$/.test(s))return null
 const [units,cents]=s.split('.')
 const amount=Number(units)*100+Number(cents)
 return Number.isSafeInteger(amount)&&amount<=100000000?amount:null
}
const balance=b=>b===undefined?null:
 b?.currency_code==='USD'?minor(b.value):null
function result(reason,signals){
 return Object.freeze({
  reason,
  needsCycleAttribution:true,
  cycleVerified:false,
  mayCreatePaidPeriod:false,
  mayGrantBenefits:false,
  mayCountCommemorativeMonth:false,
  mayChangeBilling:false,
  entitlement:false,
  paidThrough:null,periodStart:null,periodEnd:null,
  signals:Object.freeze(signals),
 })
}
const unknown=()=>result('cycle_link_unverified',{
 outstandingBalanceMinor:null,
 failedPaymentsCount:null,
 paymentRetryScheduled:null,
 autoBillOutstanding:null,
 billingExecutionsObserved:null,
 paymentWindowComplete:false,
 multipleCycleSettlementPossible:null,
})
export function assessF16P05CycleAttributionRisks({
 billingFacts,subscription,plan,transactions,
}={}){
 // The P05 facts auditor must already have checked merchant ownership,
 // original SALE, BOUND private intent and expected plan. This is only an
 // offline composition assertion; never used as authorization to grant.
 if(billingFacts?.factsConsistent!==true||
  billingFacts.coverageReady!==false||
  billingFacts.entitlement!==false||
  billingFacts.needsCycleAttribution!==true||
  billingFacts.signals?.monthlyRegularPlan!==true||
  billingFacts.signals?.singleVerifiedSaleInWindow!==true||
  !subscription||typeof subscription!=='object'||Array.isArray(subscription)||
  !plan||typeof plan!=='object'||Array.isArray(plan)||
  !Array.isArray(transactions)||transactions.length>100)
  return unknown()
 const info=subscription.billing_info
 const pay=plan.payment_preferences
 if(info===null||info===undefined||typeof info!=='object'||Array.isArray(info))
  return unknown()
 const outstanding=balance(info.outstanding_balance)
 if(info.outstanding_balance!==undefined&&outstanding===null)
  return unknown()
 const failures=info.failed_payments_count
 if(failures!==undefined&&(!Number.isSafeInteger(failures)||failures<0||failures>9999))
  return unknown()
 const lastFailed=info.last_failed_payment
 if(lastFailed!==undefined&&(!lastFailed||typeof lastFailed!=='object'||
   !validUtc(lastFailed.time)||
   lastFailed.amount?.currency_code!=='USD'||
   minor(lastFailed.amount.value)===null))
  return unknown()
 // PayPal keeps the retry timestamp under last_failed_payment.
 const retry=lastFailed?.next_payment_retry_time
 if(retry!==undefined&&!validUtc(retry))return unknown()
 const executions=info.cycle_executions
 if(executions!==undefined&&(!Array.isArray(executions)||executions.length>3||
  executions.some(e=>!e||!['REGULAR','TRIAL'].includes(e.tenure_type)||
    !Number.isSafeInteger(e.cycles_completed)||e.cycles_completed<0)))
  return unknown()
 const autoBill=pay?.auto_bill_outstanding
 if(autoBill!==undefined&&typeof autoBill!=='boolean')return unknown()
 const possibleOutstanding=outstanding===null||outstanding>0
 const retryOrFailures=failures===undefined||failures>0||
  retry!==undefined||lastFailed!==undefined
 // Even if no current debt or failed payments, previous failures could
 // have been reset by a subsequent successful payment. Snapshots are
 // insufficient to confirm historical attribution.
 const historicalFailureProofMissing=true
 const multiPossible=possibleOutstanding||retryOrFailures||
  transactions.length>1||historicalFailureProofMissing
 return result(possibleOutstanding||retryOrFailures?
   'debt_retry_or_unknown_history_requires_cycle_evidence':
   'snapshot_cannot_assign_original_sale_to_cycle',{
  outstandingBalanceMinor:outstanding,
  failedPaymentsCount:failures===undefined?null:failures,
  paymentRetryScheduled:retry===undefined?null:true,
  autoBillOutstanding:autoBill===undefined?null:autoBill,
  billingExecutionsObserved:executions===undefined?null:executions.length,
  paymentWindowComplete:false,
  multipleCycleSettlementPossible:multiPossible,
 })
}
