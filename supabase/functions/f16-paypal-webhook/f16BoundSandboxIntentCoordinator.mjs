// F16 — SERVER-ONLY Auth -> private intent -> PayPal Sandbox correlation.
// PREPARED, NOT DEPLOYED. Do not call prepare or bind with hosted adapters
// without a separate, explicit PO GO for Auth/DB writes + Sandbox purchase.
// No checkout, OAuth token, PayPal POST, ledger, entitlement, or paidThrough.
// The caller MUST provide a private service_role RPC adapter, a trusted
// Auth-server getUser resolver, and a merchant GET subscription reader.
import {createF16OwnerBindingPreflight} from './ownerBindingPreflight.mjs'

const PLAN='P-14V25407JP6850922NLHMDKI'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const deny=reason=>Object.freeze({
 readyForSandboxCreation:false,readyForSandboxApproval:false,
 bound:false,mayGrantBenefits:false,mayCountPaidMonth:false,
 entitlement:false,paidThrough:null,reason,
})
const ready=(reason,extra)=>Object.freeze({
 readyForSandboxCreation:false,readyForSandboxApproval:false,
 bound:false,mayGrantBenefits:false,mayCountPaidMonth:false,
 entitlement:false,paidThrough:null,reason,...extra,
})
export function createF16BoundSandboxIntentCoordinator({
 resolveOwnerFromVerifiedSession,createPrivateIntent,loadPrivateIntent,
 readPayPalSubscription,bindPrivateIntent,newIntentId,
}={}){
 if([resolveOwnerFromVerifiedSession,createPrivateIntent,loadPrivateIntent,
   readPayPalSubscription,bindPrivateIntent,newIntentId]
   .some(fn=>typeof fn!=='function'))
  throw Error('f16_bound_sandbox_not_configured')
 const preflight=createF16OwnerBindingPreflight({
  resolveOwnerFromVerifiedSession,loadPrivateIntent,readPayPalSubscription,
 })
 return Object.freeze({
  // STOP 1: this inserts a private intent when backed by real service_role.
  // Must run only AFTER independent explicit authorisation for this write.
  async prepare({requestContext}={}){
   let owner
   try{owner=await resolveOwnerFromVerifiedSession(requestContext)}
   catch{return deny('auth_unavailable')}
   if(typeof owner!=='string'||!UUID.test(owner))
    return deny('verified_auth_required')
   let id
   try{id=newIntentId()}
   catch{return deny('intent_creation_unavailable')}
   if(typeof id!=='string'||!INTENT.test(id))
    return deny('invalid_server_generated_intent')
   let stored
   try{stored=await createPrivateIntent({ownerId:owner,intentId:id})}
   catch{return deny('private_intent_unavailable')}
   if(stored!==true)return deny('private_intent_not_created')
   // The coordinator does not create a PayPal subscription.
   // Only a trusted SERVER-side PayPal creation step may transmit
   // {plan_id:PLAN, custom_id:id}. Never hand payment authority to
   // browser-supplied ownerId, planId or custom_id.
   return ready('private_intent_prepared_no_paypal_action',{
    readyForSandboxCreation:true,intentId:id,planId:PLAN,
   })
  },
  // STOP 2: intended AFTER trusted PayPal GET confirms the ID/plan/custom_id.
  // If service_role is connected, the final call writes the BOUND state.
  async bind({requestContext,intentId,subscriptionId}={}){
   let result
   try{
    result=await preflight.inspect({requestContext,intentId,subscriptionId})
   }catch{return deny('binding_preflight_unavailable')}
   if(result?.readyToBind!==true||!result.binding)
    return deny('binding_preflight_rejected')
   const b=result.binding
   let saved
   try{
    saved=await bindPrivateIntent({
     intentId:b.intentId,ownerId:b.ownerId,
     subscriptionId:b.externalSubscriptionId,planId:b.planId,
    })
   }catch{return deny('private_binding_unavailable')}
   if(saved!=='new_binding'&&saved!=='already_bound')
    return deny('private_binding_not_confirmed')
   // BOUND is ownership correlation, NEVER proof that the buyer paid.
   return ready('private_intent_bound_no_payment_credit',{
    readyForSandboxApproval:true,bound:true,
    bindingState:saved,
   })
  },
 })
}
