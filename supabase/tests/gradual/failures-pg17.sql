\connect f14_synthetic
-- Runs after kernel-pg17.sql, before concurrency resets only the gradual fixtures.
SELECT set_config('request.jwt.claims','{"role":"service_role"}',false);
SELECT public.pazo_f16_gradual_admin_action('82000000-0000-4000-8000-00000000ffff','resume',(SELECT revision FROM supporter_private.gradual_campaign),gen_random_uuid());
-- Provider CREATE already claimed: expiry cannot free a provisional slot.
UPDATE supporter_private.gradual_interest SET provider_started=true,slot_expires_at=statement_timestamp()-interval '1 day' WHERE owner_id='82000000-0000-4000-8000-00000000000c';
SELECT supporter_private.gradual_pump();
SELECT gradual_test.assert('EVT-05_UNCERTAIN_NEVER_TIMED_OUT',(SELECT state='slot_granted' AND slot_token IS NOT NULL AND provider_started FROM supporter_private.gradual_interest WHERE owner_id='82000000-0000-4000-8000-00000000000c'));
-- An actual ledger period without an effective entitlement pauses new admission.
SELECT gradual_test.pay(13,true,false);
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('EVT-07_PROJECTION_FAILURE',(SELECT lifecycle='paused_automatic' FROM supporter_private.gradual_campaign) AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_outbox WHERE owner_id='82000000-0000-4000-8000-00000000000d' AND kind='verified'));
UPDATE supporter_private.pazo_paypal_live_paid_periods SET service_start=statement_timestamp()-interval '1 day' WHERE sale_id='SALE-GRADUAL-13';
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('EVT-10_DURABLE_RECOVERY',(SELECT state='benefits_active' FROM supporter_private.gradual_interest WHERE owner_id='82000000-0000-4000-8000-00000000000d') AND (SELECT lifecycle='paused_automatic' FROM supporter_private.gradual_campaign));
-- A fake/unsigned period cannot produce verified benefits or a thank-you.
SELECT gradual_test.pay(14,false,true);
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('EVT-12_UNSIGNED_NOT_VERIFIED',NOT supporter_private.gradual_verified('82000000-0000-4000-8000-00000000000e') AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_outbox WHERE owner_id='82000000-0000-4000-8000-00000000000e' AND kind='verified'));
-- Stable two-thread identities; repeated delivery after lost ACK is idempotent.
DO $$ DECLARE claim jsonb;first uuid; BEGIN
 FOR n IN 1..80 LOOP
  claim:=public.pazo_f16_gradual_notice_claim();EXIT WHEN claim IS NULL;
  PERFORM gradual_test.assert('OUTBOX_DELIVERY',public.pazo_f16_gradual_notice_deliver((claim->>'campaign')::uuid,(claim->>'owner')::uuid,claim->>'kind',(claim->>'version')::bigint,(claim->>'lease')::uuid));
  PERFORM gradual_test.assert('OUTBOX_REPLAY_DENIED',NOT public.pazo_f16_gradual_notice_deliver((claim->>'campaign')::uuid,(claim->>'owner')::uuid,claim->>'kind',(claim->>'version')::bigint,(claim->>'lease')::uuid));
 END LOOP;
 SELECT notification_id INTO first FROM supporter_private.gradual_outbox WHERE owner_id='82000000-0000-4000-8000-000000000002' AND kind='invitation';
 PERFORM supporter_private.gradual_notice('82000000-0000-4000-8000-000000000002','invitation','waiting');
 PERFORM gradual_test.assert('GR-02_SAME_THREAD',(SELECT notification_id=first FROM supporter_private.gradual_outbox WHERE owner_id='82000000-0000-4000-8000-000000000002' AND kind='invitation'));
END $$;
SELECT gradual_test.assert('GR-10_TWO_LOGICAL_NOTICES',(SELECT max(n)<=2 FROM(SELECT count(*)n FROM public.notifications WHERE type IN('supporter_campaign','supporter_verified') GROUP BY user_id)x));
-- Leases recover after a crashed notification worker. A stale version cannot ACK.
DO $$ DECLARE old jsonb;fresh jsonb; BEGIN
 old:=public.pazo_f16_gradual_notice_claim();
 UPDATE supporter_private.gradual_outbox SET lease_expires_at=statement_timestamp()-interval '1 second' WHERE lease_token=(old->>'lease')::uuid;
 fresh:=public.pazo_f16_gradual_notice_claim();
 PERFORM gradual_test.assert('GR-18_LEASE_RECOVERY',old->>'lease'<>fresh->>'lease');
 PERFORM gradual_test.assert('GR-18_STALE_LEASE',NOT public.pazo_f16_gradual_notice_deliver((old->>'campaign')::uuid,(old->>'owner')::uuid,old->>'kind',(old->>'version')::bigint,(old->>'lease')::uuid));
 PERFORM gradual_test.assert('GR-18_NEW_LEASE',public.pazo_f16_gradual_notice_deliver((fresh->>'campaign')::uuid,(fresh->>'owner')::uuid,fresh->>'kind',(fresh->>'version')::bigint,(fresh->>'lease')::uuid));
END $$;
-- Optional feedback creates one private F17 ticket and never changes entitlement.
SELECT set_config('request.jwt.claim.sub','82000000-0000-4000-8000-000000000002',false);
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"82000000-0000-4000-8000-000000000002"}',false);
SELECT gradual_test.assert('GR-11_ISSUE_ACCEPTED',public.pazo_gradual_feedback('issue','badge'));
SELECT gradual_test.assert('GR-11_FEEDBACK_DEDUPE',public.pazo_gradual_feedback('issue','badge'));
SELECT gradual_test.assert('GR-11_RIGHTS_UNCHANGED',supporter_private.gradual_verified('82000000-0000-4000-8000-000000000002'));
SELECT gradual_test.assert('GR-11_PRIVATE_SUPPORT',(SELECT count(*)=1 FROM public.pazo_support_tickets WHERE owner_id='82000000-0000-4000-8000-000000000002'));
-- Authenticated role cannot access raw campaign/other owner data or service RPCs.
GRANT USAGE ON SCHEMA gradual_test TO authenticated;
SET ROLE authenticated;
SELECT gradual_test.assert('GR-17_OWN_STATUS',(public.pazo_gradual_my_status()->>'myState')='benefits_active' AND NOT public.pazo_gradual_my_status()?'owner_id');
DO $$ BEGIN
 BEGIN PERFORM * FROM supporter_private.gradual_interest;RAISE EXCEPTION 'raw table leak';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.pazo_f16_gradual_tick(true);RAISE EXCEPTION 'service RPC leak';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.pazo_admin_gradual_status();RAISE EXCEPTION 'admin leak';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
-- CAS, nonce reuse, legacy bypass and explicit public barrier.
SELECT set_config('request.jwt.claims','{"role":"service_role"}',false);
SELECT gradual_test.assert('GR-15_CAS',public.pazo_f16_gradual_admin_action('82000000-0000-4000-8000-00000000ffff','pause',99999,gen_random_uuid())->>'code'='revision_changed');
SELECT gradual_test.assert('GR-15_PUBLIC_BARRIER',public.pazo_f16_gradual_admin_action('82000000-0000-4000-8000-00000000ffff','public',(SELECT revision FROM supporter_private.gradual_campaign),gen_random_uuid())->>'code'<>'updated');
SELECT gradual_test.assert('GR-15_LEGACY_NO_BYPASS',public.pazo_f16_live_service_release_change('82000000-0000-4000-8000-00000000ffff','public',1,gen_random_uuid())->>'code'='release_reconciliation_pending');
