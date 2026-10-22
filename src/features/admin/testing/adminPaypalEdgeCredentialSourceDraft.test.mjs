import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const lab=readFileSync(new URL('../../../../supabase/drafts/f16_live_edge_credential_source_DISPOSABLE_ONLY.sql',import.meta.url),'utf8')
const hosted=readFileSync(new URL('../../../../supabase/drafts/f16_live_edge_credential_source_HOSTED_PROPOSAL_NOT_APPROVED.sql',import.meta.url),'utf8')
const block=x=>x.slice(x.indexOf('ALTER TABLE admin_private.pazo_paypal_merchant_generations'),x.indexOf('COMMIT;'))
test('hosted Edge credential schema proposal does not exist under migrations',()=>{
 assert.match(hosted,/NOT AUTHORIZED, NOT A MIGRATION/)
 assert.match(hosted,/active_environment='sandbox'/)
 assert.match(hosted,/live_checkout_enabled=false/)
 assert.match(hosted,/credential_source IN\('vault','edge_secrets'\)/)
 assert.match(hosted,/client_id_vault IS NULL AND client_secret_vault IS NULL/)
 assert.doesNotMatch(hosted,/GRANT EXECUTE|GRANT SELECT|vault.decrypted_secrets/)
})
test('Edge generation source keeps earlier Vault metadata valid and cannot mix refs',()=>{
 const phrase=lab.slice(lab.indexOf('ALTER TABLE'),lab.indexOf('COMMIT;'))
 assert.ok(hosted.includes(phrase))
 assert.match(lab,/current_database\(\)<>'f14_synthetic'/)
 assert.match(phrase,/credential_source='vault'/)
 assert.match(phrase,/credential_source='edge_secrets'/)
 assert.match(phrase,/ALTER COLUMN client_id_vault DROP NOT NULL/)
 assert.match(phrase,/ALTER COLUMN client_secret_vault DROP NOT NULL/)
})
