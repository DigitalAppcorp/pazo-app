// PAZO F16 — P06 commercial policy approved 2026-10-14.
// PURE SERVER-ONLY OFFLINE CLASSIFIER. NEVER a grant/revoke/checkout action.
// P05 verified billing periods, external evidence, hosted migrations and
// financial retention all require independent PO gates.
// Call only with a trusted privately reconciled single-cycle projection.
const KEYS=['cycleBoundVerified','disputeState','evidenceReconciled',
 'paymentState','periodVerified','refundMinor','refundState','subscriptionState']
const PAYMENTS=new Set(['completed','pending','failed','unknown'])
const SUBSCRIPTIONS=new Set(['active','cancelled','suspended','unknown'])
const REFUNDS=new Set(['none','partial','full','unknown'])
const DISPUTES=new Set(['none','open','resolved','unknown'])
const response=(cycleHandling,reason,needsReview=true)=>Object.freeze({
 cycleHandling,reason,needsReview,
 allowGrant:false,allowRevoke:false,mayChangeBilling:false,
 preserveFreeFeatures:true,entitlement:false,
 paidThrough:null,commemorativeMonths:null,
})
export function classifyF16P06Cycle(input) {
 if(!input||typeof input!=='object'||Array.isArray(input)||
  JSON.stringify(Object.keys(input).sort())!==JSON.stringify(KEYS)||
  typeof input.cycleBoundVerified!=='boolean'||
  typeof input.evidenceReconciled!=='boolean'||
  typeof input.periodVerified!=='boolean'||
  !PAYMENTS.has(input.paymentState)||
  !SUBSCRIPTIONS.has(input.subscriptionState)||
  !REFUNDS.has(input.refundState)||
  !DISPUTES.has(input.disputeState)||
  !(input.refundMinor===null||
    (Number.isSafeInteger(input.refundMinor)&&input.refundMinor>=0&&input.refundMinor<=299)))
  return response('manual_review','untrusted_or_incomplete_cycle_evidence')
 const expectedAmount=input.refundState==='none'?0:
  input.refundState==='full'?299:
  input.refundState==='partial'?null:null
 if((input.refundState==='unknown'&&input.refundMinor!==null)||
  (input.refundState==='partial'&&
   !(input.refundMinor>=1&&input.refundMinor<=298))||
  (expectedAmount!==null&&input.refundMinor!==expectedAmount))
  return response('manual_review','refund_evidence_inconsistent')
 if(input.cycleBoundVerified!==true||input.evidenceReconciled!==true)
  return response('manual_review','cycle_or_provider_evidence_not_verified')
 // A dispute is NOT a refund: never invent fraud, outcome, or a period loss.
 if(input.disputeState!=='none')
  return response('hold_new_credit','dispute_needs_independent_resolution')
 if(input.refundState==='unknown')
  return response('hold_new_credit','refund_state_unknown')
 // A partial refund freezes the *decision* for only this cycle.
 // It does not automatically remove benefits already granted.
 if(input.refundState==='partial')
  return response('review_affected_cycle','partial_refund_no_automatic_proration')
 // A full refund targets the original verified cycle, not all user benefits.
 if(input.refundState==='full') {
  if(input.periodVerified!==true)
   return response('manual_review','refunded_cycle_period_unverified')
  return response('exclude_refunded_cycle','full_refund_target_cycle_only',false)
 }
 if(input.paymentState==='pending'||input.paymentState==='failed')
  return response('do_not_extend_cycle','payment_not_completed',false)
 if(input.paymentState!=='completed')
  return response('hold_new_credit','payment_evidence_unknown')
 if(input.periodVerified!==true)
  return response('manual_review','billing_period_not_verified')
 if(input.subscriptionState==='suspended'||input.subscriptionState==='unknown')
  return response('manual_review','subscription_status_needs_review')
 // Cancellation stops future renewals; historical coverage is not refunded.
 // NO direct PayPal billing action is authorized by this classifier.
 return response('preserve_verified_paid_cycle',
  input.subscriptionState==='cancelled'?
   'cancelled_does_not_refund_verified_period':'completed_period_unreversed',false)
}
