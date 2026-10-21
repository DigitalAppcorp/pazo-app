// F16: SQL persistence for externally verified Live settlement evidence.
// No PayPal API calls, automatic entitlement grants, or guessed billing dates.
// The independent provider verifier must produce the trusted inputs upstream.
// The database enforces original binding, signed inbox event and period overlap.
import {
 assessPazoLiveVerifiedSale,assessPazoLiveVerifiedReversal
} from './liveVerifiedSettlement.mjs'

const fail=code=>Object.freeze({
 state:'REVIEW_REQUIRED',code,entitlementGranted:false,paymentRecorded:false
})

export function createPazoLiveVerifiedSettlementWriter({rpc}={}){
 if(typeof rpc!=='function')throw Error('live_settlement_backend_not_ready')

 async function write(operation,proof){
  if(proof?.ready!==true||proof.mayGrantBenefits!==false||!proof.record)
   return fail('independent_provider_evidence_required')
  let result
  try{result=await rpc(operation,proof.record)}
  catch{return fail('ledger_write_outcome_unknown')}
  if(result==='recorded')return Object.freeze({
   state:'RECORDED',code:'verified_financial_record_persisted',
   entitlementGranted:false,paymentRecorded:operation==='recordSale'
  })
  if(result==='already_recorded')return Object.freeze({
   state:'ALREADY_RECORDED',code:'verified_financial_record_idempotent',
   entitlementGranted:false,paymentRecorded:false
  })
  return fail('ledger_reconciliation_required')
 }
 return Object.freeze({
  async recordVerifiedSale({binding,receipt,period}={}){
   return write('recordSale',assessPazoLiveVerifiedSale({
    binding,receipt,period
   }))
  },
  async recordVerifiedReversal({binding,receipt}={}){
   return write('recordRefund',assessPazoLiveVerifiedReversal({
    binding,receipt
   }))
  }
 })
}

// Production worker writer. The lease and financial row commit in ONE SQL
// transaction; there is no second finish request after a successful write.
// An unknown HTTP outcome leaves recovery to persisted state, never a second
// payment or a guessed acknowledgement. Old non-leased bridges are revoked.
export function createPazoLiveLeasedSettlementWriter({rpc}={}){
 if(typeof rpc!=='function')throw Error('live_settlement_backend_not_ready')
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
 const run=async(operation,proof,lease)=>{
  if(proof?.ready!==true||!proof.record||lease?.claimed!==true||
   !uuid.test(lease.leaseToken||'')||lease.eventId!==proof.record.p_event_id||
   lease.ownerId!==proof.record.p_owner||lease.intentId!==proof.record.p_intent||
   lease.merchantGeneration!==proof.record.p_generation||
   lease.sourceEnvironment!=='live'||lease.provider!=='paypal')
   return Object.freeze({...fail('current_signed_lease_required'),leaseReleased:false})
  let result
  try{result=await rpc(operation,{...proof.record,p_lease:lease.leaseToken})}
  catch{return Object.freeze({...fail('leased_write_outcome_unknown'),leaseReleased:false,outcomeUnknown:true})}
  if(!['recorded','already_recorded'].includes(result))
   return Object.freeze({...fail('leased_write_requires_review'),leaseReleased:false})
  return Object.freeze({state:result==='recorded'?'RECORDED':'ALREADY_RECORDED',
   code:'verified_financial_record_and_lease_committed',leaseReleased:true,
   paymentRecorded:operation==='leasedSale'&&result==='recorded',
   refundRecorded:operation==='leasedRefund'&&result==='recorded',entitlementGranted:false})
 }
 return Object.freeze({
  recordVerifiedSale:({binding,receipt,period,lease}={})=>run('leasedSale',
   assessPazoLiveVerifiedSale({binding,receipt,period}),lease),
  recordVerifiedReversal:({binding,receipt,lease}={})=>run('leasedRefund',
   assessPazoLiveVerifiedReversal({binding,receipt}),lease)
 })
}
