-- PAZO F17 · PO-authorized canonical Live return-origin cutover.
-- Operator-proven HTTPS/PWA callbacks: GitHub CI run 39856221792; release
-- code dpl_8uDfwTYrqYqGDfjeFwWg3W4KXTxT at https://pazo-app.vercel.app.
-- NO PayPal charge; NO public release; NO credential rotation; NO new plan.
-- Requires the exact F16 v1 PostgreSQL functions and empty financial ledger.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='95s';

-- Serialize the financial control and merchant configuration while swapping
-- all five origin guards together. Readers see either old or new, never half.
LOCK TABLE admin_private.pazo_live_release_control,
 admin_private.pazo_paypal_new_checkout_switch,
 admin_private.paypal_gateway_settings,
 admin_private.pazo_live_release_artifact IN SHARE ROW EXCLUSIVE MODE;

DO $canonical$
DECLARE
 rec record; current_def text;
 v_control admin_private.pazo_live_release_control%ROWTYPE;
 v_switch admin_private.pazo_paypal_new_checkout_switch%ROWTYPE;
 v_settings admin_private.paypal_gateway_settings%ROWTYPE;
 v_artifact admin_private.pazo_live_release_artifact%ROWTYPE;
 v_old constant text:='https://pazo-app-t83r.vercel.app';
 v_new constant text:='https://pazo-app.vercel.app';
 v_proof constant text:='pazo_live_origin_v2|2026-10-22|dpl_8uDfwTYrqYqGDfjeFwWg3W4KXTxT|1b2340523b80234a41a0a6ffac489bc32f5a2937|ci_39853006863|f17_39853006970|canonical_http_39856221792|https://pazo-app.vercel.app';
