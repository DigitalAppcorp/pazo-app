-- F16-P05: privilege and metadata assertions; read-only transaction.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $assert$
DECLARE f record; checked integer:=0; r text;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'disposable PostgreSQL only'; END IF;
 FOR f IN
  SELECT p.oid,p.proname,p.prosecdef,p.proconfig,p.pronargs,
   p.provolatile
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN
   ('f16_p05_draft_read_pazo_payment_by_sale',
    'f16_p05_draft_read_bound_intent_for_sale')
 LOOP
  checked:=checked+1;
  IF NOT f.prosecdef OR NOT ('search_path=""'=ANY(f.proconfig))
   OR f.provolatile<>'v'
  THEN RAISE EXCEPTION 'unsafe service RPC: %',f.proname; END IF;
  IF (f.proname='f16_p05_draft_read_pazo_payment_by_sale'
       AND f.pronargs<>1)
   OR (f.proname='f16_p05_draft_read_bound_intent_for_sale'
       AND f.pronargs<>2)
  THEN RAISE EXCEPTION 'unexpected overload/argument scope %',f.proname; END IF;
  IF NOT has_function_privilege('service_role',f.oid,'EXECUTE')
    OR has_function_privilege('anon',f.oid,'EXECUTE')
    OR has_function_privilege('authenticated',f.oid,'EXECUTE')
  THEN RAISE EXCEPTION 'function privilege leak: %',f.proname; END IF;
 END LOOP;
 IF checked<>2 THEN RAISE EXCEPTION 'two service-only readers required'; END IF;
 FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_table_privilege(r,'supporter_private.paypal_payment_entries','SELECT')
   OR has_table_privilege(r,'supporter_private.paypal_subscription_intents','SELECT')
   OR has_table_privilege(r,'supporter_private.paypal_payment_entries','UPDATE')
  THEN RAISE EXCEPTION 'direct ledger table privileges exposed to %',r; END IF;
 END LOOP;
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n
  ON n.oid=c.relnamespace WHERE n.nspname='supporter_private'
  AND c.relname IN ('paypal_payment_entries','paypal_subscription_intents')
  AND c.relrowsecurity AND c.relforcerowsecurity)<>2
 THEN RAISE EXCEPTION 'ledger or intent must FORCE RLS'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint c
  WHERE c.conrelid='supporter_private.paypal_payment_entries'::regclass
  AND c.contype='p')
 THEN RAISE EXCEPTION 'ledger sale ID PK missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint c
  WHERE c.conrelid='supporter_private.paypal_subscription_intents'::regclass
  AND c.contype='u')
 THEN RAISE EXCEPTION 'subscription ID uniqueness absent'; END IF;
END
$assert$;
ROLLBACK;