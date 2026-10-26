// Private durable lease -> persisted signature receipt -> original PayPal GET.
// No HTTP intake, calendar period inference, financial write or benefit grant.
const REF=/^[A-Za-z0-9._-]{3,128}$/
const deny=(code,leaseReleased=false)=>Object.freeze({state:'REVIEW_REQUIRED',code,
 leaseReleased,paymentRecorded:false,entitlementGranted:false})
export function createPazoLiveSignedEventClaim({released=false,lease,
 findOriginalBinding,eventReaderForGeneration,findOriginalSaleBinding,
 eventTypes=['PAYMENT.SALE.COMPLETED']}={}){
 return async({merchantGeneration,eventId}={})=>{
  if(released!==true)return deny('signed_sale_claim_not_released')
  if(!Number.isSafeInteger(merchantGeneration)||merchantGeneration<1||merchantGeneration>9999||
   !REF.test(eventId||''))return deny('signed_sale_claim_invalid')
  if(typeof lease?.claim!=='function'||typeof lease?.finish!=='function'||
   typeof lease?.readSignedReceipt!=='function'||typeof findOriginalBinding!=='function'||
   typeof eventReaderForGeneration!=='function')return deny('signed_sale_claim_not_configured')
  let claimed
  try{claimed=await lease.claim({merchantGeneration,eventId})}
  catch{return deny('signed_sale_lease_unavailable')}
  if(claimed===null)return Object.freeze({state:'NOT_CLAIMED',paymentRecorded:false,entitlementGranted:false})
  const finish=async(code,result)=>{
   let released=false
   try{released=await lease.finish({merchantGeneration,eventId,leaseToken:claimed.leaseToken,result})===true}catch{/* Unknown: durable expiry recovery. */}
   return Object.freeze({...deny(code,released),retryable:result==='pending'&&released})
  }
  if(claimed?.eventId!==eventId||claimed.merchantGeneration!==merchantGeneration||
   !eventTypes.includes(claimed.eventType)||claimed.provider!=='paypal'||
   claimed.sourceEnvironment!=='live'||claimed.claimed!==true)
   return finish('signed_sale_claim_mismatch','held')
  let receipt,binding
  try{
   receipt=await lease.readSignedReceipt({merchantGeneration,eventId,leaseToken:claimed.leaseToken})
   if(receipt?.signatureVerified!==true||receipt.proofSource!=='paypal_live_postback_success'||
    !/^[a-f0-9]{64}$/.test(receipt.signedBodySha256||'')||receipt.eventId!==eventId||
    receipt.eventType!==claimed.eventType||receipt.merchantGeneration!==merchantGeneration)
    return finish('persisted_signed_sale_receipt_required','held')
   binding=await findOriginalBinding({subscriptionId:receipt.subscriptionId})
  }catch{return finish('signed_sale_metadata_unavailable','pending')}
  if(binding?.provider!=='paypal'||binding.sourceEnvironment!=='live'||
   binding.subscriptionId!==receipt.subscriptionId||binding.merchantGeneration!==merchantGeneration||
   binding.ownerId!==claimed.ownerId||binding.intentId!==claimed.intentId||
   binding.state!=='bound'||binding.consentVerified!==true)
   return finish('signed_sale_original_binding_mismatch','held')
  let provider
  try{
   const lookup=await eventReaderForGeneration({merchantGeneration,sourceEnvironment:'live'})
   provider=await lookup({eventId,eventType:claimed.eventType,expectedGeneration:merchantGeneration})
  }catch{return finish('signed_sale_provider_event_unavailable','pending')}
  const refund=['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED'].includes(claimed.eventType)
  const saleId=refund?(provider?.saleId||provider?.subjectId):receipt.subjectId
  let originalSale=null
  if(refund){
   try{originalSale=await findOriginalSaleBinding?.({merchantGeneration,saleId})}
   catch{return finish('refund_original_sale_temporarily_unavailable','pending')}
   if(originalSale?.recorded!==true||originalSale.provider!=='paypal'||originalSale.sourceEnvironment!=='live'||
    originalSale.merchantGeneration!==merchantGeneration||originalSale.saleId!==saleId||
    originalSale.subscriptionId!==receipt.subscriptionId||originalSale.ownerId!==claimed.ownerId||
    originalSale.intentId!==claimed.intentId||!Number.isFinite(Date.parse(originalSale.originalPaymentAt)))
    return finish('refund_original_sale_scope_required','pending')
  }
  const subscriptionMatches=provider?.subscriptionId===receipt.subscriptionId||
   (refund&&provider?.subscriptionId===null&&originalSale?.subscriptionId===receipt.subscriptionId)
  if(provider?.verifiedProviderRead!==true||provider.sourceEnvironment!=='live'||provider.provider!=='paypal'||
   provider.eventId!==eventId||provider.eventType!==claimed.eventType||
   provider.merchantGeneration!==merchantGeneration||provider.subjectId!==receipt.subjectId||
   !subscriptionMatches||provider.subjectAt!==receipt.subjectAt||
   !Number.isFinite(Date.parse(provider.providerEventAt))||
   new Date(provider.providerEventAt).toISOString()!==receipt.providerEventAt)
   return finish('signed_sale_provider_event_mismatch','held')
  // This is a retrieval window from a persisted signed timestamp, not a service period.
  const at=Date.parse(refund?originalSale.originalPaymentAt:receipt.subjectAt)
  if(!Number.isFinite(at))return finish('signed_sale_timestamp_unavailable','held')
  return Object.freeze({state:'CLAIMED',lease:claimed,
   binding:Object.freeze({...binding,ownerVerified:binding.consentVerified,
    merchantGenerationVerified:provider.merchantGeneration===binding.merchantGeneration}),
   event:Object.freeze({claimed:true,eventId,eventType:claimed.eventType,
    provider:'paypal',sourceEnvironment:'live',merchantGeneration,
    signatureVerified:receipt.signatureVerified,signatureProofSource:receipt.proofSource,
    subscriptionId:receipt.subscriptionId,saleId,
    subjectId:receipt.subjectId,subjectAt:receipt.subjectAt,providerEventAt:receipt.providerEventAt,
    searchStart:new Date(at-2*86400000).toISOString(),searchEnd:new Date(at+2*86400000).toISOString()}),
   ...(originalSale?{originalSale}:{}),paymentRecorded:false,entitlementGranted:false})
 }
}

export function createPazoLiveSignedSaleClaim(options={}){
 return createPazoLiveSignedEventClaim({...options,eventTypes:['PAYMENT.SALE.COMPLETED']})
}
