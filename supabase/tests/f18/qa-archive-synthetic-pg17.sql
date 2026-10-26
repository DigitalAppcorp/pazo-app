\connect f18_admin_synthetic
DO $$ BEGIN
 IF current_database()<>'f18_admin_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'QA archive test requires disposable f18_admin_synthetic database'; END IF;
END $$;

-- Synthetic owner is deliberately the one reclassified by the preceding F18 lab.
-- Do not query or edit hosted Supabase, and never call PayPal.
TRUNCATE supporter_private.pazo_paypal_live_event_inbox,
 supporter_private.pazo_paypal_live_signed_receipts,
 supporter_private.pazo_paypal_live_paid_periods,
 supporter_private.pazo_paypal_live_cancel_claims,
 supporter_private.pazo_paypal_live_period_holds,
 supporter_private.pazo_paypal_live_checkout_intents CASCADE;
UPDATE admin_private.pazo_live_release_control
 SET canary_owner=f18_test.owner(180),merchant_generation=1;
UPDATE supporter_private.public_supporter_control
 SET checkouts_enabled=false,invitations_enabled=false;
UPDATE supporter_private.gradual_incident SET resolved_at=clock_timestamp();
INSERT INTO supporter_private.gradual_incident(code) VALUES('financial_review')
 ON CONFLICT(code) DO UPDATE SET resolved_at=NULL;

INSERT INTO supporter_private.pazo_paypal_live_checkout_intents
 (intent_id,owner_id,request_key,merchant_generation,source_environment,
  plan_id,locale,terms_version,terms_digest,affirmative_consent,provider_create_claimed_at,
  provider_subscription_id,state)
 SELECT 'intent-18000000-0000-4000-8000-000000000180',f18_test.owner(180),gen_random_uuid(),1,'live',
  g.plan_id,'es',o.terms_version,o.terms_digest,true,
  clock_timestamp(),'I-TEST-F18-ARCHIVE','bound'
 FROM admin_private.pazo_paypal_merchant_generations g
 CROSS JOIN supporter_private.pazo_live_offer_versions o
 WHERE g.generation=1 AND g.environment='live' AND o.locale='es';

INSERT INTO supporter_private.pazo_paypal_live_event_inbox
 (merchant_generation,provider_event_id,event_type,source_environment,
  linked_intent_id,processing_state,claim_attempts,last_diagnostic_code)
 VALUES(1,'WH-F18-ARCHIVE-ORIGINAL','BILLING.SUBSCRIPTION.CREATED',
 'live','intent-18000000-0000-4000-8000-000000000180','held',3,'worker_review_required');
INSERT INTO supporter_private.pazo_paypal_live_signed_receipts
 (merchant_generation,provider_event_id,event_type,proof_source,
  signed_body_sha256,signature_webhook_id,subscription_id,subject_id,
  provider_event_at,subject_at)
 SELECT 1,'WH-F18-ARCHIVE-ORIGINAL','BILLING.SUBSCRIPTION.CREATED',
  'paypal_live_postback_success',repeat('a',64),g.webhook_id,
  'I-TEST-F18-ARCHIVE','I-TEST-F18-ARCHIVE',clock_timestamp(),clock_timestamp()
 FROM admin_private.pazo_paypal_merchant_generations g
 WHERE g.generation=1 AND g.environment='live';

SELECT f18_test.check('ARCHIVE_BASELINE_CANARY_RECLASSIFIED',
 supporter_private.public_supporter_eligible(f18_test.owner(180)));
SELECT f18_test.check('ARCHIVE_BASELINE_ONE_HELD_AND_NO_LEDGER',
 (SELECT count(*)=1 FROM supporter_private.pazo_paypal_live_event_inbox WHERE processing_state='held')
 AND (SELECT count(*)=0 FROM supporter_private.pazo_paypal_live_paid_periods));

-- Same full SQL as the eventual closeout, but always ROLLBACK in disposable PG17.
\i supabase/tests/f18/qa-archive.rollback.generated.sql
SELECT f18_test.check('ARCHIVE_ROLLBACK_RESTORES_SCHEMA_AND_ROWS',
 to_regclass('supporter_private.pazo_f18_historical_qa_archive') IS NULL
 AND (SELECT count(*)=1 FROM supporter_private.pazo_paypal_live_event_inbox WHERE processing_state='held')
 AND (SELECT count(*)=1 FROM supporter_private.pazo_paypal_live_checkout_intents WHERE closed_at IS NULL)
 AND (SELECT count(*)=1 FROM supporter_private.gradual_incident WHERE code='financial_review' AND resolved_at IS NULL));

-- Commit only in this synthetic, subsequently destroyed database.
\i docs/review/f18/PROPOSED_SINGLE_QA_ARCHIVE_20261026.sql
SELECT f18_test.check('ARCHIVE_PROOF_PRESERVED',
 (SELECT count(*)=1 FROM supporter_private.pazo_f18_historical_qa_archive WHERE released_at IS NULL)
 AND (SELECT count(*)=1 FROM supporter_private.pazo_paypal_live_signed_receipts
   WHERE event_type='BILLING.SUBSCRIPTION.CREATED')
 AND (SELECT count(*)=1 FROM supporter_private.pazo_paypal_live_event_inbox WHERE processing_state='qa_archived'));
SELECT f18_test.check('ARCHIVE_PAYMENT_NOT_CERTIFIED',
 (SELECT count(*)=0 FROM supporter_private.pazo_paypal_live_paid_periods)
 AND (SELECT count(*)=1 FROM supporter_private.pazo_paypal_live_checkout_intents
  WHERE closed_reason='qa_historical_unverified' AND provider_status IS NULL));
SELECT f18_test.check('ARCHIVE_OWNER_IS_QUARANTINED',
 NOT supporter_private.public_supporter_eligible(f18_test.owner(180)));
SELECT f18_test.check('ARCHIVE_FINANCIAL_REVIEW_RESOLVED_LOCALLY',
 (SELECT count(*)=0 FROM supporter_private.gradual_incident
  WHERE code='financial_review' AND resolved_at IS NULL));
SELECT f18_test.check('ARCHIVE_LATE_EVENT_ACCEPTED',
 supporter_private.pazo_live_queue_verified_event(f18_test.owner(180),
  'intent-18000000-0000-4000-8000-000000000180','I-TEST-F18-ARCHIVE',1,
  'WH-F18-ARCHIVE-LATE','BILLING.SUBSCRIPTION.PAYMENT.FAILED')='queued');
SELECT f18_test.check('ARCHIVE_LATE_EVENT_REOPENS_REVIEW',
 (SELECT count(*)=1 FROM supporter_private.gradual_incident
  WHERE code='financial_review' AND resolved_at IS NULL)
 AND (SELECT count(*)=1 FROM supporter_private.pazo_paypal_live_event_inbox
  WHERE provider_event_id='WH-F18-ARCHIVE-LATE' AND processing_state='pending'));
SELECT f18_test.check('ARCHIVE_IS_PRIVATE',
 (SELECT relrowsecurity FROM pg_class
  WHERE oid='supporter_private.pazo_f18_historical_qa_archive'::regclass)
 AND NOT has_table_privilege('authenticated',
  'supporter_private.pazo_f18_historical_qa_archive','SELECT'));
