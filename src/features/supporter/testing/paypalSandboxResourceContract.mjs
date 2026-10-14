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
export function assessF16SandboxResources(plan,webhook,officialCatalog=null) {
  const p=assessPazoSandboxPlan(plan)
  const w=webhook && typeof webhook==='object' && !Array.isArray(webhook) ? webhook : null
  const idMatches=w?.id===PAZO_SANDBOX_WEBHOOK_ID
  // Only recognize names from our fixed, public PayPal event allowlist.
  // Never reflect arbitrary event names, original webhook URLs or payloads.
  const rawTypes=idMatches&&Array.isArray(w?.event_types)?w.event_types:[]
  const eventNames=rawTypes.map(e=>e?.name)
  const eventTypes=new Set(eventNames.filter(x=>typeof x==='string'))
  const recognizedEvents=PAZO_REQUIRED_PAYPAL_EVENTS.filter(e=>eventTypes.has(e))
  const missingEvents=PAZO_REQUIRED_PAYPAL_EVENTS.filter(e=>!eventTypes.has('*')&&!eventTypes.has(e))
  const missingSubscriptionEvents=PAZO_REQUIRED_PAYPAL_EVENTS.slice(0,6).filter(e=>!eventTypes.has(e))
  const unexpectedEventsCount=eventNames.filter(n=>!PAZO_REQUIRED_PAYPAL_EVENTS.includes(n)).length
  const duplicateEventsCount=eventNames.length-new Set(eventNames).size
  // Extra event names are emitted ONLY if independently confirmed by PayPal's
  // authenticated public event-type catalogue from the SAME Sandbox REST app.
  // Arbitrary strings from webhook registrations are NEVER reflected to stdout.
  const catalogTypes=Array.isArray(officialCatalog?.event_types)?
    officialCatalog.event_types:null
  const catalogValid=catalogTypes!==null &&
    catalogTypes.length>0 && catalogTypes.length<=500 &&
    catalogTypes.every(t=>typeof t?.name==='string')
  const documentedEventPattern=/^[A-Z][A-Z0-9-]*(?:\\.[A-Z][A-Z0-9-]*){1,5}$/
  const available=catalogValid?
    new Set(catalogTypes.map(t=>t.name).filter(n=>n.length<=128&&documentedEventPattern.test(n))):
    new Set()
  const additionalProviderEvents=eventNames.filter(n=>
    typeof n==='string' && !PAZO_REQUIRED_PAYPAL_EVENTS.includes(n) &&
    available.has(n) && documentedEventPattern.test(n))
  const unresolvedAdditionalEventsCount=unexpectedEventsCount-additionalProviderEvents.length
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
      configuredEventsCount:rawTypes.length,
      recognizedEvents,
      missingSubscriptionEvents,
      unexpectedEventsCount,
      additionalProviderEvents,
      unresolvedAdditionalEventsCount,
      officialCatalogStatus:catalogValid?'verified':'unavailable',
      duplicateEventsCount,
      wildcardPresent:eventTypes.has('*'),
      eventConfigurationComplete:!!idMatches&&missingEvents.length===0,
    },
    // Read access alone is NEVER permission to enable a receiver, checkout or entitlement.
    safeToActivate:false,
    disclaimer:'read_only_configuration_not_webhook_delivery_or_payment_proof',
  }
}
