// #169 CAPI worker. No event can exist while the database release gate is off.
// Admitted by the scheduler's single-use credential, never by a user.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createMetaWorkerRuntime} from './runtime.mjs'
import {createMetaMatchReader} from '../_shared/metaMatchReader.mjs'

const url=Deno.env.get('SUPABASE_URL')
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const settings={
  released:true,privacyReviewed:true,matchFieldsApproved:true,
  providerApproved:true,
  url,
  // Unset in production. An isolated project declares itself and gets QA only.
  isolatedOrigin:Deno.env.get('META_ISOLATED_SUPABASE_ORIGIN')??null,
  serviceKey,
  readSecret:(name:string)=>Deno.env.get(name),
  authenticate:async(token:string)=>{
    const response=await fetch(url+'/rest/v1/rpc/pazo_meta_worker_admit',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(6000),
      headers:{apikey:serviceKey!,authorization:'Bearer '+serviceKey,'content-type':'application/json'},
      body:JSON.stringify({p_token:token}),
    })
    return response.status===200&&await response.json()===true
  },
  readApprovedMatchField:createMetaMatchReader({
    enabled:true,
    privacyReviewed:true,
    sourceApproved:true,
    url,
    isolatedOrigin:Deno.env.get('META_ISOLATED_SUPABASE_ORIGIN')??null,
    serviceKey,
  }),
  apiVersion:'v26.0',
}
Deno.serve(createMetaWorkerRuntime(settings))
