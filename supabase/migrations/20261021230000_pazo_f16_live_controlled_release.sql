-- P4: server-only release state machine. Installing does NOT enable checkout.
-- Deployment/HTTPS certification is operator-only; a fresh admin+TOTP Edge
-- must separately request canary/public/stop. Never called by credential save.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $preflight$ BEGIN
 IF EXISTS(SELECT 1 FROM (VALUES
   ('public.pazo_f16_live_service_checkout_begin(uuid,uuid,bigint,text,text,text)','fd42a59301cfa055c54e4e08b2adf1fe'),
   ('public.pazo_f16_live_service_provider_claim_with_origin(uuid,text,uuid,bigint,text)','2acdf5a791633b87acbcbf9bcf663a10'),
   ('public.pazo_f16_live_service_recovery_claim(uuid,text)','214d19f477608fb07b2030767802d9f4')
  ) expected(signature,source_md5)
  LEFT JOIN pg_catalog.pg_proc p ON p.oid=pg_catalog.to_regprocedure(expected.signature)
  WHERE p.oid IS NULL OR pg_catalog.md5(pg_catalog.replace(p.prosrc,E'\r',''))<>expected.source_md5)
 THEN RAISE EXCEPTION 'controlled release owner bridge source drift'; END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE singleton AND NOT live_enabled AND kill_switch AND active_generation IS NULL)
  OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods)
  OR to_regprocedure('public.pazo_admin_live_readiness()') IS NULL
 THEN RAISE EXCEPTION 'controlled release requires the audited OFF baseline'; END IF;
END $preflight$;

CREATE TABLE IF NOT EXISTS admin_private.pazo_live_release_artifact(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 frontend_commit text NOT NULL CHECK(frontend_commit ~ '^[a-f0-9]{40}$'),
 checkout_build text NOT NULL CHECK(checkout_build='pazo_live_checkout_controlled_v1'),
 webhook_build text NOT NULL CHECK(webhook_build='pazo_live_webhook_controlled_v1'),
 control_build text NOT NULL CHECK(control_build='pazo_live_control_v1'),
 worker_build text NOT NULL CHECK(worker_build='pazo_live_worker_v2'),
 return_origin text NOT NULL CHECK(return_origin='https://pazo-app-t83r.vercel.app'),
 evidence_sha256 text NOT NULL CHECK(evidence_sha256 ~ '^[a-f0-9]{64}$'),
 verified_at timestamptz NOT NULL
);
-- Deliberately NO initial artifact: schema presence is not deployment proof.
CREATE TABLE IF NOT EXISTS admin_private.pazo_live_release_control(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 mode text NOT NULL DEFAULT 'off' CHECK(mode IN('off','canary','public')),
 revision bigint NOT NULL CHECK(revision>=0),
 merchant_generation bigint REFERENCES admin_private.pazo_paypal_merchant_generations(generation),
 canary_owner uuid,
 canary_started_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(mode='off' OR (merchant_generation IS NOT NULL AND canary_owner IS NOT NULL AND canary_started_at IS NOT NULL))
);
INSERT INTO admin_private.pazo_live_release_control(singleton,revision)
 SELECT true,revision FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton ON CONFLICT(singleton) DO NOTHING;
CREATE TABLE IF NOT EXISTS admin_private.pazo_live_release_requests(
 request_id uuid PRIMARY KEY,
 actor_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN('canary','public','stop')),
 from_revision bigint NOT NULL,
 to_revision bigint NOT NULL CHECK(to_revision=from_revision+1),
 happened_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE admin_private.pazo_live_release_artifact ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_private.pazo_live_release_artifact FORCE ROW LEVEL SECURITY;
ALTER TABLE admin_private.pazo_live_release_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_private.pazo_live_release_control FORCE ROW LEVEL SECURITY;
ALTER TABLE admin_private.pazo_live_release_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_private.pazo_live_release_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON admin_private.pazo_live_release_artifact,
 admin_private.pazo_live_release_control,admin_private.pazo_live_release_requests
 FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION admin_private.pazo_live_artifact_ready()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $f$
 SELECT EXISTS(SELECT 1 FROM admin_private.pazo_live_release_artifact
  WHERE singleton AND verified_at<=pg_catalog.statement_timestamp()
   AND checkout_build='pazo_live_checkout_controlled_v1'
   AND webhook_build='pazo_live_webhook_controlled_v1'
   AND control_build='pazo_live_control_v1' AND worker_build='pazo_live_worker_v2'
   AND return_origin='https://pazo-app-t83r.vercel.app');
