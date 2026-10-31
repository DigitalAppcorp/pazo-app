// #169. Isolated, permission-gated SDK loader. NOT imported in PAZO runtime.
// A real use must obtain server-issued `eventId` for the newly verified signup.
// Deliberately no PageView, auto-advanced matching, FB cookies/IDs or payload PII.
import {canUseMetaPixel,dispatchMetaPixel} from './metaPixel.mjs'
const PIXEL_URL='https://connect.facebook.net/en_US/fbevents.js'
const DATASET=/^[1-9][0-9]{5,24}$/
export async function loadMetaPixelForVerifiedSignup({
  releaseEnabled=false,privacyGateApproved=false,explicitConsent=false,
  accountExcluded=true,qaOrAdmin=true,optedOut=true,verifiedRegistration=false,
  datasetId=null,eventId=null,stillAllowed=()=>false,
  browser=null,dom=null,
}={}) {
  if (!canUseMetaPixel({
    releaseEnabled,privacyGateApproved,explicitConsent,
    excluded:accountExcluded,qaOrAdmin,optedOut,
    globalPrivacyControl:browser?.navigator?.globalPrivacyControl!==false,
    verifiedRegistration,
  }) || !DATASET.test(String(datasetId)) || !browser?.document
     || dom!==browser.document || typeof dom.createElement!=='function'
     || typeof stillAllowed!=='function' || stillAllowed()!==true)
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
  // Queue privacy safeguard before initialization. No automatic PageView.
  fbq('consent','revoke')
  fbq('init',datasetId)
  return new Promise(resolve=>{
    let settled=false
    const finish=result=>{if(!settled){settled=true;resolve(result)}}
    const script=dom.createElement('script')
    script.async=true
    script.src=PIXEL_URL
    script.onerror=()=>{
      // On failure, leave no pending tracked event.
      fbq('consent','revoke')
      finish({status:'unavailable'})
    }
    script.onload=()=>{
      if (stillAllowed()!==true || browser.navigator?.globalPrivacyControl!==false){
        fbq('consent','revoke')
        return finish({status:'suppressed'})
      }
      fbq('consent','grant')
      const result=dispatchMetaPixel({
        authorized:true,browserGpc:false,stillConsented:stillAllowed,
        eventId,datasetId,fbq,
      })
      finish(result)
    }
    try {dom.head.appendChild(script)}
    catch {finish({status:'unavailable'})}
  })
}
