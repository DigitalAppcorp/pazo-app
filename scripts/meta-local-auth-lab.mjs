// #169: REAL local GoTrue email-confirmation integration test.
// Only an ephemeral Supabase CLI stack; never connects to hosted PAZO.
// It is deliberately NOT an E2E of the hosted Meta outbox or Meta Events.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {runAuthenticatedMetaEdgeLab} from './meta-local-auth-edge-flow.mjs'

function local(url,allowedPaths=[]){
  const parsed=new URL(url)
  assert.equal(parsed.protocol,'http:','Local Auth lab must use http loopback')
  assert.ok(['127.0.0.1','localhost','[::1]'].includes(parsed.hostname),
    'Local Auth lab must never contact a hosted database')
  if(allowedPaths.length)assert.ok(allowedPaths.some(x=>parsed.pathname.startsWith(x)),
    'Only local Auth/Mailpit paths are permitted')
  return parsed
}
function envMap(file){
  const raw=readFileSync(file,'utf8').trim()
  if(raw.startsWith('{'))return JSON.parse(raw)
  const out={}
  for(const line of raw.split(/\r?\n/)){
    const m=/^(?:export\s+)?([A-Z_]+)=(.*)$/.exec(line.trim())
    if(m)out[m[1]]=m[2].replace(/^["']|["']$/g,'')
  }
  return out
}
function requireLocalBase(value,port){
  const parsed=local(value||'http://127.0.0.1:'+port)
  return parsed.origin
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const safeFetch=async(url,options={})=>{
  local(url)
  const res=await fetch(url,{...options,redirect:'manual',
    signal:AbortSignal.timeout(12000)})
  return res
}
const json=async res=>{
  try{return await res.json()}catch{return {}}
}
async function requestAuth(base,key,part,body,token){
  const response=await safeFetch(base+'/auth/v1/'+part,{
    method:body?'POST':'GET',
    headers:{apikey:key,'content-type':'application/json',
      ...(token?{authorization:'Bearer '+token}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),
  })
  return {status:response.status,data:await json(response)}
}
function normalizeLink(src){
  return src.replaceAll('&amp;','&').replaceAll('&#38;','&')
    .replaceAll('&#x26;','&')
}
async function confirmationUrl(mailpit,email){
  // Mailpit captures local messages. No external SMTP or real inboxes.
  for(let tries=0;tries<35;tries++){
    const list=await safeFetch(mailpit+'/api/v1/messages')
    if(list.ok){
      const data=await json(list)
      const messages=Array.isArray(data.messages)?data.messages:[]
      const item=messages.find(x=>JSON.stringify(x.To||x.to||[]).includes(email))
      if(item?.ID||item?.id){
        const message=await safeFetch(mailpit+'/api/v1/message/'+encodeURIComponent(item.ID||item.id))
        assert.equal(message.status,200,'Mailpit message unavailable')
        const detail=await json(message)
        const html=String(detail.HTML||detail.html||'')
        const text=String(detail.Text||detail.text||'')
        const candidates=normalizeLink(html+'\n'+text).match(
          /https?:\/\/(?:127\.0\.0\.1|localhost):54321\/auth\/v1\/verify\?[^"'<>\s]+/gi
        )||[]
        for(const candidate of candidates){
          let link
          try{link=new URL(candidate)}catch{continue}
          if(link.pathname==='/auth/v1/verify'
             && ['signup','email'].includes(link.searchParams.get('type'))
             && link.searchParams.has('token'))return link
        }
        throw Error('confirmation_link_not_found_in_local_mailpit')
      }
    }
    await sleep(500)
  }
  throw Error('local_confirmation_email_not_received')
}
export async function runMetaLocalAuthLab({statusFile,apiUrl,mailpitUrl}={}){
  console.log('META_AUTH_PHASE status_file')
  const vars=statusFile?envMap(statusFile):{}
  const api=requireLocalBase(apiUrl||vars.API_URL||vars.SUPABASE_URL,54321)
  const mailpit=requireLocalBase(mailpitUrl||vars.MAILPIT_URL||vars.INBUCKET_URL,54324)
  // All server URLs must be local, before any network request.
  local(api+'/auth/v1/signup',['/auth/v1/'])
  local(mailpit+'/api/v1/messages',['/api/v1/'])
  console.log('META_AUTH_PHASE loopback_only')
  const key=vars.ANON_KEY||vars.PUBLISHABLE_KEY
  assert.ok(typeof key==='string'&&key.length>=16,
    'local_publishable_key_not_available')
  console.log('META_AUTH_PHASE local_key_ready')
  const email='pazo-auth-'+Date.now()+'-'+randomUUID().slice(0,8)+'@example.invalid'
  const password='PazoLab!4'+randomUUID().replaceAll('-','')
  console.log('META_AUTH_PHASE signup_requested')
  const requested=await requestAuth(api,key,'signup',{email,password})
  assert.ok([200,201].includes(requested.status),'local_signup_failed')
  assert.equal(!!requested.data.access_token,false,
    'signup_requested_cannot_be_an_authenticated_conversion')
  // Raw GoTrue POST /signup returns a user object directly, whereas
  // supabase-js wraps it as {user,session}. Accept either shape, but never
  // infer confirmation from the existence of a signup response alone.
  const requestedUser=requested.data.user||requested.data
  assert.match(String(requestedUser.id||''),
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'signup_user_id_missing')
  assert.equal(requestedUser.email_confirmed_at??null,null,
    'signup_request_should_not_mark_email_confirmed')
  console.log('META_AUTH_PHASE signup_no_session')
  const unverified=await requestAuth(api,key,'token?grant_type=password',{email,password})
  assert.ok([400,401,403,422].includes(unverified.status),
    'unverified_signup_must_not_login')
  assert.ok(!unverified.data.access_token,'unverified_signup_cannot_issue_session')
  console.log('META_AUTH_PHASE unverified_login_denied')
  const confirmation=await confirmationUrl(mailpit,email)
  console.log('META_AUTH_PHASE mailpit_confirmation_link')
  // Prevent Mailpit content from redirecting us to a hosted domain.
  assert.equal(confirmation.port,new URL(api).port,'Mailpit link must use local Auth port')
  const verifiedResponse=await safeFetch(confirmation.href)
  assert.ok([200,302,303,307,308].includes(verifiedResponse.status),
    'local_confirmation_link_rejected')
  console.log('META_AUTH_PHASE confirmation_request')
  const loggedIn=await requestAuth(api,key,'token?grant_type=password',{email,password})
  assert.equal(loggedIn.status,200,'confirmed_signup_cannot_login')
  const token=loggedIn.data.access_token
  assert.ok(typeof token==='string'&&token.length>=50,'confirmed_jwt_missing')
  console.log('META_AUTH_PHASE confirmed_password_login')
  const who=await requestAuth(api,key,'user',null,token)
  assert.equal(who.status,200,'verified_jwt_get_user_failed')
  assert.equal(who.data.id,requestedUser.id,'owner_changed_during_confirmation')
  assert.ok(who.data.email_confirmed_at,'email_confirmation_not_recorded_by_auth')
  assert.notEqual(who.data.is_anonymous,true,'synthetic user must not be anonymous')
  // Re-login is *not* a new confirmed signup; last state is checked in
  // GoTrue, while one-time outbox issuance is separately verified in PG17.
  console.log('META_AUTH_PHASE verified_get_user')
  const repeat=await requestAuth(api,key,'token?grant_type=password',{email,password})
  assert.equal(repeat.status,200,'repeat_login_failed')
  assert.equal(repeat.data.user?.id,who.data.id,'repeat_login_changed_owner')
  // The same live GoTrue session now passes candidate HTTP handlers with
  // an in-memory outbox. No hosted SQL or Meta provider interaction.
  console.log('META_AUTH_PHASE candidate_edge_real_jwt')
  const edge=await runAuthenticatedMetaEdgeLab({
    api,key,ownerId:who.data.id,token,
  })
  assert.equal(edge.status,'LOCAL_AUTH_META_EDGE_CONTRACT_PASS')
  return {result:'LOCAL_GOTRUE_CONFIRMED_SIGNUP_PASS',
    signupRequestedWithoutSession:true,
    unverifiedLoginRejected:true,
    confirmedAuthUser:true,
    repeatLoginSameOwner:true,
    edgeContract:edge.status,
    browserOwnerSpoofRejected:edge.browserOwnerSpoofRejected,
    gpcWithdrawPersistedInMemory:edge.gpcWithdrawPersistedInMemory,
    hostedRequests:0,metaProviderRequests:0}
}
const direct=process.argv[1]?.endsWith('/meta-local-auth-lab.mjs')
if(direct){
  runMetaLocalAuthLab({statusFile:process.argv[2]}).then(result=>{
    console.log(JSON.stringify(result))
  }).catch(error=>{
    // Never reveal token, email, signup response, Mailpit content or passwords.
    const allowed=/^[a-zA-Z0-9_ -]{3,100}$/.test(error.message)
    console.error('META_LOCAL_AUTH_LAB_FAIL: '+error.name+' / '+(allowed?error.message:'redacted_failure_detail'))
    process.exitCode=1
  })
}
