// #169 — disposable real-browser harness, never imported into PAZO.
// Only bundled by Vite in GitHub's localhost-only integration workflow.
import {createClient} from '@supabase/supabase-js'
import {createMetaConsentTransport,createMetaWithdrawalTransport}
 from '../src/features/marketing/metaConsentTransport.mjs'
import {completeExplicitMetaOptIn}
 from '../src/features/marketing/metaConsentRegistrationFlow.mjs'

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
  const run=()=>completeExplicitMetaOptIn({
    releaseEnabled:true,privacyApproved:true,deliberateOptIn:true,
    ownerId,accessToken:token,getActiveSession:session,
    stillPermitted:()=>privacyPermitted,browser:window,dom:{},
    requestGrant:transport.requestGrant,requestReceipt:transport.requestReceipt,
    requestWithdraw:withdrawal.requestWithdraw,
    pixelLoader:async({eventId,datasetId})=>{
      callbacks++;issuedId=eventId;issuedDataset=datasetId
      return {status:'queued'}
    },
  })
  // Browser preflight + functions.invoke MUST complete before this counts.
  console.log('META_BROWSER_CLIENT_PHASE consent_and_receipt_request')
  const first=await run()
  if(first.status!=='queued'||callbacks!==1)
    throw Error('browser_first_grant_receipt_failed:'+first.status)
  console.log('META_BROWSER_CLIENT_PHASE first_consent_accepted')
  const second=await run()
  if(second.status==='queued'||callbacks!==1)
    throw Error('browser_repeat_conversion_accepted')
  gpc=true
  const veto=await run()
  if(veto.status!=='suppressed'||callbacks!==1)
    throw Error('browser_gpc_veto_failed')
  console.log('META_BROWSER_CLIENT_PHASE repeated_event_and_gpc_veto')
  const removed=await withdrawal.requestWithdraw({
    accessToken:token,body:{action:'withdraw'},
  })
  if(removed.status!=='withdrawn')
    throw Error('browser_durable_withdrawal_failed')
  gpc=false
  privacyPermitted=true
  const afterWithdraw=await run()
  if(afterWithdraw.status==='queued'||callbacks!==1)
    throw Error('browser_withdrawn_account_regranted')
  console.log('META_BROWSER_CLIENT_PHASE withdrawal_persisted')
  await client.auth.signOut({scope:'local'})
  return {status:'REAL_BROWSER_SUPABASE_JS_META_OFF_PASS',
    ownerId,eventId:issuedId,datasetId:issuedDataset,
    sdkFunctionInvocations:sdkCalls,
    first:first.status,second:second.status,
    gpcVeto:veto.status,withdrawal:removed.status,
    postWithdrawal:afterWithdraw.status,
    simulatedPixelCallbacks:callbacks,
  }
}
