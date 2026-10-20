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
