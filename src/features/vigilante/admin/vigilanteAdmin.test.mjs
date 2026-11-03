import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {isQuietHours} from '../quietHours.ts'

const sql=readFileSync(new URL('../../../../supabase/migrations/20261103230000_pazo_vigilante_engine.sql',import.meta.url),'utf8')
const fn=name=>{const start=sql.indexOf(`function ${name}(`);assert.ok(start>0,name);return sql.slice(start,sql.indexOf('$fn$;',start))}

test('quiet hours follow Los Angeles time',()=>{
  assert.equal(isQuietHours(new Date('2026-11-04T06:30:00Z')),true)   // 22:30 PST
  assert.equal(isQuietHours(new Date('2026-11-04T15:30:00Z')),true)   // 07:30 PST
  assert.equal(isQuietHours(new Date('2026-11-04T20:00:00Z')),false)  // 12:00 PST
})

test('the Vigilante installs OFF and nothing is published while it is off',()=>{
  assert.match(sql,/enabled boolean not null default false/)
  assert.match(fn('public.pazo_vigilante_ingest'),/if not s\.enabled then return jsonb_build_object\('enabled',false\)/)
  assert.match(fn('public.pazo_vigilante_decide'),/Vigilante is off/)
  assert.match(fn('vigilante_private.tick'),/if not \(select enabled from vigilante_private\.settings\) then return null/)
})

test('only a recorded administrator decision publishes; only editing needs a fresh second factor',()=>{
  for(const name of ['public.pazo_vigilante_decide','public.pazo_vigilante_edit','public.pazo_vigilante_cancel','public.pazo_vigilante_test','public.pazo_vigilante_inbox','public.pazo_vigilante_set_enabled'])
    assert.match(fn(name),/vigilante_private\.require_admin\(\)/,name)
  assert.match(fn('public.pazo_vigilante_edit'),/has_fresh_second_factor\(\)/)
  assert.doesNotMatch(fn('public.pazo_vigilante_decide'),/has_fresh_second_factor/)
  assert.match(fn('public.pazo_vigilante_decide'),/insert into vigilante_private\.audit/)
  assert.match(fn('vigilante_private.has_fresh_second_factor'),/'aal2'[\s\S]+'totp','webauthn'[\s\S]+-300/)
  // publish() is not callable by any client role.
  assert.match(sql,/revoke all on function vigilante_private\.publish\(vigilante_private\.drafts,boolean\) from public;/)
  assert.doesNotMatch(sql,/grant execute on function vigilante_private\./)
})

test('the worker and ingestion are reachable only through the service role and a single-use token',()=>{
  assert.match(sql,/grant execute on function public\.pazo_vigilante_ingest\(text,jsonb\) to service_role;/)
  assert.match(sql,/revoke all on function public\.pazo_vigilante_ingest\(text,jsonb\) from public, anon, authenticated;/)
  assert.match(sql,/revoke all on function public\.pazo_vigilante_worker_admit\(text\) from public, anon, authenticated;/)
  assert.match(fn('public.pazo_vigilante_worker_admit'),/set dispatch_sha256=null,dispatch_expires_at=null/)
})

test('the audience never leaves the server as identities, and notices never carry the pet name',()=>{
  assert.doesNotMatch(fn('vigilante_private.audience_counts'),/user_id',|pet_id',/)
  assert.doesNotMatch(fn('vigilante_private.publish'),/p\.name|pets\.name/)
  assert.match(fn('vigilante_private.audience'),/'insufficient'/)
  assert.match(fn('vigilante_private.audience'),/'no_date'/)
})
