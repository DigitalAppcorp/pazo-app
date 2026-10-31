// #169 — Real Supabase LOCAL Edge runtime over HTTP, using GoTrue JWT.
// Requires the already-initialized disposable SQL/GoTrue lab. No Meta requests.
import assert from 'node:assert/strict'
import {localPsql} from './meta-local-gotrue-sql-lab.mjs'
const ORIGIN='https://pazo-app.vercel.app'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function loopback(url){
 const u=new URL(url)
 assert.equal(u.protocol,'http:')
 assert.ok(['localhost','127.0.0.1','[::1]'].includes(u.hostname))
 assert.equal(u.port,'54321','Edge HTTP lab must use ONLY local CLI Kong')
 return u.origin
}
export async function runMetaLocalEdgeHttpLab({api,key,ownerId,token,dbUrl}={}){
 const base=loopback(api)
 assert.match(ownerId,UUID)
 assert.ok(typeof token==='string'&&token.length>30)
 assert.ok(typeof key==='string'&&key.length>15)
 const sql=localPsql(dbUrl)
 const q="'"+ownerId+"'"
 const request=async(route,{body={},auth=token,origin=ORIGIN,
   method='POST',extraHeaders={}}={})=>{
  assert.ok(['grant','receipt','withdraw','status'].includes(route))
  const url=base+'/functions/v1/pazo-meta-lab/'+route
  loopback(url)
  const res=await fetch(url,{
   method,redirect:'manual',signal:AbortSignal.timeout(9000),
   headers:{apikey:key,authorization:'Bearer '+auth,
    origin,'content-type':'application/json',...extraHeaders},
   ...(method==='POST'?{body:JSON.stringify(body)}:{}),
  })
  let data
  try{data=await res.json()}catch{data=null}
  return {status:res.status,data,headers:res.headers}
 }
 const status=await request('status',{method:'GET'})
 assert.equal(status.status,404,
  'local candidate handler must respond over actual Edge HTTP')
 assert.deepEqual(status.data,{status:'not_available'})
 console.log('META_EDGE_HTTP_PHASE served_local_deno_runtime')
 // The same verified signup from earlier in the lab has a persistently
 // withdrawn purpose. A second HTTP grant must NOT revive it.
 const rejected=await request('grant',{body:{
  action:'grant',noticeVersion:'pazo-meta-conversions-v1',
 }})
 assert.equal(rejected.status,409,
  'real Edge and SQL must reject re-grant after persisted withdrawal')
 assert.deepEqual(rejected.data,{status:'not_available'})
 // The local service-level RPC may not be callable by browser roles.
 const noReceipt=await request('receipt',{body:{}})
 assert.equal(noReceipt.status,404,
  'withdrawn account must never consume another server Pixel receipt')
 const foreign=await request('withdraw',{body:{action:'withdraw'},
  origin:'https://attacker.invalid'})
 assert.equal(foreign.status,403)
 const invalid=await request('withdraw',{body:{action:'withdraw'},
  auth:'synthetic-invalid-jwt-1234567890'})
 assert.equal(invalid.status,401)
 assert.deepEqual(invalid.data,{status:'not_available'})
 console.log('META_EDGE_HTTP_PHASE auth_and_origin_denials')
 const before=sql(`SELECT decision||'|'||sharing_opt_out||'|'||gpc_at_last_request
 FROM marketing_private.meta_purpose_candidate WHERE owner_id=${q}`)
 assert.equal(before,'withdrawn|t|t')
 const gpc=await request('receipt',{body:{},
  extraHeaders:{'sec-gpc':'1'}})
 assert.equal(gpc.status,403)
 assert.deepEqual(gpc.data,{status:'not_available'})
 const explicit=await request('withdraw',{body:{action:'withdraw'}})
 assert.equal(explicit.status,200)
 assert.deepEqual(explicit.data,{status:'withdrawn'})
 const after=sql(`SELECT decision||'|'||sharing_opt_out||'|'||gpc_at_last_request
 FROM marketing_private.meta_purpose_candidate WHERE owner_id=${q}`)
 assert.equal(after,before,'GPC/withdrawal must persist across real Edge HTTP')
 assert.equal(sql(`SELECT status FROM marketing_private.meta_outbox_candidate
 WHERE owner_id=${q}`),'suppressed')
 console.log('META_EDGE_HTTP_PHASE durable_gpc_and_idempotent_withdraw')
 const cors=await request('withdraw',{method:'OPTIONS'})
 assert.equal(cors.status,204)
 assert.equal(cors.headers.get('access-control-allow-origin'),ORIGIN)
 assert.equal(cors.headers.get('cache-control'),'no-store')
 const noBrowser=await request('withdraw',{body:{action:'withdraw',ownerId}})
 assert.equal(noBrowser.status,400,
  'browser must not provide an owner ID in withdrawal body')
 return {status:'LOCAL_REAL_EDGE_HTTP_META_PASS',
  actualDenoRuntime:true,actualLocalPostgrestRpc:true,
  realGoTrueJwt:true,originAndJwtChecks:true,
  persistentGpcThroughHttp:true,privateOutboxRevoked:true,
  noMetaNetwork:true,noHostedChanges:true}
}
