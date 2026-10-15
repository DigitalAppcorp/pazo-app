// F16 — Pure inspector of ONE already-created, unapproved Sandbox subscription.
// Input from server-side PRIVATE sources only. Never a bind/write/entitlement.
// Output is deliberately sanitized: no owner, intent, subscription, token,
// URL, payer, email or raw provider data. No implicit month/coverage credit.
import {assessPazoSandboxPlan} from '../../../src/features/supporter/testing/paypalSandboxPlanContract.mjs'
const PLAN='P-14V25407JP6850922NLHMDKI'
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const statusSet=new Set(['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'])
function approvalLinkSignal(links){
 if(!Array.isArray(links))return 'not_returned'
 const matches=links.filter(x=>x?.rel==='approve')
 if(matches.length===0)return 'not_returned'
 if(matches.length!==1)return 'ambiguous'
 const item=matches[0]
 if(item.method!=='GET'||typeof item.href!=='string')return 'not_safe'
 try{
  const u=new URL(item.href)
  return u.protocol==='https:'&&
   ['www.sandbox.paypal.com','sandbox.paypal.com'].includes(u.hostname)&&
   !u.username&&!u.password?'sandbox_get':'not_safe'
 }catch{return 'not_safe'}
}
export function assessF16PendingSandboxReadOnly({
 savedState,subscription,plan,privateIntent,authOwnerExists,
}={}){
 const result={
  environment:'sandbox',step:'pending_binding_diagnostic_readonly',
  savedPhase:typeof savedState?.phase==='string'?savedState.phase:'unknown',
  hasSavedSubscriptionReference:SUB.test(savedState?.subscriptionId||''),
  subscriptionStatus:statusSet.has(subscription?.status)?subscription.status:'UNKNOWN',
  subscriptionIdMatches:false,subscriptionPlanMatches:false,
  customIdMatches:false,privateIntentPending:false,privateIntentOwnerMatches:false,
  authOwnerExists:authOwnerExists===true,
  plan299MonthlyConsistent:false,planTermIssueCodes:[],
  planValidator:'canonical_sandbox_plan_contract',planOverrideExplicitlyFalse:false,
  quantityOneExplicit:false,quantityReported:false,
  approvalLinkSignal:approvalLinkSignal(subscription?.links),
  couldCompletePreapprovalChecks:false,
  mayBind:false,mayCreateSubscription:false,mayApproveBuyer:false,
  mayGrantBenefits:false,paidThrough:null,financialHistoryComplete:false,
  networkWrites:0,
 }
 if(!savedState||!SUB.test(savedState.subscriptionId||'')||
  typeof savedState.intentId!=='string'||typeof savedState.authOwnerId!=='string')
  return Object.freeze({...result,reason:'incomplete_local_reference'})
 result.subscriptionIdMatches=subscription?.id===savedState.subscriptionId
 result.subscriptionPlanMatches=subscription?.plan_id===PLAN
 result.customIdMatches=subscription?.custom_id===savedState.intentId
 result.privateIntentPending=privateIntent?.state==='pending'
 result.privateIntentOwnerMatches=
  privateIntent?.id===savedState.intentId&&
  privateIntent?.owner_id===savedState.authOwnerId&&
  privateIntent?.plan_id===PLAN&&
  privateIntent?.external_subscription_id===null
 // Keep the exact same currency/period/fee semantics as the operator's
 // remote preflight. Earlier forensic logic used a stricter string equality
 // for zero setup fee and could disagree with an already-PASS canonical plan.
 // Return ONLY issue code enums; NEVER the raw merchant plan or pricing.
 const planResult=assessPazoSandboxPlan(plan)
 const allowedIssues=new Set([
  'invalid_response','plan_id_mismatch','plan_not_active',
  'unexpected_billing_cycles_or_trial','not_monthly',
  'finite_billing_cycles','price_not_usd_2_99',
  'nonzero_or_unknown_setup_fee','quantity_supported_review',
  'tax_configuration_review','quantity_supported_not_false',
 ])
 const issues=[
  ...planResult.issues,...planResult.warnings,
  ...(plan?.quantity_supported===true?[]:
   plan?.quantity_supported===false||plan?.quantity_supported===undefined?[]:
   ['quantity_supported_not_false']),
 ].filter(issue=>allowedIssues.has(issue))
 result.planTermIssueCodes=issues
 result.plan299MonthlyConsistent=planResult.ok&&
  planResult.warnings.length===0&&
  (plan?.quantity_supported===false||plan?.quantity_supported===undefined)
 result.planOverrideExplicitlyFalse=subscription?.plan_overridden===false
 result.quantityReported=subscription?.quantity!==undefined&&
  subscription?.quantity!==null
 result.quantityOneExplicit=subscription?.quantity==='1'
 const correlated=result.subscriptionIdMatches&&result.subscriptionPlanMatches&&
  result.customIdMatches&&result.privateIntentOwnerMatches&&
  result.privateIntentPending&&result.authOwnerExists
 const terms=result.plan299MonthlyConsistent&&
  result.planOverrideExplicitlyFalse&&result.quantityOneExplicit
 result.couldCompletePreapprovalChecks=
  correlated&&terms&&result.subscriptionStatus==='APPROVAL_PENDING'
 const reason=!correlated?'binding_sources_not_consistent':
  result.subscriptionStatus!=='APPROVAL_PENDING'?'subscription_not_pending':
  !terms?'effective_terms_unknown_or_different':
  'evidence_consistent_but_one_shot_test_stopped'
 return Object.freeze({...result,reason})
}
