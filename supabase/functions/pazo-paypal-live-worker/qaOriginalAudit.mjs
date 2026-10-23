import {canonicalPaypalInstant} from '../pazo-paypal-live-webhook/liveBillingSnapshot.mjs'
// Scope comes only from service SQL: a single bound prebeta canary contract.
// No provider ID, owner, payer, URL, token or credentials leave this adapter.
export function createOriginalQaAudit({rpc,historical}={}){
 return async()=>{
  const scope=await rpc('qaOriginalScope',{})
  if(scope===null)return {source:'original_qa_provider_audit_v1',code:'no_original_qa_contract',mayCreate:false,mayCancel:false,mayGrantBenefits:false}
  if(scope?.source!=='original_prebeta_qa_scope_v1'||scope.sourceEnvironment!=='live')throw Error('qa_scope_unavailable')
  const binding=await historical.findBoundSubscription({subscriptionId:scope.subscriptionId})
  if(binding?.ownerId!==scope.ownerId||binding.intentId!==scope.intentId||binding.planId!==scope.planId||
   binding.merchantGeneration!==scope.merchantGeneration||binding.consentVerified!==true)throw Error('qa_original_binding_unverified')
  const reader=await historical.readerForGeneration({merchantGeneration:scope.merchantGeneration,sourceEnvironment:'live'})
  const audit=await reader.readOriginalQaAudit({...scope,expectedGeneration:scope.merchantGeneration})
  let signedEventMatches=null
  if(scope.event){
   const lookup=await historical.eventReaderForGeneration({merchantGeneration:scope.merchantGeneration,sourceEnvironment:'live'})
   const event=await lookup({eventId:scope.event.eventId,eventType:scope.event.type,expectedGeneration:scope.merchantGeneration})
   signedEventMatches=event.verifiedProviderRead===true&&event.subscriptionId===scope.subscriptionId&&
    event.subjectId===scope.event.subjectId&&canonicalPaypalInstant(event.providerEventAt)===scope.event.providerEventAt&&
    canonicalPaypalInstant(event.subjectAt)===scope.event.subjectAt
  }
  return {...audit,signedEventMatches}
 }
}
