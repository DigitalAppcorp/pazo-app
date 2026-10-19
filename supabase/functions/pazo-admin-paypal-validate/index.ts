// Administrative PayPal OAuth credential check. No checkout or money movement.
// JWT verified by Supabase gateway AND owner identity checked with GoTrue.
// Secrets remain in Vault, are read only on this Edge Function via service_role.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
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
 try{
  const body=await req.json()
  env=body?.environment
  if(!['sandbox','live'].includes(env)||Object.keys(body).length!==1)
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
  const data=await rpc('pazo_admin_paypal_service_credentials',{
   p_environment:env,p_actor:user.id
  })
  if(!data.ok)return json({ok:false,code:'configuration_unavailable'},503,cors)
  const credentials=await data.json()
  if(!credentials?.client_id||!credentials?.client_secret)
   return json({ok:false,code:'credentials_not_configured'},409,cors)
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
  await rpc('pazo_admin_paypal_service_mark_validation',{
   p_environment:env,p_actor:user.id,p_success:validated
  })
  return json({ok:validated,environment:env,
   code:validated?'credentials_valid':'credentials_invalid',
   live_checkout_enabled:false},validated?200:422,cors)
 }catch{
  return json({ok:false,code:'provider_unavailable'},503,cors)
 }
})
