\connect f14_synthetic
BEGIN;
-- Restore only disposable fixture health; every mutation in this file rolls back.
UPDATE supporter_private.gradual_interest SET state='withdrawn' WHERE owner_id='82000000-0000-4000-8000-00000000000e';
UPDATE supporter_private.gradual_incident SET resolved_at=statement_timestamp();
UPDATE supporter_private.gradual_campaign SET lifecycle='active',webhook_ok_at=statement_timestamp();
UPDATE supporter_private.pazo_paypal_live_worker_control SET last_heartbeat_at=statement_timestamp();
SELECT set_config('request.jwt.claims','{"role":"service_role"}',false);
-- Eligibility is explicit, excludes QA, banned/unonboarded/deleting accounts.
SELECT gradual_test.assert('GR-03_ELIGIBLE',supporter_private.gradual_eligible('82000000-0000-4000-8000-00000000003c'));
UPDATE auth.users SET banned_until=now()+interval '1 day' WHERE id='82000000-0000-4000-8000-00000000003c';
SELECT gradual_test.assert('GR-03_BAN',NOT supporter_private.gradual_eligible('82000000-0000-4000-8000-00000000003c'));
UPDATE auth.users SET banned_until=NULL WHERE id='82000000-0000-4000-8000-00000000003c';
UPDATE public.profiles SET onboarding_completed=false WHERE id='82000000-0000-4000-8000-00000000003c';
SELECT gradual_test.assert('GR-03_ONBOARDING',NOT supporter_private.gradual_eligible('82000000-0000-4000-8000-00000000003c'));
UPDATE public.profiles SET onboarding_completed=true WHERE id='82000000-0000-4000-8000-00000000003c';
INSERT INTO account_requests_private.deletion_requests VALUES('82000000-0000-4000-8000-00000000003c','requested');
SELECT gradual_test.assert('GR-03_DELETION',NOT supporter_private.gradual_eligible('82000000-0000-4000-8000-00000000003c'));
SELECT gradual_test.assert('GR-03_OPERATOR_EXCLUDED',NOT supporter_private.gradual_eligible('82000000-0000-4000-8000-00000000ffff'));
-- A verified original subscription may keep its renewal outside the campaign.
DO $$ DECLARE saved supporter_private.gradual_interest%ROWTYPE;BEGIN
 SELECT * INTO saved FROM supporter_private.gradual_interest WHERE owner_id='82000000-0000-4000-8000-000000000002';
 DELETE FROM supporter_private.gradual_interest WHERE owner_id=saved.owner_id;
 PERFORM gradual_test.assert('EVT-15_PAID_LEGACY_ISOLATED',supporter_private.gradual_legacy_open()=0 AND (SELECT provider_status='ACTIVE' AND closed_at IS NULL FROM supporter_private.pazo_paypal_live_checkout_intents WHERE intent_id=saved.intent_id));
 INSERT INTO supporter_private.gradual_interest SELECT saved.*;
END $$;
-- Original consent/intent and provider claim guards remain authoritative.
DO $$ DECLARE result jsonb;intent text;request uuid:=gen_random_uuid();who uuid:='82000000-0000-4000-8000-00000000000f'; BEGIN
 UPDATE supporter_private.gradual_interest SET slot_expires_at=statement_timestamp()+interval '15 minutes' WHERE owner_id=who;
 SELECT public.pazo_f16_live_service_checkout_begin(who,request,1,'es',terms_version,terms_digest) INTO result FROM supporter_private.pazo_live_offer_versions WHERE locale='es';
 PERFORM gradual_test.assert('GR-06_ORIGINAL_CONSENT',result->>'ok'='true');intent:=result->>'intentId';
 PERFORM gradual_test.assert('GR-06_ATTACHED_INTENT',(SELECT intent_id=intent AND state='paying' FROM supporter_private.gradual_interest WHERE owner_id=who));
 UPDATE supporter_private.gradual_interest SET slot_expires_at=statement_timestamp()-interval '1 second' WHERE owner_id=who;
 PERFORM supporter_private.gradual_pump();
 PERFORM gradual_test.assert('EVT-04_BEGIN_WITHOUT_CREATE_CLOSED',(SELECT closed_reason='unclaimed_abandoned' FROM supporter_private.pazo_paypal_live_checkout_intents WHERE intent_id=intent));
 PERFORM gradual_test.assert('EVT-04_EXPIRED_CANNOT_CLAIM',NOT public.pazo_f16_live_service_provider_claim_with_origin(who,intent,request,1,'https://pazo-app-t83r.vercel.app'));
