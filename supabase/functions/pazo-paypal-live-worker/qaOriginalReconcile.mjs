import {canonicalPaypalInstant} from '../pazo-paypal-live-webhook/liveBillingSnapshot.mjs'
// A private operator recheck, never a provider CANCEL/CREATE. Every retry still
// uses the original signed lease/lifecycle writer and its existing attempt cap.
export function createOriginalQaReconcile({rpc,historical,auditOriginal,lifecycle}={}){
 return async()=>{
  const audit=await auditOriginal()
  const out=code=>({...audit,reconciliationCode:code,mayCreate:false,mayCancel:false,mayGrantBenefits:false})
  if(audit.complete!==true||audit.bindingVerified!==true||audit.planVerified!==true||audit.originalGenerationVerified!==true||audit.signedEventMatches!==true||audit.transactionsComplete!==true||
   audit.transactionCount!==0||audit.completedPayments!==0||audit.lastPaymentPresent!==false||
   !['APPROVAL_PENDING','CANCELLED','EXPIRED'].includes(audit.status)||
   !canonicalPaypalInstant(audit.statusUpdatedAt)||!canonicalPaypalInstant(audit.observedAt))return out('qa_provider_review_required')
  const scope=await rpc('qaOriginalScope',{})
  if(scope?.source!=='original_prebeta_qa_scope_v1'||!scope.event)return out('qa_original_scope_unavailable')
  const bytes=new TextEncoder().encode(JSON.stringify(audit))
  const evidence=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('')
  const result=await rpc('qaOriginalRetry',{p_request:crypto.randomUUID(),p_generation:scope.merchantGeneration,p_intent:scope.intentId,
   p_subscription:scope.subscriptionId,p_event:scope.event.eventId,p_status:audit.status,p_status_at:audit.statusUpdatedAt,p_observed_at:audit.observedAt,p_evidence_sha256:evidence})
  if(!['queued','already_queued','already_processed'].includes(result))return out('qa_retry_not_admitted')
  const recorded=result==='already_processed'?{state:'ALREADY_RECORDED',leaseReleased:true}:await lifecycle({merchantGeneration:scope.merchantGeneration,eventId:scope.event.eventId})
  if(recorded?.outcomeUnknown===true)return out('qa_lifecycle_outcome_unknown')
  if(!['RECORDED','ALREADY_RECORDED'].includes(recorded?.state)||recorded.leaseReleased!==true)return out('qa_lifecycle_review_required')
  if(!['CANCELLED','EXPIRED'].includes(audit.status))return out('qa_event_reconciled_contract_not_terminal')
  // Repeat the original GET immediately before the existing terminal closer.
  // A 404 never passes here; no status/absence of payments is inferred.
  const reader=await historical.readerForGeneration({merchantGeneration:scope.merchantGeneration,sourceEnvironment:'live'})
  const current=await reader.readVerifiedSubscription({subscriptionId:scope.subscriptionId,intentId:scope.intentId,expectedGeneration:scope.merchantGeneration})
  if(current?.status!==audit.status||!canonicalPaypalInstant(current.statusUpdatedAt)||
   current.id!==scope.subscriptionId||current.plan_id!==scope.planId||current.custom_id!==scope.intentId||current.merchantGeneration!==scope.merchantGeneration||current.sourceEnvironment!=='live'||Date.parse(current.statusUpdatedAt)<Date.parse(audit.statusUpdatedAt))return out('qa_terminal_state_changed')
  const closed=await rpc('terminalClose',{p_owner:scope.ownerId,p_intent:scope.intentId,p_generation:scope.merchantGeneration,
   p_subscription:scope.subscriptionId,p_status:current.status})
  return out(closed===true?'qa_original_terminal_closed':'qa_original_obligations_pending')
 }
}
