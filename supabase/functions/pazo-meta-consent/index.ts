// #169: candidate withdrawal-only Supabase Edge endpoint, NOT deployed.
// A separate privacy/GO review is required before changing the flag.
// This endpoint does NOT install Pixel, read the Meta CAPI token,
// transmit to Meta, or accept permission grants.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createMetaWithdrawalHandler} from './withdrawCore.mjs'
import {createMetaWithdrawalProvider} from './withdrawAdapter.mjs'

const META_WITHDRAW_ENDPOINT_RELEASED=false
function setup(){
  if(!META_WITHDRAW_ENDPOINT_RELEASED)return createMetaWithdrawalHandler()
  try {
    const provider=createMetaWithdrawalProvider({
      url:Deno.env.get('SUPABASE_URL'),
      anonKey:Deno.env.get('SUPABASE_ANON_KEY'),
      serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    })
    return createMetaWithdrawalHandler({released:true,...provider})
  }catch{return createMetaWithdrawalHandler()}
}
Deno.serve(setup())
