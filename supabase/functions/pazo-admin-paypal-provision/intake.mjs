// PAZO F16 — Admin Live Edge provisioning HTTP boundary (HOSTED INERT).
// RELEASE OFF by default. Requires verified Supabase JWT & trusted admin
// permission adapter passed to liveEdgeProvisioning.mjs after separate GO.
const TARGET='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-admin-paypal-provision'
const JSON_TYPE=/^application\/json(?:\s*;\s*charset=utf-8)?$/i
const BEARER=/^Bearer [A-Za-z0-9_\-]+(?:\.[A-Za-z0-9_\-]+){2}$/
const MAX_BODY=2048
const deny=(status,code)=>new Response(JSON.stringify({
 ok:false,code,liveActivated:false,mayCharge:false
}),{status,headers:{'content-type':'application/json','cache-control':'no-store'}})
const allowedKeys=['merchantGeneration','clientId','clientSecret',
 'confirmation','expectedRevision']
export function createPazoLiveProvisioningIntake({released=false,provision}={}){
 return async req=>{
  if(released!==true)return deny(503,'live_provisioning_not_released')
  if(!(req instanceof Request)||req.method!=='POST'||typeof provision!=='function')
   return deny(405,'provisioning_unavailable')
  if(req.url!==TARGET||!BEARER.test(req.headers.get('authorization')||'')||
   !JSON_TYPE.test(req.headers.get('content-type')||''))
   return deny(400,'invalid_provisioning_request')
  if(Number(req.headers.get('content-length'))>MAX_BODY)
   return deny(413,'provisioning_request_too_large')
  let text
  try{text=await req.text()}catch{return deny(400,'invalid_provisioning_request')}
  if(typeof text!=='string'||new TextEncoder().encode(text).byteLength>MAX_BODY)
   return deny(413,'provisioning_request_too_large')
  let data
  try{data=JSON.parse(text)}catch{return deny(400,'invalid_provisioning_request')}
  if(!data||Array.isArray(data)||typeof data!=='object'||
   Object.keys(data).length!==allowedKeys.length||
   Object.keys(data).some(k=>!allowedKeys.includes(k)))
   return deny(400,'invalid_provisioning_request')
  let outcome
  try{outcome=await provision({...data,request:req})}
  catch{return deny(503,'provisioning_backend_unavailable')}
  if(outcome?.ok===true&&outcome?.code==='generation_secret_names_confirmed'&&
   outcome?.liveActivated===false&&outcome?.mayCharge===false&&
   outcome?.credentialsExposed===false)
   return new Response(JSON.stringify({ok:true,
    code:'generation_secret_names_confirmed',liveActivated:false,
    mayCharge:false}),{status:202,headers:{
    'content-type':'application/json','cache-control':'no-store'}})
  // Never reflect backend errors or request fields. In particular no
  // client_secret, PAT, PayPal OAuth token, plan, merchant fingerprint.
  return deny(503,'provisioning_not_completed')
 }
}
