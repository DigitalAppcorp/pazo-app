import {canonicalPaypalInstant} from '../pazo-paypal-live-webhook/liveBillingSnapshot.mjs'
// Scope comes only from service SQL: a single bound prebeta canary contract.
// No provider ID, owner, payer, URL, token or credentials leave this adapter.
export function createOriginalQaAudit({rpc,historical}={}){
 return async()=>{
  let stage='scope_read'
  try{
  const scope=await rpc('qaOriginalScope',{})
  if(scope===null)return {source:'original_qa_provider_audit_v1',code:'no_original_qa_contract',mayCreate:false,mayCancel:false,mayGrantBenefits:false}
  if(scope?.source!=='original_prebeta_qa_scope_v1'||scope.sourceEnvironment!=='live')throw Error('qa_scope_unavailable')
  stage='binding_read'
  const binding=await historical.findBoundSubscription({subscriptionId:scope.subscriptionId})
  if(binding?.ownerId!==scope.ownerId||binding.intentId!==scope.intentId||binding.planId!==scope.planId||
   binding.merchantGeneration!==scope.merchantGeneration||binding.consentVerified!==true)throw Error('qa_original_binding_unverified')
  stage='generation_reader'
  const reader=await historical.readerForGeneration({merchantGeneration:scope.merchantGeneration,sourceEnvironment:'live'})
  stage='provider_read'
  const audit=await reader.readOriginalQaAudit({...scope,expectedGeneration:scope.merchantGeneration})
  let signedEventMatches=null
  stage='signed_event_read'
  if(scope.event){
   const lookup=await historical.eventReaderForGeneration({merchantGeneration:scope.merchantGeneration,sourceEnvironment:'live'})
   const event=await lookup({eventId:scope.event.eventId,eventType:scope.event.type,expectedGeneration:scope.merchantGeneration})
   signedEventMatches=event.verifiedProviderRead===true&&event.subscriptionId===scope.subscriptionId&&
    event.subjectId===scope.event.subjectId&&canonicalPaypalInstant(event.providerEventAt)===scope.event.providerEventAt&&
    canonicalPaypalInstant(event.subjectAt)===scope.event.subjectAt
  }
  return {...audit,complete:true,signedEventMatches}
  }catch(error){
   const phases=new Set(['input','oauth','subscription_get','binding','create_time','plan_get','plan_terms','transactions_get','transactions_shape','pagination','transaction_coverage'])
   const detail=stage==='provider_read'&&phases.has(error?.qaStage)?'_'+error.qaStage:''
   return {source:'original_qa_provider_audit_v1',complete:false,code:'qa_'+stage+detail+'_unavailable',mayCreate:false,mayCancel:false,mayGrantBenefits:false}
  }
 }
}
