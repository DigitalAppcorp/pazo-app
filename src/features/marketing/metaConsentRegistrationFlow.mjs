// #169: explicit opt-in -> grant -> one-time receipt -> conditional Pixel.
// ISOLATED, NOT IMPORTED BY PAZO. NO provider requests unless injected.
// All flags default OFF and require an approved, versioned Meta notice.
// Supabase Auth, consent, exclusion and registration must ALSO be verified by
// the server RPC; browser state is an additional veto, NEVER an authority.
import {loadMetaPixelForVerifiedSignup} from './metaPixelLoader.mjs'

const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const USER=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATASET=/^[1-9][0-9]{5,24}$/
const NOTICE='pazo-meta-conversions-v1'

export async function completeExplicitMetaOptIn({
  releaseEnabled=false,privacyApproved=false,deliberateOptIn=false,
  ownerId=null,accessToken=null,getActiveSession=()=>null,
  browser=null,dom=null,stillPermitted=()=>false,
  requestGrant=null,requestReceipt=null,requestWithdraw=null,
  pixelLoader=loadMetaPixelForVerifiedSignup,
}={}) {
  // No startup hooks, no autogrant, no PageView; only a deliberate opt-in.
  if(releaseEnabled!==true||privacyApproved!==true)return {status:'disabled'}
  if(deliberateOptIn!==true||!USER.test(ownerId||'')
     ||typeof accessToken!=='string'||accessToken.length<12
     ||typeof getActiveSession!=='function'
     ||typeof stillPermitted!=='function'
     ||typeof requestGrant!=='function'
     ||typeof requestReceipt!=='function'
     ||typeof pixelLoader!=='function')
    return {status:'suppressed'}
  // Pin the verified Auth account and token; never use another session's JWT.
  const allowed=()=>{
    try {
      const current=getActiveSession()
      return browser?.navigator?.globalPrivacyControl!==true
        && stillPermitted()===true
        && current?.id===ownerId && current?.accessToken===accessToken
    } catch {return false}
  }
  // After a grant request has been sent, a later GPC/opt-out may race
  // with a successful server write. Attempt a *first-party* persistent
  // withdrawal before reporting privacy suppression. Never call Meta.
  const postGrantVeto=async()=>{
    let sameOwner=false
    try{
      const snapshot=getActiveSession()
      sameOwner=snapshot?.id===ownerId && snapshot?.accessToken===accessToken
    }catch{/* stale Auth must fail closed */}
    if(!sameOwner||typeof requestWithdraw!=='function')
      return {status:'withdrawal_unconfirmed'}
    let timer
    try {
      const outcome=await Promise.race([
        Promise.resolve().then(()=>requestWithdraw({
          accessToken,body:{action:'withdraw'},
        })),
        new Promise(resolve=>{
          timer=setTimeout(()=>resolve({status:'not_available'}),2500)
        }),
      ])
      return {status:outcome?.status==='withdrawn'
        ?'suppressed':'withdrawal_unconfirmed'}
    }catch{return {status:'withdrawal_unconfirmed'}}
    finally{if(timer!==undefined)clearTimeout(timer)}
  }
  if(!allowed())return {status:'suppressed'}
  let grant
  try {
    grant=await requestGrant({
      accessToken,body:{action:'grant',noticeVersion:NOTICE},
    })
  }catch{
    return !allowed()?postGrantVeto():{status:'unavailable'}
  }
  if(!allowed())return postGrantVeto()
  if(grant?.status!=='granted')return {status:'not_granted'}
  let receipt
  try {
    // No client-supplied event, owner, identity or consent payload is allowed.
    receipt=await requestReceipt({accessToken,body:{}})
  }catch{
    return !allowed()?postGrantVeto():{status:'unavailable'}
  }
  if(!allowed())return postGrantVeto()
  if(receipt?.status!=='verified'||receipt.eventName!=='CompleteRegistration'
     ||typeof receipt.eventId!=='string'||!ID.test(receipt.eventId)
     ||typeof receipt.datasetId!=='string'||!DATASET.test(receipt.datasetId))
    return {status:'no_receipt'}
  // A valid one-use receipt can be read only after server has checked Auth,
  // QA/admin status, fresh verified registration and current Meta preference.
  // Those are attested by a trusted endpoint, not by the browser flags here.
  try {
    return await pixelLoader({
      releaseEnabled:true,privacyGateApproved:true,explicitConsent:true,
      accountExcluded:false,qaOrAdmin:false,optedOut:false,
      verifiedRegistration:true,
      eventId:receipt.eventId,datasetId:receipt.datasetId,
      browser,dom,stillAllowed:allowed,
    })
  }catch{return {status:'unavailable'}}
}
