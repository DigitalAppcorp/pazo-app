-- F16 P05 v1 DRAFT metadata proof. Disposable PostgreSQL only.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $audit$
DECLARE t text; role_name text; count_fk integer;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'F16 P05 security checks cannot run outside synthetic lab'; END IF;
 FOREACH t IN ARRAY ARRAY[
  'paypal_terms_acceptances','paypal_activation_schedule_evidence',
  'paypal_first_period_reviews'
 ] LOOP
  IF NOT EXISTS (
   SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='supporter_private' AND c.relname=t
    AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity
    AND pg_get_userbyid(c.relowner)='postgres'
  ) THEN RAISE EXCEPTION 'F16 P05 no forced RLS or unexpected owner for %',t; END IF;
  IF EXISTS(SELECT 1 FROM pg_policies
   WHERE schemaname='supporter_private' AND tablename=t)
  THEN RAISE EXCEPTION 'F16 P05 unexpected direct RLS policy on %',t; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(role_name,format('supporter_private.%I',t),'SELECT')
    OR has_table_privilege(role_name,format('supporter_private.%I',t),'INSERT')
    OR has_table_privilege(role_name,format('supporter_private.%I',t),'UPDATE')
    OR has_table_privilege(role_name,format('supporter_private.%I',t),'DELETE')
   THEN RAISE EXCEPTION 'F16 P05 table % directly exposed to %',t,role_name; END IF;
  END LOOP;
  IF NOT EXISTS (
   SELECT 1 FROM pg_constraint c JOIN pg_class tbl ON tbl.oid=c.conrelid
   JOIN pg_namespace n ON n.oid=tbl.relnamespace
   WHERE n.nspname='supporter_private' AND tbl.relname=t
    AND c.contype='f'
  ) THEN RAISE EXCEPTION 'F16 P05 missing FK on %',t; END IF;
 END LOOP;

 IF NOT EXISTS (SELECT 1 FROM pg_constraint c
 JOIN pg_class t ON t.oid=c.conrelid
 WHERE t.oid='supporter_private.paypal_first_period_reviews'::regclass
 AND c.contype='u' AND c.conname='paypal_first_period_reviews_external_payment_id_key')
 THEN RAISE EXCEPTION 'F16 P05 payment unique ownership absent'; END IF;

 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
  WHERE t.oid='supporter_private.paypal_first_period_reviews'::regclass
   AND c.contype='f' AND c.conname='p05_sale_matches_subscription_fk'
 ) OR NOT EXISTS (
  SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
  WHERE t.oid='supporter_private.paypal_first_period_reviews'::regclass
   AND c.contype='f' AND c.conname='p05_sale_event_type_fk'
 ) OR NOT EXISTS (
  SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
  WHERE t.oid='supporter_private.paypal_activation_schedule_evidence'::regclass
   AND c.contype='f' AND c.conname='p05_activation_event_type_fk'
 ) THEN RAISE EXCEPTION 'F16 P05 composite identity constraints missing'; END IF;

 IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='supporter_private'
   AND table_name IN ('paypal_terms_acceptances',
    'paypal_activation_schedule_evidence','paypal_first_period_reviews')
   AND column_name IN ('paid_through','paidThrough','is_paid',
     'is_approved','may_grant_benefits','approved_at','entitlement_expires_at')
 ) THEN RAISE EXCEPTION 'F16 P05 unauthorized benefit fields'; END IF;

 IF to_regprocedure('public.f16_p05_grant_benefits(text)') IS NOT NULL
 THEN RAISE EXCEPTION 'F16 P05 benefit RPC unexpectedly exists'; END IF;
END;
$audit$;
ROLLBACK;
