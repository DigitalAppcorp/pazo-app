// Read-only diagnostic of the existing F16 Sandbox merchant credentials.
// Never returns credentials, OAuth tokens, provider bodies or billing identities.
// Do not mistake OAuth success for a verified webhook, payment or Live readiness.
const SANDBOX_OAUTH='https://api-m.sandbox.paypal.com/v1/oauth2/token'
const LOCKED_PLAN='P-14V25407JP6850922NLHMDKI'
const present=(value)=>typeof value==='string'&&value.length>=8&&value.length<=512&&
 /^[\x21-\x7e]+$/.test(value)
export async function inspectLegacySandboxOAuth({get,fetchImpl}={}){
 const unavailable=()=>Object.freeze({ok:false,code:'legacy_gateway_unavailable'})
 if(typeof get!=='function'||typeof fetchImpl!=='function')return unavailable()
 const env=get('PAZO_F16_PAYPAL_ENV')
 const plan=get('PAZO_F16_PAYPAL_PLAN_ID')
 const webhook=get('PAZO_F16_PAYPAL_WEBHOOK_ID')
 const id=get('PAZO_F16_PAYPAL_CLIENT_ID')
 const secret=get('PAZO_F16_PAYPAL_CLIENT_SECRET')
 // Fail closed if the currently deployed flow no longer matches locked F16 QA.
 if(env!=='sandbox'||plan!==LOCKED_PLAN||
   !/^[A-Za-z0-9_-]{8,100}$/.test(webhook||'')||
   !present(id)||!present(secret)||id.includes(':'))return unavailable()
 try{
  const response=await fetchImpl(SANDBOX_OAUTH,{
   method:'POST',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(12000),
   headers:{Authorization:'Basic '+btoa(id+':'+secret),
    'content-type':'application/x-www-form-urlencoded',Accept:'application/json'},
   body:'grant_type=client_credentials',
  })
  if(!response?.ok)return unavailable()
  const value=await response.json()
  if(value?.token_type?.toLowerCase()!=='bearer'||
     !present(value?.access_token))return unavailable()
  return Object.freeze({ok:true,code:'legacy_gateway_oauth_valid'})
 }catch{return unavailable()}
}
