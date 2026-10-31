// #169 — REAL GoTrue JWT and REAL candidate SQL in the SAME disposable
// Supabase CLI PostgreSQL instance. NO hosted connection or Meta network.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {createMetaGrantHandler} from '../supabase/functions/pazo-meta-consent/grantCore.mjs'
import {createMetaReceiptHandler} from '../supabase/functions/pazo-meta-receipt/receiptCore.mjs'
import {createMetaWithdrawalHandler} from '../supabase/functions/pazo-meta-consent/withdrawCore.mjs'
import {createMetaConsentTransport,createMetaWithdrawalTransport}
 from '../src/features/marketing/metaConsentTransport.mjs'
import {completeExplicitMetaOptIn}
 from '../src/features/marketing/metaConsentRegistrationFlow.mjs'

const ORIGIN='https://pazo-app.vercel.app'
const DATASET='1438916858347709'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function localOnly(url,port){
 const u=new URL(url)
 assert.equal(u.protocol,'http:')
 assert.ok(['localhost','127.0.0.1','[::1]'].includes(u.hostname))
 if(port)assert.equal(u.port,String(port))
 return u
}
function localPsql(dbUrl){
 const u=new URL(dbUrl)
 assert.ok(['postgres:','postgresql:'].includes(u.protocol))
 assert.ok(['localhost','127.0.0.1','[::1]'].includes(u.hostname))
 assert.equal(u.port,'54322','SQL integration must use ONLY local CLI PostgreSQL')
 assert.equal(u.username,'postgres')
 assert.equal(u.pathname,'/postgres')
 const env={...process.env,PGHOST:'127.0.0.1',PGPORT:u.port,
   PGUSER:'postgres',PGDATABASE:'postgres',PGPASSWORD:decodeURIComponent(u.password),
   PGSSLMODE:'disable'}
 return query=>{
  const r=spawnSync('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{
    env,input:query,encoding:'utf8',maxBuffer:350000,timeout:15000})
  if(r.status!==0)throw Error('local_sql_query_failed')
  return r.stdout.trim()
 }
}
function fileSql(path){
 assert.ok(path.startsWith('supabase/tests/marketing/'))
 return readFileSync(path,'utf8')
}
export async function runLocalGoTrueSqlMeta({api,key,ownerId,token,dbUrl}={}){
 const base=localOnly(api,54321).origin
 assert.match(ownerId,UUID)
 assert.ok(typeof token==='string'&&token.length>=30)
 assert.ok(typeof key==='string'&&key.length>=16)
 const sql=localPsql(dbUrl)
 // These DDL files are strictly test-only; the candidate SQL is unmodified.
 sql(fileSql('supabase/tests/marketing/meta-local-gotrue-prerequisites.sql'))
 sql(fileSql('supabase/tests/marketing/meta-outbox-candidate.sql'))
 console.log('META_SQL_PHASE candidate_schema_installed_local')
 const quoted="'"+ownerId+"'"
 const select=q=>sql(q)
 const service=q=>sql('SET ROLE service_role;'+q)
 const auth=async jwt=>{
  const u=base+'/auth/v1/user'
  localOnly(u,54321)
  const response=await fetch(u,{method:'GET',redirect:'manual',
    signal:AbortSignal.timeout(7000),
    headers:{apikey:key,authorization:'Bearer '+jwt,'accept':'application/json'}})
  if(response.status!==200)return null
  let x
  try{x=await response.json()}catch{return null}
  if(!x?.id||!UUID.test(x.id)||x.is_anonymous===true)return null
  return {id:x.id,is_anonymous:false,email_confirmed_at:x.email_confirmed_at}
 }
 const verified=await auth(token)
 assert.equal(verified?.id,ownerId)
 assert.ok(verified.email_confirmed_at)
 assert.equal(select('SELECT enabled FROM marketing_private.meta_release_gate_candidate WHERE singleton'),'f')
 assert.equal(select('SELECT count(*) FROM marketing_private.meta_outbox_candidate'),'0')
 // Gate changes occur only inside the disposable local test database. Never
 // apply them to hosted PAZO. No SDK or Graph API is enabled by these writes.
 sql("UPDATE marketing_private.collection_gate SET enabled=true WHERE singleton")
 sql("UPDATE marketing_private.meta_release_gate_candidate SET enabled=true WHERE singleton")
 const inserted=select(`INSERT INTO marketing_private.acquisition(owner_id,signup_verified_at)
   SELECT id,email_confirmed_at FROM auth.users WHERE id=${quoted}
   RETURNING owner_id::text`)
 assert.equal(inserted,ownerId)
 assert.equal(select('SELECT count(*) FROM marketing_private.meta_outbox_candidate'),'0',
  'confirmed signup is not enough without deliberate consent')
 console.log('META_SQL_PHASE verified_auth_signup_no_provider_event')

 const grant=createMetaGrantHandler({released:true,privacyReviewed:true,
  authenticate:auth,authenticateGpc:auth,
  grant:async(owner,notice,gpc)=>{
   if(owner!==ownerId)return false
   return service(`SELECT public.pazo_meta_grant_first_session_candidate(
      '${owner}', '${notice}', ${gpc?'true':'false'})`)==='t'
  },
  persistGpc:async owner=>service(
   `SELECT public.pazo_meta_withdraw_candidate('${owner}')`)==='t'})
 const receipt=createMetaReceiptHandler({released:true,privacyReviewed:true,
  authenticate:auth,authenticateGpc:auth,persistGpc:async owner=>service(
   `SELECT public.pazo_meta_withdraw_candidate('${owner}')`)==='t',
  lookupReceipt:async owner=>{
   if(owner!==ownerId)return null
   const data=service(`SELECT row_to_json(r) FROM (
      SELECT * FROM public.pazo_meta_take_pixel_receipt_candidate('${owner}')
   ) r`)
   if(!data)return null
   const row=JSON.parse(data)
   return {ownerId:owner,authorized:true,verifiedRegistration:true,
    excluded:false,gpc:false,sharingOptOut:false,withdrawn:false,
    metaReleaseEnabled:true,eventId:row.event_id,datasetId:DATASET,
    eventTime:Math.floor(Date.parse(row.event_time)/1000)}
  },
 })
 const withdrawal=createMetaWithdrawalHandler({released:true,
  authenticate:auth,withdraw:async owner=>
   service(`SELECT public.pazo_meta_withdraw_candidate('${owner}')`)==='t'})
 const handlers={
  'pazo-meta-grant':grant,'pazo-meta-receipt':receipt,
  'pazo-meta-consent':withdrawal,
 }
 const invoke=async(name,opts)=>{
  const handler=handlers[name]
  assert.ok(handler)
  const req=new Request('https://local.invalid/'+name,{
   method:'POST',headers:{origin:ORIGIN,
    'content-type':'application/json',
    'x-client-info':'supabase-js-local',
    authorization:opts.headers.Authorization},
   body:JSON.stringify(opts.body),
  })
  const res=await handler(req)
  return {data:await res.json(),error:res.ok?null:{status:res.status}}
 }
 const snapshot=()=>({id:ownerId,accessToken:token})
 let gpc=false,pixelCount=0,reportedEvent=null
 const browser={navigator:{get globalPrivacyControl(){return gpc}}}
 const transport=createMetaConsentTransport({
  released:true,privacyApproved:true,
  supabaseClient:{functions:{invoke}},ownerId,
  getSessionSnapshot:snapshot,stillPermitted:()=>true,browser})
 const optOut=createMetaWithdrawalTransport({
  withdrawalReleased:true,supabaseClient:{functions:{invoke}},
  ownerId,getSessionSnapshot:snapshot,
 })
 const result=await completeExplicitMetaOptIn({
  releaseEnabled:true,privacyApproved:true,deliberateOptIn:true,
  ownerId,accessToken:token,getActiveSession:snapshot,
  stillPermitted:()=>true,browser,dom:{},
  requestGrant:transport.requestGrant,requestReceipt:transport.requestReceipt,
  requestWithdraw:optOut.requestWithdraw,
  pixelLoader:async ({eventId})=>{
   pixelCount++;reportedEvent=eventId
   return {status:'queued'} // in-memory mock; not an SDK or Meta network
  },
 })
 assert.equal(result.status,'queued','local SQL + Auth consent must succeed')
 const dbEvent=select(`SELECT event_id::text FROM marketing_private.meta_outbox_candidate
   WHERE owner_id=${quoted}`)
 assert.match(dbEvent,UUID4)
 assert.equal(reportedEvent,dbEvent,'Pixel contract ID must match durable SQL ID')
 assert.equal(pixelCount,1)
 assert.equal(select('SELECT count(*) FROM marketing_private.meta_outbox_candidate'),'1')
 console.log('META_SQL_PHASE real_gotrue_jwt_and_stored_uuid_match')
 // Identical signed-in user cannot mint a second event on a second tab/login.
 const again=await completeExplicitMetaOptIn({
  releaseEnabled:true,privacyApproved:true,deliberateOptIn:true,
  ownerId,accessToken:token,getActiveSession:snapshot,
  stillPermitted:()=>true,browser,dom:{},
  requestGrant:transport.requestGrant,requestReceipt:transport.requestReceipt,
  pixelLoader:async()=>{pixelCount++;return {status:'queued'}},
 })
 assert.notEqual(again.status,'queued')
 assert.equal(pixelCount,1)
 assert.equal(select(`SELECT event_id::text FROM marketing_private.meta_outbox_candidate
   WHERE owner_id=${quoted}`),dbEvent)

 // Worker claims but never transmits: an authenticated GPC request must
 // atomically cancel this durable leased event before it could be settled.
 const lease=service('SELECT row_to_json(l) FROM (SELECT * FROM public.pazo_meta_lease_candidate()) l')
 assert.ok(lease,'worker must obtain a local-only lease')
 const held=JSON.parse(lease)
 assert.equal(held.owner_id,ownerId)
 assert.equal(held.event_id,dbEvent)
 assert.equal(service(`SELECT owner_id::text
   FROM public.pazo_meta_check_claim_candidate('${dbEvent}','${held.lease_id}')`),ownerId)
 const gpcReq=new Request('https://local.invalid/pazo-meta-receipt',{
  method:'POST',headers:{origin:ORIGIN,'content-type':'application/json',
    authorization:'Bearer '+token,'sec-gpc':'1'},body:'{}'})
 const gpcReply=await receipt(gpcReq)
 assert.equal(gpcReply.status,403,'GPC request must persist opt-out and refuse receipt')
 assert.equal(select(`SELECT status FROM marketing_private.meta_outbox_candidate
   WHERE owner_id=${quoted}`),'suppressed')
 assert.equal(service(`SELECT owner_id::text
   FROM public.pazo_meta_check_claim_candidate('${dbEvent}','${held.lease_id}')`),'')
 assert.equal(service(`SELECT public.pazo_meta_settle_candidate(
   '${dbEvent}','${held.lease_id}','sent')`),'f')
 assert.equal(service(`SELECT * FROM public.pazo_meta_take_pixel_receipt_candidate(
    ${quoted})`),'')
 assert.equal(select(`SELECT decision FROM marketing_private.meta_purpose_candidate
    WHERE owner_id=${quoted}`),'withdrawn')
 assert.deepEqual(await optOut.requestWithdraw({
  accessToken:token,body:{action:'withdraw'}}),{status:'withdrawn'})
 assert.equal(service(`SELECT public.pazo_meta_grant_first_session_candidate(
   ${quoted},'pazo-meta-conversions-v1',false)`),'f')
 gpc=true
 assert.equal((await transport.requestGrant({accessToken:token,
  body:{action:'grant',noticeVersion:'pazo-meta-conversions-v1'}})).status,'not_available')
 assert.equal(pixelCount,1,'GPC must prevent any further Pixel callbacks')
 console.log('META_SQL_PHASE gpc_revoked_durable_sql_lease_and_receipt')
 // No untrusted browser/database role can mutate/read private state.
 for(const role of ['anon','authenticated']){
  assert.throws(()=>sql(`SET ROLE ${role}; SELECT * FROM marketing_private.meta_outbox_candidate`))
  assert.throws(()=>sql(`SET ROLE ${role}; SELECT public.pazo_meta_withdraw_candidate(${quoted})`))
 }
 return {status:'LOCAL_REAL_AUTH_SQL_META_PASS',
  realGoTrueJwt:true,samePostgresAuthAndOutbox:true,
  actualCandidateSql:true,sameUuidAcrossServerAndBrowserMock:true,
  repeatedSignupPrevented:true,gpcRevokedLeasedWork:true,
  serviceOnlyRpcs:true,
  metaNetworkRequests:0,hostedDbRequests:0}
}
