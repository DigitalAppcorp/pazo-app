-- F16 disposable PG17 cutover transaction rehearsal. NEVER RUN HOSTED.
-- Simulates stale legacy EXECUTE grants then revokes them in the SAME
-- transaction that verifies the lease-aware replacements; rolls EVERYTHING back.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
DECLARE required text;
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
    OR session_user<>'f14_admin'
    OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
 THEN RAISE EXCEPTION 'Cutover rehearsal requires isolated PG17 CI'; END IF;
 FOREACH required IN ARRAY ARRAY[
  'public.f16_paypal_commit_verified_sale(text,text,text,uuid,text,integer,text,timestamptz)',
  'public.f16_paypal_commit_verified_reversal(text,text,text,timestamptz)',
  'public.f16_lab_claim_verified_inbox(text,integer)',
  'public.f16_lab_release_claim(text,uuid,text,boolean)',
  'public.f16_lab_commit_claimed_sale(text,uuid,text,text,uuid,text,integer,text,timestamptz)',
  'public.f16_lab_commit_claimed_reversal(text,uuid,text,text,timestamptz)',
  'public.f16_lab_read_bound_intent_by_subscription(text)',
  'public.f16_lab_read_known_reversal_ids(text)'
 ] LOOP
  IF pg_catalog.to_regprocedure(required) IS NULL
  THEN RAISE EXCEPTION 'Missing prereq SQL function: %',required; END IF;
 END LOOP;
END $guard$;
CREATE TEMP TABLE f16_cutover_baseline ON COMMIT DROP AS
 SELECT
  (SELECT COUNT(*) AS n FROM supporter_private.paypal_verified_event_inbox) AS inbox,
  (SELECT COUNT(*) AS n FROM supporter_private.paypal_payment_entries) AS payments,
  (SELECT COUNT(*) AS n FROM supporter_private.paypal_payment_reversals) AS reversals;

