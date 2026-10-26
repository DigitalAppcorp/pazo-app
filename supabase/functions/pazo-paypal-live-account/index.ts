// PAZO F16 — original-owner read, cancellation and bounded request recovery.
// Recovery may replay the exact originally admitted CREATE under a private
// lease; it cannot start another consent/request or grant paid coverage.
// Deployed with Edge JWT verification ON; GoTrue rechecks the bearer.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveOwnerAccountRead} from './liveAccountRead.mjs'
import {createPazoLiveGoTrueOwnerResolver} from '../pazo-paypal-live-checkout/liveGoTrueOwner.mjs'
import {createPazoLiveVaultGenerationSecretReader} from '../pazo-paypal-live-webhook/liveVaultGenerationSecrets.mjs'
import {createPaypalLiveSubscriptionProvider} from '../pazo-paypal-live-checkout/liveSubscriptionProvider.mjs'
import {createPazoOriginalSubscriptionReadDiagnostic} from './liveProviderReadDiagnostic.mjs'
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const ACCOUNT_MANAGEMENT_RELEASED=true
const unavailable=()=>createPazoLiveOwnerAccountRead()
function setup(){
 if(!ACCOUNT_MANAGEMENT_RELEASED)return unavailable()
 try{
  const url=Deno.env.get('SUPABASE_URL')
  const anon=Deno.env.get('SUPABASE_ANON_KEY')
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if(url!==PROJECT||!anon||!service||service.length<24)throw Error('invalid_env')
  const resolveAuthenticatedOwner=createPazoLiveGoTrueOwnerResolver({
   supabaseUrl:url,anonKey:anon
  })
  const readPrivateOwner=async({ownerId}:{ownerId:string})=>{
   const res=await fetch(PROJECT+'/rest/v1/rpc/pazo_f16_live_service_owner_checkouts_read',{
    method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{apikey:service,Authorization:'Bearer '+service,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_owner:ownerId})
   })
   if(res.status!==200||!res.ok)throw Error('private_owner_unavailable')
   const raw=await res.text()
   if(raw.length>24576)throw Error('private_owner_response_too_large')
   return JSON.parse(raw)
  }
  const readOriginalSecrets=createPazoLiveVaultGenerationSecretReader({
   supabaseUrl:url,serviceRoleKey:service
  })
  const originalReadFetch=createPazoOriginalSubscriptionReadDiagnostic({
    fetchImpl:fetch,
    report:diagnostic=>console.info('pazo_live_original_subscription_read',JSON.stringify(diagnostic))
  })
  const getOriginalProvider=async({merchantGeneration,planId,origin}:{
   merchantGeneration:number,planId:string,origin?:string
  })=>{
   let credentials
   try{credentials=await readOriginalSecrets({
    merchantGeneration,sourceEnvironment:'live'
   })}catch{
    console.info('pazo_live_original_subscription_setup',JSON.stringify({result:'vault_unavailable'}))
    throw Error('original_merchant_unavailable')
   }
   if(credentials?.environment!=='live'||credentials.generation!==merchantGeneration||
    credentials.planId!==planId||credentials.credentialSource!=='vault')
    throw Error('original_merchant_unavailable')
   // Recovery supplies the persisted original origin for an identical replay.
   // The fallback is used only for historical GET/CANCEL, which never CREATE.
   return createPaypalLiveSubscriptionProvider({
    clientId:credentials.clientId,clientSecret:credentials.clientSecret,
    planId,origin:origin||'https://pazo-app-t83r.vercel.app',
    fetchImpl:originalReadFetch
   })
  }
  const readProviderStatus=async({merchantGeneration,planId,subscriptionId}:{
   merchantGeneration:number,planId:string,subscriptionId:string
  })=>(await getOriginalProvider({merchantGeneration,planId})).readSubscription(subscriptionId)
  const postCancel=async({merchantGeneration,planId,subscriptionId}:{
   merchantGeneration:number,planId:string,subscriptionId:string
  })=>(await getOriginalProvider({merchantGeneration,planId})).cancelSubscription(subscriptionId)
  const cancelRpc=async(name:string,args:Record<string,unknown>)=>{
   const res=await fetch(PROJECT+'/rest/v1/rpc/'+name,{
    method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{apikey:service,Authorization:'Bearer '+service,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify(args)
   })
   if(!res.ok||res.status!==200)throw Error('cancel_claim_unavailable')
   const value=await res.json()
   if(typeof value!=='boolean')throw Error('cancel_claim_invalid')
   return value
  }
  const claimCancel=async({ownerId,intentId,merchantGeneration}:{
   ownerId:string,intentId:string,merchantGeneration:number
  })=>cancelRpc('pazo_f16_live_service_cancel_claim',{
   p_owner:ownerId,p_intent:intentId,p_generation:merchantGeneration
  })
  const finishCancel=async({ownerId,intentId,merchantGeneration,outcome}:{
   ownerId:string,intentId:string,merchantGeneration:number,outcome:string
  })=>cancelRpc('pazo_f16_live_service_cancel_finish',{
   p_owner:ownerId,p_intent:intentId,p_generation:merchantGeneration,
   p_outcome:outcome
  })
  const privateRpc=async(name:string,args:Record<string,unknown>)=>{
   const res=await fetch(PROJECT+'/rest/v1/rpc/'+name,{
    method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{apikey:service,Authorization:'Bearer '+service,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify(args)
   })
   if(!res.ok||res.status!==200)throw Error('private_recovery_unavailable')
   const raw=await res.text()
   if(raw.length>24576)throw Error('private_recovery_response_too_large')
   return JSON.parse(raw)
  }
  const claimRecovery=async({ownerId,intentId}:{ownerId:string,intentId:string})=>
   privateRpc('pazo_f16_live_service_recovery_claim',{p_owner:ownerId,p_intent:intentId})
  const finishRecovery=async({ownerId,intentId,merchantGeneration,leaseToken,
   requestKey,planId,subscriptionId}:Record<string,unknown>)=>
   privateRpc('pazo_f16_live_service_recovery_finish',{p_owner:ownerId,p_intent:intentId,
    p_generation:merchantGeneration,p_lease:leaseToken,p_request_key:requestKey,
    p_plan:planId,p_subscription:subscriptionId})
  const retireTerminal=async({ownerId,intentId,merchantGeneration,subscriptionId,
   providerStatus}:Record<string,unknown>)=>
   privateRpc('pazo_f16_live_service_terminal_checkout_close',{
    p_owner:ownerId,p_intent:intentId,p_generation:merchantGeneration,
    p_subscription:subscriptionId,p_status:providerStatus})
  const abandonUnclaimed=async({ownerId,intentId}:{ownerId:string,intentId:string})=>
   privateRpc('pazo_f16_live_service_abandon_unclaimed',{p_owner:ownerId,p_intent:intentId})
  const readRecoveryReadiness=async()=>{
   const h=await privateRpc('pazo_f16_live_service_worker_health_read',{})
   return h?.source==='private_live_worker_health'&&h.enabled===true&&
    h.processingAllowed===true&&h.healthy===true
  }
  const readAcceptance=async({ownerId,intentId}:{ownerId:string,intentId:string})=>
   privateRpc('pazo_f16_live_service_acceptance_read',{p_owner:ownerId,p_intent:intentId})
  return createPazoLiveOwnerAccountRead({released:true,
   resolveAuthenticatedOwner,readPrivateOwner,readProviderStatus,
   claimCancel,finishCancel,postCancel,getOriginalProvider,claimRecovery,
   finishRecovery,retireTerminal,abandonUnclaimed,readRecoveryReadiness,readAcceptance})
 }catch{return unavailable()}
}
Deno.serve(setup())
