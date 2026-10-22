// P4 control only. No activation on deployment, credential save or GET.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveReleaseHandler} from './handler.mjs'
import {createPazoLivePrivilegedAdmin} from '../pazo-admin-paypal-provision/liveAuthenticatedAdminFactory.mjs'
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
function setup(){
 try{
  const url=Deno.env.get('SUPABASE_URL')
  const anon=Deno.env.get('SUPABASE_ANON_KEY')
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if(url!==PROJECT||!anon||!service)throw Error('config')
  const authenticateAdmin=createPazoLivePrivilegedAdmin({supabaseUrl:url,publishableKey:anon})
  const changeRelease=async({actorId,action,expectedRevision,requestId}:{
   actorId:string;action:string;expectedRevision:number;requestId:string})=>{
   const response=await fetch(PROJECT+'/rest/v1/rpc/pazo_f16_live_service_release_change',{
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
    headers:{apikey:service,Authorization:'Bearer '+service,'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_actor:actorId,p_action:action,p_expected_revision:expectedRevision,p_request:requestId})
   })
   if(!response.ok||response.status!==200)throw Error('release_unknown')
   return response.json()
  }
  return createPazoLiveReleaseHandler({authenticateAdmin,changeRelease})
 }catch{return createPazoLiveReleaseHandler()}
}
Deno.serve(setup())
