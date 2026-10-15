// PAZO F16-P05 — claim -> scoped merchant assessment -> fenced RETRY/REVIEW.
// OFFLINE CONTRACT ONLY: injectable mocks, NO hosted Supabase/PayPal calls.
// Cannot mark 'processed', credit a sale, grant benefits or derive paidThrough.
// The actual PayPal event -> subscription -> BOUND intent bridge is NOT wired.
const REF=/^[A-Za-z0-9._-]{3,128}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
// PostgreSQL jsonb_build_object(timestamptz) uses +00:00 and can retain
// microseconds; PayPal's ISO timestamps may instead end with Z.
const UTC=/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|\+00:00)$/
const isUtc=s=>typeof s==='string'&&UTC.test(s)&&Number.isFinite(Date.parse(s))&&
 new Date(s).toISOString().slice(0,19)===s.slice(0,19)
const exactly=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===keys.slice().sort().join('|')
const CLAIM=['eventId','eventType','verifiedAt','processingState','attemptCount',
 'leaseToken','leaseExpiresAt']
const READ=['id','type','verifiedAt','processingState']
const REVERSAL_TYPES=new Set(['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED',
 'CUSTOMER.DISPUTE.CREATED'])
const FAIL_TYPES=new Set(['BILLING.SUBSCRIPTION.PAYMENT.FAILED',
 'BILLING.SUBSCRIPTION.SUSPENDED','BILLING.SUBSCRIPTION.RE-ACTIVATED'])
const KNOWN_TYPES=new Set([...REVERSAL_TYPES,...FAIL_TYPES,
 'PAYMENT.SALE.COMPLETED','BILLING.SUBSCRIPTION.ACTIVATED',
 'BILLING.SUBSCRIPTION.CANCELLED'])
const mappings=Object.freeze({
 sale_correlated_candidate:['review','cycle_unproven'],
 reversal_signal:['review','reversal_possible'],
 foreign_reference:['review','foreign_reference'],
 insufficient_evidence:['review','missing_evidence'],
 retryable_outage:['retry','merchant_unavailable'],
 read_error:['retry','read_unavailable'],
 temporarily_incomplete:['retry','temporarily_incomplete'],
})
const SAFE=Object.freeze({
 environment:'sandbox',step:'f16_p05_offline_inbox_orchestration',
 sourceAttestedByThisCode:false,providerSignatureVerifiedByThisCode:false,
 cycleVerified:false,originalRegularCycleProven:false,
 mayRecordPayment:false,mayGrantBenefits:false,
 mayCreatePaidPeriod:false,mayEnableCheckout:false,
 financialHistoryComplete:false,periodStart:null,periodEnd:null,paidThrough:null,
 dbWrites:0,networkPaymentWrites:0,deployAuthorized:false,
})
const answer=(phase,reason,extra={})=>Object.freeze({...SAFE,phase,reason,...extra})
const wellClaim=c=>exactly(c,CLAIM)&&REF.test(c.eventId||'')&&
 KNOWN_TYPES.has(c.eventType)&&isUtc(c.verifiedAt)&&
 c.processingState==='processing'&&Number.isInteger(c.attemptCount)&&
 c.attemptCount>=1&&c.attemptCount<=5&&UUID.test(c.leaseToken||'')&&
 isUtc(c.leaseExpiresAt)
const wellRead=(e,c)=>exactly(e,READ)&&e.id===c.eventId&&
 e.type===c.eventType&&e.verifiedAt===c.verifiedAt&&
 e.processingState==='processing'
export function createP05OfflineInboxOrchestrator(adapters={}){
 const required=['claimNextVerifiedEvent','readClaimedEvent',
  'inspectMerchantEvidence','finishClaimedEvent']
 if(required.some(k=>typeof adapters[k]!=='function'))
  throw Error('p05_offline_worker_adapters_missing')
 return Object.freeze({
  async runOnce(){
   // Deliberately no parameters: never expose a buyer-selected event or sub ID.
   let claim
   try{claim=await adapters.claimNextVerifiedEvent()}
   catch{return answer('CLAIM_UNAVAILABLE','private_inbox_claim_unavailable')}
   if(claim===null)return answer('NO_CLAIM','inbox_idle_or_rollout_disabled')
   if(!wellClaim(claim))
    return answer('CLAIM_REJECTED','malformed_or_untrusted_claim_no_disposition')

   let disposition
   let read
   try{
    read=await adapters.readClaimedEvent({
     eventId:claim.eventId,claimToken:claim.leaseToken})
   }catch{
    disposition=['retry','read_unavailable']
   }
   if(!disposition&&!wellRead(read,claim))
    disposition=['review','missing_evidence']
   if(!disposition){
    if(REVERSAL_TYPES.has(claim.eventType))
     disposition=['review','reversal_possible']
    else if(FAIL_TYPES.has(claim.eventType))
     disposition=['review','cycle_unproven']
    else if(claim.eventType!=='PAYMENT.SALE.COMPLETED')
     disposition=['review','missing_evidence']
    else{
     try{
      // Internal service callback must itself resolve event -> merchant GET
      // -> subscription ID -> privately BOUND intent. THIS MODULE does not
      // authenticate it, and never promotes a 'match' to financial credit.
      const evidence=await adapters.inspectMerchantEvidence({
       eventId:claim.eventId,eventType:claim.eventType,
       claimToken:claim.leaseToken})
      disposition=exactly(evidence,['kind'])&&
       Object.hasOwn(mappings,evidence.kind)?
       mappings[evidence.kind]:['review','missing_evidence']
     }catch{disposition=['retry','merchant_unavailable']}
    }
   }
   const [outcome,reasonCode]=disposition
   let finalized=false
   try{
    finalized=await adapters.finishClaimedEvent({
     eventId:claim.eventId,claimToken:claim.leaseToken,
     outcome,reasonCode})===true
   }catch{
    return answer('FINISH_UNCONFIRMED','fenced_finish_unavailable')
   }
   if(!finalized)return answer('FINISH_UNCONFIRMED','stale_lease_or_rollout_disabled')
   // 'review' means quarantine, NOT 'processed'; retry returns pending.
   return answer(outcome==='retry'?'RETRY_REQUESTED':'REVIEW_REQUESTED',
    reasonCode,{dispositionConfirmed:true})
  },
 })
}