$f$;
CREATE OR REPLACE FUNCTION admin_private.pazo_live_control_admits(p_owner uuid,p_generation bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $f$
 SELECT p_owner IS NOT NULL AND admin_private.pazo_live_artifact_ready() AND EXISTS(
  SELECT 1 FROM admin_private.pazo_live_release_control c
  JOIN admin_private.pazo_paypal_new_checkout_switch s ON s.singleton AND s.revision=c.revision
  JOIN supporter_private.pazo_paypal_live_worker_control w ON w.singleton
  WHERE c.singleton AND c.mode IN('canary','public') AND c.merchant_generation=p_generation
   AND (c.mode='public' OR c.canary_owner=p_owner)
   AND s.environment='live' AND s.live_enabled AND NOT s.kill_switch
   AND s.active_generation=c.merchant_generation AND w.enabled AND w.processing_enabled
   AND w.expected_build='pazo_live_worker_v2'
   AND w.last_heartbeat_at BETWEEN pg_catalog.statement_timestamp()-interval '5 minutes' AND pg_catalog.statement_timestamp());
$f$;
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_release_admit(p_owner uuid,p_generation bigint)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 IF (NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 RETURN COALESCE(admin_private.pazo_live_control_admits(p_owner,p_generation),false);
END $f$;
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_release_runtime(p_component text,p_build text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 IF (NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 -- Webhook remains available for ORIGINAL historical generations after stop.
 -- A valid signature and original binding are still required by its pipeline.
 RETURN admin_private.pazo_live_artifact_ready() AND COALESCE(
  (p_component='checkout' AND p_build='pazo_live_checkout_controlled_v1') OR
  (p_component='webhook' AND p_build='pazo_live_webhook_controlled_v1') OR
  (p_component='control' AND p_build='pazo_live_control_v1'),false);
END $f$;

-- Replace the staged hard constraints with a coherent state invariant. There
-- are still NO direct writes for authenticated/service_role on either table.
ALTER TABLE admin_private.pazo_paypal_new_checkout_switch
 DROP CONSTRAINT IF EXISTS pazo_paypal_new_checkout_switch_environment_check,
 DROP CONSTRAINT IF EXISTS pazo_paypal_new_checkout_switch_live_enabled_check,
 DROP CONSTRAINT IF EXISTS pazo_paypal_new_checkout_switch_kill_switch_check,
 DROP CONSTRAINT IF EXISTS pazo_paypal_off_switch_generation,
 ADD CONSTRAINT pazo_paypal_controlled_switch_shape CHECK(
  (environment='sandbox' AND NOT live_enabled AND kill_switch AND active_generation IS NULL) OR
  (environment='live' AND live_enabled AND NOT kill_switch AND active_generation IS NOT NULL));
ALTER TABLE admin_private.paypal_gateway_runtime
 DROP CONSTRAINT IF EXISTS paypal_gateway_runtime_active_environment_check,
 DROP CONSTRAINT IF EXISTS paypal_gateway_runtime_live_checkout_enabled_check,
 ADD CONSTRAINT pazo_paypal_controlled_runtime_shape CHECK(
  (active_environment='sandbox' AND NOT live_checkout_enabled) OR
  (active_environment='live' AND live_checkout_enabled));
CREATE OR REPLACE FUNCTION admin_private.pazo_live_switch_matches_control()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM admin_private.pazo_live_release_control c
  WHERE c.singleton AND c.revision=NEW.revision AND
   ((c.mode='off' AND NOT NEW.live_enabled AND NEW.kill_switch AND NEW.active_generation IS NULL) OR
    (c.mode IN('canary','public') AND NEW.live_enabled AND NOT NEW.kill_switch
     AND NEW.active_generation=c.merchant_generation AND admin_private.pazo_live_artifact_ready())))
 THEN RAISE EXCEPTION 'release state mismatch' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER pazo_live_switch_matches_control BEFORE UPDATE ON admin_private.pazo_paypal_new_checkout_switch
 FOR EACH ROW EXECUTE FUNCTION admin_private.pazo_live_switch_matches_control();

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_release_change(
 p_actor uuid,p_action text,p_expected_revision bigint,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $f$
DECLARE c admin_private.pazo_live_release_control%ROWTYPE;
 s admin_private.pazo_paypal_new_checkout_switch%ROWTYPE;
 previous admin_private.pazo_live_release_requests%ROWTYPE;
 g admin_private.pazo_paypal_merchant_generations%ROWTYPE;
 new_revision bigint;
BEGIN
 IF (NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
  OR p_actor IS NULL OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor)
 THEN RAISE EXCEPTION 'service verified administrator required' USING ERRCODE='42501'; END IF;
 IF p_action IS NULL OR p_action NOT IN('canary','public','stop') OR p_request IS NULL
  OR p_expected_revision IS NULL OR p_expected_revision<0
 THEN RETURN jsonb_build_object('code','invalid_release_request'); END IF;
 SELECT * INTO c FROM admin_private.pazo_live_release_control WHERE singleton FOR UPDATE;
 SELECT * INTO s FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton FOR UPDATE;
 IF c.revision IS DISTINCT FROM s.revision THEN RETURN jsonb_build_object('code','release_state_unavailable'); END IF;
 SELECT * INTO previous FROM admin_private.pazo_live_release_requests WHERE request_id=p_request;
 IF FOUND THEN
  IF previous.actor_id<>p_actor OR previous.action<>p_action OR previous.from_revision<>p_expected_revision
  THEN RETURN jsonb_build_object('code','release_request_conflict'); END IF;
  -- Returning current state instead of an old success prevents a timed-out
  -- activation retry from claiming that a subsequently stopped route is active.
  RETURN jsonb_build_object('code','release_request_already_recorded','mode',c.mode,'revision',c.revision);
 END IF;
 IF c.revision<>p_expected_revision THEN RETURN jsonb_build_object('code','release_revision_changed'); END IF;
 IF p_action='stop' AND c.mode='off'
 THEN RETURN jsonb_build_object('code','new_checkout_already_stopped','mode','off','revision',c.revision); END IF;
 IF p_action<>'stop' THEN
  IF NOT admin_private.pazo_live_artifact_ready()
  THEN RETURN jsonb_build_object('code','release_engineering_pending'); END IF;
  -- A normal credential save validates original resources and stores immutable
  -- Vault references. A draft flag or a plan ID alone is not sufficient.
  SELECT generation.* INTO g FROM admin_private.pazo_paypal_merchant_generations generation
   JOIN admin_private.paypal_gateway_settings settings ON settings.environment='live'
    AND generation.plan_id=settings.plan_id AND generation.webhook_id=settings.webhook_id
    AND generation.client_id_vault=settings.client_id_vault AND generation.client_secret_vault=settings.client_secret_vault
   WHERE generation.environment='live' AND generation.credential_source='vault' AND generation.retired_at IS NULL
    AND settings.validation_status='valid' AND settings.validated_at IS NOT NULL
    AND settings.price_minor=299 AND settings.currency='USD' AND settings.interval_unit='MONTH'
    AND settings.return_origin='https://pazo-app-t83r.vercel.app';
  IF NOT FOUND THEN RETURN jsonb_build_object('code','release_credentials_unverified'); END IF;
  IF NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_live_bootstrap_reservations r
   WHERE r.generation=g.generation AND r.actor_id=p_actor AND r.plan_id=g.plan_id AND r.state='finalized')
  THEN RETURN jsonb_build_object('code','original_operator_required'); END IF;
  IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control w
   WHERE w.singleton AND w.enabled AND w.expected_build='pazo_live_worker_v2'
    AND w.last_heartbeat_at BETWEEN statement_timestamp()-interval '5 minutes' AND statement_timestamp())
  THEN RETURN jsonb_build_object('code','release_worker_unavailable'); END IF;
  IF (SELECT count(*) FROM supporter_private.pazo_live_offer_versions
   WHERE terms_version='pazo-supporter-live.beta20261021-v1' AND locale IN('es','en'))<>2
  THEN RETURN jsonb_build_object('code','release_terms_unavailable'); END IF;
  IF p_action='canary' AND c.mode<>'off'
  THEN RETURN jsonb_build_object('code','release_stop_before_new_canary'); END IF;
  IF p_action='public' THEN
   IF c.mode<>'canary' OR c.canary_owner<>p_actor OR c.merchant_generation<>g.generation
   THEN RETURN jsonb_build_object('code','release_canary_required'); END IF;
   -- These rows are written ONLY by independent original-generation merchant
   -- reads + signed durable inbox reconciliation and cancellation GET proof.
   IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p
    JOIN supporter_private.pazo_paypal_live_checkout_intents i ON i.intent_id=p.intent_id AND i.merchant_generation=p.merchant_generation
    JOIN supporter_private.pazo_paypal_live_event_inbox e ON e.merchant_generation=p.merchant_generation
     AND e.provider_event_id=p.provider_event_id AND e.event_type='PAYMENT.SALE.COMPLETED' AND e.linked_intent_id=p.intent_id
    JOIN supporter_private.pazo_paypal_live_signed_receipts receipt ON receipt.merchant_generation=p.merchant_generation
     AND receipt.provider_event_id=p.provider_event_id AND receipt.event_type='PAYMENT.SALE.COMPLETED'
     AND receipt.subject_id=p.sale_id AND receipt.subscription_id=i.provider_subscription_id
     AND receipt.signature_webhook_id=g.webhook_id AND receipt.proof_source='paypal_live_postback_success'
    JOIN supporter_private.pazo_paypal_live_cancel_claims cancel ON cancel.intent_id=i.intent_id
     AND cancel.merchant_generation=i.merchant_generation AND cancel.state='confirmed' AND cancel.provider_confirmed_at IS NOT NULL
    JOIN supporter_private.pazo_live_dispute_monitors monitor ON monitor.sale_id=p.sale_id
     AND monitor.ever_clear AND monitor.last_result='clear' AND monitor.next_check_at>=clock_timestamp()
    WHERE i.owner_id=c.canary_owner AND i.merchant_generation=g.generation
     AND i.created_at>=c.canary_started_at AND p.merchant_verified_at>=c.canary_started_at
     AND p.amount_minor=299 AND p.currency='USD' AND e.processing_state='processed'
     AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h WHERE h.sale_id=p.sale_id AND h.released_at IS NULL))
   THEN RETURN jsonb_build_object('code','release_canary_evidence_pending'); END IF;
   IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox
    WHERE merchant_generation=g.generation AND processing_state IN('pending','processing','held'))
   THEN RETURN jsonb_build_object('code','release_reconciliation_pending'); END IF;
  END IF;
 END IF;
 new_revision:=c.revision+1;
 UPDATE admin_private.pazo_live_release_control SET mode=CASE WHEN p_action='stop' THEN 'off' ELSE p_action END,
  revision=new_revision,merchant_generation=CASE WHEN p_action='stop' THEN c.merchant_generation ELSE g.generation END,
  canary_owner=CASE WHEN p_action='canary' THEN p_actor ELSE c.canary_owner END,
  canary_started_at=CASE WHEN p_action='canary' AND (c.canary_started_at IS NULL
   OR c.canary_owner IS DISTINCT FROM p_actor OR c.merchant_generation IS DISTINCT FROM g.generation)
   THEN clock_timestamp() ELSE c.canary_started_at END,
  updated_at=clock_timestamp() WHERE singleton;
 UPDATE admin_private.pazo_paypal_new_checkout_switch SET
  environment=CASE WHEN p_action='stop' THEN 'sandbox' ELSE 'live' END,
  live_enabled=p_action<>'stop',kill_switch=p_action='stop',
  active_generation=CASE WHEN p_action='stop' THEN NULL ELSE g.generation END,
  revision=new_revision,updated_by=p_actor,updated_at=clock_timestamp() WHERE singleton;
 UPDATE admin_private.paypal_gateway_runtime SET active_environment=CASE WHEN p_action='stop' THEN 'sandbox' ELSE 'live' END,
  live_checkout_enabled=p_action<>'stop' WHERE singleton;
 -- Stopping new checkout MUST keep historical events/cancellations working.
 IF p_action<>'stop' THEN UPDATE supporter_private.pazo_paypal_live_worker_control SET processing_enabled=true WHERE singleton; END IF;
 INSERT INTO admin_private.pazo_live_release_requests(request_id,actor_id,action,from_revision,to_revision)
 VALUES(p_request,p_actor,p_action,c.revision,new_revision);
 INSERT INTO admin_private.pazo_paypal_switch_audit(actor_id,from_revision,to_revision,attempted_mode,outcome,evidence_hash)
 VALUES(p_actor,c.revision,new_revision,CASE WHEN p_action='stop' THEN 'stop' ELSE 'live' END,
  CASE WHEN p_action='stop' THEN 'rolled_back' ELSE 'approved' END,
  COALESCE((SELECT evidence_sha256 FROM admin_private.pazo_live_release_artifact WHERE singleton),repeat('0',64)));
 RETURN jsonb_build_object('code','release_state_updated','mode',CASE WHEN p_action='stop' THEN 'off' ELSE p_action END,'revision',new_revision);
