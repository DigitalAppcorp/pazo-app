import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPublicSupporterAdminHandler} from './handler.mjs'
import {createPazoLivePrivilegedAdmin} from '../pazo-admin-paypal-provision/liveAuthenticatedAdminFactory.mjs'
import {createPazoLiveServiceRpc} from '../pazo-paypal-live-checkout/liveSqlServiceAdapters.mjs'
function setup(){
 try{
  const supabaseUrl=Deno.env.get('SUPABASE_URL'),serviceRoleKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authenticateAdmin=createPazoLivePrivilegedAdmin({supabaseUrl,publishableKey:Deno.env.get('SUPABASE_ANON_KEY')})
  const rpc=createPazoLiveServiceRpc({projectUrl:supabaseUrl,serviceRoleKey})
  return createPublicSupporterAdminHandler({authenticateAdmin,change:({actorId,action,revision,requestId}:{actorId:string;action:string;revision:number;requestId:string})=>rpc('publicSupporterAdmin',{p_actor:actorId,p_action:action,p_revision:revision,p_request:requestId})})
 }catch{return createPublicSupporterAdminHandler()}
}
Deno.serve(setup())

