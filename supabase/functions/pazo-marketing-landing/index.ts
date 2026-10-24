// PUBLIC function for future aggregate signals; always fails closed.
// Deployment is NOT authorized. Endpoint explicitly returns 503 while OFF.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createMarketingLandingHandler} from './landingCore.mjs'
import {createMarketingLandingSubmit} from './landingAdapter.mjs'
const MARKETING_LANDING_RELEASED=false
function setup(){
  if(!MARKETING_LANDING_RELEASED)return createMarketingLandingHandler()
  try {
    const submit=createMarketingLandingSubmit({
      url:Deno.env.get('SUPABASE_URL'),
      serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    })
    return createMarketingLandingHandler({released:true,submit})
  }catch{return createMarketingLandingHandler()}
}
Deno.serve(setup())
