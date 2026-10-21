// Administrative PayPal OAuth credential check. No checkout or money movement.
// JWT verified by Supabase gateway AND owner identity checked with GoTrue.
// Secrets remain in Vault, are read only on this Edge Function via service_role.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {inspectLegacySandboxOAuth} from './legacySandboxHealth.mjs'
import {inspectLivePaypalResources} from './liveProviderReadOnly.mjs'
const json=(body:Record<string,unknown>,status=200,origin='')=>
 new Response(JSON.stringify(body),{status,headers:{
  'content-type':'application/json','cache-control':'no-store',
  'vary':'Origin',...(origin?{'access-control-allow-origin':origin}:{})
 }})
const allow=(origin:string)=>{
 try{
  const u=new URL(origin)
  return (u.protocol==='https:'||
   (u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))&&
   u.pathname==='/'&&u.username===''&&u.password===''?origin:''
 }catch{return ''}
}
Deno.serve(async req=>{
 const cors=allow(req.headers.get('origin')||'')
 const headers={'access-control-allow-origin':cors,'access-control-allow-methods':'POST, OPTIONS',
  'access-control-allow-headers':'authorization,apikey,content-type,x-client-info','vary':'Origin'}
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers})
 if(req.method!=='POST')return json({ok:false,code:'method_not_allowed'},405,cors)
 const api=Deno.env.get('SUPABASE_URL')||''
 const anon=Deno.env.get('SUPABASE_ANON_KEY')||''
 const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
 const bearer=req.headers.get('authorization')||''
 if(!api.startsWith('https://')||!anon||!service||!bearer.startsWith('Bearer '))
  return json({ok:false,code:'configuration_unavailable'},503,cors)
 let env:string
 let inspectActive=false
 let inspectLive=false
 try{
  const body=await req.json()
  env=body?.environment
  inspectActive=body?.action==='inspect_active_sandbox'
  inspectLive=body?.action==='inspect_live_resources'
  if(!['sandbox','live'].includes(env)||
    (inspectActive
      ?(env!=='sandbox'||Object.keys(body).length!==2)
      :inspectLive
        ?(env!=='live'||Object.keys(body).length!==2)
        :(body?.action!==undefined||Object.keys(body).length!==1)))
   return json({ok:false,code:'invalid_request'},400,cors)
 }catch{return json({ok:false,code:'invalid_request'},400,cors)}
 try{
  const who=await fetch(api+'/auth/v1/user',{
   method:'GET',headers:{apikey:anon,authorization:bearer},
   signal:AbortSignal.timeout(10000),redirect:'error',cache:'no-store'
  })
  if(!who.ok)return json({ok:false,code:'unauthorized'},401,cors)
  const user=await who.json()
  if(!user?.id||typeof user.id!=='string')
   return json({ok:false,code:'unauthorized'},401,cors)
  const rpc=async(path:string,body:Record<string,unknown>)=>
   fetch(api+'/rest/v1/rpc/'+path,{method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(10000),
    headers:{apikey:service,authorization:'Bearer '+service,
     'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify(body)})
  if(inspectActive){
   // Verify the caller is a real PAZO administrator using their OWN JWT.
   // The service-role token must never authorize the browser caller by itself.
   const permission=await fetch(api+'/rest/v1/rpc/pazo_admin_paypal_settings',{
    method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(10000),
    headers:{apikey:anon,authorization:bearer,
     'content-type':'application/json',accept:'application/json'},body:'{}'
   })
   if(!permission.ok)return json({ok:false,code:'admin_required'},403,cors)
   const active=await permission.json()
   if(active?.checkout_source!=='legacy_sandbox_checkout'||
      active?.active_environment!=='sandbox'||active?.live_checkout_enabled!==false)
    return json({ok:false,code:'active_source_unverified'},409,cors)
   const result=await inspectLegacySandboxOAuth({
    get:(name:string)=>Deno.env.get(name),fetchImpl:fetch
   })
   return json({...result,source:'edge_legacy',environment:'sandbox',
      changes_checkout:false,live_checkout_enabled:false},result.ok?200:503,cors)
  }
  const data=await rpc('pazo_admin_paypal_service_credentials',{
   p_environment:env,p_actor:user.id
  })
  if(!data.ok)return json({ok:false,code:'configuration_unavailable'},503,cors)
  const credentials=await data.json()
  if(!credentials?.client_id||!credentials?.client_secret)
   return json({ok:false,code:'credentials_not_configured'},409,cors)
  if(inspectLive){
   // Admin GoTrue owner was resolved above; service RPC checks the SAME
   // authenticated owner against the restricted admin grant before Vault read.
   // Read-only merchant verification: no checkout, key copy or switch.
   const evidence=await inspectLivePaypalResources({
    environment:'live',clientId:credentials.client_id,
    clientSecret:credentials.client_secret,planId:credentials.plan_id,
    webhookId:credentials.webhook_id,fetchImpl:fetch
   })
   return json({...evidence,changes_checkout:false,
    live_checkout_enabled:false},evidence.ok?200:409,cors)
  }
  const endpoint=env==='sandbox'?
   'https://api-m.sandbox.paypal.com/v1/oauth2/token':
   'https://api-m.paypal.com/v1/oauth2/token'
  const token=await fetch(endpoint,{
   method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
   headers:{Authorization:'Basic '+btoa(credentials.client_id+':'+credentials.client_secret),
    'content-type':'application/x-www-form-urlencoded',Accept:'application/json'},
   body:'grant_type=client_credentials'
  })
  const validated=token.ok
  // Never relay OAuth response body/tokens, merchant identifiers or secrets.
  const saved=await rpc('pazo_admin_paypal_service_mark_validation',{
   p_environment:env,p_actor:user.id,p_success:validated
  })
  if(!saved.ok||await saved.json()!==true)
   return json({ok:false,code:'validation_record_unavailable'},503,cors)
  return json({ok:validated,environment:env,
   code:validated?'credentials_valid':'credentials_invalid',
   live_checkout_enabled:false},validated?200:422,cors)
 }catch{
  return json({ok:false,code:'provider_unavailable'},503,cors)
 }
})
