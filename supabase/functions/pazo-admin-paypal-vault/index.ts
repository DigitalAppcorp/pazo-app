// F16 operator-only, nonfinancial PayPal Live credential staging.
// Uses existing Supabase Vault under a freshly verified admin+TOTP session.
// Hard-disabled until CI, SQL permission audit and PO review of release path.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveVaultSetup} from './liveVaultSetup.mjs'
import {createPazoLivePrivilegedAdmin}
 from '../pazo-admin-paypal-provision/liveAuthenticatedAdminFactory.mjs'
import {createPazoAdminLiveDraftReader}
 from '../pazo-admin-paypal-provision/liveAdminDraftReader.mjs'
import {createLiveResourceStore}
 from '../pazo-admin-paypal-live-inspect/store.mjs'
const RELEASE_APPROVED=false
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const fail=()=>{throw Error('secure_configuration_unavailable')}
function setup(){
 if(!RELEASE_APPROVED)return createPazoLiveVaultSetup()
 try{
  const url=Deno.env.get('SUPABASE_URL')
  const anon=Deno.env.get('SUPABASE_ANON_KEY')
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if(url!==PROJECT||!anon||!service)fail()
  const authenticateAdmin=createPazoLivePrivilegedAdmin({
   supabaseUrl:url,publishableKey:anon
  })
  const readSettings=createPazoAdminLiveDraftReader({
   supabaseUrl:url,publishableKey:anon
  })
  const {readReservation}=createLiveResourceStore({
   projectUrl:url,serviceRoleKey:service
  })
  const userRpc=async(request:Request,name:string,payload:object)=>{
   const bearer=request.headers.get('authorization')||''
   if(!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(bearer))fail()
   return await fetch(PROJECT+'/rest/v1/rpc/'+name,{
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000),
    headers:{apikey:anon,Authorization:bearer,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify(payload)
   })
  }
  const saveVault=async({request,clientId,clientSecret}:{request:Request,
   clientId:string,clientSecret:string})=>{
   const response=await userRpc(request,'pazo_admin_paypal_save_credentials',{
    p_environment:'live',p_client_id:clientId,p_client_secret:clientSecret
   })
   if(!response.ok||response.status!==200)return false
   return await response.json()===true
  }
  const readbackVault=async({request,planId,webhookId}:{request:Request,
   planId:string,webhookId:string})=>{
   const response=await userRpc(request,'pazo_admin_paypal_settings',{})
   if(!response.ok||response.status!==200)return false
   const result=await response.json()
   const live=result?.environments?.filter((x:Record<string,unknown>)=>x.environment==='live')
   return result?.active_environment==='sandbox'&&
    result.live_checkout_enabled===false&&live?.length===1&&
    live[0].plan_id===planId&&live[0].webhook_id===webhookId&&
    live[0].client_id_stored===true&&live[0].client_secret_stored===true
  }
  return createPazoLiveVaultSetup({released:true,authenticateAdmin,
   readSettings,readReservation,saveVault,readbackVault})
 }catch{return createPazoLiveVaultSetup()}
}
Deno.serve(setup())
