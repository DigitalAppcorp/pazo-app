// PAZO F16 server integration: Supabase Auth getUser + PayPal Sandbox
// merchant API + private intent read -> no-grant binding candidate.
// Needs a future private-DB reader and persistence transaction; not deployed.
import {createVerifiedAuthOwnerResolver} from './verifiedAuthOwner.mjs'
import {createPaypalSandboxSubscriptionReader} from './paypalSandboxTransactions.mjs'
import {createF16OwnerBindingPreflight} from './ownerBindingPreflight.mjs'

export function createSandboxSubscriptionOwnerVerifier({
 authClient,paypalClientId,paypalClientSecret,loadPrivateIntent,
 fetchImpl=fetch,
}={}) {
 if(typeof loadPrivateIntent!=='function') throw Error('trusted_private_intent_reader_required')
 const resolveOwnerFromVerifiedSession=createVerifiedAuthOwnerResolver({authClient})
 const reader=createPaypalSandboxSubscriptionReader({
   clientId:paypalClientId,clientSecret:paypalClientSecret,fetchImpl,
 })
 const preflight=createF16OwnerBindingPreflight({
   resolveOwnerFromVerifiedSession,loadPrivateIntent,
   readPayPalSubscription:(subscriptionId)=>reader.readSubscription(subscriptionId),
 })
 return async function verify({request,intentId,subscriptionId}={}) {
   // request must be the actual inbound HTTP Request from the Edge Function,
   // not user-provided JSON requestContext or decoded JWT claims.
   if(!(request instanceof Request))return {
     readyToBind:false,entitlement:false,reason:'invalid_request_context',
   }
   return preflight.inspect({requestContext:request,intentId,subscriptionId})
 }
}
