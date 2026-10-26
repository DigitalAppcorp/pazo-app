-- PostgreSQL 17 synthetic security test, no hosted calls.
BEGIN;
SET LOCAL lock_timeout='3s';

DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM marketing_private.collection_gate WHERE enabled) THEN
  RAISE EXCEPTION 'Marketing collection must start OFF';
 END IF;
 IF NOT (SELECT c.relrowsecurity AND c.relforcerowsecurity
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='marketing_private' AND c.relname='acquisition') THEN
  RAISE EXCEPTION 'RLS + FORCE absent';
 END IF;
 IF NOT (SELECT c.relrowsecurity AND c.relforcerowsecurity
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='marketing_private' AND c.relname='collection_gate') THEN
  RAISE EXCEPTION 'Gate must be FORCE RLS';
 END IF;
 IF has_schema_privilege('anon','marketing_private','USAGE')
    OR has_schema_privilege('authenticated','marketing_private','USAGE')
    OR has_schema_privilege('service_role','marketing_private','USAGE')
    OR has_table_privilege('anon','marketing_private.acquisition','SELECT')
    OR has_table_privilege('authenticated','marketing_private.acquisition','INSERT')
    OR has_table_privilege('service_role','marketing_private.acquisition','SELECT')
    OR has_table_privilege('service_role','marketing_private.collection_gate','UPDATE')
    OR has_function_privilege('authenticated',
      'marketing_private.record_verified_acquisition(uuid,text,timestamptz)','EXECUTE')
    OR has_function_privilege('service_role',
      'marketing_private.record_verified_acquisition(uuid,text,timestamptz)','EXECUTE')
    OR has_function_privilege('anon','marketing_private.cohort_snapshot()','EXECUTE') THEN
   RAISE EXCEPTION 'Marketing private grants leak into an API role';
 END IF;
END $$;

INSERT INTO auth.users(id,created_at,email_confirmed_at)
VALUES
 ('00000000-0000-0000-0000-000000000101',now()-interval '24 hours',now()-interval '23 hours'),
 ('00000000-0000-0000-0000-000000000102',now()-interval '24 hours',now()-interval '23 hours'),
 ('00000000-0000-0000-0000-000000000103',now()-interval '24 hours',now()-interval '23 hours'),
 ('00000000-0000-0000-0000-000000000104',now()-interval '10 days 1 hour',now()-interval '10 days');
INSERT INTO public.profiles(id,is_founder)
 SELECT id, false FROM auth.users;
INSERT INTO supporter_private.gradual_qa_accounts(owner_id,reason)
 VALUES('00000000-0000-0000-0000-000000000102','synthetic');
INSERT INTO admin_private.admin_grants(user_id)
 VALUES('00000000-0000-0000-0000-000000000103');

