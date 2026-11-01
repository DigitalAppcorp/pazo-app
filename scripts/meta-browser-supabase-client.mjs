// #169 — disposable real-browser harness, never imported into PAZO.
// Only bundled by Vite in GitHub's localhost-only integration workflow.
import {createClient} from '@supabase/supabase-js'
import {createMetaConsentTransport,createMetaWithdrawalTransport}
 from '../src/features/marketing/metaConsentTransport.mjs'
import {createMetaConsentController}
 from '../src/features/marketing/metaConsentController.mjs'

window.__runPazoMetaBrowserLab=async({api,key,email,password}={})=>{
  const base=new URL(api)
  if(base.protocol!=='http:'||!['127.0.0.1','localhost'].includes(base.hostname)
    ||base.port!=='54321')throw Error('nonlocal_browser_auth_forbidden')
  const approved=new Set(['pazo-meta-grant','pazo-meta-receipt','pazo-meta-consent'])
  const mapped={'pazo-meta-grant':'grant','pazo-meta-receipt':'receipt',
    'pazo-meta-consent':'withdraw'}
  let sdkCalls=0
  const localFetch=(source,init)=>{
    const url=new URL(typeof source==='string'?source:source.url)
    if(url.origin!==base.origin)throw Error('outbound_browser_request_forbidden')
    const head='/functions/v1/'
    if(url.pathname.startsWith(head)){
      const name=url.pathname.slice(head.length)
      if(!approved.has(name))throw Error('unknown_local_meta_endpoint')
      url.pathname='/functions/v1/pazo-meta-lab/'+mapped[name]
      sdkCalls++
    }else if(!url.pathname.startsWith('/auth/v1/')){
      throw Error('not_local_auth_or_candidate')
    }
    return fetch(url.href,init)
  }
  // Distinguish browser loopback/CORS gating from supabase-js auth errors.
  let probe
  try{
    probe=await fetch(base.origin+'/auth/v1/settings',{method:'GET'})
  }catch{throw Error('browser_local_auth_network_unavailable')}
  if(!probe.ok)throw Error('browser_local_auth_settings_rejected')
  console.log('META_BROWSER_CLIENT_PHASE local_network_probe_passed')
  let privacyPermitted=true,gpc=false
  Object.defineProperty(navigator,'globalPrivacyControl',{
    configurable:true,get:()=>gpc,
  })
  const client=createClient(base.origin,key,{
    global:{fetch:localFetch},
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  })
  console.log('META_BROWSER_CLIENT_PHASE login_request')
  const login=await client.auth.signInWithPassword({email,password})
  if(login.error||!login.data?.session?.access_token)
    throw Error('browser_gotrue_login_failed')
  const ownerId=login.data.user?.id
  const token=login.data.session.access_token
  console.log('META_BROWSER_CLIENT_PHASE login_reply')
  const verified=await client.auth.getUser()
  if(verified.error||verified.data?.user?.id!==ownerId
    ||!verified.data.user.email_confirmed_at)
    throw Error('browser_real_auth_verification_failed')
  console.log('META_BROWSER_CLIENT_PHASE real_gotrue_user_verified')
  const session=()=>({id:ownerId,accessToken:token})
  const transport=createMetaConsentTransport({
    released:true,privacyApproved:true,supabaseClient:client,
    ownerId,getSessionSnapshot:session,
    stillPermitted:()=>privacyPermitted,browser:window,
  })
  const withdrawal=createMetaWithdrawalTransport({
    withdrawalReleased:true,supabaseClient:client,
    ownerId,getSessionSnapshot:session,
  })
  if(!transport||!withdrawal)throw Error('transport_initialization_failed')
  let callbacks=0,issuedId=null,issuedDataset=null
  const controller=createMetaConsentController({
    releaseEnabled:true,privacyApproved:true,withdrawalReleased:true,
    supabaseClient:client,ownerId,accessToken:token,
    getSessionSnapshot:session,stillPermitted:()=>privacyPermitted,
    browser:window,dom:{},
    pixelLoader:async({eventId,datasetId})=>{
      callbacks++;issuedId=eventId;issuedDataset=datasetId
      return {status:'unavailable'} // Offline Pixel failure must not undo grant.
    },
  })
  if(!controller)throw Error('browser_controller_initialization_failed')
  // Browser preflight and functions.invoke MUST both succeed.
  console.log('META_BROWSER_CLIENT_PHASE controller_grant_and_receipt_request')
  const first=await controller.onGrant()
  if(first!==true||callbacks!==1)
    throw Error('browser_controller_first_grant_failed')
  console.log('META_BROWSER_CLIENT_PHASE controller_first_consent_saved')
  const second=await controller.onGrant()
  if(second!==true||callbacks!==1)
    throw Error('browser_controller_repeat_conversion_dispatched')
  // GPC after an earlier opt-in vetoes all future Pixel work and initiates
  // durable withdrawal independently of the Pixel delivery outcome.
  gpc=true
  const veto=await controller.onGrant()
  if(veto!==false||callbacks!==1)
    throw Error('browser_controller_gpc_veto_failed')
  console.log('META_BROWSER_CLIENT_PHASE controller_repeat_and_gpc_veto')
  const removed=await controller.syncGpc()
  if(removed.status!=='withdrawn')
    throw Error('browser_controller_durable_gpc_withdrawal_failed')
  gpc=false
  privacyPermitted=true
  const afterWithdraw=await controller.onGrant()
  if(afterWithdraw!==false||callbacks!==1)
    throw Error('browser_controller_withdrawn_account_regranted')
  console.log('META_BROWSER_CLIENT_PHASE controller_withdrawal_persisted')
  await client.auth.signOut({scope:'local'})
  return {status:'REAL_BROWSER_SUPABASE_JS_META_OFF_PASS',
    ownerId,eventId:issuedId,datasetId:issuedDataset,
    sdkFunctionInvocations:sdkCalls,
    first:first?'saved':'not_saved',second:second?'saved_no_duplicate':'not_saved',
    gpcVeto:veto?'failed':'suppressed',withdrawal:removed.status,
    postWithdrawal:afterWithdraw?'failed':'suppressed',
    simulatedPixelCallbacks:callbacks,
  }
}