END $f$;

CREATE OR REPLACE FUNCTION public.pazo_admin_live_release_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $f$
DECLARE result jsonb; preparation jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.pazo_is_admin()
 THEN RAISE EXCEPTION 'administrator required' USING ERRCODE='42501'; END IF;
 preparation:=public.pazo_admin_live_readiness();
 SELECT jsonb_build_object('source','pazo_live_release_status_v1','mode',c.mode,'revision',c.revision,
  'engineeringVerified',admin_private.pazo_live_artifact_ready(),
  'preparationReady',jsonb_array_length(preparation->'blockers')=0,
  'originalOperator',EXISTS(SELECT 1 FROM admin_private.pazo_paypal_live_bootstrap_reservations r
   WHERE r.actor_id=auth.uid() AND r.state='finalized' AND EXISTS(SELECT 1 FROM admin_private.pazo_paypal_merchant_generations g
    WHERE g.generation=r.generation AND g.environment='live' AND g.retired_at IS NULL)),
  'mayCharge',false,'asOf',statement_timestamp()) INTO result
 FROM admin_private.pazo_live_release_control c WHERE singleton;
 RETURN result;
END $f$;
REVOKE ALL ON FUNCTION admin_private.pazo_live_artifact_ready(),admin_private.pazo_live_control_admits(uuid,bigint),
 admin_private.pazo_live_switch_matches_control() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_release_admit(uuid,bigint),
 public.pazo_f16_live_service_release_runtime(text,text),
 public.pazo_f16_live_service_release_change(uuid,text,bigint,uuid),
 public.pazo_admin_live_release_status() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_release_admit(uuid,bigint),
 public.pazo_f16_live_service_release_runtime(text,text),
 public.pazo_f16_live_service_release_change(uuid,text,bigint,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_live_release_status() TO authenticated;

-- The three admission bridges below are replaced in this same transaction.

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_checkout_begin(
 p_owner uuid,p_request_key uuid,p_generation bigint,p_locale text,p_terms_version text,p_terms_digest text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $begin$
DECLARE current supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM admin_private.pazo_live_release_control WHERE singleton FOR SHARE;
 IF NOT COALESCE(admin_private.pazo_live_control_admits(p_owner,p_generation),false)
 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','controlled_release_admission_denied'); END IF;
 IF EXISTS(SELECT 1 FROM admin_private.pazo_live_release_control c
  JOIN supporter_private.pazo_paypal_live_checkout_intents i ON i.owner_id=c.canary_owner
   AND i.merchant_generation=c.merchant_generation AND i.provider_create_claimed_at>=c.canary_started_at
  WHERE c.singleton AND c.mode='canary' AND i.provider_create_claimed_at IS NOT NULL AND i.request_key<>p_request_key)
 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','canary_attempt_already_claimed'); END IF;
 IF p_owner IS NULL OR p_request_key IS NULL THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','invalid_consent'); END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,1602));
 SELECT * INTO current FROM supporter_private.pazo_paypal_live_checkout_intents WHERE owner_id=p_owner AND request_key=p_request_key;
 IF FOUND AND current.closed_at IS NOT NULL
 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','closed_checkout_requires_new_consent'); END IF;
 SELECT * INTO current FROM supporter_private.pazo_paypal_live_checkout_intents WHERE owner_id=p_owner AND closed_at IS NULL;
 IF FOUND AND current.request_key<>p_request_key
 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','owner_slot_occupied'); END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_live_offer_versions WHERE terms_version=p_terms_version
  AND locale=p_locale AND terms_digest=p_terms_digest)
 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','published_terms_unverified'); END IF;
 IF current.intent_id IS NULL AND EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p
  JOIN supporter_private.pazo_paypal_live_checkout_intents i ON i.intent_id=p.intent_id AND i.merchant_generation=p.merchant_generation
  WHERE i.owner_id=p_owner AND p.service_start<=pg_catalog.clock_timestamp() AND p.service_end>pg_catalog.clock_timestamp()
   AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h WHERE h.sale_id=p.sale_id AND h.released_at IS NULL))
 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','verified_coverage_still_active'); END IF;
 RETURN supporter_private.pazo_live_intent_begin(p_owner,p_request_key,p_generation,p_locale,p_terms_version,p_terms_digest);
