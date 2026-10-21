// PAZO F16 — GoTrue verified owner identity. SERVER ONLY / NOT DEPLOYED.
// Never trust a user id from JSON, URL, localStorage or unverified JWT parsing.
// A valid GoTrue response is necessary, not sufficient, for paid membership:
// account admission, versioned consent and immutable merchant binding follow.
const SUPABASE_ORIGIN='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const BEARER=/^Bearer ([A-Za-z0-9_-]{2,2048}\.[A-Za-z0-9_-]{2,2048}\.[A-Za-z0-9_-]{2,2048})$/
export function createPazoLiveGoTrueOwnerResolver({
 supabaseUrl,anonKey,fetchImpl=fetch
}={}){
 if(supabaseUrl!==SUPABASE_ORIGIN||
    typeof anonKey!=='string'||anonKey.length<20||anonKey.length>8192||
    /\s/.test(anonKey)||typeof fetchImpl!=='function')
  throw Error('live_auth_backend_not_configured')
 return async request=>{
  if(!(request instanceof Request)||request.method!=='POST')return null
  const auth=request.headers.get('authorization')||''
  if(!BEARER.test(auth))return null
  try{
   const response=await fetchImpl(SUPABASE_ORIGIN+'/auth/v1/user',{
    method:'GET',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{apikey:anonKey,authorization:auth,accept:'application/json'}
   })
   if(response?.status!==200||!response?.ok)return null
   const user=await response.json()
   if(!user||typeof user!=='object'||Array.isArray(user)||
    !UUID.test(user.id||'')||user.is_anonymous===true||
    (user.aud!==undefined&&user.aud!=='authenticated'))return null
   return user.id
  }catch{return null}
 }
}
