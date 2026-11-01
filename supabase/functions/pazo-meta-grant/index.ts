// #169 — candidate explicit grant endpoint. NOT DEPLOYED.
// Release remains OFF until updated bilingual notice, approved consent UX,
// verified-session DB migration, independent GPC and provider QA are complete.
// Never sends any conversion or accesses the CAPI token.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createMetaGrantHandler} from '../pazo-meta-consent/grantCore.mjs'
import {createMetaGrantProvider} from '../pazo-meta-consent/grantAdapter.mjs'
const META_GRANT_ENDPOINT_RELEASED=false
const META_CONSENT_PRIVACY_REVIEWED=false
function setup(){
 if(!META_GRANT_ENDPOINT_RELEASED||!META_CONSENT_PRIVACY_REVIEWED)
  return createMetaGrantHandler()
 try{
  const provider=createMetaGrantProvider({
   url:Deno.env.get('SUPABASE_URL'),
   anonKey:Deno.env.get('SUPABASE_ANON_KEY'),
   serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  })
  return createMetaGrantHandler({released:true,privacyReviewed:true,...provider})
 }catch{return createMetaGrantHandler()}
}
Deno.serve(setup())
