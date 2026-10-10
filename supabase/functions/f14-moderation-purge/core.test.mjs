import test from 'node:test'
import assert from 'node:assert/strict'
import {resolvePurgeObject,runMediaPurge,PurgeRejected} from './core.ts'
const origin='https://pazo-test.supabase.co'
const id='2158592e-627e-4ff1-af17-82db400a487d'
const url=origin+'/storage/v1/object/public/post-photos/owner/photo.png'
function stub(overrides={}) {
 const calls=[]
 const deps={
  authorizeModerator:async()=>{calls.push('auth');return true},
  fetchRow:async()=>{calls.push('row');return {photo_url:url}},
  gate:async(_target,stage)=>{calls.push(stage);return true},
  objectExists:async()=>{calls.push('exists');return calls.filter(x=>x==='exists').length===1},
  removeObject:async()=>{calls.push('remove')},
  publicUrlInaccessible:async()=>{calls.push('head');return true},
  ...overrides,
 }
 return {calls,deps}
}
test('success validates auth, current row, backend, object and public URL before finalizing',async()=>{
 const {calls,deps}=stub()
 assert.deepEqual(await runMediaPurge(origin,'feed_post',id,deps),{status:'origin_removed_cdn_uncertain'})
 assert.deepEqual(calls,['auth','row','preflight','exists','remove','exists','head','complete'])
})
test('missing origin reconciles prior attempt without additional delete',async()=>{
 const {calls,deps}=stub({objectExists:async()=>{calls.push('exists');return false}})
 await runMediaPurge(origin,'feed_post',id,deps)
 assert.ok(!calls.includes('remove'));assert.ok(calls.includes('complete'))
})
test('non moderator cannot read row or delete',async()=>{
 const {calls,deps}=stub({authorizeModerator:async()=>{calls.push('auth');return false}})
 await assert.rejects(runMediaPurge(origin,'feed_post',id,deps),e=>e instanceof PurgeRejected&&e.code==='unauthorized')
 assert.deepEqual(calls,['auth'])
})
test('preflight failure stops before any storage call',async()=>{
 const {calls,deps}=stub({gate:async()=>{calls.push('preflight');return false}})
 await assert.rejects(runMediaPurge(origin,'feed_post',id,deps))
 assert.deepEqual(calls,['auth','row','preflight'])
})
test('remaining object or public cache never marks purged',async()=>{
 for (const stage of ['exists','head']) {
  const {calls,deps}=stub(stage==='exists'?{objectExists:async()=>{calls.push('exists');return true}}
   :{publicUrlInaccessible:async()=>{calls.push('head');return false}})
  await assert.rejects(runMediaPurge(origin,'feed_post',id,deps))
  assert.ok(!calls.includes('complete'))
 }
})
test('fail-closed if backend refuses to finalize',async()=>{
 const {calls,deps}=stub({gate:async(_o,s)=>{calls.push(s);return s==='preflight'}})
 await assert.rejects(runMediaPurge(origin,'feed_post',id,deps))
 assert.ok(calls.includes('complete'))
})
test('rejects external links, wrong bucket/project, traversal and ambiguous objects',()=>{
 const bad=[
  'https://other.supabase.co/storage/v1/object/public/post-photos/x/y.png',
  'https://images.unsplash.com/test.png',
  origin+'/storage/v1/object/public/pet-documents/x/y.png',
  origin+'/storage/v1/object/public/post-photos/x/y.png?token=x',
  origin+'/storage/v1/object/public/post-photos/x%2f..%2fother.png',
 ]
 for(const link of bad)assert.throws(()=>resolvePurgeObject(origin,'feed_post',id,{photo_url:link}))
 assert.throws(()=>resolvePurgeObject(origin,'pet_profile',id,{photo_url:url}))
 assert.throws(()=>resolvePurgeObject(origin,'feed_post','invalid',{photo_url:url}))
 assert.throws(()=>resolvePurgeObject(origin,'feed_post',id,{photo_url:null}))
})
test('community storage path must match exact row',()=>{
 const path=id+'/author-id/pic.jpg'
 const link=origin+'/storage/v1/object/public/community-post-photos/'+path
 assert.equal(resolvePurgeObject(origin,'community_post',id,{photo_url:link,photo_storage_path:path}).path,path)
 assert.throws(()=>resolvePurgeObject(origin,'community_post',id,{photo_url:link,photo_storage_path:'other/pic.jpg'}))
})
