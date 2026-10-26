// Prepared server-only Cloudflare Turnstile adapter. No logging, IP forwarding,
// caching, token persistence, retries or client assertion of bot verification.
const VERIFY='https://challenges.cloudflare.com/turnstile/v0/siteverify'
export function createMarketingChallengeVerifier({secret,hostname='pazo-app.vercel.app',fetchImpl=fetch,clock=()=>Date.now()}={}){
 if(typeof secret!=='string'||secret.length<20||secret.length>512||!/^\S+$/.test(secret)||hostname!=='pazo-app.vercel.app')throw Error('marketing_challenge_not_configured')
 return async token=>{
  if(typeof token!=='string'||token.length<10||token.length>2048||! /^[\x21-\x7e]+$/.test(token))return false
  try{
   const response=await fetchImpl(VERIFY,{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
    headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret,response:token}).toString()})
   if(response.status!==200||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')||''))return false
   const raw=await response.text();if(raw.length>8192)return false
   const value=JSON.parse(raw),at=Date.parse(value.challenge_ts),now=clock()
   return value.success===true&&value.hostname===hostname&&value.action==='pazo_marketing_landing'&&
    Number.isFinite(at)&&Number.isFinite(now)&&at<=now+30000&&at>=now-300000
  }catch{return false}
 }
}
