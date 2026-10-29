import {captureAnalyticsRequest} from './analyticsPreference'
import {BEHAVIOR_COLLECTION_ENABLED} from './behaviorRuntime'
import {parsePazoCampaign} from './attribution'
import {requestLandingChallenge} from './landingChallenge'
import {supabase} from '../../services/supabaseClient'
import {observeAnonymous} from './intelligenceRuntime'

type PreregStep='signup_cta'|'signup_start'|'signup_requested'|'signup_error'
const sent=new Set<PreregStep>()
/** One request per closed step per page lifetime, no anonymous identity or journey. */
export function observePrereg(step:PreregStep){
 const current=captureAnalyticsRequest();if(!current())return
 if(!BEHAVIOR_COLLECTION_ENABLED||typeof window==='undefined'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl===true||document.visibilityState!=='visible'||sent.has(step))return
 const attr=parsePazoCampaign(window.location.search,Date.now())
 if(!attr){observeAnonymous(step);return}
 sent.add(step)
 void requestLandingChallenge().then(token=>token&&current()?supabase.functions.invoke('pazo-marketing-landing',{
  headers:{'x-pazo-challenge':token},body:{utm_source:attr.source,utm_medium:attr.medium,utm_campaign:attr.campaign,utm_content:attr.creative,step},
 }):undefined).catch(()=>{/* No retry, identity, signup delay or error text. */})
}