-- Admin aggregate RPC must not be public, service-readable or owner-spoofed.
DO $marketing_admin_acl$
BEGIN
 IF has_function_privilege('anon',
      'public.pazo_admin_marketing_summary(integer)','EXECUTE')
   OR has_function_privilege('service_role',
      'public.pazo_admin_marketing_summary(integer)','EXECUTE')
   OR NOT has_function_privilege('authenticated',
      'public.pazo_admin_marketing_summary(integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Marketing reporting RPC authorization grant mismatch'; END IF;
END $marketing_admin_acl$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
DO $marketing_admin_denied$
BEGIN
 BEGIN
  PERFORM public.pazo_admin_marketing_summary(30);
  RAISE EXCEPTION 'Ordinary account accessed marketing report';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $marketing_admin_denied$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000103',true);
DO $marketing_admin_disabled$
DECLARE v jsonb;
BEGIN
 v:=public.pazo_admin_marketing_summary(30);
 IF v->>'status'<>'not_configured' OR (v->'totals'->>'landing_signals')::bigint<>0
    OR jsonb_array_length(v->'daily')<>0
 THEN RAISE EXCEPTION 'Marketing admin initial disabled state wrong';END IF;
 IF v ? 'owner_id' OR v ? 'email' OR v ? 'user_id'
 THEN RAISE EXCEPTION 'Marketing admin response contains identity'; END IF;
 BEGIN
  PERFORM public.pazo_admin_marketing_summary(365);
  RAISE EXCEPTION 'Unbounded admin report permitted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
END $marketing_admin_disabled$;
RESET ROLE;
-- PG transaction-local Auth claims are temporary test data, never persisted.
SELECT set_config('request.jwt.claim.sub','',true);

-- Browser callers cannot call the public bridge. The service role can
-- execute the explicit bridge only; it cannot SELECT private attribution.
DO $$
BEGIN
 IF has_function_privilege('anon','public.pazo_marketing_record_verified_v1(uuid,text,timestamptz)','EXECUTE')
    OR has_function_privilege('authenticated','public.pazo_marketing_record_verified_v1(uuid,text,timestamptz)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.pazo_marketing_record_verified_v1(uuid,text,timestamptz)','EXECUTE')
    OR has_function_privilege('anon','public.pazo_marketing_withdraw_v1(uuid)','EXECUTE')
    OR has_function_privilege('authenticated','public.pazo_marketing_withdraw_v1(uuid)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.pazo_marketing_withdraw_v1(uuid)','EXECUTE')
    OR has_function_privilege('anon','public.pazo_marketing_prune_v1()','EXECUTE')
    OR has_function_privilege('authenticated','public.pazo_marketing_prune_v1()','EXECUTE')
    OR NOT has_function_privilege('service_role','public.pazo_marketing_prune_v1()','EXECUTE')
 THEN RAISE EXCEPTION 'Public marketing bridge ACL mismatch'; END IF;
END $$;
SET LOCAL ROLE service_role;
DO $$
DECLARE accepted boolean;
BEGIN
 SELECT public.pazo_marketing_record_verified_v1(
  '00000000-0000-0000-0000-000000000101',
  'perfil_es',now()-interval '25 hours') INTO accepted;
 IF accepted IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Service bridge must reject OFF gate'; END IF;
END $$;
RESET ROLE;

-- Aggregated landing RPC is service-only; no browser grants or raw visitor IDs.
DO $landing_test_1$
BEGIN
 IF has_table_privilege('anon','marketing_private.landing_daily','SELECT')
  OR has_table_privilege('authenticated','marketing_private.landing_daily','INSERT')
  OR has_table_privilege('service_role','marketing_private.landing_daily','SELECT')
  OR has_function_privilege('anon','public.pazo_marketing_record_landing_v1(text)','EXECUTE')
  OR has_function_privilege('authenticated','public.pazo_marketing_record_landing_v1(text)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.pazo_marketing_record_landing_v1(text)','EXECUTE')
  OR has_function_privilege('anon','public.pazo_marketing_prune_landing_v1()','EXECUTE')
  OR NOT has_function_privilege('service_role','public.pazo_marketing_prune_landing_v1()','EXECUTE')
 THEN RAISE EXCEPTION 'Landing aggregate ACL leak'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns
   WHERE table_schema='marketing_private' AND table_name='landing_daily'
    AND column_name IN ('ip','email','owner_id','user_id','session_id','visitor_id','user_agent','fbclid'))
 THEN RAISE EXCEPTION 'Landing aggregate persisted identifiers'; END IF;
END $landing_test_1$;
SET LOCAL ROLE service_role;
DO $landing_test_2$
BEGIN
 IF public.pazo_marketing_record_landing_v1('perfil_es') IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Landing signal accepted with gate OFF'; END IF;
END $landing_test_2$;
RESET ROLE;
DO $landing_test_3$
BEGIN
 IF EXISTS(SELECT 1 FROM marketing_private.landing_daily)
 THEN RAISE EXCEPTION 'OFF gate wrote landing signals'; END IF;
END $landing_test_3$;

