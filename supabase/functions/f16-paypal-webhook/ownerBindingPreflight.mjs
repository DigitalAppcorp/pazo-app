// PAZO F16: fail-closed, READ-ONLY owner/subscription binding preflight.
// NOT an API endpoint or entitlement. Injected adapters MUST be trusted backend
// sources: Auth getUser(session), private DB intent and PayPal merchant API.
// No ownerId, custom_id, plan or provider payload from the browser is trusted.
const PLAN='P-14V25407JP6850922NLHMDKI'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[A-Za-z0-9_-]{12,90}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const deny=(reason)=>({readyToBind:false,entitlement:false,reason})
export function createF16OwnerBindingPreflight({
 resolveOwnerFromVerifiedSession,loadPrivateIntent,readPayPalSubscription,
}={}) {
 if(typeof resolveOwnerFromVerifiedSession!=='function' ||
    typeof loadPrivateIntent!=='function' ||
    typeof readPayPalSubscription!=='function')
    throw Error('owner_binding_not_configured')
 return {
  async inspect({requestContext,intentId,subscriptionId}={}) {
   if(!INTENT.test(intentId||'') || !SUB.test(subscriptionId||''))
     return deny('invalid_reference')
   // This must validate the Auth JWT on the server (auth.getUser), not
   // decode unverified claims, user_metadata, or browser-provided owner ID.
   const ownerId=await resolveOwnerFromVerifiedSession(requestContext)
   if(typeof ownerId!=='string' || !UUID.test(ownerId))
     return deny('unauthenticated')
   const intent=await loadPrivateIntent(intentId)
   if(!intent || intent.id!==intentId || intent.ownerId!==ownerId ||
      intent.provider!=='paypal' || intent.planId!==PLAN ||
      (intent.state!=='pending' && intent.state!=='bound'))
     return deny('owner_intent_mismatch')
   if(intent.state==='bound' && intent.externalSubscriptionId!==subscriptionId)
     return deny('already_bound_different_subscription')
   const provider=await readPayPalSubscription(subscriptionId)
   if(!provider || provider.id!==subscriptionId ||
      provider.plan_id!==PLAN || provider.custom_id!==intentId)
     return deny('paypal_subscription_mismatch')
   // A binding is not a payment. Subscription ACTIVE cannot grant access.
   return {
    readyToBind:true,entitlement:false,
    reason:'verified_binding_candidate_only',
    binding:Object.freeze({
      ownerId,intentId,externalSubscriptionId:subscriptionId,
      provider:'paypal',planId:PLAN,
    }),
   }
  },
 }
}
