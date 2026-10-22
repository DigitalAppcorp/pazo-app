import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { getPublicSupabaseConfig } from '../src/lib/publicConfig.ts'
import { canUseAccountFeatures } from '../src/features/auth/accountAccess.ts'
import { mapNotificationRow, getNotificationSightingId } from '../src/features/notifications/notificationSource.ts'
import { prepareCommunityPostCleanup, retainUnconfirmedUpload, CommunityMediaPendingError } from '../src/features/communities/communityMediaCleanup.ts'

const env = { VITE_SUPABASE_URL: 'https://mrybvqdebbgcayuvgkkr.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_test_only' }
test('T17 missing, malformed, foreign-project and private configuration fail closed', () => {
  for (const invalid of [{}, { ...env, VITE_SUPABASE_URL: '' }, { ...env, VITE_SUPABASE_PUBLISHABLE_KEY: '' },
    { ...env, VITE_SUPABASE_URL: 'https://other.supabase.co' }, { ...env, VITE_SUPABASE_URL: 'http://mrybvqdebbgcayuvgkkr.supabase.co' },
    { ...env, VITE_SUPABASE_URL: env.VITE_SUPABASE_URL + '/other' },
    { ...env, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_synthetic_never_valid' }]) {
    assert.equal(getPublicSupabaseConfig(invalid), null)
  }
  assert.deepEqual(getPublicSupabaseConfig(env), { url: env.VITE_SUPABASE_URL, key: env.VITE_SUPABASE_PUBLISHABLE_KEY })
  const jwt = payload => `e30.${btoa(JSON.stringify(payload))}.synthetic`
  assert.equal(getPublicSupabaseConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: jwt({role:'service_role',ref:'mrybvqdebbgcayuvgkkr'}) }), null)
  assert.equal(getPublicSupabaseConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: jwt({role:'anon',ref:'other'}) }), null)
  assert.ok(getPublicSupabaseConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: jwt({role:'anon',ref:'mrybvqdebbgcayuvgkkr'}) }))
})
test('T15 demo cannot use account features even if a session exists; real users can', () => {
  for (const id of [null, undefined, '']) for (const demo of [false,true]) assert.equal(canUseAccountFeatures(id,demo),false)
  assert.equal(canUseAccountFeatures('synthetic-user',true),false)
  assert.equal(canUseAccountFeatures('synthetic-user',false),true)
})
test('T03 system, unknown and untyped IDs never route to sighting details', () => {
  const row = { id:'synthetic-notification',title:'Test',body:'Test',read_at:null,created_at:'2026-10-10T00:00:00Z',pet_id:null,source_id:'synthetic-source' }
  for (const type of ['system','future','']) assert.equal(getNotificationSightingId(mapNotificationRow({...row,type})),null)
  const sighting = mapNotificationRow({...row,type:'sighting'})
  assert.equal(sighting.category,'comunidad')
  assert.equal(getNotificationSightingId(sighting),'synthetic-source')
  assert.equal(getNotificationSightingId({...sighting,sourceId:null}),null)
  assert.equal(getNotificationSightingId({...sighting,sourceType:undefined}),null)
  assert.equal(sighting.timeAgo,'Reciente') // T18 is explicitly excluded.
})
test('T16 denied, ambiguous and failed row deletion cannot enqueue confirmed deletion', async () => {
  for (const rows of [[],[{id:'other',community_id:'c',photo_storage_path:'other-photo'}],
    [{id:'p',community_id:'c',photo_storage_path:'x'},{id:'p2',community_id:'c',photo_storage_path:'y'}]]) {
    await assert.rejects(prepareCommunityPostCleanup('p',async()=>rows), /not confirmed/)
  }
  await assert.rejects(prepareCommunityPostCleanup('p',async()=>{throw Error('transport failure')}),/transport failure/)
})
test('T16 verified row keeps the exact server reference and never promises physical removal', async () => {
  const row={id:'p',community_id:'c',photo_storage_path:'c/u/synthetic.webp'}
  assert.deepEqual(await prepareCommunityPostCleanup('p',async()=>[row]),{mediaCleanupPending:true,storagePath:row.photo_storage_path})
  assert.deepEqual(await prepareCommunityPostCleanup('p',async()=>[{...row,photo_storage_path:null}]),{mediaCleanupPending:false,storagePath:null})
})
test('T16 lost insert response preserves media rather than deleting a possibly committed post image', () => {
  const original=Error('lost response')
  assert.throws(()=>retainUnconfirmedUpload('c/u/synthetic.webp',original),e=>e instanceof CommunityMediaPendingError && e.storagePath==='c/u/synthetic.webp')
  assert.throws(()=>retainUnconfirmedUpload(null,original),e=>e===original)
})
test('T08 read-only trial verifier refuses missing configuration before any network request', () => {
  const childEnv={...process.env}
  for(const key of Object.keys(childEnv)) if(key.toUpperCase().startsWith('PAZO_VERIFY_')) delete childEnv[key]
  const result=spawnSync(process.execPath,['--experimental-strip-types','scripts/verify-single-media.mjs','after'],{env:childEnv,encoding:'utf8',timeout:10000})
  assert.equal(result.status,2)
  assert.match(result.stderr,/BLOCKED: stage, exact allowed bucket/)
  assert.equal(result.stdout,'')
})
