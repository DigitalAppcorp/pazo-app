// #169 — real local gateway + Edge runtime + worker + candidate SQL over HTTP.
// Proves how the dispatch secret behaves at the JWT gateway, then settles one
// durable event against an in-memory fake provider. No Meta, no hosted project.
import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {localPsql} from './meta-local-gotrue-sql-lab.mjs'
const SECRET='synthetic_local_worker_dispatch_secret_0123456789'
const UA='Mozilla/5.0 (PAZO Synthetic Worker Lab)'
function loopback(url){
 const u=new URL(url)
 assert.equal(u.protocol,'http:')
 assert.ok(['localhost','127.0.0.1','[::1]'].includes(u.hostname))
 assert.equal(u.port,'54321','worker lab must use ONLY local CLI Kong')
 return u.origin
}
export async function runMetaLocalWorkerHttpLab({api,serviceKey,dbUrl}={}){
 const base=loopback(api)
 assert.ok(typeof serviceKey==='string'&&serviceKey.length>15)
 const sql=localPsql(dbUrl)
 const service=q=>sql('SET ROLE service_role;'+q)
 const call=async(fn,{method='POST',auth=SECRET,headers={},path=''}={})=>{
  const res=await fetch(base+'/functions/v1/'+fn+path,{method,redirect:'manual',
   signal:AbortSignal.timeout(20000),
   headers:{...(auth?{authorization:'Bearer '+auth}:{}),...headers}})
  const text=await res.text()
  let data=null
  try{data=JSON.parse(text)}catch{/* a gateway may answer in plain text */}
  return {status:res.status,data}
 }
 const worker='pazo-meta-worker-lab',control='pazo-meta-worker-jwt-control'
 // Control: identical function behind verify_jwt=true. Reproduces the finding,
 // so the PASS below is not explained by a gateway that verifies nothing.
 const gated=await call(control)
 assert.equal(gated.status,401,'JWT gateway must reject a non-JWT dispatch secret')
 assert.notDeepEqual(gated.data,{status:'not_available'},
  'rejection must come from the gateway, before the handler')
 console.log('META_WORKER_HTTP_PHASE jwt_gateway_rejects_dispatch_secret')
 // With the repo's verify_jwt setting the handler itself makes every decision.
 const expectDenied=async(options,code)=>{
  const r=await call(worker,options)
  assert.equal(r.status,code,JSON.stringify(Object.keys(options)))
  assert.deepEqual(r.data,{status:'not_available'})
 }
 await expectDenied({auth:''},401)
 await expectDenied({auth:'synthetic_wrong_worker_dispatch_secret_0123456'},401)
 await expectDenied({headers:{origin:'https://pazo-app.vercel.app'}},403)
 await expectDenied({headers:{cookie:'session=synthetic'}},403)
 await expectDenied({method:'PUT'},405)
 console.log('META_WORKER_HTTP_PHASE handler_denies_browser_and_wrong_secret')

 const created=async()=>{
  const email='pazo-worker-'+randomUUID().slice(0,12)+'@example.invalid'
  const res=await fetch(base+'/auth/v1/admin/users',{method:'POST',redirect:'manual',
   signal:AbortSignal.timeout(12000),
   headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,
    'content-type':'application/json'},
   body:JSON.stringify({email,password:'PazoLab!4'+randomUUID().replaceAll('-',''),
    email_confirm:true})})
  assert.ok([200,201].includes(res.status),'local_admin_user_create_failed')
  const {id}=await res.json()
  sql(`INSERT INTO marketing_private.acquisition(owner_id,signup_verified_at)
    SELECT id,email_confirmed_at FROM auth.users WHERE id='${id}'`)
  assert.equal(service(`SELECT public.pazo_meta_grant_first_session_candidate(
    '${id}','pazo-meta-conversions-v1',false)`),'t')
  assert.equal(service(`SELECT public.pazo_meta_capture_ua_candidate('${id}','${UA}')`),'t')
  return {id,email}
 }
 const provider=async()=>{
  const r=await call(worker,{method:'GET',auth:'',path:'/__captured'})
  assert.equal(r.status,200)
  return r.data
 }
 const statusOf=id=>sql(`SELECT status FROM marketing_private.meta_outbox_candidate
   WHERE owner_id='${id}'`)
 assert.deepEqual(await provider(),[])
 // A withdrawn owner is never delivered, whoever holds the dispatch secret.
 const withdrawn=await created()
 assert.equal(service(`SELECT public.pazo_meta_withdraw_candidate('${withdrawn.id}')`),'t')
 const owner=await created()
 const eventId=sql(`SELECT event_id::text FROM marketing_private.meta_outbox_candidate
   WHERE owner_id='${owner.id}'`)
 const accepted=await call(worker)
 assert.equal(accepted.status,200,'empty POST must reach the handler through Kong')
 assert.deepEqual(accepted.data,{status:'accepted'})
 assert.equal(statusOf(owner.id),'sent')
 assert.equal(statusOf(withdrawn.id),'suppressed')
 const delivered=await provider()
 assert.equal(delivered.length,1)
 const event=delivered[0].event
 assert.deepEqual(delivered[0].keys,['data'],'no test code in the worker payload')
 assert.equal(event.event_id,eventId,'CAPI must use the durable SQL event ID')
 assert.equal(event.event_name,'CompleteRegistration')
 assert.deepEqual(Object.keys(event.user_data).sort(),['client_user_agent','em'])
 const em=[event.user_data.em].flat()[0]
 assert.equal(em,createHash('sha256').update(owner.email).digest('hex'))
 assert.equal(event.user_data.client_user_agent,UA)
 assert.equal(JSON.stringify(delivered).includes(owner.email),false,'no raw email to provider')
 console.log('META_WORKER_HTTP_PHASE one_durable_event_sent_to_fake_provider')
 const again=await call(worker)
 assert.equal(again.status,200)
 assert.deepEqual(again.data,{status:'not_eligible'})
 assert.equal((await provider()).length,1,'a settled event is never resent')
 console.log('META_WORKER_HTTP_PHASE no_duplicate_after_settlement')
 return {status:'LOCAL_REAL_WORKER_HTTP_PASS',jwtGatewayRejectsDispatchSecret:true,
  handlerReachedWithRepoVerifyJwt:true,realSqlOutbox:true,
  fakeProviderOnly:true,metaNetworkRequests:0,hostedRequests:0}
}
