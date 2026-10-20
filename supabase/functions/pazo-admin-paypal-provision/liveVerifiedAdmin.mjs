// PAZO F16: unreleased privileged admin identity gate for merchant secrets.
// GoTrue owns identity, the hosted pazo_is_admin RPC owns authorization,
// and a DIFFERENT trusted backend must prove recent reauthentication.
// No parsing of unsigned JWT claims, no user_metadata or frontend admin flags.
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const JWT=/^Bearer [A-Za-z0-9_-]{2,2048}\.[A-Za-z0-9_-]{2,2048}\.[A-Za-z0-9_-]{2,2048}$/
export function createPazoLiveVerifiedAdmin({
 supabaseUrl,publishableKey,fetchImpl=fetch,proveFreshReauthentication
}={}){
 if(supabaseUrl!==PROJECT||typeof publishableKey!=='string'||
   publishableKey.length<20||publishableKey.length>8192||
   /\s/.test(publishableKey)||typeof fetchImpl!=='function')
  throw Error('privileged_admin_config_unavailable')
 return async function authenticateAdmin(request){
  if(!(request instanceof Request)||request.method!=='POST')return null
  const bearer=request.headers.get('authorization')||''
  if(!JWT.test(bearer))return null
  // Checking GoTrue user first limits work with untrusted bearer strings.
  let id
  try{
   const res=await fetchImpl(PROJECT+'/auth/v1/user',{
    method:'GET',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(8000),
    headers:{apikey:publishableKey,Authorization:bearer,Accept:'application/json'}
   })
   if(!res?.ok||res.status!==200)return null
   const data=await res.json()
   if(!UUID.test(data?.id||'')||data?.is_anonymous===true||
     (data?.aud!==undefined&&data.aud!=='authenticated'))return null
   id=data.id
  }catch{return null}
  // The signed-in user's token, NOT service_role, must authorize admin.
  let allowed
  try{
   const res=await fetchImpl(PROJECT+'/rest/v1/rpc/pazo_is_admin',{
    method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(8000),
    headers:{apikey:publishableKey,Authorization:bearer,
     'content-type':'application/json',Accept:'application/json'},
    body:'{}'
   })
   if(!res?.ok||res.status!==200)return null
   allowed=await res.json()
  }catch{return null}
  if(allowed!==true||typeof proveFreshReauthentication!=='function')
   return null
  // A refreshed access token is NOT proof of recent password/MFA challenge.
  // This callback needs trusted server session state bound to this request.
  let fresh
  try{fresh=await proveFreshReauthentication({actorId:id,request})}
  catch{return null}
  return fresh===true?
   Object.freeze({id,isAdmin:true,freshSession:true}):null
 }
}
