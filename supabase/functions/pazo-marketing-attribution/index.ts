// Prepared but strictly INERT. Never activate without explicit PO GO,
// approved consent/retention, verified JWT and service-only RPC bridge.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createMarketingIntakeHandler } from './intakeCore.mjs'
const MARKETING_INTAKE_RELEASED = false
Deno.serve(createMarketingIntakeHandler({ released: MARKETING_INTAKE_RELEASED }))