END $begin$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_provider_claim_with_origin(
 p_owner uuid,p_intent text,p_request_key uuid,p_generation bigint,p_origin text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $claim$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE; claimed boolean;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM admin_private.pazo_live_release_control WHERE singleton FOR SHARE;
 IF NOT COALESCE(admin_private.pazo_live_control_admits(p_owner,p_generation),false) THEN RETURN false; END IF;
 IF p_owner IS NULL OR p_intent IS NULL OR p_request_key IS NULL OR p_generation IS NULL OR p_origin IS NULL
  OR p_origin !~ '^https://[a-z0-9][a-z0-9.-]{1,240}$' THEN RETURN false; END IF;
 SELECT * INTO i FROM supporter_private.pazo_paypal_live_checkout_intents WHERE owner_id=p_owner AND intent_id=p_intent
  AND request_key=p_request_key AND merchant_generation=p_generation AND closed_at IS NULL FOR UPDATE;
 IF NOT FOUND OR i.provider_create_claimed_at IS NOT NULL OR i.provider_request_origin IS NOT NULL OR
  NOT EXISTS(SELECT 1 FROM admin_private.paypal_gateway_settings WHERE environment='live' AND plan_id=i.plan_id AND return_origin=p_origin) OR
  NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_merchant_generations WHERE generation=i.merchant_generation
   AND environment='live' AND plan_id=i.plan_id AND retired_at IS NULL)
 THEN RETURN false; END IF;
 claimed:=supporter_private.pazo_live_intent_claim_once(p_owner,p_intent,p_request_key,p_generation);
 IF NOT claimed THEN RETURN false; END IF;
 UPDATE supporter_private.pazo_paypal_live_checkout_intents SET provider_request_origin=p_origin,
  provider_request_version='pazo_subscription_create_v1' WHERE intent_id=p_intent;
 RETURN true;
