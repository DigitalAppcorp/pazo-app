// Issue130 candidate. Deploy only with verified-email and retention controls.
// The independent SQL collection gate and current purge health remain mandatory.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createMarketingIntakeHandler } from './intakeCore.mjs'
import { createMarketingProvider } from './intakeAdapter.mjs'

const MARKETING_INTAKE_RELEASED = true
function setup(){
  if(!MARKETING_INTAKE_RELEASED) return createMarketingIntakeHandler()
  try {
    const provider = createMarketingProvider({
      url:Deno.env.get('SUPABASE_URL'),
      anonKey:Deno.env.get('SUPABASE_ANON_KEY'),
      serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    })
    return createMarketingIntakeHandler({released:true,...provider})
  } catch { return createMarketingIntakeHandler() }
}
Deno.serve(setup())
