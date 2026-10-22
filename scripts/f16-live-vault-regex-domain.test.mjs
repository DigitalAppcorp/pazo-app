import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../supabase/drafts/pazo_f16_vault_2201b_regex_length_fix.sql',import.meta.url),'utf8')
test('Live and legacy credential RPCs both remove the PostgreSQL invalid quantifiers',()=>{
 assert.match(source,/CREATE OR REPLACE FUNCTION public\.pazo_f16_live_service_vault_prepare\(/)
 assert.match(source,/CREATE OR REPLACE FUNCTION public\.pazo_admin_paypal_save_credentials\(/)
 assert.equal((source.match(/length\(p_client_id\) NOT BETWEEN 20 AND 256/g)||[]).length,2)
 assert.equal((source.match(/length\(p_client_secret\) NOT BETWEEN 20 AND 512/g)||[]).length,2)
 assert.equal((source.match(/p_client_id !~ '\^\[A-Za-z0-9_-\]\+\$'/g)||[]).length,2)
 assert.equal((source.match(/p_client_secret !~ '\^\[A-Za-z0-9_-\]\+\$'/g)||[]).length,2)
 assert.doesNotMatch(source,/p_client_(?:id|secret) !~ '[^']*\{20,(?:256|512)\}/)
 assert.match(source,/SECURITY DEFINER/g)
 assert.match(source,/VAULT_VALIDATOR_DOMAIN_FAILED/)
})
