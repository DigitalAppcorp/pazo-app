import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const hosted=readFileSync(new URL('../../../../supabase/migrations/20261020014049_pazo_f16_live_edge_credential_source_metadata.sql',import.meta.url),'utf8')
const proposal=readFileSync(new URL('../../../../supabase/drafts/f16_live_edge_credential_source_HOSTED_PROPOSAL_NOT_APPROVED.sql',import.meta.url),'utf8')
const ddl=s=>s.slice(s.indexOf('ALTER TABLE admin_private.pazo_paypal_merchant_generations'),s.indexOf('-- Final state invariant'))
test('authorized metadata migration retains reviewed DDL without sensitive side effects',()=>{
 assert.equal(ddl(hosted),ddl(proposal))
 assert.match(hosted,/Product Owner approved Edge merchant generation metadata only/)
 assert.match(hosted,/credential_source IN\('vault','edge_secrets'\)/)
 assert.match(hosted,/client_id_vault IS NULL AND client_secret_vault IS NULL/)
 assert.match(hosted,/credential_source='vault'/)
 assert.doesNotMatch(hosted,/CREATE FUNCTION|GRANT EXECUTE|GRANT SELECT|REVOKE|INSERT INTO|UPDATE (?:admin_private|supporter_private)\.|DELETE FROM/)
})
test('pre/postflight preserve Sandbox OFF, private ACL and FORCE RLS',()=>{
 for(const phrase of ["active_environment='sandbox'","live_checkout_enabled=false",
  'c.relrowsecurity AND c.relforcerowsecurity',"'anon',relation_oid,'SELECT'",
  "'authenticated',relation_oid,'SELECT'","'service_role',relation_oid,'SELECT'",
  'NOT kill_switch','active_generation IS NOT NULL']){
  assert.ok(hosted.includes(phrase),phrase)
 }
 assert.match(hosted,/BEGIN;[\s\S]*COMMIT;/)
})
