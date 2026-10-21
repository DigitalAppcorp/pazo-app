// PAZO F16 — PRIVATE Live credentials pipeline composition; UNRELEASED.
// No webhook, checkout or entitlement activation. This file is not imported
// by deployed index.ts. Releasing it requires a separate security/release GO.
//
// The verified PayPal merchant adapter is wired server-side with a mandatory
// pinned fingerprint read from an immutable generation row. Plan + webhook
// alone never identify the merchant or permit financial operations.
import {createPazoLiveProvisioningIntake} from './intake.mjs'
import {createPazoLivePrivilegedAdmin} from './liveAuthenticatedAdminFactory.mjs'
import {createPazoLiveProvisionSqlStore} from './liveProvisionSqlStore.mjs'
import {createPazoScopedManagementTokenReader}
 from './scopedManagementToken.mjs'
import {createPazoLiveEdgeSecretsProvisioner}
 from '../pazo-admin-paypal-validate/liveEdgeProvisioning.mjs'
import {createPazoLiveVerifiedMerchantResources}
 from '../pazo-admin-paypal-validate/liveMerchantIdentityReadOnly.mjs'
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const response=(code)=>new Response(JSON.stringify({
 ok:false,code,liveActivated:false,mayCharge:false
}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}})
export function createPazoLiveHostedProvisioning({
 released=false,getEnv=()=>undefined,
 verifyProviderResources,fetchImpl=fetch
}={}){
 // Do not even read environment secrets before the release gate.
 if(released!==true)return async()=>response('live_provisioning_not_released')
 if(typeof getEnv!=='function'||
    typeof verifyProviderResources!=='function'||
    typeof fetchImpl!=='function')
  return async()=>response('live_provisioning_not_configured')
 let handler
 try{
  const projectUrl=getEnv('SUPABASE_URL')
  const serviceRoleKey=getEnv('SUPABASE_SERVICE_ROLE_KEY')
  const publishableKey=getEnv('SUPABASE_ANON_KEY')
  if(projectUrl!==PROJECT||typeof publishableKey!=='string')
   throw Error('server_config_missing')
  // Never accept client-supplied merchant identity. The verifier compares the
  // PayPal reporting account against immutable server generation metadata.
  // A missing original-merchant fingerprint will fail closed without requests.
  const providerVerifier=verifyProviderResources||
   createPazoLiveVerifiedMerchantResources({fetchImpl})
  const admin=createPazoLivePrivilegedAdmin({
   supabaseUrl:projectUrl,publishableKey,fetchImpl
  })
  const store=createPazoLiveProvisionSqlStore({
   projectUrl,serviceRoleKey,fetchImpl
  })
  const readToken=createPazoScopedManagementTokenReader({getEnv})
  const provision=createPazoLiveEdgeSecretsProvisioner({
   released:true,
   authenticateAdmin:admin,
   readGeneration:store.readGeneration,
   verifyProviderResources:providerVerifier,
   reserveAttempt:store.reserveAttempt,
   recordAttemptOutcome:store.recordAttemptOutcome,
   getScopedManagementToken:readToken,fetchImpl
  })
  handler=createPazoLiveProvisioningIntake({released:true,provision})
 }catch{return async()=>response('live_provisioning_not_configured')}
 return handler
}
