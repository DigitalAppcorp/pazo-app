\connect f14_synthetic
DO $$ BEGIN IF current_database()<>'f14_synthetic' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Disposable only';END IF;END $$;
-- Review6394513523: removing resolution is an allowed remediation. Even a
-- privileged/fresh admin cannot close either incident without an individual
-- evidence contract. All fixture changes below roll back.
BEGIN;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
INSERT INTO supporter_private.gradual_incident(code) VALUES('financial_review'),('projection_unavailable')
 ON CONFLICT(code) DO UPDATE SET resolved_at=NULL;
UPDATE supporter_private.public_supporter_control SET checkouts_enabled=true,invitations_enabled=true;
CREATE TEMP TABLE review_before AS SELECT
 (SELECT jsonb_agg(to_jsonb(t) ORDER BY code) FROM supporter_private.gradual_incident t) AS incidents,
 (SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM supporter_private.pazo_paypal_live_event_inbox t) AS inbox,
 (SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM supporter_private.pazo_paypal_live_signed_receipts t) AS receipts,
 (SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM supporter_private.pazo_paypal_live_paid_periods t) AS periods,
 (SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM supporter_private.pazo_paypal_live_period_holds t) AS holds,
 (SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM supporter_private.pazo_admin_gift_access t) AS gifts,
 (SELECT revision FROM supporter_private.public_supporter_control) AS revision,
 (SELECT count(*) FROM admin_private.public_supporter_audit) AS audit;
SELECT f18_test.check('REVIEW_TWO_DISTINCT_INCIDENTS_HELD',(SELECT count(*)=2 FROM supporter_private.gradual_incident WHERE code IN('financial_review','projection_unavailable') AND resolved_at IS NULL));
SELECT f18_test.check('REVIEW_RESOLUTION_WITHOUT_EVIDENCE_REJECTED',public.pazo_f18_supporter_admin_action(f18_test.owner(65535),'resolve_incidents',(SELECT revision FROM review_before),'18000000-0000-4000-8000-000000000201')->>'code'='invalid_request');
SELECT f18_test.check('REVIEW_DUPLICATE_RESOLUTION_STILL_REJECTED',public.pazo_f18_supporter_admin_action(f18_test.owner(65535),'resolve_incidents',(SELECT revision FROM review_before),'18000000-0000-4000-8000-000000000201')->>'code'='invalid_request');
DO $$ BEGIN BEGIN
 PERFORM public.pazo_f18_supporter_admin_action(f18_test.owner(101),'resolve_incidents',(SELECT revision FROM review_before),gen_random_uuid());
 RAISE EXCEPTION 'FAIL nonadmin resolution';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS F18 REVIEW_NONADMIN_CANNOT_RESOLVE';END;END $$;
