-- PAZO F16-P05 inbox claim proposal: security-only assertions.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $check$
DECLARE f record; rolename text;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'P05 metadata tests forbidden outside disposable DB'; END IF;
 FOR f IN SELECT p.oid,p.proname,p.prosecdef,p.proconfig
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN
   ('f16_p05_draft_claim_next_verified_event','f16_p05_draft_read_claimed_event')
 LOOP
  IF NOT f.prosecdef OR
   NOT ('search_path=""'=ANY(f.proconfig))
  THEN RAISE EXCEPTION 'P05 unsafe privileged function %',f.proname; END IF;
  IF NOT has_function_privilege('service_role',f.oid,'EXECUTE')
    OR has_function_privilege('anon',f.oid,'EXECUTE')
    OR has_function_privilege('authenticated',f.oid,'EXECUTE')
  THEN RAISE EXCEPTION 'P05 function % has invalid EXECUTE grants',f.proname; END IF;
 END LOOP;
 IF (SELECT count(*)
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname IN
      ('f16_p05_draft_claim_next_verified_event','f16_p05_draft_read_claimed_event'))<>2
 THEN RAISE EXCEPTION 'P05 privileged functions missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM supporter_private.p05_inbox_worker_gate
  WHERE id=1 AND NOT enabled AND not_before IS NULL)
 THEN RAISE EXCEPTION 'P05 rollout gate must be disabled by default'; END IF;
 FOR rolename IN SELECT unnest(ARRAY['anon','authenticated','service_role']) LOOP
  IF has_table_privilege(rolename,'supporter_private.p05_inbox_worker_gate','SELECT')
   OR has_table_privilege(rolename,'supporter_private.p05_inbox_worker_gate','UPDATE')
   OR has_table_privilege(rolename,'supporter_private.paypal_verified_event_inbox','SELECT')
   OR has_table_privilege(rolename,'supporter_private.paypal_verified_event_inbox','UPDATE')
  THEN RAISE EXCEPTION 'P05 direct table privilege exposed to %',rolename; END IF;
 END LOOP;
 IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='supporter_private' AND c.relname='p05_inbox_worker_gate'
   AND c.relrowsecurity AND c.relforcerowsecurity)
 THEN RAISE EXCEPTION 'P05 rollout control not RLS protected'; END IF;
END
$check$;
ROLLBACK;