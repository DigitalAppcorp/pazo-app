// PAZO F16-P05 — READ-ONLY EVIDENCE ANALYSIS, LAB ONLY.
// Never import into browser, deployed Edge, cron, worker, or entitlement path.
// API snapshots (PayPal last_payment, next_billing_time, billing_cycles and
// transaction timestamps) cannot independently establish a paid service period.
// Caller must supply independently merchant-verified original sale and
// service-owned private Auth intent; booleans are not browser authorization.
import {PAZO_SANDBOX_PLAN} from './paymentReconciliation.mjs'

const REF=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/
const date=v=>typeof v==='string'&&UTC.test(v)&&
 Number.isFinite(Date.parse(v))&&
 new Date(Date.parse(v)).toISOString().replace(/\.000Z$/,'Z')===v
const isMoney=(v,amount)=>v?.currency_code==='USD'&&v.value===amount
const no=(reason)=>Object.freeze({
 factsConsistent:false,reason,needsCycleAttribution:true,
 coverageReady:false,entitlement:false,periodStart:null,
 periodEnd:null,paidThrough:null,commemorativeMonths:null,
})
const signals=(reason,f)=>Object.freeze({
 factsConsistent:true,reason,needsCycleAttribution:true,
 coverageReady:false,entitlement:false,periodStart:null,
 periodEnd:null,paidThrough:null,commemorativeMonths:null,
 signals:Object.freeze(f),
})
export function assessF16P05BillingFacts({
 environment,intent,merchantScopedByPayPalApi,planScopedByPayPalApi,
 lookupSubscriptionId,subscription,plan,transactions,originalSale,
}={}) {
 if(environment!=='sandbox')return no('not_sandbox')
 if(merchantScopedByPayPalApi!==true||planScopedByPayPalApi!==true)
  return no('merchant_provenance_not_confirmed')
 if(!intent||intent.state!=='bound'||intent.provider!=='paypal'||
  intent.planId!==PAZO_SANDBOX_PLAN||intent.verifiedOwnerBinding!==true||
  !UUID.test(intent.ownerId||'')||!REF.test(intent.id||'')||
  !SUB.test(intent.externalSubscriptionId||''))
  return no('private_owner_binding_missing')
 if(!subscription||subscription.id!==intent.externalSubscriptionId||
  subscription.id!==lookupSubscriptionId||
  subscription.plan_id!==PAZO_SANDBOX_PLAN||
  subscription.custom_id!==intent.id)
  return no('subscription_owner_mismatch')
 // PayPal can override plan attributes for one subscription. Checking
 // only GET /plans/{id} is insufficient to establish that THIS specific
 // agreement has the expected monthly amount and cycle.
 if(subscription.plan_overridden!==false)
  return no('subscription_plan_override_unverified')
 if(subscription.quantity!==undefined&&subscription.quantity!=='1')
  return no('subscription_quantity_unverified')
 if(!plan||plan.id!==PAZO_SANDBOX_PLAN||plan.status!=='ACTIVE'||
  !Array.isArray(plan.billing_cycles)||plan.billing_cycles.length!==1)
  return no('plan_cycle_structure_unproven')
 const regular=plan.billing_cycles[0]
 if(regular?.tenure_type!=='REGULAR'||regular.frequency?.interval_unit!=='MONTH'||
  regular.frequency?.interval_count!==1||
  !isMoney(regular.pricing_scheme?.fixed_price,'2.99')||
  plan.payment_preferences?.setup_fee!==undefined&&
   !isMoney(plan.payment_preferences.setup_fee,'0.00'))
  return no('plan_frequency_price_or_fee_mismatch')
 if(!originalSale||originalSale.verifiedByMerchantApi!==true||
  !REF.test(originalSale.id||'')||
  originalSale.subscriptionId!==subscription.id||
  originalSale.state!=='completed'||originalSale.grossMinorUnits!==299||
  originalSale.currency!=='USD'||!date(originalSale.completedAt))
  return no('original_sale_not_confirmed')
 if(!Array.isArray(transactions)||transactions.length>100)
  return no('transaction_window_missing_or_unbounded')
 const matching=transactions.filter(x=>x?.id===originalSale.id)
 if(matching.length!==1)
  return no('payment_transaction_not_unique_in_window')
 const transaction=matching[0]
 if(transaction.status!=='COMPLETED'||transaction.time!==originalSale.completedAt||
  !isMoney(transaction.amount_with_breakdown?.gross_amount,'2.99'))
  return no('payment_transaction_not_concordant')
 const info=subscription.billing_info
 const next=info?.next_billing_time
 const last=info?.last_payment?.time
 const started=subscription.start_time
 if(next!==undefined&&!date(next)||
  last!==undefined&&!date(last)||
  started!==undefined&&!date(started)||
  last!==undefined&&!isMoney(info.last_payment?.amount,'2.99'))
  return no('billing_snapshot_invalid')
 if(started!==undefined&&Date.parse(started)>Date.parse(originalSale.completedAt))
  return no('sale_precedes_subscription_start')
 if(next!==undefined&&Date.parse(next)<=Date.parse(originalSale.completedAt))
  return no('next_billing_boundary_not_after_this_sale')
 if(!['ACTIVE','CANCELLED','SUSPENDED','EXPIRED'].includes(subscription.status))
  return no('subscription_state_unknown')
 const hasOutstandingBalance=info?.outstanding_balance!==undefined&&
  !isMoney(info.outstanding_balance,'0.00')
 const lastPaymentMatchesSale=last===originalSale.completedAt
 // A canceled subscription can legitimately lack next_billing_time.
 // A late catch-up payment may be after its billed interval, so the
 // snapshot next_billing_time must NEVER be used as paid_through.
 return signals('monthly_plan_and_original_payment_proven_period_still_unknown',{
  monthlyRegularPlan:true,
  singleVerifiedSaleInWindow:true,
  snapshotNextBillingPresent:next!==undefined,
  lastPaymentMatchesSale,
  outstandingBalancePresent:hasOutstandingBalance,
  subscriptionCancelled:subscription.status==='CANCELLED',
 })
}
