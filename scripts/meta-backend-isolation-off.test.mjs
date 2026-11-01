import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolveMetaBackend}
  from '../supabase/functions/_shared/metaSupabaseOrigin.mjs'
import {createMetaOutboxRepository}
  from '../supabase/functions/_shared/metaOutboxRepository.mjs'
import {createMetaMatchReader}
  from '../supabase/functions/_shared/metaMatchReader.mjs'
import {createMetaWorkerRuntime}
  from '../supabase/functions/pazo-meta-worker/runtime.mjs'

const PRODUCTION='https://mrybvqdebbgcayuvgkkr.supabase.co'
const ISOLATED='https://abcdefghijklmnopqrst.supabase.co'
const LIVE='1438916858347709'
const QA='1090116830295088'
const KEY='synthetic_service_role_key_NOT_REAL_123456789'
const SECRET='synthetic_worker_dispatch_secret_123456789_ABC'
const TOKEN='synthetic_capi_token_ABC_123456789123456'
const gates={released:true,privacyReviewed:true,matchFieldsApproved:true,
 providerApproved:true}

test('production backend resolves only to the PAZO Web dataset',()=>{
 assert.deepEqual({...resolveMetaBackend({url:PRODUCTION})},
  {origin:PRODUCTION,datasetId:LIVE,isolated:false})
})
test('declared isolated backend resolves only to the QA dataset',()=>{
 for(const origin of [ISOLATED,'http://kong:8000'])
  assert.deepEqual({...resolveMetaBackend({url:origin,isolatedOrigin:origin})},
   {origin,datasetId:QA,isolated:true})
})
test('arbitrary, malformed, mismatched or production-as-isolated URLs fail closed',()=>{
 for(const [url,isolatedOrigin] of [
  [null,null],[undefined,undefined],[123,null],['',null],
  // Undeclared isolated hosts, and SSRF look-alikes.
  [ISOLATED,null],['http://kong:8000',null],['https://foreign.invalid',null],
  [PRODUCTION+'/',null],[PRODUCTION+'.attacker.invalid',null],
  ['https://user:pw@mrybvqdebbgcayuvgkkr.supabase.co',null],
  // A staging config must never point at production, even if declared.
  [PRODUCTION,PRODUCTION],[PRODUCTION,ISOLATED],[ISOLATED,PRODUCTION],
  // Isolated values outside the allowlist.
  ['https://foreign.invalid','https://foreign.invalid'],
  ['http://abcdefghijklmnopqrst.supabase.co','http://abcdefghijklmnopqrst.supabase.co'],
  [ISOLATED+'/rest/v1',ISOLATED+'/rest/v1'],
  ['https://abc.supabase.co','https://abc.supabase.co'],
  ['http://127.0.0.1:54321','http://127.0.0.1:54321'],
  [ISOLATED,'https://zzzzzzzzzzzzzzzzzzzz.supabase.co'],[ISOLATED,42],
 ])assert.equal(resolveMetaBackend({url,isolatedOrigin}),null,String(url)+' / '+String(isolatedOrigin))
})
test('repository and match reader call RPC only on the resolved backend origin',async()=>{
 const seen=[]
 const fetchImpl=async uri=>{seen.push(uri);return new Response('[]',{status:200})}
 const repo=createMetaOutboxRepository({enabled:true,privacyApproved:true,
  matchFieldsApproved:true,url:ISOLATED,isolatedOrigin:ISOLATED,serviceKey:KEY,
  readApprovedMatchField:async()=>null,fetchImpl})
 await repo.leaseOne()
 const reader=createMetaMatchReader({enabled:true,privacyReviewed:true,
  sourceApproved:true,url:ISOLATED,isolatedOrigin:ISOLATED,serviceKey:KEY,fetchImpl})
 await reader('16900000-0000-4000-8000-000000000001',
  '11111111-2222-4333-8444-555555555555','77777777-8888-4999-aaaa-bbbbbbbbbbbb')
 assert.deepEqual(seen,[ISOLATED+'/rest/v1/rpc/pazo_meta_lease_candidate',
  ISOLATED+'/rest/v1/rpc/pazo_meta_read_match_candidate'])
 assert.equal(createMetaOutboxRepository({enabled:true,privacyApproved:true,
  matchFieldsApproved:true,url:ISOLATED,serviceKey:KEY,
  readApprovedMatchField:async()=>null,fetchImpl}),null)
 assert.equal(createMetaMatchReader({enabled:true,privacyReviewed:true,
  sourceApproved:true,url:ISOLATED,serviceKey:KEY,fetchImpl}),null)
})

const request=()=>new Request('https://lab.invalid/functions/v1/pazo-meta-worker',{
 method:'POST',headers:{authorization:'Bearer '+SECRET}})
const runtime=({url,isolatedOrigin,dataset,calls})=>createMetaWorkerRuntime({
 ...gates,url,isolatedOrigin,serviceKey:KEY,apiVersion:'v26.0',
 readApprovedMatchField:async()=>null,
 readSecret:name=>({META_WORKER_DISPATCH_SECRET:SECRET,META_DATASET_ID:dataset,
  META_CAPI_ACCESS_TOKEN:TOKEN})[name],
 fetchImpl:async uri=>{calls.push(uri);return new Response('[]',{status:200})},
})
test('dataset that does not belong to the backend stops before any lease',async()=>{
 for(const config of [
  {url:PRODUCTION,isolatedOrigin:null,dataset:QA},
  {url:ISOLATED,isolatedOrigin:ISOLATED,dataset:LIVE},
 ]){
  const calls=[]
  const reply=await runtime({...config,calls})(request())
  assert.equal(reply.status,503)
  assert.deepEqual(await reply.json(),{status:'not_configured'})
  assert.deepEqual(calls,[])
 }
})
test('matching backend and dataset do reach the outbox of that backend only',async()=>{
 for(const config of [
  {url:PRODUCTION,isolatedOrigin:null,dataset:LIVE},
  {url:ISOLATED,isolatedOrigin:ISOLATED,dataset:QA},
 ]){
  const calls=[]
  const reply=await runtime({...config,calls})(request())
  assert.deepEqual(await reply.json(),{status:'not_eligible'})
  assert.deepEqual(calls,[config.url+'/rest/v1/rpc/pazo_meta_lease_candidate'])
 }
})
test('staging pointed at production leaves the worker disabled with no calls',async()=>{
 const calls=[]
 const reply=await runtime({url:PRODUCTION,isolatedOrigin:ISOLATED,dataset:LIVE,calls})(request())
 assert.equal(reply.status,503)
 assert.deepEqual(await reply.json(),{status:'disabled'})
 assert.deepEqual(calls,[])
})

test('repo config lets the dispatch secret reach the handler and blocks global deploys',()=>{
 const config=readFileSync(new URL('../supabase/config.toml',import.meta.url),'utf8')
 const block=/^\[functions\.pazo-meta-worker\]\r?\n((?:(?!\[).*\r?\n?)*)/m.exec(config)?.[1]
 assert.ok(block,'worker needs an explicit config block')
 assert.match(block,/^verify_jwt = false\s*$/m)
 assert.match(block,/^enabled = false\s*$/m)
})
