// Server-only preparation; NOT imported by a hosted index or browser.
// Requires an authorized reporting/balances/read grant before a real check.
// No payment, account settings, credential storage or generation finalization.
import {inspectLivePaypalResources} from './liveProviderReadOnly.mjs'
const HOST='https://api-m.paypal.com'
const BALANCE_SCOPE='https://uri.paypal.com/services/reporting/balances/read'
const ACCOUNT=/^[2-9A-HJ-NP-Z]{13}$/
const HASH=/^[a-f0-9]{64}$/
const TOKEN=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&/^[\x21-\x7e]+$/.test(s)
const MAX_BYTES=32768
const unavailable='live_merchant_identity_unavailable'
const invalid=code=>Object.freeze({ok:false,code,merchantIdentityVerified:false,
 webhookDeliveryVerified:false,mayCharge:false,mayActivate:false})
async function boundedObject(response){
 if(!/^application\/json(?:\s*;|$)/i.test(response.headers?.get('content-type')||'')||
  Number(response.headers?.get('content-length'))>MAX_BYTES||!response.body)
  throw Error(unavailable)
 const reader=response.body.getReader(),chunks=[]
 let size=0
 try{
  while(true){
   const part=await reader.read()
   if(part.done)break
   size+=part.value.byteLength
   if(size>MAX_BYTES){await reader.cancel();throw Error(unavailable)}
   chunks.push(part.value)
  }
 }finally{reader.releaseLock()}
 const bytes=new Uint8Array(size)
 let offset=0
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))
 if(!value||Array.isArray(value)||typeof value!=='object')throw Error(unavailable)
 return value
}
export async function readLivePaypalMerchantIdentity({environment,clientId,clientSecret,
 planId,webhookId,merchantGeneration,expectedMerchantFingerprint,fetchImpl=fetch}={}){
 // A browser-supplied fingerprint must never become the trusted expectation.
 // The caller must resolve any expectation from immutable server metadata.
 if(expectedMerchantFingerprint!==undefined&&!HASH.test(expectedMerchantFingerprint||''))
  return invalid('live_merchant_identity_config_incomplete')
 const resources=await inspectLivePaypalResources({environment,clientId,clientSecret,
  planId,webhookId,merchantGeneration,fetchImpl})
 if(resources?.ok!==true)return invalid(resources.code)
 try{
  const request=(path,options)=>fetchImpl(HOST+path,{...options,redirect:'error',
   cache:'no-store',signal:AbortSignal.timeout(12000)})
  // A separate short-lived token is kept in this request only. No browser token
  // intake, auth assertions, partner/third-party account or configurable host.
  const authResponse=await request('/v1/oauth2/token',{method:'POST',headers:{
   Authorization:'Basic '+btoa(clientId+':'+clientSecret),Accept:'application/json',
   'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'})
  if(!authResponse?.ok||authResponse.status!==200)
   return invalid('live_merchant_oauth_unverified')
  const auth=await boundedObject(authResponse)
  if(auth.token_type?.toLowerCase()!=='bearer'||!TOKEN(auth.access_token))
   return invalid('live_merchant_oauth_unverified')
  if(typeof auth.scope!=='string'||auth.scope.length>16384||
   !auth.scope.split(/\s+/).includes(BALANCE_SCOPE))
   return invalid('live_merchant_read_permission_required')
  const response=await request('/v1/reporting/balances?currency_code=USD',{
   method:'GET',headers:{Authorization:'Bearer '+auth.access_token,Accept:'application/json'}})
  if(response?.status===403)return invalid('live_merchant_read_permission_required')
  if(!response?.ok||response.status!==200)return invalid(unavailable)
  const account=await boundedObject(response)
  // Only account_id is used. Balances, dates and other provider data are discarded.
  // Hash an exact canonical account identifier with an explicit environment domain.
  if(!ACCOUNT.test(account.account_id||''))return invalid('live_merchant_identity_unverified')
  const digest=await crypto.subtle.digest('SHA-256',
   new TextEncoder().encode('paypal:live:'+account.account_id))
  const merchantFingerprint=Array.from(new Uint8Array(digest),
   n=>n.toString(16).padStart(2,'0')).join('')
  if(expectedMerchantFingerprint!==undefined&&merchantFingerprint!==expectedMerchantFingerprint)
   return invalid('live_merchant_identity_mismatch')
  // A self-presented PayPal credential proves only the account it can read.
  // Merchant identity becomes VERIFIED solely against a fingerprint previously
  // pinned by an independent, trusted, immutable server-side merchant record.
  const pinned=expectedMerchantFingerprint!==undefined
  return Object.freeze({ok:true,
   code:pinned?'live_merchant_identity_read_verified':'live_merchant_candidate_read',
   environment:'live',merchantFingerprint,merchantIdentityVerified:pinned,
   planReadVerified:true,webhookReadVerified:true,webhookDeliveryVerified:false,
   mayCharge:false,mayActivate:false})
 }catch{return invalid(unavailable)}
}


// Bridge from a server-owned immutable generation to the secret provisioner.
// The 'merchantFingerprint' argument MUST come from readGeneration() after
// verifying the admin session, not from the browser. No fingerprint == no
// merchant identity approval, even when PayPal OAuth/plan/webhook all pass.
export function createPazoLiveVerifiedMerchantResources({fetchImpl=fetch}={}){
 if(typeof fetchImpl!=='function')throw Error('live_merchant_verifier_unavailable')
 return async function verifyProviderResources({environment,clientId,clientSecret,
  planId,webhookId,merchantGeneration,merchantFingerprint}={}){
  const denied=()=>Object.freeze({oauthVerified:false,planVerified:false,
   webhookVerified:false,merchantIdentityVerified:false,isLive:false,mayCharge:false})
  if(!HASH.test(merchantFingerprint||''))return denied()
  let verified
  try{
   verified=await readLivePaypalMerchantIdentity({environment,clientId,clientSecret,
    planId,webhookId,merchantGeneration,
    expectedMerchantFingerprint:merchantFingerprint,fetchImpl})
  }catch{return denied()}
  if(verified?.ok!==true||verified.merchantIdentityVerified!==true||
   verified.merchantFingerprint!==merchantFingerprint||
   verified.planReadVerified!==true||verified.webhookReadVerified!==true||
   verified.webhookDeliveryVerified!==false)return denied()
  return Object.freeze({oauthVerified:true,planVerified:true,
   webhookVerified:true,merchantIdentityVerified:true,isLive:true,mayCharge:false})
 }
}