END $$;
-- Signed period hold removes paid proof and pauses new admissions, not history.
INSERT INTO supporter_private.pazo_paypal_live_period_holds(sale_id,hold_id,kind,verified_at) VALUES('SALE-GRADUAL-2','GRADUAL-DISPUTE','dispute',statement_timestamp());
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('EVT-17_HOLD_NO_PROMOTION',NOT supporter_private.gradual_verified('82000000-0000-4000-8000-000000000002') AND (SELECT lifecycle='paused_automatic' FROM supporter_private.gradual_campaign));
SELECT gradual_test.assert('GR-16_HISTORICAL_CAPACITY',(SELECT count(*)=12 FROM supporter_private.gradual_admission));
SELECT gradual_test.assert('EVT-11_ORIGINAL_RECOVERY',supporter_private.gradual_recovery_admits('82000000-0000-4000-8000-000000000002',1));
-- Replays are actor+action+revision bound and audit only once.
DO $$ DECLARE nonce uuid:=gen_random_uuid();rev bigint;actor uuid:='82000000-0000-4000-8000-00000000ffff';BEGIN
 SELECT revision INTO rev FROM supporter_private.gradual_campaign;
 PERFORM gradual_test.assert('GR-15_AUDITED',public.pazo_f16_gradual_admin_action(actor,'pause',rev,nonce)->>'code'='updated');
 PERFORM gradual_test.assert('GR-15_REPLAY',public.pazo_f16_gradual_admin_action(actor,'pause',rev,nonce)->>'code'='already_recorded');
 PERFORM gradual_test.assert('GR-15_NONCE_CONFLICT',public.pazo_f16_gradual_admin_action(actor,'stop',rev,nonce)->>'code'='request_conflict');
 PERFORM gradual_test.assert('GR-15_ONE_AUDIT',(SELECT count(*)=1 FROM supporter_private.gradual_audit WHERE request_id=nonce));
END $$;
-- A missed invitation expires after 72h and advances to one new eligible owner.
UPDATE supporter_private.gradual_incident SET resolved_at=statement_timestamp();
UPDATE supporter_private.pazo_paypal_live_period_holds SET released_at=clock_timestamp() WHERE hold_id='GRADUAL-DISPUTE';
UPDATE supporter_private.gradual_campaign SET lifecycle='active';
INSERT INTO supporter_private.gradual_invitation(owner_id,campaign_id,expires_at) SELECT '82000000-0000-4000-8000-000000000032',id,statement_timestamp()-interval '1 second' FROM supporter_private.gradual_campaign;
SELECT supporter_private.gradual_pump();
SELECT gradual_test.assert('GR-02_EXPIRE_AND_REPLACE',(SELECT state='expired' FROM supporter_private.gradual_invitation WHERE owner_id='82000000-0000-4000-8000-000000000032') AND (SELECT count(*)=1 FROM supporter_private.gradual_invitation WHERE state='invited'));
-- Runtime projection failure must pause safely instead of rolling back the pause.
CREATE TEMP TABLE saved_projection AS SELECT pg_get_functiondef('supporter_private.pazo_live_project_paid_periods(uuid,timestamptz)'::regprocedure) definition;
CREATE OR REPLACE FUNCTION supporter_private.pazo_live_project_paid_periods(p_owner uuid,p_as_of timestamptz) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN RAISE EXCEPTION 'synthetic projection unavailable';END $$;
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('EVT-07_PROJECTION_EXCEPTION',(SELECT lifecycle='paused_automatic' FROM supporter_private.gradual_campaign) AND NOT admin_private.pazo_live_control_admits('82000000-0000-4000-8000-000000000010',1));
DO $$ DECLARE definition text;BEGIN SELECT s.definition INTO definition FROM saved_projection s;EXECUTE definition;END $$;
-- Expired coverage is honest, never shown as a pending new payment.
UPDATE supporter_private.pazo_paypal_live_paid_periods SET service_start=statement_timestamp()-interval '40 days',service_end=statement_timestamp()-interval '10 days' WHERE sale_id='SALE-GRADUAL-3';
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('GR-09_EXPIRED_COVERAGE',(SELECT state='benefits_ended' FROM supporter_private.gradual_interest WHERE owner_id='82000000-0000-4000-8000-000000000003') AND NOT supporter_private.gradual_verified('82000000-0000-4000-8000-000000000003'));
SELECT set_config('request.jwt.claim.sub','82000000-0000-4000-8000-000000000003',true);
SELECT gradual_test.assert('GR-09_AUTHORITATIVE_ACTIONS',public.pazo_gradual_my_status()->>'myState'='benefits_ended' AND public.pazo_gradual_my_status()->'allowedActions'='["manage"]'::jsonb AND public.pazo_gradual_my_status()->>'pendingVerification'='false');
-- Closed-campaign cleanup removes operational notices/feedback, never ledger/quota.
UPDATE supporter_private.gradual_campaign SET ended_at=statement_timestamp()-interval '91 days';
DO $$ DECLARE periods bigint;admissions bigint;BEGIN
 SELECT count(*) INTO periods FROM supporter_private.pazo_paypal_live_paid_periods;
 SELECT count(*) INTO admissions FROM supporter_private.gradual_admission;
 PERFORM supporter_private.gradual_cleanup();
 PERFORM gradual_test.assert('GR-17_RETENTION_NOTICES',NOT EXISTS(SELECT 1 FROM public.notifications WHERE type IN('supporter_campaign','supporter_verified')));
 PERFORM gradual_test.assert('GR-17_RETENTION_FEEDBACK',NOT EXISTS(SELECT 1 FROM supporter_private.gradual_interest WHERE feedback IS NOT NULL));
 PERFORM gradual_test.assert('GR-17_RETENTION_FINANCE',(SELECT count(*)=periods FROM supporter_private.pazo_paypal_live_paid_periods) AND (SELECT count(*)=admissions FROM supporter_private.gradual_admission));
END $$;
ROLLBACK;
