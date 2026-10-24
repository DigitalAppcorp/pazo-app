\connect f14_synthetic
DO $$ BEGIN IF current_database()<>'f14_synthetic' THEN RAISE EXCEPTION 'Disposable only';END IF;END $$;
\i supabase/migrations/20261024003716_pazo_f16_original_qa_recheck_and_hosted_gate_certificate.sql
BEGIN;
SELECT gradual_test.assert('ISSUE85_RECHECK_SERVICE_ONLY',NOT has_function_privilege('authenticated','public.pazo_f16_live_service_qa_original_retry(uuid,bigint,text,text,text,text,timestamptz,timestamptz,text)','EXECUTE') AND has_function_privilege('service_role','public.pazo_f16_live_service_qa_original_retry(uuid,bigint,text,text,text,text,timestamptz,timestamptz,text)','EXECUTE'));
SELECT gradual_test.assert('ISSUE85_CERTIFICATE_NOT_CLIENT_OR_SERVICE',NOT has_function_privilege('authenticated','supporter_private.pazo_gradual_certify_hosted_gate(uuid,bigint,text,text,text,text,text,text)','EXECUTE') AND NOT has_function_privilege('service_role','supporter_private.pazo_gradual_certify_hosted_gate(uuid,bigint,text,text,text,text,text,text)','EXECUTE'));
SELECT gradual_test.assert('ISSUE85_NEW_TABLES_FORCE_RLS',(SELECT bool_and(relrowsecurity AND relforcerowsecurity) FROM pg_class WHERE oid IN('supporter_private.gradual_qa_rechecks'::regclass,'supporter_private.gradual_hosted_gate_certificates'::regclass)));
-- Hosted-equivalent canonical origin in the isolated legacy kernel. This is
-- exactly the origin-only function/constraint repin from canonical migration,
-- without deleting the financial fixtures used by the other regression cases.
DO $$ DECLARE d text;BEGIN
 d:=pg_get_functiondef('admin_private.pazo_live_artifact_ready()'::regprocedure);
 EXECUTE replace(d,'https://pazo-app-t83r.vercel.app','https://pazo-app.vercel.app');
END $$;
ALTER TABLE admin_private.pazo_live_release_artifact DROP CONSTRAINT pazo_live_release_artifact_return_origin_check;
ALTER TABLE admin_private.pazo_live_release_artifact ADD CONSTRAINT pazo_live_release_artifact_return_origin_check CHECK(return_origin='https://pazo-app.vercel.app') NOT VALID;
UPDATE admin_private.pazo_live_release_artifact SET return_origin='https://pazo-app.vercel.app';
ALTER TABLE admin_private.pazo_live_release_artifact VALIDATE CONSTRAINT pazo_live_release_artifact_return_origin_check;
UPDATE admin_private.paypal_gateway_settings SET return_origin='https://pazo-app.vercel.app' WHERE environment='live';
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
UPDATE admin_private.pazo_live_release_control SET canary_owner='82000000-0000-4000-8000-00000000003c',mode='canary';
INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(intent_id,owner_id,request_key,merchant_generation,plan_id,locale,terms_version,terms_digest,affirmative_consent,created_at,provider_create_claimed_at,provider_subscription_id,state)
 SELECT 'intent-82000000-0000-4000-8000-00000000003c','82000000-0000-4000-8000-00000000003c',gen_random_uuid(),1,'P-ABCDEFGHIJKLMN','es',terms_version,terms_digest,true,clock_timestamp()-interval '1 second',clock_timestamp(),'I-QA-RECHECK-ORIGINAL','bound' FROM supporter_private.pazo_live_offer_versions WHERE locale='es';
INSERT INTO supporter_private.pazo_paypal_live_event_inbox(merchant_generation,provider_event_id,event_type,linked_intent_id,processing_state,claim_attempts,last_diagnostic_code)
 VALUES(1,'WH-QA-HELD-RECHECK','BILLING.SUBSCRIPTION.CREATED','intent-82000000-0000-4000-8000-00000000003c','held',1,'worker_review_required');
