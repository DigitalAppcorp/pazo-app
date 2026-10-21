// F16-P05 — historical activation webhook: evidence discovery, NEVER paid-period proof.
const BASE=Object.freeze({
 environment:'sandbox',step:'f16_p05_activation_schedule_probe',
 cycleVerified:false,periodStart:null,periodEnd:null,paidThrough:null,
 mayGrantBenefits:false,mayRecordPayment:false,mayCreatePaidPeriod:false,
 globalFinancialCoverage:false,
})
const no=(phase,reason)=>Object.freeze({...BASE,phase,reason})
const when=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(v)&&
 Number.isFinite(Date.parse(v))?v:null
const id=/^[A-Za-z0-9._-]{3,128}$/
export function assessF16P05HistoricalActivation({state,event,eventId}={}){
 if(!state||state.environment!=='sandbox'||state.phase!=='buyer_cancelled'||
   state.recoveryPhase!=='bound_verified'||!/^I-[A-Za-z0-9_-]{3,70}$/.test(state.subscriptionId||''))
   return no('BLOCKED','original_bound_subscription_not_verified')
 if(!id.test(eventId||'')||!event||typeof event!=='object'||Array.isArray(event)||
    !id.test(event.id||''))
   return no('INCONCLUSIVE','webhook_event_reference_unavailable')
 if(event.id!==eventId||event.event_type!=='BILLING.SUBSCRIPTION.ACTIVATED')
   return no('MISMATCH','webhook_event_identity_or_type_mismatch')
 const resource=event.resource
 if(!resource||resource.id!==state.subscriptionId)
   return no('MISMATCH','activated_subscription_reference_mismatch')
 if(resource.plan_id!==undefined&&resource.plan_id!==state.plan)
   return no('MISMATCH','activated_plan_reference_mismatch')
 if(resource.custom_id!==undefined&&resource.custom_id!==state.intentId)
   return no('MISMATCH','activated_intent_reference_mismatch')
 // Webhook resource may be incomplete or a transient provider snapshot.
 // Even an explicit next billing date is not sale -> original cycle proof.
 const schedule=when(resource.billing_info?.next_billing_time)
 const snapshotStart=when(resource.start_time)
 const eventCreated=when(event.create_time)
 const validSchedule=schedule!==null&&eventCreated!==null&&
   Date.parse(schedule)>Date.parse(eventCreated)
 return Object.freeze({...BASE,
   phase:validSchedule?'HISTORICAL_SCHEDULE_CANDIDATE':'INCONCLUSIVE',
   reason:validSchedule?'provider_activation_snapshot_contains_future_billing_date_not_period_proof':
     'no_reliable_future_billing_date_at_activation',
   originalSubscriptionMatched:true,
   activatedEventTime:eventCreated,
   activationSubscriptionStart:snapshotStart,
   eventStatus:resource.status==='ACTIVE'?'ACTIVE':null,
   futureBillingDatePresent:validSchedule,
   observedNextBillingTime:validSchedule?schedule:null,
   activationEventHasIntentReference:typeof resource.custom_id==='string',
   source:'provider_webhook_event_read_operator_inbox_reference',
   saleCycleAllocationVerified:false,
 })
}
