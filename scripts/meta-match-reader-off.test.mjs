import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createMetaMatchReader}
  from '../supabase/functions/_shared/metaMatchReader.mjs'

const owner='16900000-0000-4000-8000-000000000001'
const event='11111111-2222-4333-8444-555555555555'
const lease='77777777-8888-4999-aaaa-bbbbbbbbbbbb'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const secret='synthetic-service-role-long-key-123456789'
const hash=createHash('sha256').update('synthetic@example.invalid').digest('hex')
const browserUA='Mozilla/5.0 (PAZO authentic approved browser fixture)'

test('OFF or absent data-source approval means no matching reader or network',async()=>{
 let calls=0
 for(const patch of [{},{enabled:true},{enabled:true,privacyReviewed:true},
  {enabled:true,privacyReviewed:true,sourceApproved:true,url,serviceKey:'short'}]){
  assert.equal(createMetaMatchReader({...patch,fetchImpl:async()=>{calls++}}),null)
 }
 assert.equal(calls,0)
})
test('private matching lookup never carries account or email in body or URL',async()=>{
 let calls=0
 const read=createMetaMatchReader({enabled:true,privacyReviewed:true,
  sourceApproved:true,url,serviceKey:secret,
  fetchImpl:async(uri,opts)=>{
   calls++
   assert.equal(uri,url+'/rest/v1/rpc/pazo_meta_read_match_candidate')
   assert.equal(opts.headers.authorization,'Bearer '+secret)
   assert.equal(opts.headers.apikey,secret)
   assert.deepEqual(JSON.parse(opts.body),{p_event:event,p_lease:lease})
   assert.equal(opts.body.includes(owner),false)
   assert.equal(opts.body.includes('example.invalid'),false)
   return new Response(JSON.stringify([{em:hash,client_user_agent:browserUA}]),{
    status:200,headers:{'content-type':'application/json'}})
  },
 })
 assert.deepEqual(await read(owner,event,lease),{em:hash,clientUserAgent:browserUA})
 assert.equal(calls,1)
})
test('invalid Auth owner, event and stale lease are refused without network',async()=>{
 let calls=0
 const read=createMetaMatchReader({enabled:true,privacyReviewed:true,
  sourceApproved:true,url,serviceKey:secret,fetchImpl:async()=>{calls++}})
 for(const args of [[null,event,lease],[owner,'bad',lease],
  [owner,event,'bad'],['not-owner',event,lease]]){
   assert.equal(await read(...args),null)
 }
 assert.equal(calls,0)
})
test('unexpected response rows, raw email or untrusted User-Agent fail closed',async()=>{
 for(const rows of [
   [],[{em:hash,client_user_agent:browserUA},{em:hash,client_user_agent:browserUA}],
   [{email:'synthetic@example.invalid',client_user_agent:browserUA}],
   [{em:hash,client_user_agent:'cron'}],
   [{em:hash.toUpperCase(),client_user_agent:browserUA}],
   [{em:hash,client_user_agent:'Mozilla/5.0\nInjected'}],
 ]) {
  const read=createMetaMatchReader({enabled:true,privacyReviewed:true,
   sourceApproved:true,url,serviceKey:secret,
   fetchImpl:async()=>new Response(JSON.stringify(rows),{status:200})})
  assert.equal(await read(owner,event,lease),null,JSON.stringify(rows))
 }
})
