-- Administrative metadata only. No secret reads, financial release or writes.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE FUNCTION public.pazo_admin_live_readiness()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE checks jsonb; blockers jsonb:='[]'::jsonb; active boolean; phase text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.pazo_is_admin()
 THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'termsReady',(SELECT count(*)=2 FROM supporter_private.pazo_live_offer_versions
   WHERE terms_version='pazo-supporter-live.beta20261021-v1' AND locale IN('es','en')),
  'ownerRecoverySchemaReady',
   pg_catalog.to_regprocedure('public.pazo_f16_live_service_recovery_finish(uuid,text,bigint,uuid,uuid,text,text)') IS NOT NULL AND
   pg_catalog.to_regprocedure('public.pazo_f16_live_service_terminal_checkout_close(uuid,text,bigint,text,text)') IS NOT NULL AND
   pg_catalog.to_regprocedure('public.pazo_f16_live_service_cancel_finish(uuid,text,bigint,text)') IS NOT NULL,
  'benefitsSchemaReady',EXISTS(SELECT 1 FROM pg_catalog.pg_class c
   WHERE c.oid=pg_catalog.to_regclass('supporter_private.pazo_live_pet_themes')
    AND c.relrowsecurity AND c.relforcerowsecurity),
  'financeSchemaReady',pg_catalog.to_regprocedure('public.pazo_admin_live_finance_summary()') IS NOT NULL,
  -- Schema existence alone cannot certify deployed release logic. Remains
  -- false until the separate controlled-release migration replaces this read.
  'releaseControlsReady',false,
  'credentialsStored',EXISTS(SELECT 1 FROM admin_private.paypal_gateway_settings s
   JOIN admin_private.pazo_paypal_merchant_generations g
    ON g.environment='live' AND g.retired_at IS NULL AND g.credential_source='vault'
     AND g.plan_id=s.plan_id AND g.webhook_id=s.webhook_id
     AND g.client_id_vault=s.client_id_vault AND g.client_secret_vault=s.client_secret_vault
   WHERE s.environment='live' AND s.client_id_vault IS NOT NULL AND s.client_secret_vault IS NOT NULL),
  'providerResourcesVerified',EXISTS(SELECT 1 FROM admin_private.paypal_gateway_settings s
   WHERE s.environment='live' AND s.validation_status='valid' AND s.validated_at IS NOT NULL
    AND s.client_id_vault IS NOT NULL AND s.client_secret_vault IS NOT NULL),
  'workerHealthy',EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control c
   WHERE c.singleton AND c.enabled AND c.expected_build='pazo_live_worker_v2'
    AND c.last_heartbeat_at>=pg_catalog.statement_timestamp()-interval '5 minutes')) INTO checks;
 IF checks->>'termsReady'<>'true' THEN blockers:=blockers||'"terms_unavailable"'::jsonb; END IF;
 IF checks->>'ownerRecoverySchemaReady'<>'true' THEN blockers:=blockers||'"account_backend_unavailable"'::jsonb; END IF;
 IF checks->>'benefitsSchemaReady'<>'true' THEN blockers:=blockers||'"benefits_backend_unavailable"'::jsonb; END IF;
 IF checks->>'financeSchemaReady'<>'true' THEN blockers:=blockers||'"finance_backend_unavailable"'::jsonb; END IF;
 IF checks->>'releaseControlsReady'<>'true' THEN blockers:=blockers||'"controlled_release_pending"'::jsonb; END IF;
 IF checks->>'credentialsStored'<>'true' THEN blockers:=blockers||'"live_credentials_pending"'::jsonb; END IF;
 IF checks->>'providerResourcesVerified'<>'true' THEN blockers:=blockers||'"provider_verification_pending"'::jsonb; END IF;
 IF checks->>'workerHealthy'<>'true' THEN blockers:=blockers||'"private_worker_unavailable"'::jsonb; END IF;
 SELECT COALESCE(bool_or(s.environment='live' AND s.live_enabled AND NOT s.kill_switch),false)
 INTO active FROM admin_private.pazo_paypal_new_checkout_switch s WHERE s.singleton;
 phase:=CASE WHEN active THEN 'active' ELSE 'engineering_pending' END;
 RETURN pg_catalog.jsonb_build_object('source','pazo_live_admin_readiness_v1',
  'asOf',pg_catalog.statement_timestamp(),'phase',phase,'checks',checks,
  'blockers',blockers,'checkoutActive',active,'mayActivate',false,'mayCharge',false);
END $f$;
REVOKE ALL ON FUNCTION public.pazo_admin_live_readiness() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_live_readiness() TO authenticated;
COMMIT;
