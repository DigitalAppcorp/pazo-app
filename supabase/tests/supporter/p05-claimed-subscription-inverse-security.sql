-- F16-P05 inverse private lookup: read-only metadata assertions.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $security$
DECLARE f record;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'P05 security checks only in disposable PostgreSQL'; END IF;
 SELECT p.oid,p.prosecdef,p.proconfig,p.provolatile
 INTO f
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public'
   AND p.proname='f16_p05_draft_resolve_claimed_subscription'
   AND p.pronargs=4;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'P05 inverse function absent'; END IF;
 IF NOT f.prosecdef OR NOT ('search_path=""'=ANY(f.proconfig))
 THEN RAISE EXCEPTION 'P05 inverse function not hardened'; END IF;
 IF f.provolatile<>'v' THEN
  RAISE EXCEPTION 'P05 lease-sensitive function must be volatile'; END IF;
 IF NOT has_function_privilege('service_role',f.oid,'EXECUTE')
  OR has_function_privilege('anon',f.oid,'EXECUTE')
  OR has_function_privilege('authenticated',f.oid,'EXECUTE')
 THEN RAISE EXCEPTION 'P05 inverse EXECUTE privileges exposed'; END IF;
 IF has_table_privilege('service_role',
  'supporter_private.paypal_subscription_intents','SELECT')
  OR has_table_privilege('service_role',
  'supporter_private.paypal_verified_event_inbox','SELECT')
  OR has_table_privilege('anon',
  'supporter_private.paypal_subscription_intents','SELECT')
  OR has_table_privilege('authenticated',
  'supporter_private.paypal_subscription_intents','SELECT')
 THEN RAISE EXCEPTION 'P05 private table leaked direct access'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint c
  JOIN pg_class t ON t.oid=c.conrelid
  WHERE t.oid='supporter_private.paypal_subscription_intents'::regclass
   AND c.contype='u' AND
   c.conname='paypal_subscription_intents_external_subscription_id_key')
 THEN RAISE EXCEPTION 'P05 external subscription uniqueness absent'; END IF;
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
   AND p.proname='f16_p05_draft_resolve_claimed_subscription')<>1
 THEN RAISE EXCEPTION 'P05 inverse overloaded function unexpectedly exposed'; END IF;
END
$security$;
ROLLBACK;