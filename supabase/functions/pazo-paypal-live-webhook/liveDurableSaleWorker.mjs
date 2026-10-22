// Private composition for one durable sale. A scheduler must authenticate,
// select a due inbox ID and check readiness before entering this module.
import {createPazoLiveSignedSaleClaim} from './liveSignedSaleClaim.mjs'
import {createPazoLiveObservedPeriodProof} from './liveObservedPeriodProof.mjs'
import {createPazoLiveLeasedSettlementWriter} from './liveVerifiedSettlementWriter.mjs'
import {createPazoLiveSettlementReconciliationGate} from './liveSettlementReconciliationGate.mjs'
const denied=code=>Object.freeze({state:'REVIEW_REQUIRED',code,paymentRecorded:false,entitlementGranted:false})
export function createPazoLiveDurableSaleWorker({released=false,lease,rpc,historical,verifyAcceptedConsent,now=Date.now}={}){
 if(released!==true)return async()=>denied('durable_sale_worker_not_released')
 if([rpc,lease?.claim,lease?.readSignedReceipt,lease?.finish,historical?.readerForGeneration,
  historical?.findBoundSubscription,historical?.eventReaderForGeneration,verifyAcceptedConsent,now]
  .some(f=>typeof f!=='function'))
  return async()=>denied('durable_sale_worker_not_configured')
 const claim=createPazoLiveSignedSaleClaim({released,lease,
  findOriginalBinding:historical.findBoundSubscription,eventReaderForGeneration:historical.eventReaderForGeneration})
 const prove=createPazoLiveObservedPeriodProof({rpc,readerForGeneration:historical.readerForGeneration,
  eventReaderForGeneration:historical.eventReaderForGeneration,verifyAcceptedConsent,now})
 const writer=createPazoLiveLeasedSettlementWriter({rpc})
 return async args=>{
  const current=await claim(args)
  if(current.state!=='CLAIMED')return current
  let sale,periodDecision,writeDecision
  const gate=createPazoLiveSettlementReconciliationGate({released:true,
   claimVerifiedEvent:async()=>current.event,findOriginalBinding:historical.findBoundSubscription,
   readerForGeneration:async generation=>{
    const reader=await historical.readerForGeneration(generation)
    return {readCompletedSale:async input=>{sale=await reader.readCompletedSale(input);return sale}}
   },
   proveOriginalServicePeriod:async()=>{
    periodDecision=await prove({binding:current.binding,event:current.event,lease:current.lease,sale})
    return periodDecision.ready?periodDecision.period:null
   },writer:{recordVerifiedSale:async proof=>{
    writeDecision=await writer.recordVerifiedSale({...proof,lease:current.lease});return writeDecision
   }}})
  const result=await gate({queueEventId:args.eventId})
  if(writeDecision?.leaseReleased===true)return writeDecision
  // Unknown write may already have committed. Never finish/retry on speculation.
  // The durable inbox/lease + idempotent SQL reply are the recovery authority.
  if(writeDecision?.outcomeUnknown===true)return writeDecision
  const code=periodDecision?.ready===false?periodDecision.code:result.code
  const retryable=periodDecision?.retryable===true||/unavailable|not_proven/.test(result.code||'')
  let leaseReleased=false
  try{leaseReleased=await lease.finish({merchantGeneration:args.merchantGeneration,eventId:args.eventId,
   leaseToken:current.lease.leaseToken,result:retryable?'pending':'held'})===true}catch{/* Expiry recovery. */}
  return Object.freeze({...denied(code),retryable,leaseReleased})
 }
}
