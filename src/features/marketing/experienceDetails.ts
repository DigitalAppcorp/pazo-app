import {supabase} from '../../services/supabaseClient'
import {browserAnalyticsAllowed,captureAnalyticsRequest} from './analyticsPreference'
import {requestLandingChallenge} from './landingChallenge'
import {campaignFields} from './campaignExperience'
import {EXPERIENCE_DETAILS,classifyArrival,signupFailureFromCode,validExperienceDetail,type DemoScreen,type ExperienceDetailKind,type SignupFailure} from '../../../supabase/functions/_shared/experienceDetails.mjs'

/** OFF until the runbook is complete: notice, SQL, Edge, then this build flag. */
export const EXPERIENCE_DETAILS_ENABLED=import.meta.env.VITE_PAZO_EXPERIENCE_DETAILS_ENABLED==='true'
const allowed=()=>EXPERIENCE_DETAILS_ENABLED&&browserAnalyticsAllowed()&&typeof window!=='undefined'&&typeof navigator!=='undefined'&&(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl!==true&&window.location.hostname==='pazo-app.vercel.app'&&navigator.webdriver!==true
const sent=new Set<string>()
const body=(kind:ExperienceDetailKind,value:string)=>({detail_kind:kind,detail_value:value,...campaignFields()})

/** One daily counter per closed category and page lifetime. No text, identifier, retry or UI dependency. */
export function observeDetail(kind:ExperienceDetailKind,value:string){
 const key=kind+':'+value
 if(!allowed()||!validExperienceDetail(kind,value)||sent.has(key))return
 const current=captureAnalyticsRequest()
 sent.add(key)
 void requestLandingChallenge().then(token=>{
  const publicKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if(!token||!current()||!allowed()||typeof publicKey!=='string')return
  return supabase.functions.invoke('pazo-marketing-landing',{headers:{Authorization:`Bearer ${publicKey}`,'x-pazo-challenge':token},body:body(kind,value)})
 }).catch(()=>{/* No UI dependency or diagnostic text. */})
}
export const observeSignupFailure=(reason:SignupFailure)=>observeDetail('signup_failure',reason)
export const observeSignupFailureCode=(code:unknown)=>observeSignupFailure(signupFailureFromCode(code))

/** Signed-out visits only, once per tab. The referrer is reduced to a category and discarded. */
export function observeArrivalSource(){
 if(!allowed())return
 try{
  const key='pazo_arrival_source_v1'
  if(window.sessionStorage.getItem(key))return
  window.sessionStorage.setItem(key,'1')
  const source=classifyArrival(document.referrer,window.location.hostname,window.matchMedia?.('(display-mode: standalone)').matches)
  if(source)observeDetail('arrival_source',source)
 }catch{/* Storage denied: skip, never count twice. */}
}

// Closing a tab cannot wait for a challenge, so a token is kept ready while the Demo is in use.
const TOKEN_MS=4*60*1000
let screen:DemoScreen|null=null,token:{value:string;at:number}|null=null,asking=false,listening=false
const refreshToken=()=>{
 if(asking||(token&&Date.now()-token.at<TOKEN_MS)||!allowed())return
 asking=true
 void requestLandingChallenge().then(value=>{token=value?{value,at:Date.now()}:null}).catch(()=>{token=null}).finally(()=>{asking=false})
}
const sendLastScreen=()=>{
 const url=import.meta.env.VITE_SUPABASE_URL,publicKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
 const ready=token&&Date.now()-token.at<TOKEN_MS?token.value:null
 if(!screen||!ready||sent.has('demo_last_screen')||!allowed()||typeof url!=='string'||typeof publicKey!=='string')return
 sent.add('demo_last_screen');token=null
 void fetch(url+'/functions/v1/pazo-marketing-landing',{method:'POST',keepalive:true,headers:{apikey:publicKey,Authorization:`Bearer ${publicKey}`,'content-type':'application/json','x-pazo-challenge':ready},body:JSON.stringify(body('demo_last_screen',screen))}).catch(()=>{})
}
const onHidden=()=>{if(document.visibilityState==='hidden')sendLastScreen()}
export function trackDemoScreen(next:DemoScreen){
 if(!allowed()||!EXPERIENCE_DETAILS.demo_last_screen.includes(next))return
 screen=next;refreshToken()
 if(!listening){listening=true;document.addEventListener('visibilitychange',onHidden);window.addEventListener('pagehide',sendLastScreen)}
}
export function finishDemoTracking(){
 sendLastScreen();screen=null
 if(listening){listening=false;document.removeEventListener('visibilitychange',onHidden);window.removeEventListener('pagehide',sendLastScreen)}
}

export interface ExperienceDetailsReport{version:1;status:'paused'|'observing';coverage_since:string|null;as_of:string;scope:string;rows:{kind:ExperienceDetailKind;value:string;requests:number}[]}
const when=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))
export function parseExperienceDetails(v:unknown):ExperienceDetailsReport{
 const r=v as Record<string,unknown>
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join()!=='as_of,coverage_since,rows,scope,status,version'||r.version!==1||!['paused','observing'].includes(String(r.status))||!when(r.as_of)||!(r.coverage_since===null||when(r.coverage_since))||typeof r.scope!=='string'||!Array.isArray(r.rows)||r.rows.length>30)throw Error('invalid experience details')
 for(const row of r.rows as Record<string,unknown>[])if(!row||typeof row!=='object'||Object.keys(row).sort().join()!=='kind,requests,value'||!validExperienceDetail(row.kind,row.value)||!Number.isSafeInteger(row.requests)||Number(row.requests)<10)throw Error('unsafe experience details')
 return r as unknown as ExperienceDetailsReport
}
export async function adminExperienceDetails(days:7|30|90,scope:string,signal:AbortSignal){
 const {data,error}=await supabase.rpc('pazo_admin_experience_details_v1',{p_days:days,p_scope:scope}).abortSignal(signal)
 if(error)throw Error(error.code==='42501'?'admin_required':'report_unavailable')
 return parseExperienceDetails(data)
}