BEGIN
 SELECT * INTO STRICT v_control FROM admin_private.pazo_live_release_control WHERE singleton;
 SELECT * INTO STRICT v_switch FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton;
 SELECT * INTO STRICT v_settings FROM admin_private.paypal_gateway_settings WHERE environment='live';
 SELECT * INTO STRICT v_artifact FROM admin_private.pazo_live_release_artifact WHERE singleton;
 IF v_control.mode<>'canary' OR v_control.revision<>1
  OR v_control.canary_owner IS NULL OR v_control.merchant_generation<>1
  OR v_switch.revision<>1 OR v_switch.active_generation<>1
  OR v_switch.environment<>'live' OR NOT v_switch.live_enabled OR v_switch.kill_switch
  OR v_settings.return_origin<>v_old OR v_settings.price_minor<>299
  OR v_settings.currency<>'USD' OR v_settings.interval_unit<>'MONTH'
  OR v_settings.validation_status<>'valid' OR v_settings.validated_at IS NULL
  OR v_settings.client_id_vault IS NULL OR v_settings.client_secret_vault IS NULL
  OR v_artifact.return_origin<>v_old OR v_artifact.verified_at IS NULL
  OR NOT admin_private.pazo_live_artifact_ready()
  OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=v_control.canary_owner)
  OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents)
  OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods)
  OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox)
  OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_signed_receipts)
  OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_cancel_claims)
  OR EXISTS(SELECT 1 FROM admin_private.pazo_app_maintenance WHERE singleton AND enabled)
 THEN RAISE EXCEPTION 'PAZO Live origin migration guard failed; NO CHANGES'; END IF;
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261022220000')
 THEN RAISE EXCEPTION 'PAZO Live origin migration already recorded'; END IF;

 -- Preserve SECURITY DEFINER, original search_path, grants, parameters and
 -- every financial policy; only replace one verified origin literal per function.
 FOR rec IN SELECT * FROM (VALUES
  ('admin_private.pazo_live_artifact_ready()','dddc1be291b270fe31a12f0034b99374'),
  ('public.pazo_f16_live_service_active_route()','f692c52f0ab132ca9b2a4c6b21535440'),
  ('public.pazo_f16_live_service_bootstrap_record_resources(uuid,bigint,text,text)','da39b7076d192915781183daa19f0dcc'),
  ('public.pazo_f16_live_service_release_change(uuid,text,bigint,uuid)','e1cb0cb46b1df33fb24d36d7535d3b11'),
  ('public.pazo_f16_live_service_vault_prepare(uuid,bigint,text,text,text,text)','11979acc942e36e92d017317327051bb')
 ) AS expected(signature,sha) LOOP
  SELECT pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(rec.signature))
    INTO current_def;
  IF current_def IS NULL OR md5(current_def)<>rec.sha
   OR length(current_def)-length(replace(current_def,v_old,''))<>length(v_old)
  THEN RAISE EXCEPTION 'PAZO financial function checksum/origin differs: %',rec.signature; END IF;
  EXECUTE replace(current_def,v_old,v_new);
 END LOOP;

 UPDATE admin_private.paypal_gateway_settings
 SET return_origin=v_new,updated_at=pg_catalog.clock_timestamp(),
     updated_by=v_control.canary_owner
 WHERE environment='live' AND return_origin=v_old;
 IF NOT FOUND THEN RAISE EXCEPTION 'Live gateway origin write conflict'; END IF;
 -- Preserve the strict CHECK constraint, but repin it atomically to
 -- the PO-approved production domain. NOT VALID only avoids rejecting the
 -- existing old-origin row before the same transaction updates it.
 IF (SELECT pg_catalog.pg_get_constraintdef(c.oid,true)
     FROM pg_catalog.pg_constraint c
     WHERE c.conrelid='admin_private.pazo_live_release_artifact'::regclass
       AND c.conname='pazo_live_release_artifact_return_origin_check')
      <> 'CHECK (return_origin = ''https://pazo-app-t83r.vercel.app''::text)'
 THEN RAISE EXCEPTION 'PAZO origin CHECK constraint differs'; END IF;
 EXECUTE 'ALTER TABLE admin_private.pazo_live_release_artifact DROP CONSTRAINT pazo_live_release_artifact_return_origin_check';
 EXECUTE 'ALTER TABLE admin_private.pazo_live_release_artifact ADD CONSTRAINT pazo_live_release_artifact_return_origin_check CHECK (return_origin = ''https://pazo-app.vercel.app'') NOT VALID';
 UPDATE admin_private.pazo_live_release_artifact
 SET return_origin=v_new,
     frontend_commit='1b2340523b80234a41a0a6ffac489bc32f5a2937',
     evidence_sha256=pg_catalog.encode(extensions.digest(v_proof,'sha256'),'hex'),
     verified_at=pg_catalog.statement_timestamp()
 WHERE singleton AND return_origin=v_old;
 IF NOT FOUND THEN RAISE EXCEPTION 'Live artifact write conflict'; END IF;
 EXECUTE 'ALTER TABLE admin_private.pazo_live_release_artifact VALIDATE CONSTRAINT pazo_live_release_artifact_return_origin_check';
 INSERT INTO admin_private.paypal_gateway_change_log(
   environment,actor_id,kind,details)
 VALUES('live',v_control.canary_owner,'validation',
  pg_catalog.jsonb_build_object(
   'scope','canonical_return_origin_migration',
   'method','PO-authorized operator SQL under F17 branch',
   'previous_origin',v_old,'return_origin',v_new,
   'public_domain_http_gate','CI 39856221792: seven HTTP/manifest callbacks PASS',
   'frontend_deployment','dpl_8uDfwTYrqYqGDfjeFwWg3W4KXTxT',
   'actual_financial_sale_verified',false,'charge_attempted',false,
   'public_release_enabled',false,'credentials_rotated',false));
 IF NOT admin_private.pazo_live_artifact_ready()
  OR NOT admin_private.pazo_live_control_admits(v_control.canary_owner,v_control.merchant_generation)
  OR (SELECT return_origin<>v_new OR price_minor<>299 OR validation_status<>'valid'
      FROM admin_private.paypal_gateway_settings WHERE environment='live')
  OR (SELECT mode<>'canary' OR revision<>1
      FROM admin_private.pazo_live_release_control WHERE singleton)
 THEN RAISE EXCEPTION 'PAZO Live origin postflight failed; transaction rolled back'; END IF;
END $canonical$;

-- Place this version in the shared, atomic migration history only after the
-- operator's reversible preflight confirms all assertions.
INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
VALUES ('20261022220000','pazo_live_canonical_origin_guarded',
 ARRAY['F17 PO GO: guarded canonical origin cutover; see versioned SQL']);
COMMIT;
