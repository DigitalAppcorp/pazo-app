// #169 — real local gateway + Edge runtime + worker + candidate SQL over HTTP.
// Proves how the dispatch secret behaves at the JWT gateway, then settles one
// durable event against an in-memory fake provider. No Meta, no hosted project.
import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {localPsql} from './meta-local-gotrue-sql-lab.mjs'
import {currentTickBodyArgument} from './meta-worker-dispatch-source.mjs'
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
  // Status values only; the handler never returns identifiers or secrets.
  console.log('META_WORKER_HTTP_DIAG denied_expected='+code+' observed='+r.status
   +' handler_status='+String(r.data?.status).replace(/[^a-z_]/g,''))
  assert.equal(r.status,code,JSON.stringify(Object.keys(options)))
  assert.deepEqual(r.data,{status:'not_available'})
 }
 await expectDenied({auth:''},401)
 await expectDenied({auth:'synthetic_wrong_worker_dispatch_secret_0123456'},401)
 await expectDenied({headers:{origin:'https://pazo-app.vercel.app'}},403)
 await expectDenied({headers:{cookie:'session=synthetic'}},403)
 await expectDenied({method:'PUT'},405)
 console.log('META_WORKER_HTTP_PHASE handler_denies_browser_and_wrong_secret')

 const signup=async()=>{
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
  return {id,email}
 }
 const created=async()=>{
  const {id,email}=await signup()
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
 console.log('META_WORKER_HTTP_DIAG authorized_status='+accepted.status
  +' handler_status='+String(accepted.data?.status).replace(/[^a-z_]/g,''))
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

 // Rejection and GPC leave nothing to send, whoever holds the dispatch secret.
 const rejected=await signup()
 assert.equal(service(`SELECT public.pazo_meta_withdraw_candidate('${rejected.id}')`),'t')
 const gpc=await signup()
 assert.equal(service(`SELECT public.pazo_meta_grant_first_session_candidate(
   '${gpc.id}','pazo-meta-conversions-v1',true)`),'f')
 assert.deepEqual((await call(worker)).data,{status:'not_eligible'})
 for(const {id} of [rejected,gpc])assert.equal(statusOf(id),'')
 assert.equal((await provider()).length,1,'rejection and GPC are never delivered')
 console.log('META_WORKER_HTTP_PHASE rejection_and_gpc_never_delivered')

 // A closed gate holds a queued event back; it stays queued and unsent.
 const held=await created()
 sql('UPDATE marketing_private.meta_release_gate_candidate SET enabled=false')
 await call(worker)
 assert.equal(statusOf(held.id),'pending')
 assert.equal((await provider()).length,1,'a closed gate sends nothing')
 sql('UPDATE marketing_private.meta_release_gate_candidate SET enabled=true')
 console.log('META_WORKER_HTTP_PHASE closed_gate_never_delivered')

 // The dispatch itself, through real pg_net and Kong. A fetch from this script
 // cannot show what the database sends, which is how the `{}` bug reached production.
 const viaPgNet=async body=>{
  const request=sql(`SELECT net.http_post(
    url:='http://supabase_kong_pazo-meta-auth-lab:8000/functions/v1/${worker}',
    headers:=jsonb_build_object('authorization','Bearer ${SECRET}'),
    body:=${body},timeout_milliseconds:=15000)`)
  for(let attempt=0;attempt<40;attempt++){
   const code=sql(`SELECT status_code FROM net._http_response WHERE id=${request}`)
   if(code)return Number(code)
   await new Promise(resolve=>setTimeout(resolve,500))
  }
  throw Error('pg_net_no_response')
 }
 sql('CREATE EXTENSION IF NOT EXISTS pg_net')
 assert.equal(await viaPgNet("'{}'::jsonb"),400,'control: pg_net default must be refused')
 assert.equal(statusOf(held.id),'pending','a refused dispatch leaves the event queued')
 const bodyArgument=currentTickBodyArgument()
 assert.equal(await viaPgNet(bodyArgument),200,'the current tick must reach the handler')
 assert.equal(statusOf(held.id),'sent')
 assert.equal((await provider()).length,2)
 console.log('META_WORKER_HTTP_PHASE real_pg_net_dispatch_sends_once')
 return {status:'LOCAL_REAL_WORKER_HTTP_PASS',jwtGatewayRejectsDispatchSecret:true,
  handlerReachedWithRepoVerifyJwt:true,realSqlOutbox:true,
  fakeProviderOnly:true,metaNetworkRequests:0,hostedRequests:0}
}
