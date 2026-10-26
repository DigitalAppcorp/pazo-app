import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const path='docs/review/f18/PROPOSED_SINGLE_QA_ARCHIVE_20261026.sql'
const sql=readFileSync(path,'utf8')

test('the proposed closeout is gated and remains outside deployable migrations',()=>{
 assert.match(sql,/BEGIN;[\s\S]*COMMIT;/)
 assert.match(sql,/qa_archive_canary_scope_not_unique/)
 assert.match(sql,/qa_archive_other_webhook_events_exist/)
 assert.match(sql,/qa_archive_other_financial_evidence_exists/)
 assert.match(sql,/qa_archive_controls_not_isolated/)
 assert.match(sql,/checkouts_enabled IS FALSE/)
 assert.match(sql,/invitations_enabled IS FALSE/)
 assert.match(sql,/pazo_paypal_live_paid_periods/)
 assert.match(sql,/pazo_paypal_live_signed_receipts/)
 assert.match(sql,/processing_state='held'/)
 assert.match(sql,/provider_status IS NULL/)
 assert.doesNotMatch(sql,/DELETE FROM supporter_private\./i)
})

test('archived original stays financially unverified, signed evidence preserved',()=>{
 assert.match(sql,/financial_outcome_not_provider_certified/)
 assert.match(sql,/Do not close the original contract locally/)
 assert.match(sql,/qa_archived/)
 assert.match(sql,/last_diagnostic_code='qa_signed_created_archived_settlement_unverified'/)
 assert.doesNotMatch(sql,/SET provider_status=/)
 assert.doesNotMatch(sql,/SET processing_state='processed'/)
 assert.doesNotMatch(sql,/UPDATE supporter_private\.pazo_paypal_live_signed_receipts/i)
 assert.doesNotMatch(sql,/UPDATE supporter_private\.pazo_paypal_live_paid_periods/i)
 assert.doesNotMatch(sql,/UPDATE supporter_private\.pazo_paypal_live_checkout_intents/i)
 assert.match(sql,/original_processing_state/)
 assert.match(sql,/original_diagnostic_code/)
 assert.match(sql,/original_claim_attempts/)
 assert.match(sql,/qa_archive_already_recorded_no_financial_changes/)
})

test('historical owner cannot start a second checkout while status is unresolved',()=>{
 assert.match(sql,/owner_id uuid NOT NULL REFERENCES auth\.users/)
 assert.match(sql,/UNIQUE\(owner_id\)/)
 assert.match(sql,/CREATE OR REPLACE FUNCTION supporter_private\.public_supporter_eligible/)
 assert.match(sql,/pazo_f18_historical_qa_archive a[\s\S]*a\.owner_id=p_owner AND a\.released_at IS NULL/)
 assert.match(sql,/REVOKE ALL ON FUNCTION supporter_private\.public_supporter_eligible/)
})

test('late signed events are accepted by existing intake and reopen review',()=>{
 assert.match(sql,/AFTER INSERT ON supporter_private\.pazo_paypal_live_event_inbox/)
 assert.match(sql,/a\.intent_id=NEW\.linked_intent_id/)
 assert.match(sql,/INSERT INTO supporter_private\.gradual_incident\(code\) VALUES \('financial_review'\)/)
 assert.match(sql,/ON CONFLICT\(code\) DO UPDATE SET resolved_at=NULL/)
 assert.doesNotMatch(sql,/CREATE OR REPLACE FUNCTION supporter_private\.pazo_live_queue_verified_event/)
})

test('transaction serializes archived owner and inbox, keeps internal archive private',()=>{
 assert.match(sql,/LOCK TABLE supporter_private\.pazo_paypal_live_checkout_intents IN SHARE ROW EXCLUSIVE MODE/)
 assert.match(sql,/LOCK TABLE supporter_private\.pazo_paypal_live_event_inbox IN SHARE ROW EXCLUSIVE MODE/)
 assert.match(sql,/ALTER TABLE supporter_private\.pazo_f18_historical_qa_archive ENABLE ROW LEVEL SECURITY/)
 assert.match(sql,/REVOKE ALL ON TABLE supporter_private\.pazo_f18_historical_qa_archive/)
 assert.match(sql,/GRANT SELECT ON TABLE supporter_private\.pazo_f18_historical_qa_archive TO service_role/)
})