SELECT f18_test.check('REVIEW_REJECTED_RESOLUTION_NO_REVISION_OR_AUDIT',(SELECT revision=(SELECT revision FROM review_before) FROM supporter_private.public_supporter_control) AND (SELECT count(*)=(SELECT audit FROM review_before) FROM admin_private.public_supporter_audit));
SELECT f18_test.check('REVIEW_INCIDENTS_KEEP_FINANCIAL_BLOCK',NOT supporter_private.public_supporter_health() AND supporter_private.public_supporter_open_blocker()='health_requires_review');
SELECT f18_test.login(65535);
SELECT f18_test.check('REVIEW_CONFIGURED_AND_EFFECTIVE_STATE_DISTINCT',public.pazo_admin_public_supporter_status()->>'checkoutsRequested'='true' AND public.pazo_admin_public_supporter_status()->>'checkoutsEnabled'='false' AND public.pazo_admin_public_supporter_status()->>'openBlocker'='health_requires_review');
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT f18_test.check('REVIEW_PROMOTION_PAUSE',public.pazo_f18_supporter_admin_action(f18_test.owner(65535),'pause_invitations',(SELECT revision FROM review_before),'18000000-0000-4000-8000-000000000202')->>'code'='updated');
SELECT f18_test.check('REVIEW_PROMOTION_PAUSE_ONLY',(SELECT checkouts_enabled AND NOT invitations_enabled FROM supporter_private.public_supporter_control));
SELECT f18_test.check('REVIEW_PAUSE_NONCE_IDEMPOTENT',public.pazo_f18_supporter_admin_action(f18_test.owner(65535),'pause_invitations',(SELECT revision FROM review_before),'18000000-0000-4000-8000-000000000202')->>'code'='already_recorded');
SELECT f18_test.check('REVIEW_STATE_INAPPROPRIATE_PAUSE_REJECTED',public.pazo_f18_supporter_admin_action(f18_test.owner(65535),'pause_invitations',(SELECT revision FROM review_before)+1,gen_random_uuid())->>'code'='invalid_transition');
SELECT f18_test.check('REVIEW_STALE_ADMIN_REJECTED',public.pazo_f18_supporter_admin_action(f18_test.owner(65535),'pause_checkouts',(SELECT revision FROM review_before),gen_random_uuid())->>'code'='revision_changed');
SELECT f18_test.check('REVIEW_FINANCIAL_PAUSE',public.pazo_f18_supporter_admin_action(f18_test.owner(65535),'pause_checkouts',(SELECT revision FROM review_before)+1,'18000000-0000-4000-8000-000000000203')->>'code'='updated');
SELECT f18_test.check('REVIEW_FINANCIAL_PAUSE_ONLY',(SELECT NOT checkouts_enabled AND NOT invitations_enabled FROM supporter_private.public_supporter_control));
SELECT f18_test.check('REVIEW_NO_REOPEN_DURING_INCIDENT',public.pazo_f18_supporter_admin_action(f18_test.owner(65535),'open_checkouts',(SELECT revision FROM review_before)+2,gen_random_uuid())->>'code'='health_requires_review');
SELECT f18_test.check('REVIEW_RESOLUTION_PRESERVES_ALL_INCIDENTS',(SELECT jsonb_agg(to_jsonb(t) ORDER BY code) FROM supporter_private.gradual_incident t)=(SELECT incidents FROM review_before));
SELECT f18_test.check('REVIEW_NO_HELD_LEDGER_RECEIPT_PERIOD_OR_GIFT_MUTATION',
 (SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM supporter_private.pazo_paypal_live_event_inbox t) IS NOT DISTINCT FROM (SELECT inbox FROM review_before)
 AND (SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM supporter_private.pazo_paypal_live_signed_receipts t) IS NOT DISTINCT FROM (SELECT receipts FROM review_before)
 AND (SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM supporter_private.pazo_paypal_live_paid_periods t) IS NOT DISTINCT FROM (SELECT periods FROM review_before)
 AND (SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM supporter_private.pazo_paypal_live_period_holds t) IS NOT DISTINCT FROM (SELECT holds FROM review_before)
 AND (SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM supporter_private.pazo_admin_gift_access t) IS NOT DISTINCT FROM (SELECT gifts FROM review_before));
ROLLBACK;

BEGIN;
-- Synthetic archived canary and healthy public route. No provider calls.
UPDATE supporter_private.gradual_incident SET resolved_at=clock_timestamp();
UPDATE supporter_private.pazo_paypal_live_worker_control SET last_heartbeat_at=clock_timestamp();
UPDATE supporter_private.public_supporter_control SET checkouts_enabled=true,webhook_ok_at=clock_timestamp();
UPDATE admin_private.pazo_live_release_control SET mode='public',canary_owner=f18_test.owner(179),canary_started_at=clock_timestamp()-interval '2 days';
INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(intent_id,owner_id,request_key,merchant_generation,plan_id,locale,terms_version,terms_digest,affirmative_consent,created_at,provider_create_claimed_at,provider_request_origin,provider_request_version)
 SELECT 'intent-'||f18_test.owner(179),f18_test.owner(179),gen_random_uuid(),1,'P-ABCDEFGHIJKLMN','es',terms_version,terms_digest,true,clock_timestamp()-interval '2 days',clock_timestamp()-interval '1 day','https://pazo-app.vercel.app','pazo_subscription_create_v1' FROM supporter_private.pazo_live_offer_versions WHERE locale='es';
