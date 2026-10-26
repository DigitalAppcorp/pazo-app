// MFA-authorized, source-only until an explicit production deployment gate.
// No inbound user IDs or payment controls; all PayPal evidence is read-only.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoF18AdminOriginalAuditHandler}
 from './handler.mjs'
import {createPazoLivePrivilegedAdmin}
 from '../pazo-admin-paypal-provision/liveAuthenticatedAdminFactory.mjs'
import {createPazoLiveServiceRpc}
 from '../pazo-paypal-live-checkout/liveSqlServiceAdapters.mjs'
import {createPazoLiveVaultHistoricalVerification}
 from '../pazo-paypal-live-webhook/liveHistoricalReadPipeline.mjs'
import {createOriginalQaAudit}
 from '../pazo-paypal-live-worker/qaOriginalAudit.mjs'
function setup(){
 try{
  const supabaseUrl=Deno.env.get('SUPABASE_URL')
  const serviceRoleKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const publishableKey=Deno.env.get('SUPABASE_ANON_KEY')
  const authenticateAdmin=createPazoLivePrivilegedAdmin({supabaseUrl,publishableKey})
  const rpc=createPazoLiveServiceRpc({projectUrl:supabaseUrl,serviceRoleKey})
  const historical=createPazoLiveVaultHistoricalVerification({
   supabaseUrl,serviceRoleKey,released:true
  })
  const readOriginalAudit=createOriginalQaAudit({rpc,historical,scopeVariant:'admin_postcampaign'})
  return createPazoF18AdminOriginalAuditHandler({
   released:true,authenticateAdmin,readOriginalAudit
  })
 }catch{return createPazoF18AdminOriginalAuditHandler()}
}
Deno.serve(setup())
