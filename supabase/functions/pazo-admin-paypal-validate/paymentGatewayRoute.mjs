// F16: future multi-environment routing contract. PURE / NOT DEPLOYED.
// The data passed here MUST originate from a server-verified, immutable
// owner-to-subscription binding; never from request.body, URL or localStorage.
// This is only classification, not permission to create/cancel/charge.
// Existing Sandbox subscriptions MUST retain their historic merchant credentials.
const LEGACY_PLAN='P-14V25407JP6850922NLHMDKI'
const supported=new Set(['read','cancel','refund_review'])
const block=(reason)=>Object.freeze({ok:false,reason,mayCharge:false,mayCancel:false,mayRecordPayment:false})
const selected=(route)=>Object.freeze({ok:true,route,mayCharge:false,mayCancel:false,mayRecordPayment:false})
const verifiedId=(value)=>typeof value==='string'&&/^I-[A-Za-z0-9_-]{3,70}$/.test(value)
const intent=(value)=>typeof value==='string'&&/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
/**
 * Existing subscriptions ALWAYS resolve by immutable original merchant/app
 * generation rather than current admin-selected checkout environment.
 */
export function classifyBoundPaypalSubscription({operation,binding}={}){
 if(!supported.has(operation))return block('unsupported_operation')
 if(binding?.ownerVerified!==true||!verifiedId(binding.subscriptionId)||
   !intent(binding.intentId))return block('binding_not_verified')
 if(binding.environment==='sandbox'&&
   binding.provider==='paypal'&&binding.source==='f16_legacy_qa'&&
   binding.planId===LEGACY_PLAN&&binding.generation===1)
   return selected('f16_legacy_sandbox')
 if(binding.environment==='live')return block('live_historical_adapter_not_released')
 return block('unknown_historical_merchant')
}
/**
 * New checkout routes must never fall back between Sandbox and Live.
 * In current PR all new Live checkout creation is blocked, regardless of
 * Vault credentials, beta hostname or a frontend claim of readiness.
 */
export function classifyNewPaypalCheckout({runtime,verifiedMode}={}){
 if(runtime?.active_environment!=='sandbox'||runtime?.live_checkout_enabled!==false)
  return block('runtime_release_gate_not_proven')
 if(verifiedMode==='localhost_sandbox_qa')return selected('existing_sandbox_qa')
 return block('production_checkout_not_released')
}
