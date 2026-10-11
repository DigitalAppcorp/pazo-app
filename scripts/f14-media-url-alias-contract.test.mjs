import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const sql = readFileSync(new URL('../supabase/migrations/20261011022000_f14_media_url_alias_guard.sql', import.meta.url), 'utf8')
const previous = readFileSync(new URL('../supabase/migrations/20261010222006_f14_media_purge_retry_reconciliation.sql', import.meta.url), 'utf8')
const worker = readFileSync(new URL('../supabase/functions/f14-moderation-purge/index.ts', import.meta.url), 'utf8')

test('F14 URL-alias migration is a non-destructive follow-up with worker still disabled', () => {
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/)
  assert.match(sql, /Depends on 20261010222006_f14_media_purge_retry_reconciliation\.sql/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION moderation_private\.f14_media_probe\(/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.f14_moderation_media_gate\(/)
  assert.match(previous, /v_refs <> 1/)
  assert.doesNotMatch(sql, /^\s*(?:DELETE|TRUNCATE|DROP|ALTER TABLE)\s/mi)
  assert.match(worker, /const F14_MEDIA_PURGE_RELEASE_APPROVED = false/)
})
test('private URL identity checks canonical host, query/fragment, encoded segments and restricts callers', () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION moderation_private\.f14_local_url_points_to_object/)
  assert.match(sql, /IMMUTABLE STRICT/)
  assert.match(sql, /pg_catalog\.regexp_match\(/)
  assert.match(sql, /pg_catalog\.lower\(v_parts\[2\]\)/)
  assert.match(sql, /mrybvqdebbgcayuvgkkr\.supabase\.co/)
  assert.match(sql, /pg_catalog\.decode\(v_hex, 'hex'\)/)
  assert.match(sql, /REVOKE ALL ON FUNCTION moderation_private\.f14_local_url_points_to_object\(text, text, text\) FROM PUBLIC/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION moderation_private\.f14_local_url_points_to_object\(text, text, text\) TO "postgres"/)
  assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION moderation_private\.f14_local_url_points_to_object[^;]+TO\s+(?:PUBLIC|anon|authenticated)/i)
})
test('both probe and completion gate use all six same-object reference surfaces', () => {
  const probe = sql.match(/CREATE OR REPLACE FUNCTION moderation_private\.f14_media_probe\([\s\S]*?\$\$;/)?.[0]
  const gate = sql.match(/CREATE OR REPLACE FUNCTION public\.f14_moderation_media_gate\([\s\S]*?\$f14_media_gate\$;/)?.[0]
  assert.ok(probe && gate)
  for (const clause of [
    'FROM public.posts', 'FROM public.community_posts', 'FROM public.pets',
    'FROM public.communities', 'FROM public.profiles',
    'f14_local_url_points_to_object(photo_url,',
    'f14_local_url_points_to_object(pet_avatar,',
    'f14_local_url_points_to_object(image_url,',
    'f14_local_url_points_to_object(avatar_url,'
  ]) {
    assert.ok(probe.includes(clause), 'probe: ' + clause)
    assert.ok(gate.includes(clause), 'gate: ' + clause)
  }
  assert.equal((probe.match(/f14_local_url_points_to_object\(/g) || []).length, 6)
  assert.equal((gate.match(/f14_local_url_points_to_object\(/g) || []).length, 6)
  assert.match(probe, /IF v_count <> 1 THEN RETURN NULL/)
  assert.match(gate, /IF v_refs <> 1 THEN RETURN false/)
})
