import {createPazoLiveSignedEventClaim} from './liveSignedSaleClaim.mjs'
import {createPazoLiveRefundReconciliationGate} from './liveRefundReconciliationGate.mjs'
import {createPazoLiveLeasedSettlementWriter} from './liveVerifiedSettlementWriter.mjs'
const types=['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED']
const deny=code=>Object.freeze({state:'REVIEW_REQUIRED',code,refundRecorded:false,paymentRecorded:false,entitlementGranted:false})
export function createPazoLiveDurableRefundWorker({released=false,lease,rpc,historical}={}){
 if(released!==true)return async()=>deny('durable_refund_worker_not_released')
 if([rpc,lease?.claim,lease?.readSignedReceipt,lease?.finish,historical?.findBoundSubscription,
  historical?.findOriginalSaleBinding,historical?.readerForGeneration,historical?.eventReaderForGeneration]
  .some(f=>typeof f!=='function'))return async()=>deny('durable_refund_worker_not_configured')
 const claim=createPazoLiveSignedEventClaim({released,lease,eventTypes:types,
  findOriginalBinding:historical.findBoundSubscription,eventReaderForGeneration:historical.eventReaderForGeneration,
  findOriginalSaleBinding:historical.findOriginalSaleBinding})
 const writer=createPazoLiveLeasedSettlementWriter({rpc})
 return async args=>{
  const current=await claim(args)
  if(current.state!=='CLAIMED')return current
  let writeDecision
  const gate=createPazoLiveRefundReconciliationGate({released:true,
   claimVerifiedEvent:async()=>current.event,findOriginalBinding:historical.findBoundSubscription,
   findRecordedSale:async()=>current.originalSale,readerForGeneration:historical.readerForGeneration,
   writer:{recordVerifiedReversal:async proof=>{
    writeDecision=await writer.recordVerifiedReversal({...proof,lease:current.lease});return writeDecision
   }}})
  const result=await gate({queueEventId:args.eventId})
  if(writeDecision?.leaseReleased===true||writeDecision?.outcomeUnknown===true)return writeDecision
  const retryable=/unavailable/.test(result.code||'')
  let leaseReleased=false
  try{leaseReleased=await lease.finish({merchantGeneration:args.merchantGeneration,eventId:args.eventId,
   leaseToken:current.lease.leaseToken,result:retryable?'pending':'held'})===true}catch{/* Durable expiry. */}
  return Object.freeze({...result,retryable,leaseReleased})
 }
}
