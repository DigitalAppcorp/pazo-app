// PAZO F16 — PRE-RELEASE private Edge merchant secret provisioning orchestrator.
// NOT IMPORTED BY index.ts. NO hosted handler, no deployed release.
// Caller must authenticate administrator and verify merchant, plan, webhook
// through trusted server adapters. Never send secrets to logs / RPC / returns.
// Supabase Management API supports scoped project token with only
// Edge Function Secrets READ+WRITE; never use an unscoped Owner token.
const PROJECT='mrybvqdebbgcayuvgkkr'
const URL='https://api.supabase.com/v1/projects/'+PROJECT+'/secrets'
const G=/^[1-9]\d{0,3}$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const WH=/^[A-Za-z0-9_-]{8,100}$/
const HASH=/^[a-f0-9]{64}$/
const SAFE=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&/^[\x21-\x7e]+$/.test(s)
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const code=(name)=>Object.freeze({ok:false,code:name,liveActivated:false,mayCharge:false,credentialsExposed:false})
const fail=(name)=>{throw Error(name)}
export function createPazoLiveEdgeSecretsProvisioner({
 released=false,getScopedManagementToken,authenticateAdmin,readGeneration,
 verifyProviderResources,reserveAttempt,recordAttemptOutcome,fetchImpl=fetch
}={}){
 return async function stage({request,merchantGeneration,clientId,clientSecret,
  confirmation,expectedRevision}={}){
  // Owner's approval for writing code does NOT release live secret provisioning.
  if(released!==true)return code('edge_provisioning_not_released')
  if(!(request instanceof Request)||request.method!=='POST'||
   confirmation!=='PREPARAR CREDENCIALES LIVE'||
   !Number.isSafeInteger(expectedRevision)||expectedRevision<0||
   !Number.isSafeInteger(merchantGeneration)||merchantGeneration<1||
   !G.test(String(merchantGeneration))||
   !SAFE(clientId)||clientId.includes(':')||!SAFE(clientSecret))
   return code('invalid_provisioning_request')
  if(typeof authenticateAdmin!=='function'||typeof readGeneration!=='function'||
   typeof verifyProviderResources!=='function'||typeof reserveAttempt!=='function'||
   typeof recordAttemptOutcome!=='function'||typeof getScopedManagementToken!=='function'||
   typeof fetchImpl!=='function')return code('provisioning_backend_unavailable')
  let actor
  try{actor=await authenticateAdmin(request)}catch{return code('admin_verification_unavailable')}
  if(!UUID.test(actor?.id||'')||actor?.isAdmin!==true||actor?.freshSession!==true)
   return code('authenticated_admin_required')
  let stored
  try{stored=await readGeneration({merchantGeneration,actorId:actor.id})}
  catch{return code('generation_read_unavailable')}
  if(stored?.generation!==merchantGeneration||stored?.environment!=='live'||
   stored?.credentialSource!=='edge_secrets'||stored?.isRetired===true||
   stored?.verifiedAdminId!==actor.id||stored?.revision!==expectedRevision||
   stored?.liveCheckoutEnabled!==false||stored?.killSwitch!==true||
   !PLAN.test(stored?.planId||'')||!WH.test(stored?.webhookId||'')||
   !HASH.test(stored?.merchantFingerprint||''))
   return code('immutable_generation_not_ready')
  let provider
  try{provider=await verifyProviderResources({
   environment:'live',clientId,clientSecret,planId:stored.planId,
   webhookId:stored.webhookId,merchantFingerprint:stored.merchantFingerprint,
   merchantGeneration
  })}catch{return code('provider_validation_unavailable')}
  if(provider?.oauthVerified!==true||provider?.planVerified!==true||
   provider?.webhookVerified!==true||provider?.merchantIdentityVerified!==true||
   provider?.isLive!==true||provider?.mayCharge!==false)
   return code('live_provider_resources_unverified')
  // Validate current generation again after the remote provider check: a stale
  // admin/merchant revision must never be provisioned into a newer generation.
  let current
  try{current=await readGeneration({merchantGeneration,actorId:actor.id})}
  catch{return code('generation_revalidation_unavailable')}
  if(current?.revision!==expectedRevision||current?.generation!==stored.generation||
   current?.environment!=='live'||current?.credentialSource!=='edge_secrets'||
   current?.isRetired!==false||current?.verifiedAdminId!==actor.id||
   current?.liveCheckoutEnabled!==false||current?.killSwitch!==true||
   current?.planId!==stored.planId||current?.webhookId!==stored.webhookId||
   current?.merchantFingerprint!==stored.merchantFingerprint)
   return code('generation_changed_during_verification')
  let pat
  try{pat=getScopedManagementToken()}catch{return code('scoped_token_unavailable')}
  if(typeof pat!=='string'||!/^sbp_fc[A-Za-z0-9_-]{12,500}$/.test(pat))
   return code('scoped_token_unavailable')
  // The server-side adapter MUST atomically reserve one operation for the
  // generation/revision and durably record its result. In-memory mutexes are
  // insufficient for multiple Edge isolates; never reuse an uncertain claim.
  let claim
  try{claim=await reserveAttempt({actorId:actor.id,
   merchantGeneration,expectedRevision,planId:stored.planId,
   webhookId:stored.webhookId,merchantFingerprint:stored.merchantFingerprint})}
  catch{return code('provisioning_reservation_unavailable')}
  if(claim?.reserved!==true||!UUID.test(claim?.attemptId||''))
   return code('provisioning_attempt_not_reserved')
  const finish=async result=>{
   try{
    const saved=await recordAttemptOutcome({attemptId:claim.attemptId,
     actorId:actor.id,merchantGeneration,resultCode:result.code})
    if(saved!==true)return code('provisioning_audit_unavailable_manual_review')
   }catch{return code('provisioning_audit_unavailable_manual_review')}
   return result
  }
  const names=['READ_ENABLED','PLAN_ID','WEBHOOK_ID','MERCHANT_FINGERPRINT_SHA256','CLIENT_ID','CLIENT_SECRET']
   .map(field=>'PAZO_F16_LIVE_G'+merchantGeneration+'_'+field)
  const list=async()=>{
   let r
   try{r=await fetchImpl(URL,{method:'GET',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+pat,
     Accept:'application/json'}})}catch{fail('secret_preflight_unavailable')}
   if(!r?.ok||r.status!==200)fail('secret_preflight_unavailable')
   let data
   try{data=await r.json()}catch{fail('secret_preflight_unavailable')}
   if(!Array.isArray(data)||data.length>1000||
    !data.every(x=>typeof x?.name==='string'))fail('secret_preflight_unavailable')
   // NEVER return or log secret values that GET might accidentally include.
   return new Set(data.map(x=>x.name))
  }
  let before
  try{before=await list()}catch{return finish(code('secret_preflight_unavailable'))}
  // Existing generation may not be overwritten or silently rotated.
  // Registry/rollout activation is a separate operation with another gate.
  if(names.some(name=>before.has(name)))
   return finish(code('generation_secrets_already_present'))
  const values=['1',stored.planId,stored.webhookId,stored.merchantFingerprint,
   clientId,clientSecret]
  let response
  try{response=await fetchImpl(URL,{method:'POST',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(12000),headers:{
    Authorization:'Bearer '+pat,'Content-Type':'application/json',
    Accept:'application/json'},
   body:JSON.stringify(names.map((name,i)=>({name,value:values[i]})))
  })}catch{return finish(code('secret_write_outcome_unknown_manual_review'))}
  // Supabase Management API responds HTTP 201 for bulk create.
  // Ambiguous network or status must NEVER trigger blind retries.
  if(response?.status!==201)
   return finish(code('secret_write_outcome_unknown_manual_review'))
  let after
  try{after=await list()}catch{return finish(code('secret_write_outcome_unknown_manual_review'))}
  if(names.some(name=>!after.has(name)))
   return finish(code('secret_write_outcome_unknown_manual_review'))
  // Do not add to allowed generations, enable READ_ENABLED in runtime, or
  // flip payment switch automatically. A separate staged readiness/GO gate
  // must reconcile metadata and server-proven credentials.
  return finish(Object.freeze({ok:true,code:'generation_secret_names_confirmed',
   merchantGeneration,secretCount:6,liveActivated:false,
   mayCharge:false,credentialsExposed:false}))
 }
}
