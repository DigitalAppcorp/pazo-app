import {behaviorRecorder} from './behaviorRuntime'
import {INTELLIGENCE_COLLECTION_ENABLED,anonymousSignals,type AnonymousSignal,type IntelligenceTask,type IntelligenceKind} from './intelligenceCatalog'
import {requestLandingChallenge} from './landingChallenge'
import {supabase} from '../../services/supabaseClient'
const allowed=()=>INTELLIGENCE_COLLECTION_ENABLED&&typeof navigator!=='undefined'&&(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl!==true&&document.visibilityState==='visible'
export function observeTask(task:IntelligenceTask,kind:IntelligenceKind='intent'){if(allowed())behaviorRecorder.task(task,kind)}
/** Capture generation BEFORE operation. A→B→A cannot attribute an old failure to new A. */
export function beginTask(task:IntelligenceTask):(kind:IntelligenceKind)=>void{
 if(!allowed())return ()=>{}
 const finish=behaviorRecorder.captureTask(task)
 return(kind:IntelligenceKind)=>{if(allowed())finish(kind)}
}
const anonymousSent=new Set<AnonymousSignal>()
/** Anonymous request counters only. No anonymous session, account bridge, storage or retry. */
export function observeAnonymous(signal:AnonymousSignal){
 if(!allowed()||!anonymousSignals.includes(signal)||anonymousSent.has(signal))return
 if(window.location.hostname!=='pazo-app.vercel.app'||navigator.webdriver===true)return
 anonymousSent.add(signal)
 void requestLandingChallenge().then(token=>{
  if(!token||!allowed())return
  return supabase.functions.invoke('pazo-marketing-landing',{headers:{'x-pazo-challenge':token},body:{experience:signal}})
 }).catch(()=>{/* No UI dependency or diagnostic text. */})
}
