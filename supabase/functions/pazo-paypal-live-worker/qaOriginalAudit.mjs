import {canonicalPaypalInstant} from '../pazo-paypal-live-webhook/liveBillingSnapshot.mjs'
// Scope comes only from service SQL: a single bound prebeta canary contract.
// No provider ID, owner, payer, URL, token or credentials leave this adapter.
export function createOriginalQaAudit({rpc,historical,scopeVariant='prebeta'}={}){
 if(!['prebeta','admin_postcampaign'].includes(scopeVariant))
  throw Error('invalid_original_audit_scope_variant')
 const rpcAction=scopeVariant==='prebeta'?'qaOriginalScope':'adminOriginalScope'
 const expectedSource=scopeVariant==='prebeta'?
  'original_prebeta_qa_scope_v1':'original_admin_postcampaign_scope_v1'
 return async()=>{
  let stage='scope_read',signedEventMatches=null,eventReadable=false
  let eventReadStage='not_attempted'
  try{
  const scope=await rpc(rpcAction,{})
  if(scope===null)return {source:'original_qa_provider_audit_v1',code:'no_original_qa_contract',mayCreate:false,mayCancel:false,mayGrantBenefits:false}
  if(scope?.source!==expectedSource||scope.sourceEnvironment!=='live')throw Error('qa_scope_unavailable')
  stage='binding_read'
  const binding=await historical.findBoundSubscription({subscriptionId:scope.subscriptionId})
  if(binding?.ownerId!==scope.ownerId||binding.intentId!==scope.intentId||binding.planId!==scope.planId||
   binding.merchantGeneration!==scope.merchantGeneration||binding.consentVerified!==true)throw Error('qa_original_binding_unverified')
  stage='generation_reader'
  const reader=await historical.readerForGeneration({merchantGeneration:scope.merchantGeneration,sourceEnvironment:'live'})
  stage='provider_read'
  let audit,providerError
  try{audit=await reader.readOriginalQaAudit({...scope,expectedGeneration:scope.merchantGeneration})}catch(error){providerError=error}
  if(scope.event){
   try{
    eventReadStage='reader'
    const lookup=await historical.eventReaderForGeneration({merchantGeneration:scope.merchantGeneration,sourceEnvironment:'live'})
    eventReadStage='provider_get'
    const event=await lookup({eventId:scope.event.eventId,eventType:scope.event.type,expectedGeneration:scope.merchantGeneration})
    eventReadable=true
    signedEventMatches=event.verifiedProviderRead===true&&event.subscriptionId===scope.subscriptionId&&
     event.subjectId===scope.event.subjectId&&canonicalPaypalInstant(event.providerEventAt)===scope.event.providerEventAt&&
     canonicalPaypalInstant(event.subjectAt)===scope.event.subjectAt
    eventReadStage=signedEventMatches?'verified':'mismatch'
   }catch{eventReadStage=eventReadStage==='reader'?
    'reader_unavailable':'provider_unavailable'}
  }else{eventReadStage='event_absent'}
  if(providerError)throw providerError
  return {...audit,complete:signedEventMatches===true,eventReadable,signedEventMatches,eventReadStage,
   ...(signedEventMatches!==true?{code:'qa_signed_event_unverified'}:{})}
  }catch(error){
   const phases=new Set(['input','oauth','subscription_get','binding','create_time','plan_get','plan_terms','transactions_get','transactions_shape','pagination','transaction_coverage'])
   const detail=stage==='provider_read'&&phases.has(error?.qaStage)?'_'+error.qaStage:''
   return {source:'original_qa_provider_audit_v1',complete:false,code:'qa_'+stage+detail+'_unavailable',
    originalPlanVerified:error?.originalPlanVerified===true,eventReadable,signedEventMatches,eventReadStage,
    providerHttpStatus:Number.isInteger(error?.providerHttpStatus)&&error.providerHttpStatus>=100&&error.providerHttpStatus<=599?error.providerHttpStatus:null,
    providerErrorName:new Set(['RESOURCE_NOT_FOUND','NOT_AUTHORIZED','PERMISSION_DENIED','INVALID_RESOURCE_ID','AUTHENTICATION_FAILURE','INTERNAL_SERVER_ERROR','UNPROCESSABLE_ENTITY','INVALID_REQUEST']).has(error?.providerErrorName)?error.providerErrorName:null,
    providerDebugId:typeof error?.providerDebugId==='string'&&/^[a-f0-9]{8,32}$/.test(error.providerDebugId)?error.providerDebugId:null,
    providerFailure:new Set(['network','http','content_type','body','json','object']).has(error?.providerFailure)?error.providerFailure:null,
    mayCreate:false,mayCancel:false,mayGrantBenefits:false}
  }
 }
}
