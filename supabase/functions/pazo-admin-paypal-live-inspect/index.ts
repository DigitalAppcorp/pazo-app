// Nonfinancial admin resource check, authorized under the beta completion order.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createLiveResourceInspection} from './handler.mjs'
import {createLiveResourceStore} from './store.mjs'
import {createPazoLivePrivilegedAdmin}
 from '../pazo-admin-paypal-provision/liveAuthenticatedAdminFactory.mjs'
import {createPazoAdminLiveDraftReader}
 from '../pazo-admin-paypal-provision/liveAdminDraftReader.mjs'
const READ_ONLY_INSPECTION_RELEASED=true
function handler(){
 try{
  const projectUrl=Deno.env.get('SUPABASE_URL')
  const publishableKey=Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const {readReservation,recordResources}=createLiveResourceStore({projectUrl,serviceRoleKey})
  return createLiveResourceInspection({released:READ_ONLY_INSPECTION_RELEASED,
   authenticateAdmin:createPazoLivePrivilegedAdmin({supabaseUrl:projectUrl,publishableKey}),
   readAdminSettings:createPazoAdminLiveDraftReader({supabaseUrl:projectUrl,publishableKey}),
   readReservation,recordResources})
 }catch{return createLiveResourceInspection()}
}
Deno.serve(handler())
