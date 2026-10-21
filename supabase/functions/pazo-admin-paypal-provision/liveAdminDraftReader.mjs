// Server-side read of the currently stored PayPal draft under SAME admin JWT.
// It does not read Vault, service-role credentials or browser-supplied plan data.
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const JWT=/^Bearer [A-Za-z0-9_-]{2,2048}\.[A-Za-z0-9_-]{2,4096}\.[A-Za-z0-9_-]{2,4096}$/
const fail=()=>{throw Error('admin_live_draft_read_unavailable')}
export function createPazoAdminLiveDraftReader({
 supabaseUrl,publishableKey,fetchImpl=fetch
}={}){
 if(supabaseUrl!==PROJECT||typeof publishableKey!=='string'||
   publishableKey.length<20||publishableKey.length>8192||
   /\s/.test(publishableKey)||typeof fetchImpl!=='function')fail()
 return async function readAdminSettings({request}={}){
  if(!(request instanceof Request)||request.method!=='POST')fail()
  const bearer=request.headers.get('authorization')||''
  if(!JWT.test(bearer))fail()
  let response
  try{response=await fetchImpl(PROJECT+'/rest/v1/rpc/pazo_admin_paypal_settings',{
   method:'POST',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(8000),
   headers:{apikey:publishableKey,Authorization:bearer,
    Accept:'application/json','content-type':'application/json'},
   body:'{}'
  })}catch{fail()}
  if(!response?.ok||response.status!==200||
   !/^application\/json(?:\s*;|$)/i.test(response.headers?.get?.('content-type')||''))fail()
  let raw
  try{raw=await response.text()}catch{fail()}
  if(typeof raw!=='string'||raw.length>16384)fail()
  let settings
  try{settings=JSON.parse(raw)}catch{fail()}
  if(!settings||typeof settings!=='object'||Array.isArray(settings)||
    !Array.isArray(settings.environments)||settings.environments.length!==2)fail()
  const sanitized=settings.environments.map(x=>({
   environment:x?.environment,plan_id:x?.plan_id,
   price_minor:x?.price_minor,return_origin:x?.return_origin,
   currency:x?.currency,interval_unit:x?.interval_unit,
   webhook_id:x?.webhook_id
  }))
  return Object.freeze({
   active_environment:settings.active_environment,
   live_checkout_enabled:settings.live_checkout_enabled,
   environments:Object.freeze(sanitized)
  })
 }
}
