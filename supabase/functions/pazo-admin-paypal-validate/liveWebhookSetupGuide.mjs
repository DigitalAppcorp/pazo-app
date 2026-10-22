// PAZO F16: read-only instructions for the PayPal Business Live app.
// No subscription, webhook, provider, DB or secret writes occur here.
// The actual merchant generation must be server-verified from hosted DB;
// NEVER assume first generation is 1 just because a PayPal REST app exists.
import {liveWebhookUrlForGeneration,REQUIRED_EVENTS}
 from './liveProviderReadOnly.mjs'

const PLAN=/^P-[A-Za-z0-9]{10,75}$/
const blocked=reason=>Object.freeze({ready:false,reason,
 webhookUrl:null,eventTypes:[],mayCharge:false,mayActivateLive:false})

export function preparePazoLiveWebhookSetup({
 environment,merchantGeneration,serverGenerationVerified=false,
 planId,planVerified=false,liveCheckoutEnabled=false,killSwitch=true
}={}){
 if(environment!=='live')return blocked('not_live_environment')
 if(liveCheckoutEnabled!==false||killSwitch!==true)
  return blocked('financial_switch_must_remain_off')
 if(!PLAN.test(planId||''))return blocked('plan_id_not_staged')
 if(planVerified!==true)return blocked('plan_terms_not_verified')
 if(serverGenerationVerified!==true||!Number.isSafeInteger(merchantGeneration)||
  merchantGeneration<1||merchantGeneration>9999)
  return blocked('merchant_generation_not_verified')
 const webhookUrl=liveWebhookUrlForGeneration(merchantGeneration)
 if(!webhookUrl)return blocked('merchant_generation_not_verified')
 return Object.freeze({
  ready:true,reason:'ready_to_register_provider_webhook',
  webhookUrl,eventTypes:Object.freeze([...REQUIRED_EVENTS]),
  environment:'live',merchantGeneration,planId,
  mayCharge:false,mayActivateLive:false
 })
}