END $claim$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_recovery_claim(p_owner uuid,p_intent text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $recover$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE; token uuid; at timestamptz:=pg_catalog.clock_timestamp();
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_owner IS NULL OR p_intent IS NULL THEN RETURN NULL; END IF;
 PERFORM 1 FROM admin_private.pazo_live_release_control WHERE singleton FOR SHARE;
 SELECT * INTO i FROM supporter_private.pazo_paypal_live_checkout_intents WHERE owner_id=p_owner AND intent_id=p_intent
  AND closed_at IS NULL FOR UPDATE;
 IF NOT COALESCE(admin_private.pazo_live_control_admits(p_owner,i.merchant_generation),false) THEN RETURN NULL; END IF;
 IF NOT FOUND OR i.state<>'pending' OR i.provider_create_claimed_at IS NULL OR i.provider_create_claimed_at>at OR
  i.provider_create_claimed_at<at-interval '48 hours' OR i.provider_request_origin IS NULL OR
  i.provider_request_version IS DISTINCT FROM 'pazo_subscription_create_v1' OR i.recovery_attempts>=3 OR
  (i.recovery_expires_at IS NOT NULL AND i.recovery_expires_at>=at) OR
  (i.last_recovery_at IS NOT NULL AND i.last_recovery_at>=at-interval '1 minute') OR
  NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_merchant_generations WHERE generation=i.merchant_generation
   AND environment='live' AND plan_id=i.plan_id AND retired_at IS NULL) OR
  NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton AND environment='live'
   AND live_enabled AND NOT kill_switch AND active_generation=i.merchant_generation)
 THEN RETURN NULL; END IF;
 -- Shorter than PayPal's documented72h retention; first claim is immutable.
 token:=pg_catalog.gen_random_uuid();
 UPDATE supporter_private.pazo_paypal_live_checkout_intents SET recovery_lease=token,recovery_expires_at=at+interval '2 minutes',
  last_recovery_at=at,recovery_attempts=recovery_attempts+1 WHERE intent_id=i.intent_id;
 RETURN pg_catalog.jsonb_build_object('source','private_original_live_create_recovery','leaseToken',token,'intentId',i.intent_id,
  'requestKey',i.request_key,'merchantGeneration',i.merchant_generation,'planId',i.plan_id,'providerOrigin',i.provider_request_origin,
  'providerRequestVersion',i.provider_request_version,'originalClaimedAt',i.provider_create_claimed_at);
