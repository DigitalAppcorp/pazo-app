// F16: pure, redacted audit of EXISTING Sandbox resources. No network or mutations.
import {assessPazoSandboxPlan} from './paypalSandboxPlanContract.mjs'
import {PAZO_REQUIRED_PAYPAL_EVENTS} from './paypalSandboxWebhookContract.mjs'
import {PAZO_SANDBOX_WEBHOOK_ID} from './paypalSandboxWebhookDestinationContract.mjs'

export const PAZO_F16_EXPECTED_WEBHOOK_URL =
  'https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/f16-paypal-webhook'
const LEGACY_URL='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/paypal-webhook'

function destinationCategory(value) {
  if(typeof value!=='string'||!value||value.length>4096||
    /[\u0000-\u001f\u007f]/.test(value))return 'invalid_or_missing'
  let u
  try {u=new URL(value)} catch {return 'invalid_or_missing'}
  const expected=new URL(PAZO_F16_EXPECTED_WEBHOOK_URL)
  if(u.protocol!=='https:')return 'non_https'
  if(u.username||u.password||u.search||u.hash||u.port||value.includes('\\'))
    return 'has_extra_parameters_or_credentials'
  if(value===PAZO_F16_EXPECTED_WEBHOOK_URL)return 'f16_receiver'
  if(value===LEGACY_URL)return 'legacy_receiver_unsafe_for_f16'
  if(u.origin===expected.origin)return 'same_project_different_path'
  if(u.hostname.endsWith('.supabase.co'))return 'different_supabase_project'
  return 'different_host'
}
export function assessF16SandboxResources(plan,webhook) {
  const p=assessPazoSandboxPlan(plan)
  const w=webhook && typeof webhook==='object' && !Array.isArray(webhook) ? webhook : null
  const idMatches=w?.id===PAZO_SANDBOX_WEBHOOK_ID
  const eventTypes=Array.isArray(w?.event_types) ?
    new Set(w.event_types.map(e=>e?.name).filter(x=>typeof x==='string')) : new Set()
  const missingEvents=PAZO_REQUIRED_PAYPAL_EVENTS.filter(e=>!eventTypes.has('*')&&!eventTypes.has(e))
  const destination=idMatches?destinationCategory(w?.url):'not_available'
  return {
    environment:'sandbox',readOnly:true,
    resourcesAccessible:!!p.ok&&idMatches,
    plan:{ok:p.ok,issues:p.issues,warnings:p.warnings,summary:p.summary},
    webhook:{
      idMatches,
      destinationCategory:destination,
      destinationMatchesF16:destination==='f16_receiver',
      missingEvents,
      eventConfigurationComplete:!!idMatches&&missingEvents.length===0,
    },
    // Read access alone is NEVER permission to enable a receiver, checkout or entitlement.
    safeToActivate:false,
    disclaimer:'read_only_configuration_not_webhook_delivery_or_payment_proof',
  }
}
