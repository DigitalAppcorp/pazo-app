import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const sql = readFileSync(new URL('../../../docs/operations/F18_PRODUCTION_ADMIN_CLASSIFICATION_CORRECTION_20261025.sql',import.meta.url),'utf8')

test('principal admin production correction is strictly single-owner and keeps historic QA evidence',()=>{
 assert.match(sql,/FROM admin_private\.admin_grants\)<>1/)
 assert.match(sql,/SELECT user_id INTO STRICT v_owner FROM admin_private\.admin_grants/)
 assert.match(sql,/reason='prebeta_20261023'/)
 assert.match(sql,/test_purpose='f16_four_benefits_sandbox'/)
 assert.match(sql,/expires_at<statement_timestamp\(\)/)
 assert.match(sql,/f16_sandbox_qa_paid_periods WHERE owner_id=v_owner/)
 assert.match(sql,/pazo_paypal_live_checkout_intents WHERE owner_id=v_owner/)
 assert.match(sql,/original_gradual_qa jsonb NOT NULL/)
 assert.match(sql,/original_sandbox_qa jsonb NOT NULL/)
 assert.match(sql,/reclassification_scope_not_one_account/)
 assert.match(sql,/historical_qa_evidence_was_mutated/)
 assert.doesNotMatch(sql,/DELETE\s+FROM|TRUNCATE\s+|DROP\s+(TABLE|FUNCTION)|UPDATE\s+auth\.users/i)
 assert.doesNotMatch(sql,/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)
})
test('production classification retains Auth, finance, cancellation and signature checks',()=>{
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/)
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/REVOKE ALL ON TABLE .* FROM PUBLIC, anon, authenticated, service_role/)
 assert.match(sql,/SECURITY DEFINER/)
 assert.match(sql,/AND supporter_private\.pazo_live_financial_identity_allowed\(p_owner\)/)
 assert.match(sql,/AND supporter_private\.gradual_verified_core\(p_owner\)/)
 assert.match(sql,/AND supporter_private\.pazo_live_financial_identity_allowed\(i.owner_id\)/)
 assert.match(sql,/p\.verified_event_type='PAYMENT.SALE.COMPLETED'/)
 assert.match(sql,/r\.proof_source='paypal_live_postback_success'/)
 assert.match(sql,/e\.processing_state='processed'/)
 assert.match(sql,/NOT EXISTS \(\s*SELECT 1 FROM account_requests_private\.deletion_requests/)
 assert.match(sql,/REVOKE ALL ON FUNCTION supporter_private\.pazo_live_financial_identity_allowed/)
})
