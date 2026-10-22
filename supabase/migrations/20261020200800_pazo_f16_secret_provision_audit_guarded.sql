-- F16 ADMIN LIVE EDGE: PO-approved; pending hostile-role/CI review (NOT HOSTED).
-- Inert DDL: never handles credentials, makes provider calls, or alters Live.
-- Domain-independent, server-only reservation and immutable audit.
-- Does not access secrets, call PayPal, or modify payment switches.
BEGIN;
DO $f16provisionpre$
BEGIN
 IF to_regclass('admin_private.pazo_paypal_secret_provision_attempts') IS NOT NULL
  OR to_regprocedure('public.pazo_f16_live_service_provision_generation_read(uuid,bigint)') IS NOT NULL
  OR to_regprocedure('public.pazo_f16_live_service_provision_reserve(uuid,bigint,bigint,text,text,text)') IS NOT NULL
  OR to_regprocedure('public.pazo_f16_live_service_provision_finish(uuid,bigint,uuid,text)') IS NOT NULL
  OR to_regclass('admin_private.pazo_paypal_merchant_generations') IS NULL
  OR to_regclass('admin_private.pazo_paypal_new_checkout_switch') IS NULL
  OR to_regclass('admin_private.admin_grants') IS NULL
  OR (select count(*) from admin_private.pazo_paypal_new_checkout_switch
       where singleton and environment='sandbox' and live_enabled=false
        and kill_switch=true and active_generation is null)<>1
  -- Historical Live merchant rows, if any, are permitted: this migration
  -- creates only a new audit table/RPCs and changes no merchant metadata.
 THEN RAISE EXCEPTION 'PAZO F16 audit install preflight failed' USING ERRCODE='42501';
 END IF;
END $f16provisionpre$;
CREATE TABLE admin_private.pazo_paypal_secret_provision_attempts (
 attempt_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 merchant_generation bigint NOT NULL UNIQUE
  REFERENCES admin_private.pazo_paypal_merchant_generations(generation),
 actor_id uuid NOT NULL, -- immutable audit survives administrator grant removal
 expected_revision bigint NOT NULL CHECK(expected_revision>=0),
 plan_id text NOT NULL CHECK(plan_id ~ '^P-[A-Z0-9]{12,40}$'),
 webhook_id text NOT NULL CHECK(webhook_id ~ '^[A-Za-z0-9_-]{8,100}$'),
 merchant_fingerprint_sha256 text NOT NULL CHECK(merchant_fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','confirmed','review_required')),
 result_code text CHECK(result_code IS NULL OR result_code IN (
  'generation_secret_names_confirmed','secret_preflight_unavailable',
  'generation_secrets_already_present','secret_write_outcome_unknown_manual_review',
  'provisioning_audit_unavailable_manual_review')),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 completed_at timestamptz,
 CONSTRAINT pazo_f16_secret_attempt_state_consistency CHECK(
  (state='reserved' AND result_code IS NULL AND completed_at IS NULL) OR
  (state<>'reserved' AND result_code IS NOT NULL AND completed_at IS NOT NULL))
);
ALTER TABLE admin_private.pazo_paypal_secret_provision_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_private.pazo_paypal_secret_provision_attempts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON admin_private.pazo_paypal_secret_provision_attempts
 FROM PUBLIC,anon,authenticated,service_role;

-- Read only stable, admin-authorized merchant metadata; never provider keys.
CREATE FUNCTION public.pazo_f16_live_service_provision_generation_read(
 p_actor uuid,p_generation bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $pazo$
DECLARE v jsonb;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
  OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor)
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'generation',g.generation,'environment',g.environment,
  'credentialSource',g.credential_source,'isRetired',(g.retired_at IS NOT NULL),
  'verifiedAdminId',p_actor,'revision',s.revision,
  'liveCheckoutEnabled',s.live_enabled,'killSwitch',s.kill_switch,
  'planId',g.plan_id,'webhookId',g.webhook_id,
  'merchantFingerprint',g.merchant_fingerprint_sha256
 ) INTO v
 FROM admin_private.pazo_paypal_merchant_generations g
 CROSS JOIN admin_private.pazo_paypal_new_checkout_switch s
 WHERE g.generation=p_generation AND s.singleton
  AND g.environment='live' AND g.credential_source='edge_secrets'
  AND s.environment='sandbox' AND NOT s.live_enabled AND s.kill_switch
  AND s.active_generation IS NULL;
 RETURN v;
END $pazo$;

