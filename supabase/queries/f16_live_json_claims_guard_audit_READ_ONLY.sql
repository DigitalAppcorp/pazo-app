-- PAZO F16: catalog and aggregate state only. No RPC invocation or identity reads.
BEGIN TRANSACTION READ ONLY;
WITH expected(signature,original_md5) AS (VALUES
  ('public.pazo_f16_live_service_active_route()','0a2dfae88a57d2ef9c73b572c37f90bd'),
  ('public.pazo_f16_live_service_binding_read(text)','b100effb2b3fe103294db33b28442897'),
  ('public.pazo_f16_live_service_bootstrap_finalize(uuid,bigint,text,text,text)','c67535bd9b5cf876c483f228718f7f0f'),
  ('public.pazo_f16_live_service_bootstrap_reserve(uuid,text)','4d9445f033ef1409df9bb638aef63a4e'),
  ('public.pazo_f16_live_service_cancel_claim(uuid,text,bigint)','817927d43081d45beb0733e7ac070ddb'),
  ('public.pazo_f16_live_service_checkout_begin(uuid,uuid,bigint,text,text,text)','6f690bab480e0bf2c5c42d9163984371'),
  ('public.pazo_f16_live_service_inbox_claim(bigint,text)','e17ad3cecc6e626ec7528b60fa9add9a'),
  ('public.pazo_f16_live_service_inbox_finish(bigint,text,uuid,text)','3ae08ef5b7b2266cf3c7b579aa4ddc98'),
  ('public.pazo_f16_live_service_paid_period_projection(uuid,timestamp with time zone)','990723811c0f33f1107538b2a0a18df4'),
  ('public.pazo_f16_live_service_provider_claim(uuid,text,uuid,bigint)','25922f086748de1c339157365db7071f'),
  ('public.pazo_f16_live_service_provision_finish(uuid,bigint,uuid,text)','4d1c13c33792f7bcd76046477d116d02'),
  ('public.pazo_f16_live_service_provision_generation_read(uuid,bigint)','339bea1cd17eb22294dff3abc0d2c71c'),
  ('public.pazo_f16_live_service_provision_reserve(uuid,bigint,bigint,text,text,text)','bcf58a69b9109b84790a8c47867c5563'),
  ('public.pazo_f16_live_service_subscription_bind(uuid,text,uuid,bigint,text,text)','bacddcea62100b7b4a9369f02255c3bd'),
  ('public.pazo_f16_live_service_verified_event_queue(uuid,text,text,bigint,text,text)','52a6ab16387fa5685e99c6172a6b3b7b'),
  ('public.pazo_f16_live_service_verified_refund_record(uuid,text,text,bigint,text,text,text,text)','a537dd192a6309fbafc23702cfc85439'),
  ('public.pazo_f16_live_service_verified_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamp with time zone,timestamp with time zone)','02551a930b510a6b098ecc69a7600e4e')
), checks AS (
 SELECT e.signature,
  pg_catalog.md5(p.prosrc)=e.original_md5 AS matches_original,
  pg_catalog.strpos(p.prosrc,'(NULLIF(pg_catalog.current_setting(''request.jwt.claims'',true),'''')::jsonb ->> ''role'')')>0 AND
   pg_catalog.strpos(p.prosrc,'pg_catalog.current_setting(''request.jwt.claim.role'',true)')=0 AND
   pg_catalog.md5(pg_catalog.replace(p.prosrc,'(NULLIF(pg_catalog.current_setting(''request.jwt.claims'',true),'''')::jsonb ->> ''role'')','pg_catalog.current_setting(''request.jwt.claim.role'',true)'))=e.original_md5
   AS matches_only_role_fix,
  p.prosecdef AND p.proconfig=ARRAY['search_path=""']::text[]
   AND pg_catalog.pg_get_userbyid(p.proowner)='postgres' AS protected_definition,
  pg_catalog.has_function_privilege('service_role',e.signature,'EXECUTE')
   AND NOT pg_catalog.has_function_privilege('anon',e.signature,'EXECUTE')
   AND NOT pg_catalog.has_function_privilege('authenticated',e.signature,'EXECUTE')
   AS service_only_acl
 FROM expected e LEFT JOIN pg_catalog.pg_proc p
  ON p.oid=pg_catalog.to_regprocedure(e.signature)
)
SELECT pg_catalog.jsonb_build_object(
 'function_count',(SELECT count(*) FROM checks),
 'original_count',(SELECT count(*) FROM checks WHERE matches_original),
 'corrected_count',(SELECT count(*) FROM checks WHERE matches_only_role_fix),
 'protected_count',(SELECT count(*) FROM checks WHERE protected_definition AND service_only_acl),
 'reservations',(SELECT count(*) FROM admin_private.pazo_paypal_live_bootstrap_reservations),
 'live_generations',(SELECT count(*) FROM admin_private.pazo_paypal_merchant_generations WHERE environment='live'),
 'provision_attempts',(SELECT count(*) FROM admin_private.pazo_paypal_secret_provision_attempts),
 'switch',(SELECT pg_catalog.jsonb_build_object(
  'environment',environment,'live_enabled',live_enabled,'kill_switch',kill_switch,
  'active_generation',active_generation,'revision',revision)
  FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton),
 'functions',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(checks) ORDER BY signature) FROM checks)
) AS json_claims_guard_audit;
COMMIT;
