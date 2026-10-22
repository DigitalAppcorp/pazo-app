import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const lab=readFileSync(new URL('../../../../supabase/drafts/f16_live_historical_merchant_vault_DISPOSABLE_ONLY.sql',import.meta.url),'utf8')
const proposal=readFileSync(new URL('../../../../supabase/drafts/f16_live_historical_merchant_vault_DEPLOY_PROPOSAL_NOT_APPROVED.sql',import.meta.url),'utf8')
test('future Vault RPC proposal is not an automatic migration and only exposes to service_role',()=>{
 assert.match(proposal,/NOT AUTHORIZED/)
 assert.match(proposal,/GRANT EXECUTE ON FUNCTION\s+public\.pazo_f16_live_historical_merchant_secrets\(bigint\) TO service_role/)
 assert.match(proposal,/FROM PUBLIC,anon,authenticated,service_role/)
 assert.match(proposal,/request\.jwt\.claim\.role/)
 assert.match(proposal,/active_environment='sandbox'/)
 assert.match(proposal,/live_checkout_enabled=false/)
 assert.doesNotMatch(proposal,/CREATE TABLE|ALTER TABLE|DELETE FROM|TRUNCATE|UPDATE admin_private/)
 assert.doesNotMatch(proposal,/GRANT SELECT/)
 assert.doesNotMatch(proposal,/f14_synthetic/)
})
test('submitted production proposal is the same private function tested in disposable PostgreSQL',()=>{
 const slice=x=>x.slice(x.indexOf('CREATE FUNCTION public.pazo_f16_live_historical_merchant_secrets('),
  x.indexOf('REVOKE ALL ON FUNCTION public.pazo_f16_live_historical_merchant_secrets('))
 assert.equal(slice(proposal),slice(lab))
})