-- Gate OFF rejects even fully valid events.
DO $$
DECLARE admitted boolean;
BEGIN
 SELECT marketing_private.record_verified_acquisition(
  '00000000-0000-0000-0000-000000000101',
  'perfil_es', now()-interval '25 hours') INTO admitted;
 IF admitted THEN RAISE EXCEPTION 'OFF gate admitted campaign event'; END IF;
 IF (SELECT count(*) FROM marketing_private.acquisition) <> 0 THEN
  RAISE EXCEPTION 'OFF gate persisted attribution';
 END IF;
END $$;

-- Rollback-only landing counter verifies same-day aggregation and allowlist.
-- No attempt to count unique humans; no IP fingerprint.
SET LOCAL ROLE service_role;
DO $landing_test_4$
BEGIN
 IF public.pazo_marketing_record_landing_v1('perfil_es') IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'OFF gate bypass on landing'; END IF;
END $landing_test_4$;
RESET ROLE;

-- Enable ONLY in synthetic transaction to check guarded paths.
-- Approval cannot be simulated without an explicit retention policy/version.
DO $$
BEGIN
 BEGIN
   UPDATE marketing_private.collection_gate
    SET enabled=true,enabled_at=now() WHERE singleton=true;
   RAISE EXCEPTION 'Gate opened without approved retention';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM marketing_private.collection_gate WHERE enabled) THEN
  RAISE EXCEPTION 'Gate leaked enabled state';
 END IF;
END $$;
-- ONLY the disposable fixture simulates a configured policy (not an approval).
UPDATE marketing_private.collection_gate
 SET enabled=true,enabled_at=now(),retention_days=30,
     policy_version='pazo-marketing-attribution-notice-v1' WHERE singleton=true;

SET LOCAL ROLE service_role;
DO $landing_test_5$
BEGIN
 IF NOT public.pazo_marketing_record_landing_v1('perfil_es')
    OR NOT public.pazo_marketing_record_landing_v1('perfil_es')
    OR NOT public.pazo_marketing_record_landing_v1('qr_en')
 THEN RAISE EXCEPTION 'Landing aggregation rejected eligible signal'; END IF;
 IF public.pazo_marketing_record_landing_v1('arbitrary_creative') IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Landing aggregation accepted unknown creative'; END IF;
END $landing_test_5$;
RESET ROLE;
DO $landing_test_6$
BEGIN
 IF (SELECT signals FROM marketing_private.landing_daily
   WHERE creative='perfil_es' AND landing_day =
     (now() AT TIME ZONE 'America/Los_Angeles')::date) <> 2
   OR (SELECT sum(signals) FROM marketing_private.landing_daily) <> 3
 THEN RAISE EXCEPTION 'Landing aggregation or day partition incorrect'; END IF;
END $landing_test_6$;

-- This is a raw signal count, NOT unique visitors or a conversion rate.
DO $daily_report_check$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM marketing_private.daily_campaign_summary()
   WHERE creative='perfil_es' AND landing_signals=2
     AND verified_signups=0) THEN
  RAISE EXCEPTION 'Daily campaign summary lost landing signals';
 END IF;
 IF has_function_privilege('authenticated','marketing_private.daily_campaign_summary()','EXECUTE')
  OR has_function_privilege('service_role','marketing_private.daily_campaign_summary()','EXECUTE') THEN
  RAISE EXCEPTION 'Private campaign report was granted to public roles';
 END IF;
END $daily_report_check$;