-- Reproduce the unsafe historical variant explicitly. The F18 public boundary
-- must not inherit this guard, regardless of which hosted variant preceded it.
DO $$ DECLARE d text; BEGIN
 d:=pg_get_functiondef('supporter_private.gradual_original_checkout_begin(uuid,uuid,bigint,text,text,text)'::regprocedure);
 IF strpos(d,'AND c.mode=''canary''')=0 THEN RAISE EXCEPTION 'Expected historical fixture predicate';END IF;
 EXECUTE replace(d,'AND c.mode=''canary''','');
END $$;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT f18_test.check('REVIEW_UNSAFE_HISTORICAL_VARIANT_REPRODUCED',(SELECT supporter_private.gradual_original_checkout_begin(f18_test.owner(176),gen_random_uuid(),1,'es',terms_version,terms_digest)->>'code'='canary_attempt_already_claimed' FROM supporter_private.pazo_live_offer_versions WHERE locale='es'));
SELECT f18_test.check('REVIEW_PUBLIC_NEW_BUYER_UNBLOCKED',(SELECT public.pazo_f16_live_service_checkout_begin(f18_test.owner(176),'18000000-0000-4000-8000-000000000176',1,'es',terms_version,terms_digest)->>'ok'='true' FROM supporter_private.pazo_live_offer_versions WHERE locale='es'));
SELECT f18_test.check('REVIEW_PUBLIC_SECOND_BUYER_UNBLOCKED',(SELECT public.pazo_f16_live_service_checkout_begin(f18_test.owner(177),'18000000-0000-4000-8000-000000000177',1,'es',terms_version,terms_digest)->>'ok'='true' FROM supporter_private.pazo_live_offer_versions WHERE locale='es'));
SELECT f18_test.check('REVIEW_OWNER_IDEMPOTENCY_PRESERVED',(SELECT public.pazo_f16_live_service_checkout_begin(f18_test.owner(176),'18000000-0000-4000-8000-000000000176',1,'es',terms_version,terms_digest)->>'ok'='true' FROM supporter_private.pazo_live_offer_versions WHERE locale='es'));
SELECT f18_test.check('REVIEW_ONE_OPEN_INTENT_PRESERVED',(SELECT public.pazo_f16_live_service_checkout_begin(f18_test.owner(176),gen_random_uuid(),1,'es',terms_version,terms_digest)->>'code'='owner_slot_occupied' FROM supporter_private.pazo_live_offer_versions WHERE locale='es'));
SELECT f18_test.check('REVIEW_ORIGINAL_MERCHANT_REQUIRED',(SELECT public.pazo_f16_live_service_checkout_begin(f18_test.owner(178),gen_random_uuid(),2,'es',terms_version,terms_digest)->>'code'='controlled_release_admission_denied' FROM supporter_private.pazo_live_offer_versions WHERE locale='es'));
SELECT f18_test.check('REVIEW_CONSENT_STILL_VERIFIED',public.pazo_f16_live_service_checkout_begin(f18_test.owner(178),gen_random_uuid(),1,'es','unaccepted',repeat('a',64))->>'code'='published_terms_unverified');
UPDATE admin_private.pazo_live_release_control SET mode='canary';
SELECT f18_test.check('REVIEW_CANARY_GUARD_STILL_APPLIES',(SELECT public.pazo_f16_live_service_checkout_begin(f18_test.owner(178),gen_random_uuid(),1,'es',terms_version,terms_digest)->>'code'='canary_attempt_already_claimed' FROM supporter_private.pazo_live_offer_versions WHERE locale='es'));
SET ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.pazo_f16_live_service_checkout_begin(f18_test.owner(178),gen_random_uuid(),1,'es','x','x');RAISE EXCEPTION 'FAIL client begin';EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS F18 REVIEW_CHECKOUT_BEGIN_SERVICE_ONLY';END;END $$;
RESET ROLE;
ROLLBACK;
