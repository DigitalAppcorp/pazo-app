// F16: immutable guard for updating ONLY an existing PayPal Sandbox webhook.
// No network, no credentials, no user data. Never log existing URLs.
import {assessPazoSandboxPlan} from './paypalSandboxPlanContract.mjs'
import {PAZO_REQUIRED_PAYPAL_EVENTS} from './paypalSandboxWebhookContract.mjs'
import {PAZO_SANDBOX_WEBHOOK_ID} from './paypalSandboxWebhookDestinationContract.mjs'
import {PAZO_F16_EXPECTED_WEBHOOK_URL} from './paypalSandboxResourceContract.mjs'

// These two were verified by the PO in the same PayPal Sandbox app (8 total).
// Preserve them; never silently delete existing subscription lifecycle events.
export const PAZO_PRESERVED_PAYPAL_EXTRA_EVENTS=Object.freeze([
 'BILLING.SUBSCRIPTION.CREATED',
 'BILLING.SUBSCRIPTION.RE-ACTIVATED',
])
// The Product Owner read the existing Sandbox webhook URL directly in PayPal.
// It points to the Supabase management dashboard, NOT an HTTP event listener.
// A different old URL is a hard stop, not permission to redirect another receiver.
export const PAZO_VERIFIED_PREVIOUS_SANDBOX_WEBHOOK_URL=
 'https://supabase.com/dashboard/project/mrybvqdebbgcayuvgkkr/functions'
const ORIGINAL=Object.freeze([...PAZO_REQUIRED_PAYPAL_EVENTS.slice(0,6),
 ...PAZO_PRESERVED_PAYPAL_EXTRA_EVENTS])
const ADDED=PAZO_REQUIRED_PAYPAL_EVENTS.slice(6)
const ALL_APPROVED=Object.freeze([...ORIGINAL,...ADDED])
function fail(reason){throw Error(reason)}
function namesForWebhook(hook){
 if(hook?.id!==PAZO_SANDBOX_WEBHOOK_ID)fail('webhook_identity_mismatch')
 if(typeof hook.url!=='string'||!hook.url||hook.url.length>2048)
   fail('webhook_destination_unreadable')
 if(!Array.isArray(hook.event_types) ||
   hook.event_types.some(x=>typeof x?.name!=='string'))
   fail('webhook_events_unreadable')
 const names=hook.event_types.map(x=>x.name)
 if(names.length!==new Set(names).size || names.includes('*'))
   fail('webhook_events_ambiguous')
 if(names.some(n=>!ALL_APPROVED.includes(n)) ||
   ORIGINAL.some(n=>!names.includes(n)))
   fail('webhook_events_unexpected')
 const pending=ADDED.filter(n=>!names.includes(n))
 if(pending.length!==3 && pending.length!==0)
   fail('webhook_events_partially_changed')
 if(pending.length===0 && hook.url!==PAZO_F16_EXPECTED_WEBHOOK_URL)
   fail('webhook_configuration_partially_changed')
 if(pending.length===3 && hook.url!==PAZO_VERIFIED_PREVIOUS_SANDBOX_WEBHOOK_URL)
   fail('webhook_previous_destination_not_verified')
 return names
}
export function buildApprovedF16WebhookPatch(plan,hook){
 const inspected=assessPazoSandboxPlan(plan)
 if(!inspected.ok || inspected.warnings.length)
   fail('plan_contract_mismatch')
 const names=namesForWebhook(hook)
 const alreadyConfigured=names.length===ALL_APPROVED.length &&
   hook.url===PAZO_F16_EXPECTED_WEBHOOK_URL
 if(alreadyConfigured)return Object.freeze({status:'already_configured',patch:null})
 if(names.length!==ORIGINAL.length)fail('webhook_events_unexpected')
 const operations=[
  {op:'replace',path:'/url',value:PAZO_F16_EXPECTED_WEBHOOK_URL},
  {op:'replace',path:'/event_types',value:[...names,...ADDED].map(name=>({name}))},
 ]
 return Object.freeze({status:'patch_required',patch:operations})
}
export function sameWebhookSnapshot(before,after){
 if(before?.id!==PAZO_SANDBOX_WEBHOOK_ID || after?.id!==PAZO_SANDBOX_WEBHOOK_ID)
   return false
 const events=obj=>Array.isArray(obj?.event_types)&&
   obj.event_types.every(x=>typeof x?.name==='string')?
   obj.event_types.map(x=>x.name).sort().join('|'):null
 return before.url===after.url&&events(before)!==null&&events(before)===events(after)
}
export function verifiedF16WebhookConfiguration(hook){
 if(hook?.id!==PAZO_SANDBOX_WEBHOOK_ID||
    hook.url!==PAZO_F16_EXPECTED_WEBHOOK_URL ||
    !Array.isArray(hook.event_types))return false
 const names=hook.event_types.map(x=>x?.name)
 return names.length===ALL_APPROVED.length &&
   new Set(names).size===names.length &&
   ALL_APPROVED.every(n=>names.includes(n))
}