DO $landing_test_7$
DECLARE accepted boolean;
BEGIN
 SELECT marketing_private.record_verified_acquisition(
  '00000000-0000-0000-0000-000000000101',
  'perfil_es', now()-interval '25 hours') INTO accepted;
 IF accepted IS DISTINCT FROM true THEN RAISE EXCEPTION 'Verified eligible signup failed';END IF;

 SELECT marketing_private.record_verified_acquisition(
  '00000000-0000-0000-0000-000000000101',
  'perfil_es', now()-interval '25 hours') INTO accepted;
 IF accepted IS DISTINCT FROM false THEN RAISE EXCEPTION 'Duplicate acquisition credited';END IF;

 SELECT marketing_private.record_verified_acquisition(
  '00000000-0000-0000-0000-000000000102',
  'qr_es', now()-interval '25 hours') INTO accepted;
 IF accepted THEN RAISE EXCEPTION 'Known QA user admitted';END IF;

 SELECT marketing_private.record_verified_acquisition(
  '00000000-0000-0000-0000-000000000103',
  'comunidad_es', now()-interval '25 hours') INTO accepted;
 IF accepted THEN RAISE EXCEPTION 'Admin admitted';END IF;

 SELECT marketing_private.record_verified_acquisition(
  '00000000-0000-0000-0000-000000000101',
  'malicious_creative', now()-interval '25 hours') INTO accepted;
 IF accepted THEN RAISE EXCEPTION 'Invalid campaign creative admitted';END IF;

 IF (SELECT count(*) FROM marketing_private.acquisition) <> 1 THEN
  RAISE EXCEPTION 'Unexpected acquisitions after QA and dedup checks';
 END IF;
END $landing_test_7$;

INSERT INTO public.pets(id,owner_id,created_at) VALUES
 ('10000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000101',now()-interval '22 hours');

DO $$
DECLARE signups bigint; petowners bigint; mature bigint; d7 bigint;
BEGIN
 SELECT sum(verified_owners),sum(first_pet_within_7d),
        sum(d7_matured_owners),sum(d7_screen_activity_proxy)
 INTO signups, petowners, mature, d7
 FROM marketing_private.cohort_snapshot();
 IF signups<>1 OR petowners<>1 OR mature<>0 OR d7<>0 THEN
  RAISE EXCEPTION 'Invalid new cohort summary: %, %, %, %',signups,petowners,mature,d7;
 END IF;
END $$;

-- Synthetic historical record to validate D7 and preserve timestamps.
INSERT INTO marketing_private.acquisition(
 owner_id,campaign,creative,first_touch_at,signup_verified_at,
 notice_version
) VALUES(
 '00000000-0000-0000-0000-000000000104',
 'pazo_beta_local_202610','qr_en',
 now()-interval '10 days 2 hours',now()-interval '10 days',
 'pazo-marketing-attribution-notice-v1'
);
INSERT INTO admin_private.app_activity_daily(user_id,activity_day,module_key)
VALUES (
 '00000000-0000-0000-0000-000000000104',
 ((now()-interval '10 days') AT TIME ZONE 'America/Los_Angeles')::date + 7,
 'inicio'
);
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM marketing_private.cohort_snapshot()
   WHERE creative='qr_en' AND verified_owners=1 AND d7_matured_owners=1
     AND d7_screen_activity_proxy=1) THEN
   RAISE EXCEPTION 'D7 proxy did not match eligible mature cohort';
 END IF;
END $$;

-- A user later marked QA must disappear from aggregate history.
INSERT INTO supporter_private.gradual_qa_accounts(owner_id,reason)
 VALUES('00000000-0000-0000-0000-000000000104','late synthetic QA');
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM marketing_private.cohort_snapshot() WHERE creative='qr_en') THEN
  RAISE EXCEPTION 'Retroactive QA exclusion failed';
 END IF;
END $$;

-- Owner account removal must cascade to attribution, never keep shadow identity.
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000101';
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM marketing_private.acquisition
   WHERE owner_id='00000000-0000-0000-0000-000000000101') THEN
  RAISE EXCEPTION 'Deletion did not cascade to campaign identity';
 END IF;
END $$;

-- A privacy withdrawal is idempotent, only removes attribution and
-- is impossible from authenticated/anonymous roles. Use service role only.
INSERT INTO auth.users(id,created_at,email_confirmed_at)
VALUES
 ('00000000-0000-0000-0000-000000000105',now()-interval '2 days',now()-interval '2 days'),
 ('00000000-0000-0000-0000-000000000106',now()-interval '31 days',now()-interval '31 days');
INSERT INTO public.profiles(id,is_founder) VALUES
 ('00000000-0000-0000-0000-000000000105',false),
 ('00000000-0000-0000-0000-000000000106',false);