END $recover$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_active_route()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE output jsonb;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb ->> 'role')
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'sourceEnvironment','live','merchantGeneration',g.generation,
  'planId',g.plan_id,'credentialSource',g.credential_source,
  'returnOrigin',c.return_origin,'releaseMode',release.mode)
 INTO output
 FROM admin_private.pazo_paypal_new_checkout_switch s
 JOIN admin_private.pazo_paypal_merchant_generations g ON g.generation=s.active_generation
 JOIN admin_private.pazo_live_release_control release ON release.singleton AND release.revision=s.revision
  AND release.merchant_generation=g.generation AND release.mode IN('canary','public')
 JOIN admin_private.paypal_gateway_settings c ON c.environment='live'
  AND c.plan_id=g.plan_id AND c.webhook_id=g.webhook_id
 WHERE s.singleton=true AND s.environment='live' AND s.live_enabled=true
  AND s.kill_switch=false AND g.environment='live'
  AND g.retired_at IS NULL AND g.credential_source IN ('vault','edge_secrets')
  AND c.return_origin='https://pazo-app-t83r.vercel.app' AND admin_private.pazo_live_artifact_ready();
 RETURN output;
END $f$;

CREATE OR REPLACE FUNCTION public.pazo_admin_live_readiness()
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
  -- Certification is written only by the operator after deployment/HTTPS proof.
  'releaseControlsReady',admin_private.pazo_live_artifact_ready(),
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
 phase:=CASE WHEN active THEN 'active'
  WHEN NOT ((checks->>'termsReady')::boolean AND (checks->>'ownerRecoverySchemaReady')::boolean
   AND (checks->>'benefitsSchemaReady')::boolean AND (checks->>'financeSchemaReady')::boolean
   AND (checks->>'releaseControlsReady')::boolean AND (checks->>'workerHealthy')::boolean) THEN 'engineering_pending'
  WHEN NOT ((checks->>'credentialsStored')::boolean AND (checks->>'providerResourcesVerified')::boolean)
   THEN 'credentials_pending' ELSE 'canary_pending' END;
 RETURN pg_catalog.jsonb_build_object('source','pazo_live_admin_readiness_v1',
  'asOf',pg_catalog.statement_timestamp(),'phase',phase,'checks',checks,
  'blockers',blockers,'checkoutActive',active,'mayActivate',false,'mayCharge',false);
