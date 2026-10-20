// PAZO F16 — Future Edge admin secret management route.
// NOT DEPLOYED. No privileges released until separate PO gate.
// Do not flip to true unless the full authenticated orchestration is wired
// and tested with short-lived admin identity and project-scoped PAT.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveProvisioningIntake} from './intake.mjs'
const RELEASE_APPROVED=false
Deno.serve(createPazoLiveProvisioningIntake({released:RELEASE_APPROVED}))
