// PAZO F16 — future server-side Live cutover orchestrator. OFF BY DEFAULT.
// This module is NOT an Edge route, does not read Vault or create charges.
// SQL compareAndSwapLive and pauseNewCheckout MUST be one transaction with
// server-verified preflight, rev, operator and append-only audit.
// Client flags, URL changes and PayPal redirects never activate checkout.
// A beta publication event/date is not a prerequisite for operator-verified Live.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[a-f0-9]{12}$/i
const HASH=/^[a-f0-9]{64}$/
const MAX_PROOF_AGE=5*60_000
const error=code=>Object.freeze({ok:false,code,liveActivated:false,
 mayCharge:false,newCheckoutEnabled:false})
const result=(code,live)=>Object.freeze({ok:true,code,liveActivated:live,
 mayCharge:false,newCheckoutEnabled:live})
const exactProof=(proof,actor,revision,now)=>{
 if(proof?.origin!=='trusted_server'||
  proof?.actorId!==actor||proof?.sourceEnvironment!=='live'||
  proof?.merchantVerified!==true||proof?.planVerified!==true||
  proof?.webhookDeliveryVerified!==true||
  proof?.browserAndPwaReturnVerified!==true||
  proof?.cancelAndRefundVerified!==true||
  proof?.ledgerAndEntitlementsVerified!==true||
  proof?.rollbackVerified!==true||
  proof?.ownerApprovedLiveActivation!==true||
  !UUID.test(proof.proofId||'')||
  !HASH.test(proof.evidenceSha256||'')||
  !Number.isSafeInteger(proof.merchantGeneration)||proof.merchantGeneration<1||
  proof.expectedRevision!==revision||
  typeof proof.checkedAt!=='string')return false
 const ms=Date.parse(proof.checkedAt)
 return Number.isFinite(ms)&&ms<=now&&now-ms<=MAX_PROOF_AGE
}
export function createPazoLiveCutoverCoordinator({
 releaseApproved=false,emergencyPauseApproved=false,
 resolveAuthenticatedAdmin,readRuntime,readFreshServerProof,
 compareAndSwapLive,pauseNewCheckout,now=Date.now
}={}){
 const admin=async request=>{
  if(!(request instanceof Request)||request.method!=='POST'||
   typeof resolveAuthenticatedAdmin!=='function')return null
  try{
   const actor=await resolveAuthenticatedAdmin(request)
   return UUID.test(actor||'')?actor:null
  }catch{return null}
 }
 return Object.freeze({
  async activate({request,confirmation,expectedRevision}={}){
   if(releaseApproved!==true)return error('live_cutover_not_released')
   if(confirmation!=='ACTIVAR LIVE PAZO'||
      !Number.isSafeInteger(expectedRevision)||expectedRevision<0)
    return error('explicit_confirmation_required')
   const actor=await admin(request)
   if(!actor)return error('authenticated_admin_required')
   if(typeof now!=='function'||!Number.isFinite(now())||
      typeof readRuntime!=='function'||typeof readFreshServerProof!=='function'||
      typeof compareAndSwapLive!=='function')
    return error('live_cutover_backend_unavailable')
   let runtime
   try{runtime=await readRuntime()}catch{return error('runtime_read_unavailable')}
   if(runtime?.revision!==expectedRevision||
      runtime?.active_environment!=='sandbox'||
      runtime?.live_checkout_enabled!==false||
      runtime?.checkout_source!=='legacy_sandbox_checkout')
    return error('runtime_revision_or_mode_changed')
   let proof
   try{proof=await readFreshServerProof({actorId:actor})}
   catch{return error('fresh_server_evidence_unavailable')}
   if(!exactProof(proof,actor,expectedRevision,now()))
    return error('live_release_evidence_incomplete')
   // SQL must atomically verify ALL stored evidence, merchant generation,
   // admin grant, exact runtime revision, release latch and append audit.
   let written
   try{written=await compareAndSwapLive({
    actorId:actor,expectedRevision,merchantGeneration:proof.merchantGeneration,
    proofId:proof.proofId,evidenceSha256:proof.evidenceSha256
   })}catch{return error('atomic_switch_unavailable')}
   if(written!=='switched')return error('atomic_switch_rejected')
   try{runtime=await readRuntime()}catch{return error('switch_postflight_unknown')}
   if(runtime?.revision!==expectedRevision+1||
      runtime?.active_environment!=='live'||
      runtime?.live_checkout_enabled!==true||
      runtime?.checkout_source!=='live_gateway_v1'||
      runtime?.active_generation!==proof.merchantGeneration)
    return error('switch_postflight_unknown')
   // Even successful state switch is NOT proof of a first real payment.
   return result('live_new_checkout_route_enabled',true)
  },
  async pause({request,confirmation}={}){
   if(emergencyPauseApproved!==true)return error('emergency_stop_not_released')
   if(confirmation!=='DETENER NUEVAS COMPRAS')return error('explicit_stop_required')
   const actor=await admin(request)
   if(!actor)return error('authenticated_admin_required')
   if(typeof pauseNewCheckout!=='function'||typeof readRuntime!=='function')
    return error('stop_backend_unavailable')
   let runtime
   try{runtime=await readRuntime()}catch{return error('runtime_read_unavailable')}
   if(!Number.isSafeInteger(runtime?.revision))return error('runtime_unavailable')
   if(runtime.new_checkout_enabled===false)
    return result('new_checkout_already_stopped',false)
   let saved
   try{saved=await pauseNewCheckout({actorId:actor,expectedRevision:runtime.revision})}
   catch{return error('atomic_stop_unavailable')}
   if(saved!=='stopped')return error('atomic_stop_rejected')
   // A stop MUST NOT redirect live customers to Sandbox checkout.
   // Historical owner status and cancellations remain on original merchant.
   return result('new_checkout_stopped',false)
  }
 })
}
