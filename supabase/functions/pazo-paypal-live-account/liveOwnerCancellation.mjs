// PAZO F16: one-shot voluntary Live cancellation, original merchant only.
// The owner's request does not prove a cancellation. Only independent PayPal
// GET confirming CANCELLED permits acknowledgement or a confirmed DB claim.
// Never touches paid periods, cashback, charges or badge entitlements.
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const INTENT=/^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const VALID_STATUS=new Set(['ACTIVE','SUSPENDED','CANCELLED',
 'EXPIRED','APPROVAL_PENDING','APPROVED'])
const review=(code='live_cancel_requires_reconciliation')=>({
 confirmed:false,code,providerStatus:null
})
const verified=(remote,original)=>{
 if(!remote||remote.id!==original.subscriptionId||
  remote.plan_id!==original.planId||remote.custom_id!==original.intentId||
  !VALID_STATUS.has(remote.status))return null
 return remote.status
}
export function createPazoLiveOwnerCancellation({
 readProviderStatus,claimCancel,finishCancel,postCancel,
 allowPendingApproval=false
}={}){
 return async function cancel({ownerId,original}={}){
  if(typeof ownerId!=='string'||!original||
   !INTENT.test(original.intentId||'')||!SUB.test(original.subscriptionId||'')||
   !PLAN.test(original.planId||'')||
   !Number.isSafeInteger(original.merchantGeneration)||
   original.merchantGeneration<1||original.merchantGeneration>9999||
   ![null,'claimed','confirmed','review_required'].includes(original.cancelState)||
   typeof readProviderStatus!=='function'||typeof claimCancel!=='function'||
   typeof finishCancel!=='function'||typeof postCancel!=='function')
   return review('live_cancel_unavailable')
  const args={ownerId,intentId:original.intentId,
   merchantGeneration:original.merchantGeneration}
  const providerArgs={merchantGeneration:original.merchantGeneration,
   planId:original.planId,intentId:original.intentId,
   subscriptionId:original.subscriptionId}
  const read=async()=>{
   try{return verified(await readProviderStatus(providerArgs),original)}
   catch{return null}
  }
  let status=await read()
  if(status===null)return review('live_cancel_provider_unavailable')
  if(status==='CANCELLED'){
   if(['claimed','review_required'].includes(original.cancelState)){
    let finished=false
    try{finished=(await finishCancel({...args,outcome:'confirmed'}))===true}
    catch{return review()}
    if(!finished)return review()
   }
   return {confirmed:true,code:'future_renewals_cancelled',
    providerStatus:'CANCELLED'}
  }
  // A buyer may close an unapproved request only through an explicit,
  // isolated owner confirmation. Ordinary cancellation stays ACTIVE/SUSPENDED.
  if(allowPendingApproval===true ? status!=='APPROVAL_PENDING' :
     status!=='ACTIVE'&&status!=='SUSPENDED')
   return review('live_cancel_not_available')
  // A previous cancellation can have reached PayPal even if PAZO timed out.
  // Never issue another POST after claimed, review_required or confirmed.
  if(original.cancelState!==null)return review()
  let claimed=false
  try{claimed=(await claimCancel(args))===true}catch{return review()}
  if(!claimed)return review()
  // Exactly one call. A timeout/204 is never a final outcome by itself.
  try{await postCancel(providerArgs)}catch{/* independent GET decides */}
  status=await read()
  if(status!=='CANCELLED'){
   try{await finishCancel({...args,outcome:'review_required'})}catch{}
   return review()
  }
  try{
   const finished=await finishCancel({...args,outcome:'confirmed'})
   if(finished!==true)return review()
  }catch{return review()}
  return {confirmed:true,code:'future_renewals_cancelled',
   providerStatus:'CANCELLED'}
 }
}
