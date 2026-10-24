// PUBLIC function for future aggregate signals; always fails closed.
// Deployment is NOT authorized. Endpoint explicitly returns 503 while OFF.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createMarketingLandingHandler} from './landingCore.mjs'
import {createMarketingLandingSubmit} from './landingAdapter.mjs'
import {createMarketingChallengeVerifier} from './challengeVerifier.mjs'
const MARKETING_LANDING_RELEASED=false
function setup(){
  if(!MARKETING_LANDING_RELEASED)return createMarketingLandingHandler()
  try {
    const submit=createMarketingLandingSubmit({
      url:Deno.env.get('SUPABASE_URL'),
      serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    })
    const verifyChallenge=createMarketingChallengeVerifier({secret:Deno.env.get('PAZO_MARKETING_TURNSTILE_SECRET')})
    return createMarketingLandingHandler({released:true,submit,verifyChallenge})
  }catch{return createMarketingLandingHandler()}
}
Deno.serve(setup())