SET LOCAL ROLE postgres;
-- Simulate the unsafe *existing* grants before cutover. The transaction is
-- rolled back so the historical real grants/CI baseline never change.
GRANT EXECUTE ON FUNCTION public.f16_paypal_commit_verified_sale(
 text,text,text,uuid,text,integer,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.f16_paypal_commit_verified_reversal(
 text,text,text,timestamptz) TO service_role;
DO $before$
BEGIN
 IF NOT pg_catalog.has_function_privilege('service_role',
    'public.f16_paypal_commit_verified_sale(text,text,text,uuid,text,integer,text,timestamptz)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
    'public.f16_paypal_commit_verified_reversal(text,text,text,timestamptz)','EXECUTE')
 THEN RAISE EXCEPTION 'Legacy privileges did not exist in rehearsal'; END IF;
END $before$;

-- The *future* CLI-versioned hosted migration must wrap all DDL/ACL changes
-- with one atomic transaction. This rehearsal tests only ACL + the already
-- installed DRAFT-only functions in the disposable database.
REVOKE ALL ON FUNCTION public.f16_paypal_commit_verified_sale(
 text,text,text,uuid,text,integer,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.f16_paypal_commit_verified_reversal(
 text,text,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;

DO $acl$
DECLARE f text;
DECLARE p oid;
BEGIN
 IF pg_catalog.has_function_privilege('service_role',
    'public.f16_paypal_commit_verified_sale(text,text,text,uuid,text,integer,text,timestamptz)','EXECUTE')
 OR pg_catalog.has_function_privilege('service_role',
    'public.f16_paypal_commit_verified_reversal(text,text,text,timestamptz)','EXECUTE')
 THEN RAISE EXCEPTION 'Old finance path still callable'; END IF;
 FOREACH f IN ARRAY ARRAY[
  'public.f16_lab_claim_verified_inbox(text,integer)',
  'public.f16_lab_release_claim(text,uuid,text,boolean)',
  'public.f16_lab_commit_claimed_sale(text,uuid,text,text,uuid,text,integer,text,timestamptz)',
  'public.f16_lab_commit_claimed_reversal(text,uuid,text,text,timestamptz)',
  'public.f16_lab_read_bound_intent_by_subscription(text)',
  'public.f16_lab_read_known_reversal_ids(text)'
 ] LOOP
  p:=f::regprocedure::oid;
  IF NOT pg_catalog.has_function_privilege('service_role',p,'EXECUTE')
     OR pg_catalog.has_function_privilege('anon',p,'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated',p,'EXECUTE')
     OR NOT (SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid=p)
     OR (SELECT pg_catalog.pg_get_userbyid(proowner) FROM pg_catalog.pg_proc WHERE oid=p)<>'postgres'
     OR NOT (SELECT 'search_path=""'=ANY(proconfig) FROM pg_catalog.pg_proc WHERE oid=p)
  THEN RAISE EXCEPTION 'Unsafe replacement RPC ACL / security: %',f; END IF;
 END LOOP;
 IF pg_catalog.has_table_privilege('service_role',
     'supporter_private.paypal_payment_entries','INSERT')
 OR pg_catalog.has_table_privilege('service_role',
     'supporter_private.paypal_verified_event_inbox','UPDATE')
 THEN RAISE EXCEPTION 'Direct finance table access was introduced'; END IF;
END $acl$;
SET LOCAL ROLE service_role;
DO $old_denied$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.f16_paypal_commit_verified_sale(
    'WH-CUTOVER-SALE-QA','PAY-CUTOVER-QA','I-CUTOVER-QA',
    '63e812b0-a7e5-49f6-b2dd-c11d2c72af57',
    'P-14V25407JP6850922NLHMDKI',299,'USD',
    '2026-10-13T19:00:00Z');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Legacy sale was callable after cutover'; END IF;
 denied:=false;
 BEGIN
  PERFORM public.f16_paypal_commit_verified_reversal(
    'WH-CUTOVER-REF-QA','PAY-CUTOVER-QA','refunded','2026-10-14T11:16:00Z');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Legacy reversal was callable after cutover'; END IF;
END $old_denied$;
DO $fixture$
DECLARE owner uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
        intent text:='intent-cf8424f0-d2c7-4a89-a4b4-2d14c60d2c67';
BEGIN
 IF NOT public.f16_paypal_create_private_intent(owner,intent)
 OR public.f16_paypal_bind_private_intent(intent,owner,
      'I-F16-CUTOVER-QA','P-14V25407JP6850922NLHMDKI')<>'new_binding'
 THEN RAISE EXCEPTION 'Safe private owner precondition failed'; END IF;
 IF NOT public.f16_paypal_record_verified_event(
  'WH-F16-CUTOVER-QA','PAYMENT.SALE.COMPLETED')
 THEN RAISE EXCEPTION 'No synthetic verified event'; END IF;
END $fixture$;
DO $safe_commit$
DECLARE c jsonb; result text;
BEGIN
 c:=public.f16_lab_claim_verified_inbox('WH-F16-CUTOVER-QA',180);
 IF c->>'lease_token' IS NULL
 THEN RAISE EXCEPTION 'Safe replacement failed to claim'; END IF;
 result:=public.f16_lab_commit_claimed_sale(
  'WH-F16-CUTOVER-QA',(c->>'lease_token')::uuid,
  'PAY-F16-CUTOVER-QA','I-F16-CUTOVER-QA',
  '63e812b0-a7e5-49f6-b2dd-c11d2c72af57',
  'P-14V25407JP6850922NLHMDKI',299,'USD',
  '2026-10-13T19:00:00Z');
 IF result<>'inserted_uncredited'
 THEN RAISE EXCEPTION 'Safe replacement failed: %',result; END IF;
END $safe_commit$;
SET LOCAL ROLE postgres;
DO $final$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM supporter_private.paypal_verified_event_inbox
  WHERE provider_event_id='WH-F16-CUTOVER-QA'
  AND processing_state='processed'
  AND retention_hold IS TRUE
  AND f16_lease_token IS NULL
  AND f16_lease_expires_at IS NULL
  AND reconciled_payment_id='PAY-F16-CUTOVER-QA')
 THEN RAISE EXCEPTION 'Cutover did not atomically finalize event'; END IF;
 IF (SELECT COUNT(*) FROM supporter_private.paypal_payment_entries)
 <> (SELECT payments+1 FROM f16_cutover_baseline)
 OR (SELECT COUNT(*) FROM supporter_private.paypal_payment_reversals)
 <> (SELECT reversals FROM f16_cutover_baseline)
 OR (SELECT COUNT(*) FROM supporter_private.paypal_verified_event_inbox)
 <> (SELECT inbox+1 FROM f16_cutover_baseline)
 OR supporter_private.wall_has_verified_entitlement(NULL::uuid) IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Unexpected money/entitlement mutations'; END IF;
END $final$;
ROLLBACK;
SELECT 'PASS F16: atomic ACL replacement, unsafe old paths denied, owner+lease accepted, no entitlement';
