// F16: pure, fail-closed release-readiness *contract* for future Live.
 // This is NOT an endpoint, runtime selector or authorization to charge.
 // Independent evidence must be produced server-side after official beta hosting.
const officialOrigin=(s)=>{
 if(typeof s!=='string'||s.length>250)return false
 try {
  const u=new URL(s)
  return u.protocol==='https:'&&u.origin===s&&u.hostname.includes('.')&&
    !['localhost','127.0.0.1'].includes(u.hostname)&&
    !u.hostname.endsWith('.localhost')&&!u.hostname.endsWith('.local')&&
    !u.username&&!u.password&&!u.port&&u.pathname==='/'&&
    !u.search&&!u.hash
 }catch{return false}
}
const proofNames=Object.freeze([
 'betaPublicHttpsVerified','merchantBusinessVerified',
 'liveAppOwnershipVerified','livePlanProviderVerified',
 'webhookSignatureAndDeliveryVerified','browserReturnVerified',
 'installedPwaReturnVerified','renewalAndCancellationVerified',
 'refundAndReversalVerified','ledgerReconciliationVerified',
 'rollbackVerified','ownerApprovedLaunch',
])
const blocked=(reasons)=>Object.freeze({
 environment:'live',readiness:reasons.length===0?'preflight_ready':'blocked',
 activationAuthorized:false,checkoutEnabled:false,
 sourcesToPreserve:Object.freeze(['legacy_sandbox_checkout']),
 reasons:Object.freeze(reasons),
})
export function assessLiveBetaCutover({runtime,config,proofs}={}){
 const issues=[]
 if(runtime?.active_environment!=='sandbox'||runtime?.live_checkout_enabled!==false||
    runtime?.checkout_source!=='legacy_sandbox_checkout')
   issues.push('runtime_not_isolated')
 if(config?.environment!=='live'||config?.currency!=='USD'||
    config?.interval_unit!=='MONTH'||config?.price_minor!==299)
   issues.push('live_offer_mismatch')
 if(config?.client_id_stored!==true||config?.client_secret_stored!==true||
    config?.validation_status!=='valid'||!Number.isFinite(Date.parse(config?.validated_at))||
    !Number.isFinite(Date.parse(config?.updated_at))||
    Date.parse(config.validated_at)<Date.parse(config.updated_at))
   issues.push('live_credential_proof_missing')
 if(typeof config?.plan_id!=='string'||!/^P-[A-Za-z0-9]{10,75}$/.test(config.plan_id))
   issues.push('live_plan_missing')
 if(!officialOrigin(config?.return_origin))issues.push('beta_public_origin_missing')
 if(typeof config?.webhook_id!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(config.webhook_id))
   issues.push('live_webhook_missing')
 for(const name of proofNames)if(proofs?.[name]!==true)
   issues.push('proof_missing_'+name.replace(/[A-Z]/g,c=>'_'+c.toLowerCase()))
 return blocked(issues)
}