INSERT INTO supporter_private.pazo_paypal_live_signed_receipts(merchant_generation,provider_event_id,event_type,proof_source,signed_body_sha256,signature_webhook_id,subscription_id,subject_id,provider_event_at,subject_at)
 VALUES(1,'WH-QA-HELD-RECHECK','BILLING.SUBSCRIPTION.CREATED','paypal_live_postback_success',repeat('c',64),'WH-12345678900','I-QA-RECHECK-ORIGINAL','I-QA-RECHECK-ORIGINAL',clock_timestamp(),clock_timestamp());
UPDATE supporter_private.pazo_paypal_live_worker_control SET enabled=true,processing_enabled=true,last_heartbeat_at=clock_timestamp(),last_outcome='idle',drain_token=gen_random_uuid(),drain_expires_at=clock_timestamp()+interval '3 minutes';
SELECT gradual_test.assert('ISSUE85_HELD_PREVENTS_CERTIFICATE',supporter_private.pazo_gradual_certify_hosted_gate('85000000-0000-4000-8000-00000000aa01',(SELECT revision FROM supporter_private.gradual_campaign),repeat('a',40),repeat('a',40),repeat('b',64),repeat('c',64),repeat('d',64),repeat('e',64))='financial_blocked' AND (SELECT NOT hosted_gate_verified FROM supporter_private.gradual_campaign));
SELECT gradual_test.assert('ISSUE85_RETRY_ACTIVE_REFUSED',public.pazo_f16_live_service_qa_original_retry(gen_random_uuid(),1,'intent-82000000-0000-4000-8000-00000000003c','I-QA-RECHECK-ORIGINAL','WH-QA-HELD-RECHECK','ACTIVE',clock_timestamp(),clock_timestamp(),repeat('f',64))='review_required');
SELECT gradual_test.assert('ISSUE85_RETRY_AFTER_ACTUAL_PROOF',public.pazo_f16_live_service_qa_original_retry('85000000-0000-4000-8000-00000000aa02',1,'intent-82000000-0000-4000-8000-00000000003c','I-QA-RECHECK-ORIGINAL','WH-QA-HELD-RECHECK','EXPIRED',statement_timestamp(),statement_timestamp(),repeat('f',64))='queued');
SELECT gradual_test.assert('ISSUE85_RECEIPT_AND_ATTEMPTS_PRESERVED',(SELECT processing_state='pending' AND claim_attempts=1 FROM supporter_private.pazo_paypal_live_event_inbox WHERE provider_event_id='WH-QA-HELD-RECHECK') AND (SELECT prior_state='held' AND prior_code='worker_review_required' AND prior_attempts=1 FROM supporter_private.gradual_qa_rechecks WHERE request_id='85000000-0000-4000-8000-00000000aa02') AND EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_signed_receipts WHERE provider_event_id='WH-QA-HELD-RECHECK'));
SELECT gradual_test.assert('ISSUE85_RETRY_NONCE_IDEMPOTENT',public.pazo_f16_live_service_qa_original_retry('85000000-0000-4000-8000-00000000aa02',1,'intent-82000000-0000-4000-8000-00000000003c','I-QA-RECHECK-ORIGINAL','WH-QA-HELD-RECHECK','EXPIRED',statement_timestamp(),statement_timestamp(),repeat('f',64))='already_queued');
UPDATE supporter_private.pazo_paypal_live_event_inbox SET processing_state='held',claim_attempts=3 WHERE provider_event_id='WH-QA-HELD-RECHECK';
SELECT gradual_test.assert('ISSUE85_RETRY_NEVER_RESETS_EXHAUSTION',public.pazo_f16_live_service_qa_original_retry(gen_random_uuid(),1,'intent-82000000-0000-4000-8000-00000000003c','I-QA-RECHECK-ORIGINAL','WH-QA-HELD-RECHECK','EXPIRED',statement_timestamp(),statement_timestamp(),repeat('f',64))='retry_exhausted');
UPDATE supporter_private.pazo_paypal_live_event_inbox SET processing_state='processed' WHERE provider_event_id='WH-QA-HELD-RECHECK';
SELECT gradual_test.assert('ISSUE85_PROCESSED_EVENT_NEVER_RECLAIMED',public.pazo_f16_live_service_qa_original_retry(gen_random_uuid(),1,'intent-82000000-0000-4000-8000-00000000003c','I-QA-RECHECK-ORIGINAL','WH-QA-HELD-RECHECK','EXPIRED',statement_timestamp(),statement_timestamp(),repeat('f',64))='already_processed' AND (SELECT processing_state='processed' AND claim_attempts=3 FROM supporter_private.pazo_paypal_live_event_inbox WHERE provider_event_id='WH-QA-HELD-RECHECK'));
-- Synthetic resolved state only, to prove certification does not start L1.
UPDATE supporter_private.pazo_paypal_live_checkout_intents SET closed_at=clock_timestamp(),closed_reason='provider_terminal_reconciled' WHERE closed_at IS NULL;
UPDATE supporter_private.pazo_paypal_live_event_inbox SET processing_state='processed',lease_token=NULL,lease_expires_at=NULL;
UPDATE supporter_private.pazo_paypal_live_period_holds SET released_at=clock_timestamp() WHERE released_at IS NULL;
UPDATE supporter_private.gradual_incident SET resolved_at=clock_timestamp() WHERE resolved_at IS NULL;
DELETE FROM supporter_private.gradual_outbox;
DELETE FROM supporter_private.gradual_invitation;
UPDATE supporter_private.gradual_campaign SET webhook_ok_at=clock_timestamp();
UPDATE supporter_private.pazo_paypal_live_worker_control SET last_heartbeat_at=clock_timestamp(),drain_token=NULL,drain_expires_at=NULL;
CREATE TEMP TABLE qa_certificate_fixture AS SELECT gen_random_uuid() AS request_id,revision FROM supporter_private.gradual_campaign;
SELECT gradual_test.assert('ISSUE85_CERTIFIES_ONLY_HEALTHY_NATIVE_GATES',supporter_private.pazo_gradual_certify_hosted_gate((SELECT request_id FROM qa_certificate_fixture),(SELECT revision FROM qa_certificate_fixture),repeat('a',40),repeat('a',40),repeat('b',64),repeat('c',64),repeat('d',64),repeat('e',64))='certified');
SELECT gradual_test.assert('ISSUE85_CERTIFICATE_DOES_NOT_START',(SELECT hosted_gate_verified AND lifecycle='inactive' AND started_at IS NULL AND capacity=1 FROM supporter_private.gradual_campaign) AND (SELECT mode='canary' FROM admin_private.pazo_live_release_control) AND NOT admin_private.pazo_live_control_admits('82000000-0000-4000-8000-00000000003c',1));
SELECT gradual_test.assert('ISSUE85_CERTIFICATE_NONCE_IDEMPOTENT',supporter_private.pazo_gradual_certify_hosted_gate((SELECT request_id FROM qa_certificate_fixture),(SELECT revision FROM qa_certificate_fixture),repeat('a',40),repeat('a',40),repeat('b',64),repeat('c',64),repeat('d',64),repeat('e',64))='already_certified');
SELECT gradual_test.assert('ISSUE85_CERTIFICATE_NONCE_CONFLICT',supporter_private.pazo_gradual_certify_hosted_gate((SELECT request_id FROM qa_certificate_fixture),(SELECT revision FROM qa_certificate_fixture),repeat('a',40),repeat('a',40),repeat('f',64),repeat('c',64),repeat('d',64),repeat('e',64))='request_conflict');
ROLLBACK;
