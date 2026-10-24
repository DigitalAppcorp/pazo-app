\connect f14_synthetic
-- Local fixtures only. Simulate launch before any real account has joined.
UPDATE supporter_private.gradual_campaign SET lifecycle='inactive',started_at=NULL,ended_at=NULL,stage='L1_FIRST_REAL',capacity=1,hosted_gate_verified=false;
UPDATE auth.users SET created_at='2026-10-23 22:58:00+00';
\i supabase/migrations/20261024001615_pazo_f16_real_cohort_initial_invitation_budget.sql
SELECT gradual_test.assert('ISSUE85_QA_ALL_EXCLUDED',NOT EXISTS(SELECT 1 FROM auth.users WHERE supporter_private.gradual_eligible(id) OR supporter_private.gradual_verified(id)));
SELECT gradual_test.assert('ISSUE85_QA_FORCE_RLS',(SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='supporter_private.gradual_qa_accounts'::regclass) AND NOT has_table_privilege('authenticated','supporter_private.gradual_qa_accounts','INSERT'));
SELECT gradual_test.assert('ISSUE85_QA_HELPER_PRIVATE',NOT has_function_privilege('authenticated','supporter_private.gradual_is_real_account(uuid)','EXECUTE'));
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"82000000-0000-4000-8000-00000000ffff"}',false);
SELECT set_config('request.jwt.claim.sub','82000000-0000-4000-8000-00000000ffff',false);
SELECT gradual_test.assert('ISSUE85_QA_NO_REAL_REVENUE',(public.pazo_admin_gradual_status()->>'realRevenueMinor')::integer=0 AND (public.pazo_admin_live_finance_summary()->'payments'->>'verifiedPayments')::integer=0);
SELECT gradual_test.assert('ISSUE85_QA_NO_REAL_BUYERS',(public.pazo_admin_gradual_status()->>'admitted')::integer=0 AND (public.pazo_admin_live_finance_summary()->>'activePaidAccounts')::integer=0);
BEGIN;
-- Every financial row is kept; this transaction sets up a fresh empty campaign
-- to exercise zero eligible start and future arrivals without provider calls.
DELETE FROM supporter_private.gradual_outbox;
DELETE FROM supporter_private.gradual_invitation;
DELETE FROM supporter_private.gradual_interest;
DELETE FROM supporter_private.gradual_admission;
DELETE FROM supporter_private.gradual_incident;
UPDATE supporter_private.pazo_paypal_live_checkout_intents SET closed_at=clock_timestamp(),closed_reason='provider_terminal_reconciled' WHERE closed_at IS NULL;
UPDATE supporter_private.pazo_paypal_live_event_inbox SET processing_state='processed',lease_token=NULL,lease_expires_at=NULL;
UPDATE supporter_private.pazo_paypal_live_worker_control SET enabled=true,processing_enabled=true,last_heartbeat_at=clock_timestamp(),last_outcome='idle';
UPDATE supporter_private.gradual_campaign SET hosted_gate_verified=true,webhook_ok_at=clock_timestamp();
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT gradual_test.assert('ISSUE85_START_WITH_ZERO_REAL',public.pazo_f16_gradual_admin_action('82000000-0000-4000-8000-00000000ffff','start',(SELECT revision FROM supporter_private.gradual_campaign),gen_random_uuid())->>'code'='updated');
SELECT gradual_test.assert('ISSUE85_QA_NO_NEW_CHECKOUT',NOT admin_private.pazo_live_control_admits('82000000-0000-4000-8000-000000000002',1));
SELECT gradual_test.assert('ISSUE85_QA_NO_AUTOMATIC_PROMOTION',(SELECT stage='L1_FIRST_REAL' AND capacity=1 FROM supporter_private.gradual_campaign));
SELECT gradual_test.assert('ISSUE85_NO_QA_INVITATION',(SELECT count(*)=0 FROM supporter_private.gradual_invitation));
INSERT INTO auth.users(id,email_confirmed_at,is_anonymous,created_at)
 SELECT ('85000000-0000-4000-8000-'||lpad(to_hex(n),12,'0'))::uuid,clock_timestamp(),false,'2026-10-23 23:01:00+00'::timestamptz+n*interval '1 second' FROM generate_series(1,8)n;
INSERT INTO public.profiles SELECT id,true FROM auth.users WHERE id::text LIKE '85000000-%';
SELECT supporter_private.gradual_pump();
SELECT gradual_test.assert('ISSUE85_FUTURE_FIRST_FIVE',(SELECT count(*)=5 AND bool_and(owner_id::text LIKE '85000000-%') AND min(expires_at)>statement_timestamp()+interval '71 hours' FROM supporter_private.gradual_invitation));
SELECT supporter_private.gradual_pump();
SELECT gradual_test.assert('ISSUE85_FUTURE_INVITATIONS_IDEMPOTENT',(SELECT count(*)=5 FROM supporter_private.gradual_invitation) AND (SELECT count(*)=5 FROM supporter_private.gradual_outbox));
UPDATE supporter_private.gradual_invitation SET expires_at=clock_timestamp()-interval '1 second' WHERE owner_id='85000000-0000-4000-8000-000000000001';
SELECT supporter_private.gradual_pump();
SELECT gradual_test.assert('ISSUE85_EXPIRED_REPLENISHED_ONCE',(SELECT count(*)=5 FROM supporter_private.gradual_invitation WHERE state='invited') AND (SELECT count(*)=6 FROM supporter_private.gradual_invitation));
-- Snapshot label remains durable even if privileged Auth metadata is corrected.
UPDATE auth.users SET created_at='2026-10-23 23:01:00+00' WHERE id='82000000-0000-4000-8000-000000000002';
SELECT gradual_test.assert('ISSUE85_QA_LABEL_DURABLE',NOT supporter_private.gradual_is_real_account('82000000-0000-4000-8000-000000000002'));
INSERT INTO supporter_private.gradual_admission(campaign_id,owner_id)
 SELECT id,'85000000-0000-4000-8000-000000000002' FROM supporter_private.gradual_campaign;
DELETE FROM public.profiles WHERE id IN('85000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-00000000003c');
DELETE FROM auth.users WHERE id IN('85000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-00000000003c');
SELECT gradual_test.assert('ISSUE85_REAL_HISTORY_SURVIVES_AUTH_DELETE',supporter_private.gradual_is_real_account('85000000-0000-4000-8000-000000000002'));
SELECT gradual_test.assert('ISSUE85_DELETED_QA_NEVER_BECOMES_REAL',NOT supporter_private.gradual_is_real_account('82000000-0000-4000-8000-00000000003c'));
DO $$ BEGIN
 BEGIN UPDATE supporter_private.gradual_admission SET real_account_at_admission=false WHERE owner_id='85000000-0000-4000-8000-000000000002';
 RAISE EXCEPTION 'Historical real classification changed';EXCEPTION WHEN check_violation THEN NULL;END;
END $$;
ROLLBACK;
