// F16 — PURE server-side cutover assessment, NOT an activation mechanism.
// No secrets, buyer IDs, billing references or API calls may enter its output.
// Required proofs must be assembled by authenticated, trusted server operations;
// NEVER use browser-provided booleans as financial or merchant evidence.
// This policy is deliberately NOT wired to checkout or to a switch RPC.
export const SANDBOX_GATEWAY_PLAN='P-14V25407JP6850922NLHMDKI'
const goodOrigin=(raw)=>{
 if(typeof raw!=='string'||raw.length>250)return false
 try{
  const u=new URL(raw)
  return u.protocol==='https:'&&u.origin===raw&&u.hostname.includes('.')&&
   u.hostname!=='localhost'&&u.username===''&&u.password===''&&
   u.port===''&&u.pathname==='/'&&u.search===''&&u.hash===''&&
   !u.hostname.endsWith('.localhost')&&!u.hostname.endsWith('.local')
 }catch{return false}
}
const proofNames=Object.freeze([
 'oauthVerified',
 'merchantIdentityMatchedLegacy',
 'planReadVerified',
 'webhookDeliveryVerified',
 'callbackInstalledAndUninstalledVerified',
 'cancellationReadVerified',
 'historicSubscriptionsStillServiced',
 'rollbackVerified',
])
const releaseState=(ready,reasons)=>Object.freeze({
 ready,environment:'sandbox',switchPermitted:false,
 checkoutSourceRemains:'legacy_sandbox_checkout',liveEnabled:false,
 reasons:Object.freeze(reasons),
})
export function assessSandboxGatewayCandidate({runtime,candidate,proofs}={}){
 const reasons=[]
 // The existing F16 merchant continues to own all historical buyer reads.
 if(runtime?.active_environment!=='sandbox'||runtime?.live_checkout_enabled!==false||
    runtime?.checkout_source!=='legacy_sandbox_checkout')
   reasons.push('active_legacy_baseline_unverified')
 if(candidate?.environment!=='sandbox'||candidate?.currency!=='USD'||
   candidate?.interval_unit!=='MONTH'||candidate?.price_minor!==299||
   candidate?.plan_id!==SANDBOX_GATEWAY_PLAN)
   reasons.push('sandbox_offer_drift')
 if(!candidate?.client_id_stored||!candidate?.client_secret_stored)
   reasons.push('candidate_credentials_missing')
 if(candidate?.validation_status!=='valid'||typeof candidate?.validated_at!=='string'||
    !Number.isFinite(Date.parse(candidate.validated_at))||
    typeof candidate?.updated_at!=='string'||
    !Number.isFinite(Date.parse(candidate.updated_at))||
    Date.parse(candidate.validated_at)<Date.parse(candidate.updated_at))
   reasons.push('candidate_validation_stale_or_missing')
 if(!goodOrigin(candidate?.return_origin))reasons.push('public_callback_origin_missing')
 if(typeof candidate?.webhook_id!=='string'||
    !/^[A-Za-z0-9_-]{8,100}$/.test(candidate.webhook_id))
   reasons.push('candidate_webhook_missing')
 for(const name of proofNames){
  if(proofs?.[name]!==true)reasons.push('proof_missing_'+name.replace(/[A-Z]/g,letter=>'_'+letter.toLowerCase()))
 }
 // A passing assessment is readiness only, NEVER authority to flip a switch.
 return releaseState(reasons.length===0,reasons)
}
