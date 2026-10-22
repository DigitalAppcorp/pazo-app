import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const src=readFileSync(new URL('../../../../supabase/migrations/20261019235552_pazo_f16_live_service_binding_readonly_bridge.sql',import.meta.url),'utf8')
test('public read-only projection exclusively grants EXECUTE to service_role',()=>{
 assert.match(src,/CREATE OR REPLACE FUNCTION public\.pazo_f16_live_service_binding_read/)
 assert.match(src,/GRANT EXECUTE ON FUNCTION public\.pazo_f16_live_service_binding_read\(text\)\s+TO service_role/)
 assert.match(src,/FROM PUBLIC,anon,authenticated,service_role/)
 assert.match(src,/request\.jwt\.claim\.role/)
 assert.doesNotMatch(src,/GRANT (?:SELECT|INSERT|UPDATE|DELETE) ON/)
 assert.doesNotMatch(src,/UPDATE supporter_private|INSERT INTO supporter_private/)
})
test('bridge returns original owner/intent/plan/generation but not secret or payment status',()=>{
 for(const field of ["'ownerId'","'intentId'","'subscriptionId'","'planId'",
 "'merchantGeneration'","'sourceEnvironment'"])assert.ok(src.includes(field))
 assert.doesNotMatch(src,/jsonb_build_object\([\s\S]*?'client_secret_vault'/)
 assert.doesNotMatch(src,/jsonb_build_object\([\s\S]*?'payer_email'/)
 assert.match(src,/i\.state='bound'/)
 assert.match(src,/i\.affirmative_consent/)
})