END $f$;

CREATE OR REPLACE FUNCTION public.pazo_admin_paypal_settings()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
 SELECT 1 FROM admin_private.admin_grants WHERE user_id=auth.uid())
 THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object(
 'active_environment',(SELECT active_environment FROM admin_private.paypal_gateway_runtime WHERE singleton),
 'live_checkout_enabled',(SELECT live_checkout_enabled FROM admin_private.paypal_gateway_runtime WHERE singleton),
 'checkout_source',CASE WHEN (SELECT live_checkout_enabled FROM admin_private.paypal_gateway_runtime WHERE singleton)
  THEN 'live_gateway_v1' ELSE 'legacy_sandbox_checkout' END,
 'environments',COALESCE(jsonb_agg(jsonb_build_object(
  'environment',c.environment,'plan_id',c.plan_id,
  'price_minor',c.price_minor,'currency',c.currency,
  'interval_unit',c.interval_unit,'product_name',c.product_name,
  'return_origin',c.return_origin,'webhook_id',c.webhook_id,
  'client_id_stored',c.client_id_vault IS NOT NULL,
  'client_secret_stored',c.client_secret_vault IS NOT NULL,
  'validation_status',c.validation_status,'validated_at',c.validated_at,
  'updated_at',c.updated_at
 ) ORDER BY c.environment),'[]'::jsonb)
 ) INTO v FROM admin_private.paypal_gateway_settings c;
 RETURN v;
END $function$;
REVOKE ALL ON FUNCTION public.pazo_admin_paypal_settings() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_paypal_settings() TO authenticated;
COMMIT;
