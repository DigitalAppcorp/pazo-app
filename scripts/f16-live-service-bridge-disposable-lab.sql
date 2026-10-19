-- Synthetic service_role bridge security rehearsal (never deployed here).
\i supabase/migrations/20261019235800_pazo_f16_live_service_binding_readonly_bridge.sql
DO $bridge$
DECLARE x jsonb;
BEGIN
 IF NOT has_function_privilege('service_role',
  'public.pazo_f16_live_service_binding_read(text)','EXECUTE')
 OR has_function_privilege('authenticated',
  'public.pazo_f16_live_service_binding_read(text)','EXECUTE')
 OR has_function_privilege('anon',
  'public.pazo_f16_live_service_binding_read(text)','EXECUTE')
 THEN RAISE EXCEPTION 'Read-only bridge ACL is incorrect'; END IF;
 PERFORM pg_catalog.set_config('request.jwt.claim.role','service_role',true);
 x:=public.pazo_f16_live_service_binding_read('I-LIVE-SYNTHETIC1234');
 IF x->>'ownerId'<>'12345678-1234-4234-8234-123456789abc'
  OR x->>'sourceEnvironment'<>'live' OR
  x->>'merchantGeneration'<>'1' OR x->>'consentVerified'<>'true'
 THEN RAISE EXCEPTION 'Service projection does not match immutable account binding %',x; END IF;
 IF x ? 'client_id_vault' OR x ? 'client_secret_vault' OR
  x ? 'payer_email' OR x ? 'payment_token' OR x ? 'paidThrough'
 THEN RAISE EXCEPTION 'Sensitive financial identity leaked via bridge'; END IF;
 x:=public.pazo_f16_live_service_binding_read('I-UNKNOWN999');
 IF x IS NOT NULL THEN RAISE EXCEPTION 'Unknown subscription leaked data'; END IF;
 PERFORM pg_catalog.set_config('request.jwt.claim.role','authenticated',true);
 x:=public.pazo_f16_live_service_binding_read('I-LIVE-SYNTHETIC1234');
 IF x IS NOT NULL THEN RAISE EXCEPTION 'Spoofed auth environment read private owner'; END IF;
 IF has_table_privilege('service_role',
  'supporter_private.pazo_paypal_live_checkout_intents','SELECT')
 THEN RAISE EXCEPTION 'Service received direct private table SELECT'; END IF;
 RAISE NOTICE 'F16_LIVE_PRIVATE_BINDING_BRIDGE_SERVICE_ONLY_PG17_PASS';
END $bridge$;
