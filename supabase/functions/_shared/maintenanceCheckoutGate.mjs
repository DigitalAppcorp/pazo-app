const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const NEW_ACTIONS=new Set(['begin','retry_begin','recover_retry','resume_approval'])
export const requiresMaintenanceCheckoutAdmission=action=>NEW_ACTIONS.has(action)
/** Server-only admission; failure denies CREATE, never blocks cancel/status/intake. */
export async function maintenanceAllowsNewCheckout({projectUrl,serviceKey,fetchImpl=fetch}={}){
 if(projectUrl!==PROJECT||typeof serviceKey!=='string'||serviceKey.length<24||typeof fetchImpl!=='function')return false
 try{
  const response=await fetchImpl(PROJECT+'/rest/v1/rpc/pazo_f17_service_new_checkout_allowed',{
   method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000),
   headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'content-type':'application/json'},body:'{}'
  })
  if(response.status!==200||!response.ok)return false
  const raw=await response.text()
  return raw.length<=16&&JSON.parse(raw)===true
 }catch{return false}
}
