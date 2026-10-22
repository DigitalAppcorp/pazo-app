import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const path=new URL('../../../../supabase/queries/f16_p11_hosted_payment_readiness_READ_ONLY.sql',import.meta.url)
const sql=fs.readFileSync(path,'utf8')
test('P11 SQL is a catalog/count-only, no-identity hosted preflight',()=>{
 assert.match(sql,/^-- PAZO F16-P11/)
 assert.match(sql,/WITH private_counts AS/)
 assert.match(sql,/SELECT 'sandbox' AS intended_environment/)
 for(const table of ['paypal_subscription_intents','paypal_verified_event_inbox',
  'paypal_payment_entries','paypal_payment_reversals',
  'paypal_p06_offers','paypal_p06_checkout_attempts']){
   assert.ok(sql.includes(table),table)
 }
 for(const rpc of ['f16_p06_begin_checkout','f16_p07_claim_provider_create',
  'f16_p08_read_checkout_recovery','f16_p10_bind_recovered_checkout']){
  assert.ok(sql.includes(rpc),rpc)
 }
 for(const forbidden of [/INSERT/i,/UPDATE/i,/DELETE/i,
  /TRUNCATE/i,/ALTER/i,/DROP/i,/CREATE/i,
  /GRANT/i,/REVOKE/i,/CALL/i,
  /pg_read_file|pg_ls_dir|COPY\s|pg_sleep/iu]){
  // SQL comments contain descriptions; inspect executable body only.
  const statements=sql.split('\n').filter(line=>!line.trim().startsWith('--')).join('\n')
  assert.equal(forbidden.test(statements),false,String(forbidden))
 }
})
test('P11 never permits payment, paid-through or public checkout from counts',()=>{
 for(const field of ['may_activate_checkout','may_record_new_financial_payment',
  'may_create_paid_period','may_grant_benefits','may_enable_live'])
  assert.match(sql,new RegExp('false AS '+field))
 assert.ok(!sql.includes('external_payment_id AS'))
 assert.ok(!sql.includes('owner_id AS'))
 assert.ok(!sql.includes('provider_event_id AS'))
})
