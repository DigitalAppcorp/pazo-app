// Issue130: validate the real provider while the independent DB gate stays OFF.
// A valid challenge cannot collect until retention/collection pass their gates.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createMarketingLandingHandler} from './landingCore.mjs'
import {createMarketingLandingSubmit,createMarketingChallengeClaim,createMarketingPreregSubmit} from './landingAdapter.mjs'
import {createMarketingChallengeVerifier} from './challengeVerifier.mjs'
import {createMarketingSingleUseVerifier} from './singleUseVerifier.mjs'
const MARKETING_LANDING_RELEASED=true
const BEHAVIOR_PREREG_RELEASED=true
function setup(){
  if(!MARKETING_LANDING_RELEASED)return createMarketingLandingHandler()
  try {
    const submit=createMarketingLandingSubmit({
      url:Deno.env.get('SUPABASE_URL'),
      serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    })
    const verifyChallenge=createMarketingSingleUseVerifier({
      verifyProvider:createMarketingChallengeVerifier({secret:Deno.env.get('PAZO_MARKETING_TURNSTILE_SECRET')}),
      claimDigest:createMarketingChallengeClaim({url:Deno.env.get('SUPABASE_URL'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}),
    })
    const submitPrereg=BEHAVIOR_PREREG_RELEASED?createMarketingPreregSubmit({url:Deno.env.get('SUPABASE_URL'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}):null
    return createMarketingLandingHandler({released:true,submit,verifyChallenge,preregReleased:BEHAVIOR_PREREG_RELEASED,submitPrereg})
  }catch{return createMarketingLandingHandler()}
}
Deno.serve(setup())
