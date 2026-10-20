// PAZO F16 — UNRELEASED PayPal LIVE ORIGINAL merchant generation secret resolver.
// Secrets stay in the Edge Functions environment; no Vault/PostgREST secret RPC,
// no customer-controlled credential values, no logs, no browser exports.
// Provision a stable per-generation environment namespace; never overwrite
// G7 with G8 credentials when rotating. Revoked generations can be disabled
// separately without changing checkout or erasing historical owner bindings.
//
// This returns credentials only to the server-side provider constructor.
// A separate deployment/credential provisioning gate is required to use it.
const PLAN=/^P-[A-Z0-9]{12,40}$/
const WH=/^[A-Za-z0-9_-]{8,100}$/
const HASH=/^[a-f0-9]{64}$/
const SECRET=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&
 /^[\x21-\x7e]+$/.test(s)
const ERR='live_original_merchant_secret_unavailable'
const fail=()=>{throw Error(ERR)}
const MAX_GEN=9999
export function createPazoLiveEdgeGenerationSecretReader({
 released=false,getSecret
}={}){
 if(typeof getSecret!=='function')
  throw Error('live_edge_secret_accessor_not_configured')
 return async function fetchPrivateGeneration({merchantGeneration,sourceEnvironment}={}){
  if(released!==true||sourceEnvironment!=='live'||
   !Number.isSafeInteger(merchantGeneration)||merchantGeneration<1||
   merchantGeneration>MAX_GEN)fail()
  let configured
  try{configured=getSecret('PAZO_F16_LIVE_HISTORICAL_GENERATIONS')}
  catch{fail()}
  if(typeof configured!=='string'||configured.length>128||
   !/^[1-9]\d{0,3}(,[1-9]\d{0,3})*$/.test(configured))fail()
  const gens=configured.split(',').map(Number)
  if(new Set(gens).size!==gens.length||gens.length>16||
   !gens.includes(merchantGeneration))fail()
  const prefix='PAZO_F16_LIVE_G'+merchantGeneration+'_'
  // Values are read from *one* immutable generation namespace, never from
  // the globally active checkout credentials or a different generation.
  let v
  try{
   v={
    enabled:getSecret(prefix+'READ_ENABLED'),
    planId:getSecret(prefix+'PLAN_ID'),
    webhookId:getSecret(prefix+'WEBHOOK_ID'),
    merchantFingerprint:getSecret(prefix+'MERCHANT_FINGERPRINT_SHA256'),
    clientId:getSecret(prefix+'CLIENT_ID'),
    clientSecret:getSecret(prefix+'CLIENT_SECRET')
   }
  }catch{fail()}
  if(v.enabled!=='1'||!PLAN.test(v.planId||'')||
   !WH.test(v.webhookId||'')||!HASH.test(v.merchantFingerprint||'')||
   !SECRET(v.clientId)||v.clientId.includes(':')||
   !SECRET(v.clientSecret))fail()
  // Constructor input is private. Never stringify, return to a handler,
  // cache globally, place in provider error messages, or return to browser.
  return Object.freeze({
   provider:'paypal',environment:'live',generation:merchantGeneration,
   planId:v.planId,webhookId:v.webhookId,
   merchantFingerprint:v.merchantFingerprint,
   clientId:v.clientId,clientSecret:v.clientSecret
  })
 }
}
