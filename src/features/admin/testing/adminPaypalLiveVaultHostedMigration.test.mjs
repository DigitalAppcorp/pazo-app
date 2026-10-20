import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const hosted=readFileSync(new URL('../../../../supabase/migrations/20261020003500_pazo_f16_live_historical_merchant_vault_readonly.sql',import.meta.url),'utf8')
const approved=readFileSync(new URL('../../../../supabase/drafts/f16_live_historical_merchant_vault_DEPLOY_PROPOSAL_NOT_APPROVED.sql',import.meta.url),'utf8')
const oldLab=readFileSync(new URL('../../../../supabase/drafts/f16_live_historical_merchant_vault_DISPOSABLE_ONLY.sql',import.meta.url),'utf8')
const fn=x=>x.slice(x.indexOf('CREATE FUNCTION public.pazo_f16_live_historical_merchant_secrets('),x.indexOf('REVOKE ALL ON FUNCTION public.pazo_f16_live_historical_merchant_secrets('))
test('hosted reader function is byte-identical to approved proposal and PG17 synthetic contract',()=>{
 assert.equal(fn(hosted),fn(approved))
 assert.equal(fn(hosted),fn(oldLab))
})
test('installed reader is service_role only, Live OFF, original bound generation and no writes',()=>{
 assert.match(hosted,/Product Owner explicitly approved installing ONLY this RPC/)
 assert.match(hosted,/active_environment='sandbox'/)
 assert.match(hosted,/live_checkout_enabled=false/)
 assert.match(hosted,/i\.state='bound'/)
 assert.match(hosted,/i\.source_environment='live'/)
 assert.match(hosted,/g\.generation=p_generation/)
 assert.match(hosted,/request\.jwt\.claim\.role/)
 assert.match(hosted,/GRANT EXECUTE ON FUNCTION\s+public\.pazo_f16_live_historical_merchant_secrets\(bigint\) TO service_role/)
 assert.match(hosted,/has_function_privilege\('anon'/)
 assert.match(hosted,/has_function_privilege\('authenticated'/)
 assert.match(hosted,/this migration does not change those existing grants/)
 assert.doesNotMatch(hosted,/GRANT SELECT|REVOKE SELECT/)
 assert.doesNotMatch(hosted,/GRANT SELECT|CREATE TABLE|ALTER TABLE|INSERT INTO|DELETE FROM|TRUNCATE/)
})
