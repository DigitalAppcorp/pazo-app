// PAZO F16 — PO-authorized nonfinancial Live generation reservation.
// Does not provision PayPal credentials, create PayPal objects or change checkout.
// Mandatory GoTrue owner+admin and recent signed TOTP claim before service RPC.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveMerchantBootstrapControl}
 from '../pazo-admin-paypal-provision/liveMerchantBootstrapControl.mjs'
import {createPazoLivePrivilegedAdmin}
 from '../pazo-admin-paypal-provision/liveAuthenticatedAdminFactory.mjs'
import {createPazoAdminLiveDraftReader}
 from '../pazo-admin-paypal-provision/liveAdminDraftReader.mjs'
import {createPazoLiveBootstrapSqlStore}
 from '../pazo-admin-paypal-provision/liveBootstrapSqlStore.mjs'

const RELEASE_APPROVED=true
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
function createHandler(){
 if(!RELEASE_APPROVED)return createPazoLiveMerchantBootstrapControl()
 try{
  const url=Deno.env.get('SUPABASE_URL')
  const key=Deno.env.get('SUPABASE_ANON_KEY')
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if(url!==PROJECT||!key||!service)throw Error('missing_hosted_config')
  const fetchImpl=fetch
  const authenticateAdmin=createPazoLivePrivilegedAdmin({
   supabaseUrl:url,publishableKey:key,fetchImpl
  })
  const readAdminSettings=createPazoAdminLiveDraftReader({
   supabaseUrl:url,publishableKey:key,fetchImpl
  })
  const {reserveGeneration}=createPazoLiveBootstrapSqlStore({
   projectUrl:url,serviceRoleKey:service,fetchImpl
  })
  return createPazoLiveMerchantBootstrapControl({
   released:true,authenticateAdmin,readAdminSettings,reserveGeneration
  })
 }catch{return createPazoLiveMerchantBootstrapControl()}
}
Deno.serve(createHandler())
