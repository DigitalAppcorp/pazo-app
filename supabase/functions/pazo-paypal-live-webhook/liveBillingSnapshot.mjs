// Normalize a fresh original-generation authenticated subscription + plan GET.
// No dates are derived from frequency. This is a private observation, not a
// payment period and not proof of a merchant's legal/account identity.
import {validatePazoPaypalLiveMonthlyPlan} from '../f16-paypal-webhook/pazoPaypalLivePlanContract.mjs'
export const canonicalPaypalInstant=value=>{
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value))return null
 const at=Date.parse(value),canonical=value.replace(/(?:\.(\d{1,3}))?Z$/,(_m,f)=>'.'+(f||'').padEnd(3,'0')+'Z')
 return Number.isFinite(at)&&new Date(at).toISOString()===canonical?canonical:null
}
export function normalizePazoLiveBillingSnapshot({subscription,plan,subscriptionId,intentId,
 merchantGeneration,observedAt=new Date().toISOString()}={}){
 const fail=()=>{throw Error('live_billing_snapshot_unavailable')}
 if(subscription?.id!==subscriptionId||subscription.custom_id!==intentId||
  subscription.plan_id!==plan?.id||!validatePazoPaypalLiveMonthlyPlan(plan,subscription.plan_id).ready||
  !Number.isSafeInteger(merchantGeneration)||merchantGeneration<1||
  !['ACTIVE','CANCELLED','SUSPENDED','EXPIRED','APPROVAL_PENDING','APPROVED'].includes(subscription.status)||
  !canonicalPaypalInstant(observedAt)||![undefined,false].includes(subscription.plan_overridden)||
  ![undefined,'1',1].includes(subscription.quantity))fail()
 const info=subscription.billing_info,cycles=info?.cycle_executions
 if(!info||!Array.isArray(cycles)||cycles.length!==1||cycles[0]?.tenure_type!=='REGULAR'||
  cycles[0].sequence!==1||!Number.isSafeInteger(cycles[0].cycles_completed)||
  cycles[0].cycles_completed<0||cycles[0].cycles_completed>1200||
  !Number.isSafeInteger(info.failed_payments_count)||info.failed_payments_count<0)fail()
 const zero=info.outstanding_balance?.currency_code==='USD'&&
  typeof info.outstanding_balance.value==='string'&&/^0(?:\.0{1,2})?$/.test(info.outstanding_balance.value)
 const last=info.last_payment
 const lastAt=last?canonicalPaypalInstant(last.time):null
 if(last&&(!lastAt||last.amount?.currency_code!=='USD'||last.amount.value!=='2.99'))fail()
 const started=canonicalPaypalInstant(subscription.start_time)
 const next=info.next_billing_time==null?null:canonicalPaypalInstant(info.next_billing_time)
 if(!started||(info.next_billing_time!=null&&!next))fail()
 return Object.freeze({verifiedProviderRead:true,proofSource:'paypal_live_original_generation_get',
  sourceEnvironment:'live',merchantGeneration,subscriptionId,intentId,planId:plan.id,
  observedAt:canonicalPaypalInstant(observedAt),status:subscription.status,
  startedAt:started,statusUpdatedAt:canonicalPaypalInstant(subscription.status_update_time),
  nextBillingAt:next,lastPaymentAt:lastAt,lastPaymentMinor:last?299:null,currency:'USD',
  cyclesCompleted:cycles[0].cycles_completed,failedPaymentsCount:info.failed_payments_count,
  outstandingBalanceZero:zero,lastFailedPaymentPresent:info.last_failed_payment!=null,
  planTermsVerified:true,paymentRecorded:false,mayGrantBenefits:false})
}
