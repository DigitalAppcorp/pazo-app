// F16 strictly read-only preflight for the EXISTING Auth-bound subscription.
// No new user, intent, purchase, admin change, grant, cancellation or buyer approval.
import {assessPazoSandboxPlan} from '../../../src/features/supporter/testing/paypalSandboxPlanContract.mjs'
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PLAN='P-14V25407JP6850922NLHMDKI'
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const INTENT=/^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const statuses=new Set(['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'])
const deny=reason=>Object.freeze({
 environment:'sandbox',step:'existing_buyer_preflight',readyForBuyer:false,
 merchantSubscriptionBound:false,plan299MonthlyConsistent:false,
 subscriptionStatus:'UNKNOWN',approvalLinkAvailable:false,
 mayCreateSubscription:false,mayGrantBenefits:false,paidThrough:null,reason,
})
export function assessF16ExistingBuyerSandboxGate({
 state,privateIntent,subscription,plan,
}={}){
 if(state?.environment!=='sandbox'||state?.project!==URL||
  state?.plan!==PLAN||state?.phase!=='bound_before_approval'||
  state?.recoveryPhase!=='bound_verified'||!SUB.test(state?.subscriptionId||'')||
  !UUID.test(state?.authOwnerId||'')||!INTENT.test(state?.intentId||''))
  return deny('original_bound_local_state_required')
 if(privateIntent?.id!==state.intentId||
  privateIntent?.owner_id!==state.authOwnerId||
  privateIntent?.plan_id!==PLAN||
  privateIntent?.external_subscription_id!==state.subscriptionId||
  privateIntent?.state!=='bound'||
  subscription?.id!==state.subscriptionId||
  subscription?.plan_id!==PLAN||
  subscription?.custom_id!==state.intentId)
  return deny('bound_intent_or_merchant_correlation_failed')
 const st=statuses.has(subscription.status)?subscription.status:'UNKNOWN'
 const check=assessPazoSandboxPlan(plan)
 const clean=check.ok&&check.warnings.length===0&&
  [undefined,false].includes(plan?.quantity_supported)
 const terms=clean&&subscription?.plan_overridden===false&&
  subscription?.quantity==='1'
 const a=Array.isArray(subscription?.links)?
  subscription.links.filter(x=>x?.rel==='approve'):[]
 let approvedLink=false
 if(a.length===1&&a[0]?.method==='GET'&&typeof a[0].href==='string'){
  try{
   const u=new URL(a[0].href)
   approvedLink=u.protocol==='https:'&&u.port===''&&
    !u.username&&!u.password&&
    ['www.sandbox.paypal.com','sandbox.paypal.com'].includes(u.hostname)
  }catch{}
 }
 const ready=st==='APPROVAL_PENDING'&&terms&&approvedLink
 return Object.freeze({
  environment:'sandbox',step:'existing_buyer_preflight',
  readyForBuyer:ready,merchantSubscriptionBound:true,
  plan299MonthlyConsistent:clean,
  subscriptionStatus:st,quantityOne:subscription?.quantity==='1',
  planNotOverridden:subscription?.plan_overridden===false,
  approvalLinkAvailable:approvedLink,
  mayCreateSubscription:false,mayGrantBenefits:false,paidThrough:null,
  reason:ready?'same_bound_sandbox_subscription_ready':
   st!=='APPROVAL_PENDING'?'merchant_not_approval_pending':
   !terms?'effective_terms_not_safe':
   'approval_link_unavailable_or_invalid',
 })
}
