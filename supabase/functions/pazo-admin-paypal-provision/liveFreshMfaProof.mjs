// F16 PAZO — MFA step-up evidence, server-side ONLY, intentionally unreleased.
// Must ONLY be called AFTER Supabase GoTrue validated the EXACT bearer token
// through /auth/v1/user and pazo_is_admin under that same signed-in token.
// This parser does NOT verify JWT signatures by itself. It MUST NEVER become
// a stand-alone authorization gate or accept user_metadata as permissions.
// Require a RECENT TOTP event; JWT refresh or old aal2 session is insufficient.
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const ISSUER=PROJECT+'/auth/v1'
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const TOKEN=/^Bearer ([A-Za-z0-9_-]{2,2048})\.([A-Za-z0-9_-]{2,4096})\.([A-Za-z0-9_-]{2,4096})$/
const DEFAULT_WINDOW_SECONDS=300
const CLOCK_SKEW_SECONDS=30
function unpackPayload(part){
 if(typeof part!=='string'||part.length>4096||part.length<2||!/^[A-Za-z0-9_-]+$/.test(part))return null
 try{
  // Decode BASE64URL with strict UTF-8, not JSON extracted from untrusted
  // browser request fields or from the header without verifying GoTrue first.
  const padded=part.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-part.length%4)%4)
  const binary=atob(padded)
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0))
  const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))
  return data&&typeof data==='object'&&!Array.isArray(data)?data:null
 }catch{return null}
}
export function createPazoFreshMfaProof({
 nowSeconds=()=>Math.floor(Date.now()/1000),
 windowSeconds=DEFAULT_WINDOW_SECONDS
}={}){
 if(typeof nowSeconds!=='function'||windowSeconds!==DEFAULT_WINDOW_SECONDS)
  throw Error('fresh_mfa_contract_not_configured')
 return async function proveFreshReauthentication({actorId,request}={}){
  if(!UUID.test(actorId||'')||!(request instanceof Request)||request.method!=='POST')
   return false
  const token=request.headers.get('authorization')||''
  const match=TOKEN.exec(token)
  if(!match)return false
  const payload=unpackPayload(match[2])
  if(!payload||payload.iss!==ISSUER||payload.sub!==actorId||
   payload.role!=='authenticated'||payload.aud!=='authenticated'||
   payload.aal!=='aal2'||!UUID.test(payload.session_id||'')||
   payload.is_anonymous===true)return false
  const now=nowSeconds()
  if(!Number.isSafeInteger(now)||!Number.isSafeInteger(payload.iat)||
   !Number.isSafeInteger(payload.exp)||
   payload.iat>now+CLOCK_SKEW_SECONDS||
   payload.exp<=now||payload.iat>=payload.exp||
   !Array.isArray(payload.amr)||payload.amr.length>32)return false
  // Only TOTP proves a real second-factor challenge. OTP by itself may be
  // the first login factor and token_refresh is NEVER reauthentication.
  const latestMfa=payload.amr.filter(x=>
   x&&typeof x==='object'&&!Array.isArray(x)&&x.method==='totp'&&
   Number.isSafeInteger(x.timestamp)).reduce((max,x)=>
    Math.max(max,x.timestamp),-1)
  if(latestMfa<0||latestMfa>now+CLOCK_SKEW_SECONDS||
    now-latestMfa>windowSeconds)return false
  // The access token must be issued after the challenge's MFA event.
  // Allow 30s GoTrue issuance clock skew, but NOT a token issued hours before.
  if(payload.iat+CLOCK_SKEW_SECONDS<latestMfa)return false
  return true
 }
}
