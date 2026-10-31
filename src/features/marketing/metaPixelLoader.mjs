// #169. Isolated, permission-gated SDK loader. NOT imported in PAZO runtime.
// A real use must obtain server-issued `eventId` for the newly verified signup.
// Deliberately no PageView, auto-advanced matching, FB cookies/IDs or payload PII.
import {canUseMetaPixel,dispatchMetaPixel} from './metaPixel.mjs'
const PIXEL_URL='https://connect.facebook.net/en_US/fbevents.js'
const DATASET=/^[1-9][0-9]{5,24}$/
const UUID4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ownedPixelQueues=new WeakMap()
/** Revoke ONLY the Pixel bootstrap PAZO created after consent. Avoid
 * touching an independently installed Facebook Pixel or stale session.
 * This revokes future SDK sends, not disclosures already made.
 */
export function revokeOwnedMetaPixelConsent({browser=null}={}) {
  if(!browser || (typeof browser!=='object'&&typeof browser!=='function'))
    return false
  const owned=ownedPixelQueues.get(browser)
  if(typeof owned!=='function'||browser.fbq!==owned||browser._fbq!==owned)
    return false
  let revoked=false
  try{owned('consent','revoke');revoked=true}catch{/* fail closed locally */}
  // The authentic SDK may create _fbp (and, after a click, _fbc) after
  // consent. SDK revoke alone does NOT erase those first-party cookies.
  // Remove only Meta measurement cookies, never PAZO Auth or other cookies;
  // use only this document's host to avoid cross-site mutation.
  const doc=browser.document
  if(doc && typeof doc.cookie==='string'){
    let host=''
    try{host=String(browser.location?.hostname||'').toLowerCase()}
    catch{/* host-only clear still possible */}
    const domains=['']
    if(host && /^[a-z0-9.-]+$/.test(host)
       && host.includes('.') && !host.startsWith('.'))
      domains.push(host)
    for(const name of ['_fbp','_fbc']){
      for(const domain of domains){
        try{
          doc.cookie=name+'=; Max-Age=0; Path=/; SameSite=Lax'
            +(domain?'; Domain='+domain:'')
        }catch{/* cookie blockers cannot reactivate Meta or fail withdrawal */}
      }
    }
  }
  return revoked
}

export async function loadMetaPixelForVerifiedSignup({
  releaseEnabled=false,privacyGateApproved=false,explicitConsent=false,
  accountExcluded=true,qaOrAdmin=true,optedOut=true,verifiedRegistration=false,
  datasetId=null,eventId=null,stillAllowed=()=>false,
  browser=null,dom=null,sdkTimeoutMs=8000,
}={}) {
  const stillPermitted=()=>{
    try{return stillAllowed()===true && browser?.navigator?.globalPrivacyControl!==true}
    catch{return false}
  }
  if (!canUseMetaPixel({
    releaseEnabled,privacyGateApproved,explicitConsent,
    excluded:accountExcluded,qaOrAdmin,optedOut,
    globalPrivacyControl:browser?.navigator?.globalPrivacyControl===true,
    verifiedRegistration,
  }) || !DATASET.test(String(datasetId)) || !browser?.document
     || dom!==browser.document || typeof dom.createElement!=='function'
     || typeof eventId!=='string' || !UUID4.test(eventId)
     || typeof stillAllowed!=='function' || !stillPermitted())
    return {status:'suppressed'}
  // A different / pre-existing Pixel bootstrap would make ownership ambiguous.
  if (browser.fbq || browser._fbq) return {status:'existing_pixel'}
  // Queue Meta commands while loading; this is the documented fbevents boot
  // sequence, but it MUST only be created *after* consent succeeds.
  const fbq=function(...args) {
    if (fbq.callMethod) return fbq.callMethod.apply(fbq,args)
    fbq.queue.push(args)
  }
  fbq.queue=[]
  fbq.loaded=true
  fbq.version='2.0'
  fbq.push=fbq
  browser.fbq=fbq
  browser._fbq=fbq
  ownedPixelQueues.set(browser,fbq)
  // Queue privacy safeguard before initialization. No automatic PageView.
  fbq('consent','revoke')
  // Explicitly disable Meta's automatic event / microdata / interaction
  // instrumentation before init. This is defense in depth; the actual SDK
  // network behavior still requires an independent QA audit.
  fbq('set','autoConfig',false,datasetId)
  // Disable SPA history instrumentation; PAZO only wants one explicit event.
  fbq.disablePushState=true
  fbq('init',datasetId)
  return new Promise(resolve=>{
    let settled=false
    let timer=null
    const finish=result=>{
      if(settled)return
      settled=true
      if(timer!==null)clearTimeout(timer)
      resolve(result)
    }
    const fail=status=>{
      fbq('consent','revoke')
      finish({status})
    }
    let script
    try {script=dom.createElement('script')}
    catch {return fail('unavailable')}
    script.async=true
    script.src=PIXEL_URL
    script.onerror=()=>{
      // An absent or failed third-party script must never hold up PAZO.
      if(!settled)fail('unavailable')
    }
    script.onload=()=>{
      // Late SDK callbacks must not resurrect a timed-out conversion.
      if(settled)return
      if (!stillPermitted())return fail('suppressed')
      try {
        fbq('consent','grant')
        const result=dispatchMetaPixel({
          authorized:true,browserGpc:false,stillConsented:stillPermitted,
          eventId,datasetId,fbq,
        })
        // A preference may change between the pre-load and dispatch checks.
        if(result.status!=='queued')fbq('consent','revoke')
        finish(result)
      } catch {fail('unavailable')}
    }
    // Bound third-party loading, even when neither load nor error fires.
    // An invalid timeout uses the conservative default; it never disables
    // the privacy checks or authorizes a late delivery.
    const delay=Number.isSafeInteger(sdkTimeoutMs)&&sdkTimeoutMs>=1
      && sdkTimeoutMs<=15000?sdkTimeoutMs:8000
    timer=setTimeout(()=>{
      if(settled)return
      fbq('consent','revoke')
      try{script.remove?.()}catch{/* safe even in restricted DOM */}
      finish({status:'unavailable'})
    },delay)
    try {dom.head.appendChild(script)}
    catch {fail('unavailable')}
  })
}
