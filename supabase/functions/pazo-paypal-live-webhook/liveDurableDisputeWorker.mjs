import {canonicalPaypalInstant} from './liveBillingSnapshot.mjs'
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const denied=code=>Object.freeze({state:'REVIEW_REQUIRED',code,entitlementGranted:false,paymentRecorded:false})
export function createPazoLiveDurableDisputeWorker({released=false,rpc,historical}={}){
 if(released!==true||[rpc,historical?.findBoundSubscription,historical?.readerForGeneration].some(f=>typeof f!=='function'))
  return async()=>denied('dispute_worker_unavailable')
 return async({batchLease}={})=>{
  if(!uuid.test(batchLease||''))return denied('dispute_batch_unverified')
  let c
  try{c=await rpc('disputeClaim',{p_batch:batchLease})}catch{return denied('dispute_claim_unavailable')}
  if(c===null)return Object.freeze({state:'NOT_CLAIMED',leaseReleased:true})
  if(c?.state==='REVIEW_REQUIRED'&&c.code==='dispute_signed_sale_missing')return denied(c.code)
  if(c?.source!=='private_original_live_dispute_claim'||!uuid.test(c.leaseToken||'')||
   !Number.isSafeInteger(c.merchantGeneration)||c.merchantGeneration<1||c.merchantGeneration>9999||
   !/^[0-9A-Z_]{1,128}$/.test(c.saleId||'')||!/^I-[A-Za-z0-9_-]{3,70}$/.test(c.subscriptionId||'')||
   !/^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(c.intentId||'')||
   !/^P-[A-Z0-9]{12,40}$/.test(c.planId||'')||!canonicalPaypalInstant(c.originalPaymentAt)||
   !Array.isArray(c.knownDisputeIds)||c.knownDisputeIds.length>20||c.knownDisputeIds.some(id=>!/^[A-Za-z0-9-]{3,100}$/.test(id||'')))
   return denied('dispute_original_claim_invalid')
  let evidence=null
  try{
   const binding=await historical.findBoundSubscription({subscriptionId:c.subscriptionId})
   if(binding?.provider!=='paypal'||binding.sourceEnvironment!=='live'||binding.state!=='bound'||
    binding.consentVerified!==true||binding.intentId!==c.intentId||binding.merchantGeneration!==c.merchantGeneration||
    binding.planId!==c.planId||binding.subscriptionId!==c.subscriptionId)throw Error('binding')
   const reader=await historical.readerForGeneration({merchantGeneration:c.merchantGeneration,sourceEnvironment:'live'})
   const at=Date.parse(c.originalPaymentAt)
   evidence=await reader.readSaleDisputes({subscriptionId:c.subscriptionId,intentId:c.intentId,saleId:c.saleId,
    expectedGeneration:c.merchantGeneration,knownDisputeIds:c.knownDisputeIds,
    startTime:new Date(at-86400000).toISOString(),endTime:new Date(at+86400000).toISOString()})
   if(evidence?.verified!==true||evidence.coverageComplete!==true||evidence.saleId!==c.saleId||
    evidence.originalPaymentAt!==c.originalPaymentAt||!Array.isArray(evidence.cases))evidence=null
  }catch{evidence=null} // Unavailable is recorded for bounded retry, never absence.
  let written
  try{written=await rpc('disputeFinish',{p_batch:batchLease,p_sale:c.saleId,p_lease:c.leaseToken,p_evidence:evidence})}
  catch{return Object.freeze({...denied('dispute_write_outcome_unknown'),outcomeUnknown:true})}
  if(!['recorded','already_recorded'].includes(written))return denied('dispute_evidence_requires_review')
  const monitorOutcome=evidence===null?'unavailable':evidence.cases.some(d=>d.decision==='hold')?'held':
   evidence.cases.some(d=>d.decision==='review')?'review':'clear'
  return Object.freeze({state:written==='recorded'?'RECORDED':'ALREADY_RECORDED',leaseReleased:true,
   monitorOutcome,entitlementGranted:false,paymentRecorded:false})
 }
}
