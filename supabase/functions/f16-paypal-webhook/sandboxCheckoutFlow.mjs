// PAZO F16 sandbox checkout ORCHESTRATOR (NOT DEPLOYED).
// Deliberately not an HTTP endpoint: request deduplication, Auth lifecycle,
// rate limits, provider errors and pending-intent retention must be settled
// before it can be safely offered to real users.
// Never sets supporter entitlements, founder status, or paid coverage.
export function createSandboxCheckoutFlow({
 resolveOwnerFromVerifiedSession,intentStore,providerCreator,ownerVerifier,
}={}) {
 if(typeof resolveOwnerFromVerifiedSession!=='function' ||
   typeof intentStore?.createForVerifiedOwner!=='function' ||
   typeof intentStore?.bindVerified!=='function' ||
   typeof providerCreator?.create!=='function' ||
   typeof ownerVerifier!=='function')throw Error('sandbox_checkout_not_configured')
 return {
  async prepare({request}={}){
    if(!(request instanceof Request))return {ok:false,reason:'invalid_request'}
    const ownerId=await resolveOwnerFromVerifiedSession(request)
    if(!ownerId)return {ok:false,reason:'unauthenticated'}
    // A future durable (ownerId, idempotency-key) constraint is REQUIRED prior
    // to deployment to prevent multiple orphaned intents on retries.
    const intent=await intentStore.createForVerifiedOwner(ownerId)
    const approval=await providerCreator.create({intent})
    return Object.freeze({
      ok:true,entitlement:false,state:'approval_pending',
      intentId:intent.id,subscriptionId:approval.subscriptionId,
      approvalUrl:approval.approvalUrl,
    })
  },
  async confirm({request,intentId,subscriptionId}={}){
    if(!(request instanceof Request))return {ok:false,reason:'invalid_request'}
    const candidate=await ownerVerifier({request,intentId,subscriptionId})
    if(candidate?.readyToBind!==true || candidate.entitlement!==false)
      return {ok:false,reason:'verification_rejected',entitlement:false}
    const result=await intentStore.bindVerified(candidate.binding)
    return Object.freeze({
      ok:true,entitlement:false,state:'linked_unpaid',
      bindingResult:result.result,
    })
  },
 }
}
