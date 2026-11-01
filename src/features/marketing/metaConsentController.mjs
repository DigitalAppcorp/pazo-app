// #169 — prepared consent UI wiring for PAZO, intentionally NOT imported
// by the production app. Does not trigger any action on construction.
// Persistence of a Meta purpose grant is distinct from successful Pixel load.
// External Meta requests remain gated by the existing opt-in flow and servers.
import {createMetaConsentTransport,createMetaWithdrawalTransport}
  from './metaConsentTransport.mjs'
import {completeExplicitMetaOptIn}
  from './metaConsentRegistrationFlow.mjs'
import {syncMetaGpcWithdrawal}
  from './metaGpcSync.mjs'
import {revokeOwnedMetaPixelConsent}
  from './metaPixelLoader.mjs'

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function createMetaConsentController({
  releaseEnabled=false,privacyApproved=false,withdrawalReleased=false,
  supabaseClient=null,ownerId=null,accessToken=null,
  getSessionSnapshot=()=>null,stillPermitted=()=>false,
  browser=null,dom=null,pixelLoader=undefined,
}={}) {
  // This is a dormant adapter, not an automatic signup hook. A standalone
  // withdrawal may be prepared while affirmative sharing is still disabled.
  if(releaseEnabled!==true && withdrawalReleased!==true)return null
  if(!UUID.test(ownerId||'')||typeof accessToken!=='string'
     ||accessToken.length<12||typeof getSessionSnapshot!=='function'
     ||typeof stillPermitted!=='function')return null
  // A local withdrawal veto takes effect immediately, even if its durable
  // server write is delayed or fails. Never resurrect a pending Pixel load.
  let localWithdrawal=false
  const sameSession=()=>{
    try {
      const current=getSessionSnapshot()
      return current?.id===ownerId && current?.accessToken===accessToken
    }catch{return false}
  }
  const affirmativeAllowed=()=>{
    try {
      return !localWithdrawal && sameSession() && stillPermitted()===true
        && browser?.navigator?.globalPrivacyControl!==true
    }catch{return false}
  }
  // Opt-in cannot be offered unless the same account can also withdraw.
  // Independent withdrawal may remain available while opt-in is OFF.
  const optIn=releaseEnabled===true && privacyApproved===true
    && withdrawalReleased===true
    ?createMetaConsentTransport({
      released:true,privacyApproved:true,supabaseClient,ownerId,
      getSessionSnapshot,stillPermitted:affirmativeAllowed,browser,
    }):null
  const withdrawal=createMetaWithdrawalTransport({
    withdrawalReleased,supabaseClient,ownerId,getSessionSnapshot,
  })
  // Use only in the explicit button callback. Never auto-grant on mount,
  // session refresh, GPC sync, or an analytics preference.
  let grantFlight=null
  let confirmedGrant=false
  const onGrant=()=>{
    if(!optIn || !affirmativeAllowed())return Promise.resolve(false)
    if(confirmedGrant)return Promise.resolve(true)
    if(grantFlight)return grantFlight
    let serverGranted=false
    const task=completeExplicitMetaOptIn({
      releaseEnabled:true,privacyApproved:true,deliberateOptIn:true,
      ownerId,accessToken,getActiveSession:getSessionSnapshot,
      browser,dom,stillPermitted:affirmativeAllowed,
      requestGrant:async request=>{
        const reply=await optIn.requestGrant(request)
        serverGranted=reply?.status==='granted'
        return reply
      },
      requestReceipt:optIn.requestReceipt,
      requestWithdraw:withdrawal?.requestWithdraw,
      ...(pixelLoader?{pixelLoader}:{}),
    }).then(outcome=>{
      // A blocked SDK, missing one-time receipt, or unsuccessful Pixel
      // delivery does not undo a verified server-side grant.
      // Conversely, GPC/withdrawal/account-switch always veto UI success.
      const ok=serverGranted && affirmativeAllowed()
        && outcome?.status!=='suppressed'
        && outcome?.status!=='withdrawal_unconfirmed'
      if(ok)confirmedGrant=true
      return ok
    }).catch(()=>false).finally(()=>{
      if(grantFlight===task)grantFlight=null
    })
    grantFlight=task
    return task
  }
  const onWithdraw=async()=>{
    localWithdrawal=true
    confirmedGrant=false
    // Immediately revoke the owned SDK before any async server write.
    revokeOwnedMetaPixelConsent({browser})
    if(!withdrawal)return false
    try{
      const result=await withdrawal.requestWithdraw({
        accessToken,body:{action:'withdraw'},
      })
      if(result?.status==='withdrawn'){
        confirmedGrant=false
        return true
      }
      return false
    }catch{return false}
  }
  // Authenticated, opt-out-only sync; it never calls grant/receipt/Pixel.
  const syncGpc=()=>{
    if(browser?.navigator?.globalPrivacyControl===true){
      localWithdrawal=true
      confirmedGrant=false
      revokeOwnedMetaPixelConsent({browser})
    }
    return syncMetaGpcWithdrawal({
    withdrawalReleased,browser,ownerId,accessToken,
    getSessionSnapshot,requestWithdraw:withdrawal?.requestWithdraw,
  }).then(result=>{
    if(result.status==='withdrawn')confirmedGrant=false
    return result
  })
  }
  return Object.freeze({onGrant,onWithdraw,syncGpc})
}
