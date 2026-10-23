import {publicBetaOrigin,validLiveApprovalUrl} from '../pazo-paypal-live-checkout/liveSubscriptionProvider.mjs'
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const INTENT=/^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const STATES=new Set(['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'])
const review=(code='live_recovery_requires_reconciliation')=>({ok:false,code})
// Recovery never selects a new intent, merchant, request key or consent.
// Binding and terminal closure do not write money, periods or entitlements.
export function createPazoLiveOwnerRecovery({getOriginalProvider,claimRecovery,
 finishRecovery,retireTerminal,abandonUnclaimed,readRecoveryReadiness,now=Date.now}={}){
 return async function recover({ownerId,original,action}={}){
  if(!UUID.test(ownerId||'')||!INTENT.test(original?.intentId||'')||
   !PLAN.test(original.planId||'')||!UUID.test(original.requestKey||'')||
   !Number.isSafeInteger(original.merchantGeneration)||original.merchantGeneration<1||
   original.closedAt!==null||!['pending','bound'].includes(original.state)||
   !['resume','reconcile','abandon'].includes(action))return review()
  const args={ownerId,intentId:original.intentId,merchantGeneration:original.merchantGeneration}
  if(action==='abandon'){
   if(original.state!=='pending'||original.providerCreateClaimedAt!==null||
    original.subscriptionId!==null||typeof abandonUnclaimed!=='function')return review()
   try{return await abandonUnclaimed(args)===true
    ?{ok:true,code:'live_checkout_slot_released'}:review()}catch{return review()}
  }
  if(typeof getOriginalProvider!=='function')return review()
  let provider,subscriptionId=original.subscriptionId,lease
  try{
   // No provider credentials are obtained for an unclaimed intent.
   if(original.state==='pending'){
    const claimedAt=Date.parse(original.providerCreateClaimedAt)
    const consentAt=Date.parse(original.createdAt)
    const at=now()
    if(action!=='resume'||original.subscriptionId!==null||
     !Number.isFinite(claimedAt)||!Number.isFinite(consentAt)||!Number.isFinite(at)||
     consentAt>claimedAt||claimedAt>at||at-consentAt>48*3600000||
     original.providerRequestVersion!=='pazo_subscription_create_v1'||
     !publicBetaOrigin(original.providerOrigin)||typeof claimRecovery!=='function'||
     typeof finishRecovery!=='function'||typeof readRecoveryReadiness!=='function'||
     await readRecoveryReadiness(args)!==true)return review()
    lease=await claimRecovery(args)
    if(lease?.source!=='private_original_live_create_recovery'||
     !UUID.test(lease.leaseToken||'')||lease.intentId!==original.intentId||
     lease.requestKey!==original.requestKey||lease.planId!==original.planId||
     lease.merchantGeneration!==original.merchantGeneration||
     lease.providerOrigin!==original.providerOrigin||
     lease.providerRequestVersion!==original.providerRequestVersion||
     Date.parse(lease.originalClaimedAt)!==claimedAt)return review()
   }else if(!SUB.test(subscriptionId||''))return review()
   provider=await getOriginalProvider({merchantGeneration:original.merchantGeneration,
    planId:original.planId,origin:original.providerOrigin})
   if(lease){
    const result=await provider.recoverOriginalCreate({intentId:original.intentId,
     requestKey:original.requestKey})
    subscriptionId=result?.subscriptionId
    if(!SUB.test(subscriptionId||''))return review()
   }
   const remote=await provider.readCheckout(subscriptionId)
   if(remote?.id!==subscriptionId||remote.plan_id!==original.planId||
    remote.custom_id!==original.intentId||!STATES.has(remote.status))return review()
   if(lease&&await finishRecovery({...args,leaseToken:lease.leaseToken,
    subscriptionId,planId:original.planId,requestKey:original.requestKey})!==true)return review()
   // "Continue" also finishes a previously cancelled or expired original
   // request. This matches Sandbox recover_retry: no extra hidden management
   // step, and no new CREATE until the private financial/event gate passes.
   if(action==='reconcile'||(action==='resume'&&
      ['CANCELLED','EXPIRED'].includes(remote.status))){
    if(!['CANCELLED','EXPIRED'].includes(remote.status)||typeof retireTerminal!=='function')
     return review('live_subscription_not_terminal')
    return await retireTerminal({...args,subscriptionId,providerStatus:remote.status})===true
     ?{ok:true,code:'live_checkout_slot_released'}:review('live_coverage_or_events_pending')
   }
   if(remote.status==='APPROVAL_PENDING'){
    if(!validLiveApprovalUrl(remote.approvalUrl))return review('live_approval_link_unavailable')
    return {ok:true,code:'live_original_approval_ready',approvalUrl:remote.approvalUrl}
   }
   return {ok:true,code:'live_original_subscription_verified',providerStatus:remote.status}
  }catch{return review()}
 }
}
