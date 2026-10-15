// PAZO F16 P05 — pure projection of merchant GET evidence. No grants or paid periods.
const BASE=Object.freeze({environment:'sandbox',step:'p05_original_billing_read_only',
 networkPaymentWrites:0,dbWrites:0,mayGrantBenefits:false,mayRecordPayment:false,
 cycleVerified:false,periodStart:null,periodEnd:null,paidThrough:null,
 globalFinancialCoverage:false})
const isMoney=(x,value)=>x?.currency_code==='USD'&&x?.value===value
const safeMoney=x=>x?.currency_code==='USD'&&/^\d{1,9}\.\d{2}$/.test(x.value||'')?
 Object.freeze({currency:'USD',amount:x.value}):null
const safeTime=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT/.test(x)?x:null
const no=reason=>Object.freeze({...BASE,phase:'BLOCKED',reason})
export function summarizeF16P05ExistingBilling({state,snapshot}={}){
 if(!state||state.environment!=='sandbox'||state.phase!=='buyer_cancelled'||
   state.recoveryPhase!=='bound_verified'||!state.subscriptionId||!state.intentId||
   !snapshot?.merchantScopedByPayPalApi||!snapshot?.planScopedByPayPalApi)
   return no('original_sandbox_binding_or_merchant_evidence_missing')
 const sub=snapshot.subscription,plan=snapshot.plan
 if(!sub||!plan||sub.status!=='CANCELLED'||snapshot.lookupSubscriptionId!==state.subscriptionId||
    sub.id!==state.subscriptionId||sub.custom_id!==state.intentId||
    sub.plan_id!==state.plan||plan.id!==state.plan)
   return no('original_sandbox_subscription_or_plan_mismatch')
 const cycles=plan.billing_cycles
 const regular=Array.isArray(cycles)&&cycles.length===1?cycles[0]:null
 const knownMonthly=plan.status==='ACTIVE'&&sub.plan_overridden===false&&
   sub.quantity==='1'&&regular?.tenure_type==='REGULAR'&&
   regular.frequency?.interval_unit==='MONTH'&&
   regular.frequency?.interval_count===1&&
   isMoney(regular.pricing_scheme?.fixed_price,'2.99')&&
   isMoney(plan.payment_preferences?.setup_fee,'0.00')
 const info=sub.billing_info||{}
 const executions=Array.isArray(info.cycle_executions)?info.cycle_executions.map(c=>({
   type:['REGULAR','TRIAL'].includes(c.tenure_type)?c.tenure_type:null,
   sequence:Number.isInteger(c.sequence)?c.sequence:null,
   cyclesCompleted:Number.isInteger(c.cycles_completed)?c.cycles_completed:null,
 })):null
 return Object.freeze({...BASE,
   phase:'READ_ONLY_SNAPSHOT',
   reason:'contractual_cycle_attribution_not_yet_proven',
   originalSubscriptionMatched:true,
   subscriptionStatus:sub.status,
   planStatus:plan.status,
   planOverridden:sub.plan_overridden===true?true:sub.plan_overridden===false?false:null,
   quantity:sub.quantity==='1'?1:null,
   planFrequency:regular?.frequency?.interval_unit==='MONTH'&&
     regular.frequency?.interval_count===1?'MONTH_1':null,
   planPrice:safeMoney(regular?.pricing_scheme?.fixed_price),
   setupFee:safeMoney(plan.payment_preferences?.setup_fee),
   currentPlanTermsVerified:knownMonthly===true,
   subscriptionStartTime:safeTime(sub.start_time),
   lastPayment:info.last_payment?{
     time:safeTime(info.last_payment.time),amount:safeMoney(info.last_payment.amount),
   }:null,
   nextBillingTime:safeTime(info.next_billing_time),
   outstandingBalance:safeMoney(info.outstanding_balance),
   failedPaymentsCount:Number.isInteger(info.failed_payments_count)?
     info.failed_payments_count:null,
   lastFailedPayment:info.last_failed_payment?{
     time:safeTime(info.last_failed_payment.time),
     amount:safeMoney(info.last_failed_payment.amount),
     nextRetryTime:safeTime(info.last_failed_payment.next_payment_retry_time),
   }:null,
   cycleExecutions:executions,
 })
}