INSERT INTO marketing_private.acquisition(
 owner_id,campaign,creative,first_touch_at,signup_verified_at,
 notice_version,recorded_at
) VALUES
 ('00000000-0000-0000-0000-000000000105','pazo_beta_local_202610','perfil_es',
 now()-interval '2 days 1 hour',now()-interval '2 days',
 'pazo-marketing-attribution-notice-v1',now()),
 ('00000000-0000-0000-0000-000000000106','pazo_beta_local_202610','qr_es',
 now()-interval '31 days 1 hour',now()-interval '31 days',
 'pazo-marketing-attribution-notice-v1',now()-interval '31 days');
SET LOCAL ROLE service_role;
DO $$
BEGIN
 IF public.pazo_marketing_withdraw_v1('00000000-0000-0000-0000-000000000105') IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Withdrawal failed';END IF;
 IF public.pazo_marketing_withdraw_v1('00000000-0000-0000-0000-000000000105') IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Idempotent withdrawal failed';END IF;
 IF public.pazo_marketing_prune_v1() <> 1 THEN
  RAISE EXCEPTION 'Expired record not deleted by manual prune';END IF;
END $$;
RESET ROLE;
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM marketing_private.acquisition
  WHERE owner_id IN (
    '00000000-0000-0000-0000-000000000105',
    '00000000-0000-0000-0000-000000000106')) THEN
  RAISE EXCEPTION 'Attribution persisted after withdrawal/prune';
 END IF;
END $$;

INSERT INTO marketing_private.landing_daily(landing_day,campaign,creative,signals)
VALUES (
 (now() AT TIME ZONE 'America/Los_Angeles')::date-32,
 'pazo_beta_local_202610','perfil_en',100
);
SET LOCAL ROLE service_role;
DO $landing_test_8$
BEGIN
 IF public.pazo_marketing_prune_landing_v1() <> 1 THEN
  RAISE EXCEPTION 'Expired aggregate day not purged'; END IF;
END $landing_test_8$;
RESET ROLE;
DO $landing_test_9$
BEGIN
 IF (SELECT sum(signals) FROM marketing_private.landing_daily)<>3
 THEN RAISE EXCEPTION 'Pruning harmed current aggregate'; END IF;
END $landing_test_9$;

-- Aggregated report is browser-readable only by a genuine admin grant.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000103',true);
DO $marketing_admin_aggregates$
DECLARE v jsonb;
BEGIN
 v:=public.pazo_admin_marketing_summary(30);
 IF v->>'status'<>'collecting' OR (v->'totals'->>'landing_signals')::bigint<>3 THEN
  RAISE EXCEPTION 'Admin marketing totals not projected from private aggregation';
 END IF;
 IF (v->'totals'->>'verified_signups')::bigint < 0 THEN
  RAISE EXCEPTION 'Admin marketing returned invalid signup count';
 END IF;
 IF v::text LIKE '%00000000-0000-0000%' OR
    v::text LIKE '%@example%' OR
    v::text LIKE '%fbclid%' THEN
  RAISE EXCEPTION 'Admin marketing JSON leaks identity or click IDs';
 END IF;
 IF jsonb_array_length(v->'daily')<1 THEN
  RAISE EXCEPTION 'Admin marketing daily rows missing';
 END IF;
END $marketing_admin_aggregates$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);

-- Untrusted public endpoint cannot bypass DB budget via direct RPC. Both
-- minute and daily ceilings must remain atomic, without visitor identifiers.
DO $marketing_budget_acl$
BEGIN
 IF has_table_privilege('anon','marketing_private.landing_minute_budget','SELECT')
 OR has_table_privilege('authenticated','marketing_private.landing_minute_budget','INSERT')
 OR has_table_privilege('service_role','marketing_private.landing_minute_budget','SELECT')
 OR has_function_privilege('anon','public.pazo_marketing_prune_all_v1()','EXECUTE')
 OR has_function_privilege('authenticated','public.pazo_marketing_prune_all_v1()','EXECUTE')
 OR NOT has_function_privilege('service_role','public.pazo_marketing_prune_all_v1()','EXECUTE')
 THEN RAISE EXCEPTION 'Budget/retention private ACL compromised'; END IF;
 IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='marketing_private'
    AND table_name='landing_minute_budget'
    AND column_name IN ('owner_id','user_id','visitor_id','ip','user_agent','click_id')
 ) THEN RAISE EXCEPTION 'Minute budget persists personal identifiers'; END IF;
