import {createPazoLiveSignedEventClaim} from './liveSignedSaleClaim.mjs'
import {canonicalPaypalInstant} from './liveBillingSnapshot.mjs'
const types=['BILLING.SUBSCRIPTION.CREATED','BILLING.SUBSCRIPTION.ACTIVATED','BILLING.SUBSCRIPTION.UPDATED',
 'BILLING.SUBSCRIPTION.CANCELLED','BILLING.SUBSCRIPTION.SUSPENDED','BILLING.SUBSCRIPTION.EXPIRED','BILLING.SUBSCRIPTION.PAYMENT.FAILED']
const deny=code=>Object.freeze({state:'REVIEW_REQUIRED',code,paymentRecorded:false,entitlementGranted:false})
export function createPazoLiveDurableLifecycleWorker({released=false,lease,rpc,historical}={}){
 if(released!==true)return async()=>deny('lifecycle_worker_not_released')
 if([rpc,lease?.claim,lease?.readSignedReceipt,lease?.finish,historical?.findBoundSubscription,
  historical?.readerForGeneration,historical?.eventReaderForGeneration].some(f=>typeof f!=='function'))
  return async()=>deny('lifecycle_worker_not_configured')
 const claim=createPazoLiveSignedEventClaim({released,lease,eventTypes:types,
  findOriginalBinding:historical.findBoundSubscription,eventReaderForGeneration:historical.eventReaderForGeneration})
 return async args=>{
  const current=await claim(args)
  if(current.state!=='CLAIMED')return current
  const fail=async(code,retryable)=>{
   let leaseReleased=false
   try{leaseReleased=await lease.finish({merchantGeneration:args.merchantGeneration,eventId:args.eventId,
    leaseToken:current.lease.leaseToken,result:retryable?'pending':'held'})===true}catch{/* Durable expiry. */}
   return Object.freeze({...deny(code),retryable,leaseReleased})
  }
  let subscription
  try{
   const reader=await historical.readerForGeneration({merchantGeneration:args.merchantGeneration,sourceEnvironment:'live'})
   subscription=await reader.readVerifiedSubscription({subscriptionId:current.binding.subscriptionId,
    intentId:current.binding.intentId,expectedGeneration:args.merchantGeneration})
  }catch{return fail('lifecycle_original_provider_temporarily_unavailable',true)}
  if(subscription?.id!==current.binding.subscriptionId||subscription.plan_id!==current.binding.planId||
   subscription.custom_id!==current.binding.intentId||subscription.merchantGeneration!==args.merchantGeneration||
   subscription.sourceEnvironment!=='live'||!canonicalPaypalInstant(subscription.statusUpdatedAt)||
   !['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'].includes(subscription.status))
   return fail('lifecycle_original_status_unverified',false)
  let result
  try{result=await rpc('leasedLifecycle',{p_generation:args.merchantGeneration,p_event_id:args.eventId,
   p_lease:current.lease.leaseToken,p_status:subscription.status,p_status_at:subscription.statusUpdatedAt})}
  catch{return Object.freeze({...deny('lifecycle_commit_outcome_unknown'),outcomeUnknown:true,leaseReleased:false})}
  if(!['recorded','already_recorded'].includes(result))return fail('lifecycle_commit_requires_review',false)
  return Object.freeze({state:result==='recorded'?'RECORDED':'ALREADY_RECORDED',code:'lifecycle_record_and_lease_committed',
   leaseReleased:true,paymentRecorded:false,entitlementGranted:false,paidCoverageChanged:false})
 }
}
