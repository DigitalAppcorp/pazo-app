// PAZO F16 — unlaunched read-only LIVE original-merchant composition.
// A trusted server adapter must inject fetchPrivateGeneration, sourced from
// immutable Vault UUID references. No browser-supplied or active merchant
// credentials. No direct DB writes, payments, badge grants, or Live fallback.
import {createPazoLiveHostedBindingReader} from './liveHostedBindingRead.mjs'
import {createPazoLiveOwnerScopeResolver} from './liveOwnerScope.mjs'
import {createPaypalLiveMerchantEvidenceReader} from './liveMerchantEvidence.mjs'
import {createPaypalLivePostbackVerifier} from './livePostback.mjs'
import {createPazoLiveHostedGenerationReader} from './liveHostedGenerationRead.mjs'
const PLAN=/^P-[A-Z0-9]{12,40}$/
const WH=/^[A-Za-z0-9_-]{8,100}$/
const FINGERPRINT=/^[a-f0-9]{64}$/
const safe=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&
 /^[\x21-\x7e]+$/.test(s)
const fail=()=>{throw Error('live_historical_merchant_unavailable')}
function evidence(record,merchantGeneration){
 if(record?.provider!=='paypal'||record?.environment!=='live'||
  record?.generation!==merchantGeneration||!PLAN.test(record.planId||'')||
  !WH.test(record.webhookId||'')||
  !FINGERPRINT.test(record.merchantFingerprint||'')||
  !safe(record.clientId)||record.clientId.includes(':')||
  !safe(record.clientSecret))fail()
 // Intentionally allow a retired ORIGINAL merchant generation for account
 // status and cancellation of existing subscriptions. Never permit creating
 // new checkout from this module or rotating to a different generation.
 return {merchantGeneration,planId:record.planId,
  webhookId:record.webhookId,clientId:record.clientId,
  clientSecret:record.clientSecret}
}
export function createPazoLiveHistoricalReadPipeline({
 supabaseUrl,serviceRoleKey,fetchPrivateGeneration,fetchImpl=fetch
}={}){
 if(typeof fetchPrivateGeneration!=='function'||typeof fetchImpl!=='function')
  throw Error('live_historical_reader_not_configured')
 const findBoundSubscription=createPazoLiveHostedBindingReader({
  supabaseUrl,serviceRoleKey,fetchImpl
 })
 async function configForGeneration({merchantGeneration,sourceEnvironment}={}){
  if(sourceEnvironment!=='live'||!Number.isSafeInteger(merchantGeneration)||
   merchantGeneration<1)fail()
  let r
  try{r=await fetchPrivateGeneration({merchantGeneration,sourceEnvironment:'live'})}
  catch{fail()}
  return evidence(r,merchantGeneration)
 }
 const readerForGeneration=async arg=>{
  const record=await configForGeneration(arg)
  return createPaypalLiveMerchantEvidenceReader({...record,fetchImpl})
 }
 const verifierForGeneration=async arg=>{
  const record=await configForGeneration(arg)
  return Object.freeze({webhookId:record.webhookId,
   verifySignature:createPaypalLivePostbackVerifier({
    clientId:record.clientId,clientSecret:record.clientSecret,fetchImpl
   })})
 }
 const provePazoScope=createPazoLiveOwnerScopeResolver({
  findBoundSubscription,readerForGeneration
 })
 // Server-only trusted functions, no credentials ever returned to the caller.
 return Object.freeze({provePazoScope,readerForGeneration,verifierForGeneration,
  findBoundSubscription})
}


// The assembled hosted path is CODE-ONLY until a separate PO-approved,
// service-role-only Vault RPC exists. This helper cannot create subscriptions,
// record payments, process inbox events, or enable Live.
export function createPazoLiveHostedHistoricalVerification({
 supabaseUrl,serviceRoleKey,fetchImpl=fetch
}={}){
 const fetchPrivateGeneration=createPazoLiveHostedGenerationReader({
  supabaseUrl,serviceRoleKey,fetchImpl
 })
 return createPazoLiveHistoricalReadPipeline({
  supabaseUrl,serviceRoleKey,fetchPrivateGeneration,fetchImpl
 })
}