END $marketing_budget_acl$;

SET LOCAL ROLE service_role;
DO $marketing_budget_burst$
DECLARE n integer; ok boolean;
BEGIN
 FOR n IN 1..31 LOOP
  SELECT public.pazo_marketing_record_landing_v1('comunidad_en') INTO ok;
  IF n<=30 AND ok IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'Burst limiter prematurely rejected valid signal %',n;
  END IF;
  IF n=31 AND ok IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'Burst limiter exceeded 30 signals';
  END IF;
 END LOOP;
END $marketing_budget_burst$;
RESET ROLE;
DO $marketing_budget_assert$
BEGIN
 IF (SELECT signals FROM marketing_private.landing_daily
  WHERE creative='comunidad_en')<>30
 OR (SELECT accepted FROM marketing_private.landing_minute_budget
  WHERE creative='comunidad_en')<>30 THEN
  RAISE EXCEPTION 'Atomic burst budget diverged from landing signals';
 END IF;
END $marketing_budget_assert$;

INSERT INTO marketing_private.landing_daily(landing_day,campaign,creative,signals)
VALUES((now() AT TIME ZONE 'America/Los_Angeles')::date,
 'pazo_beta_local_202610','comunidad_es',3000);
SET LOCAL ROLE service_role;
DO $marketing_budget_day$
BEGIN
 IF public.pazo_marketing_record_landing_v1('comunidad_es') IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Daily ceiling admitted signal over 3000'; END IF;
END $marketing_budget_day$;
RESET ROLE;
DO $marketing_budget_rollback$
BEGIN
 IF EXISTS(SELECT 1 FROM marketing_private.landing_minute_budget
   WHERE creative='comunidad_es') THEN
  RAISE EXCEPTION 'Daily rejection failed to roll back minute counter';
 END IF;
 IF (SELECT signals FROM marketing_private.landing_daily
    WHERE creative='comunidad_es')<>3000 THEN
  RAISE EXCEPTION 'Daily rejection incremented signal'; END IF;
END $marketing_budget_rollback$;

-- Unified cleanup is service-only and also expires a 48-hour budget when
-- the collection gate is OFF. Job scheduling is a separate operation.
INSERT INTO marketing_private.landing_minute_budget(minute_utc,creative,accepted)
VALUES(date_trunc('minute',now()-interval '49 hours'),'perfil_en',2);
UPDATE marketing_private.collection_gate
SET enabled=false,enabled_at=null,retention_days=0,policy_version=null
WHERE singleton;
SET LOCAL ROLE service_role;
DO $marketing_budget_purge$
DECLARE result jsonb;
BEGIN
 result:=public.pazo_marketing_prune_all_v1();
 IF (result->>'acquisition_removed')::integer<>0 OR
    (result->>'aggregate_or_window_rows_removed')::integer<>1 THEN
  RAISE EXCEPTION 'Unexpected unified cleanup counters %',result;
 END IF;
END $marketing_budget_purge$;
RESET ROLE;
DO $marketing_budget_closed$
BEGIN
 IF EXISTS(SELECT 1 FROM marketing_private.landing_minute_budget
   WHERE creative='perfil_en') THEN
  RAISE EXCEPTION 'Old burst-budget record persisted with collection OFF';
 END IF;
 IF public.pazo_marketing_record_landing_v1('perfil_es') IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Closed collection gate admitted signal'; END IF;
END $marketing_budget_closed$;

ROLLBACK;
SELECT 'PAZO_MARKETING_PG17_SYNTHETIC_ROLLBACK_PASS' AS result;