-- Serializes by unique merchant generation across all Edge isolates.
-- An uncertain result is never auto-retried on the same generation.
-- Lock the selector and merchant row before reading+reserving metadata.
CREATE FUNCTION public.pazo_f16_live_service_provision_reserve(
 p_actor uuid,p_generation bigint,p_expected_revision bigint,
 p_plan text,p_webhook text,p_fingerprint text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $pazo$
DECLARE attempt uuid; current_row jsonb;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 -- The SELECT ... FOR UPDATE locks are held through the insert/commit, so
 -- concurrent admin switch/generation rotation cannot race this reservation.
 PERFORM 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE singleton AND environment='sandbox' AND live_enabled=false
   AND kill_switch=true AND active_generation IS NULL FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('reserved',false); END IF;
 PERFORM 1 FROM admin_private.pazo_paypal_merchant_generations
  WHERE generation=p_generation AND environment='live' AND retired_at IS NULL
   AND credential_source='edge_secrets' FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('reserved',false); END IF;
 SELECT public.pazo_f16_live_service_provision_generation_read(p_actor,p_generation)
 INTO current_row;
 IF current_row IS NULL OR current_row->>'isRetired' IS DISTINCT FROM 'false'
  OR current_row->>'planId' IS DISTINCT FROM p_plan
  OR current_row->>'webhookId' IS DISTINCT FROM p_webhook
  OR current_row->>'merchantFingerprint' IS DISTINCT FROM p_fingerprint
  OR (current_row->>'revision')::bigint IS DISTINCT FROM p_expected_revision
 THEN RETURN pg_catalog.jsonb_build_object('reserved',false); END IF;
 INSERT INTO admin_private.pazo_paypal_secret_provision_attempts(
  merchant_generation,actor_id,expected_revision,plan_id,webhook_id,
  merchant_fingerprint_sha256)
 VALUES (p_generation,p_actor,p_expected_revision,p_plan,p_webhook,p_fingerprint)
 ON CONFLICT (merchant_generation) DO NOTHING
 RETURNING attempt_id INTO attempt;
 RETURN pg_catalog.jsonb_build_object('reserved',attempt IS NOT NULL,'attemptId',attempt);
END $pazo$;

-- Exactly-once outcome and immutable nonsecret audit. Never accepts secrets.
CREATE FUNCTION public.pazo_f16_live_service_provision_finish(
 p_actor uuid,p_generation bigint,p_attempt uuid,p_result text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $pazo$
DECLARE changed integer;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
  OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor)
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_result NOT IN ('generation_secret_names_confirmed','secret_preflight_unavailable',
  'generation_secrets_already_present','secret_write_outcome_unknown_manual_review',
  'provisioning_audit_unavailable_manual_review') THEN RETURN false; END IF;
 UPDATE admin_private.pazo_paypal_secret_provision_attempts
 SET state=CASE WHEN p_result='generation_secret_names_confirmed'
             THEN 'confirmed' ELSE 'review_required' END,
  result_code=p_result, completed_at=pg_catalog.clock_timestamp()
 WHERE actor_id=p_actor AND merchant_generation=p_generation AND attempt_id=p_attempt
  AND state='reserved';
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed=1;
END $pazo$;

ALTER FUNCTION public.pazo_f16_live_service_provision_generation_read(uuid,bigint) OWNER TO postgres;
ALTER FUNCTION public.pazo_f16_live_service_provision_reserve(uuid,bigint,bigint,text,text,text) OWNER TO postgres;
ALTER FUNCTION public.pazo_f16_live_service_provision_finish(uuid,bigint,uuid,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_provision_generation_read(uuid,bigint) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_provision_reserve(uuid,bigint,bigint,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_provision_finish(uuid,bigint,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_provision_generation_read(uuid,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_provision_reserve(uuid,bigint,bigint,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_provision_finish(uuid,bigint,uuid,text) TO service_role;

DO $f16provisionpost$
DECLARE v record;
BEGIN
 IF to_regclass('admin_private.pazo_paypal_secret_provision_attempts') IS NULL
  OR NOT EXISTS (
   SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='admin_private' AND c.relname='pazo_paypal_secret_provision_attempts'
    AND c.relrowsecurity AND c.relforcerowsecurity)
  OR pg_catalog.has_table_privilege('anon',
    'admin_private.pazo_paypal_secret_provision_attempts','SELECT')
  OR pg_catalog.has_table_privilege('authenticated',
    'admin_private.pazo_paypal_secret_provision_attempts','INSERT')
  OR pg_catalog.has_table_privilege('service_role',
    'admin_private.pazo_paypal_secret_provision_attempts','UPDATE')
  OR (select count(*) from admin_private.pazo_paypal_secret_provision_attempts)<>0
  OR (select count(*) from admin_private.pazo_paypal_new_checkout_switch
       where singleton and environment='sandbox' and live_enabled=false
        and kill_switch=true and active_generation is null)<>1
 THEN RAISE EXCEPTION 'PAZO F16 audit install postflight failed' USING ERRCODE='42501';
 END IF;
 FOR v IN SELECT p.oid FROM pg_catalog.pg_proc p
   JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN (
    'pazo_f16_live_service_provision_generation_read',
    'pazo_f16_live_service_provision_reserve',
    'pazo_f16_live_service_provision_finish')
 LOOP
  IF NOT pg_catalog.has_function_privilege('service_role',v.oid,'EXECUTE')
   OR pg_catalog.has_function_privilege('anon',v.oid,'EXECUTE')
   OR pg_catalog.has_function_privilege('authenticated',v.oid,'EXECUTE')
  THEN RAISE EXCEPTION 'F16 audit RPC ACL postflight failed' USING ERRCODE='42501'; END IF;
 END LOOP;
 IF (select count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
     'pazo_f16_live_service_provision_generation_read',
     'pazo_f16_live_service_provision_reserve',
     'pazo_f16_live_service_provision_finish'))<>3
 THEN RAISE EXCEPTION 'F16 audit RPC count mismatch'; END IF;
END $f16provisionpost$;

COMMIT;
