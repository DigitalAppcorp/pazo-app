-- Invoked by the owned PG17 lab only. All users/payment evidence are synthetic.
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
ALTER TABLE admin_private.paypal_gateway_settings ADD COLUMN IF NOT EXISTS product_name text DEFAULT 'Amigo de PAZO';
\i supabase/migrations/20261021230000_pazo_f16_live_controlled_release.sql
BEGIN;
INSERT INTO auth.users(id,email_confirmed_at) VALUES('a9456789-1234-4234-8234-123456789abc',clock_timestamp());
INSERT INTO admin_private.admin_grants(user_id) VALUES('a9456789-1234-4234-8234-123456789abc');
DO $control$
DECLARE actor uuid:='a9456789-1234-4234-8234-123456789abc'; other uuid:='b9456789-1234-4234-8234-123456789abc';
 value jsonb; req uuid:=gen_random_uuid(); id_key uuid:=gen_random_uuid(); secret_key uuid:=gen_random_uuid();
 revision bigint; digest text; intent text; request_key uuid:=gen_random_uuid();
BEGIN
 SELECT c.revision INTO revision FROM admin_private.pazo_live_release_control c WHERE singleton;
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 IF public.pazo_f16_live_service_release_runtime('checkout','pazo_live_checkout_controlled_v1')
 THEN RAISE EXCEPTION 'installation invented deployment proof'; END IF;
 value:=public.pazo_f16_live_service_release_change(actor,'canary',revision,req);
 IF value->>'code'<>'release_engineering_pending' THEN RAISE EXCEPTION 'missing engineering proof accepted %',value; END IF;
 -- The operator-only row is inserted in THIS synthetic transaction, never hosted.
 INSERT INTO admin_private.pazo_live_release_artifact(singleton,frontend_commit,checkout_build,webhook_build,
  control_build,worker_build,return_origin,evidence_sha256,verified_at)
 VALUES(true,repeat('a',40),'pazo_live_checkout_controlled_v1','pazo_live_webhook_controlled_v1',
  'pazo_live_control_v1','pazo_live_worker_v2','https://pazo-app-t83r.vercel.app',repeat('b',64),statement_timestamp()-interval '1 second');
 value:=public.pazo_f16_live_service_release_change(actor,'canary',revision,req);
 IF value->>'code'<>'release_credentials_unverified' THEN RAISE EXCEPTION 'missing immutable credentials accepted %',value; END IF;
 INSERT INTO admin_private.pazo_paypal_merchant_generations(generation,environment,merchant_fingerprint_sha256,
  plan_id,webhook_id,credential_source,client_id_vault,client_secret_vault)
 OVERRIDING SYSTEM VALUE VALUES(9001,'live',repeat('c',64),'P-CONTROLLAB123456','WH-CONTROLLAB123456','vault',id_key,secret_key);
 INSERT INTO admin_private.pazo_paypal_live_bootstrap_reservations(generation,actor_id,plan_id,state,finalized_at)
 VALUES(9001,actor,'P-CONTROLLAB123456','finalized',clock_timestamp());
 UPDATE admin_private.paypal_gateway_settings SET plan_id='P-CONTROLLAB123456',webhook_id='WH-CONTROLLAB123456',
  client_id_vault=id_key,client_secret_vault=secret_key,validation_status='valid',validated_at=clock_timestamp(),
  return_origin='https://pazo-app-t83r.vercel.app' WHERE environment='live';
 UPDATE supporter_private.pazo_paypal_live_worker_control SET enabled=true,last_heartbeat_at=statement_timestamp()-interval '10 minutes' WHERE singleton;
 value:=public.pazo_f16_live_service_release_change(actor,'canary',revision,req);
 IF value->>'code'<>'release_worker_unavailable' THEN RAISE EXCEPTION 'stale worker accepted %',value; END IF;
 UPDATE supporter_private.pazo_paypal_live_worker_control SET last_heartbeat_at=statement_timestamp()-interval '1 second' WHERE singleton;
 value:=public.pazo_f16_live_service_release_change(actor,'canary',revision,req);
 IF value->>'code'<>'release_state_updated' OR value->>'mode'<>'canary' OR (value->>'revision')::bigint<>revision+1
 THEN RAISE EXCEPTION 'canary CAS failed %',value; END IF;
 value:=public.pazo_f16_live_service_release_change(actor,'canary',revision,req);
 IF value->>'code'<>'release_request_already_recorded' OR (SELECT count(*) FROM admin_private.pazo_live_release_requests WHERE request_id=req)<>1
 THEN RAISE EXCEPTION 'request retry wrote twice %',value; END IF;
 IF public.pazo_f16_live_service_release_admit(other,9001) OR public.pazo_f16_live_service_release_admit(actor,9002)
  OR NOT public.pazo_f16_live_service_release_admit(actor,9001)
 THEN RAISE EXCEPTION 'canary owner/generation scope broken'; END IF;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 value:=public.pazo_admin_live_release_status();
 IF value->>'mode' IS DISTINCT FROM 'canary' OR value->>'preparationReady' IS DISTINCT FROM 'true'
  OR value->>'originalOperator' IS DISTINCT FROM 'true' OR value->>'mayCharge' IS DISTINCT FROM 'false'
  OR value::text LIKE '%'||actor::text||'%' OR value::text LIKE '%'||id_key::text||'%'
 THEN RAISE EXCEPTION 'release projection incorrect or exposed private identifiers %',value; END IF;
 value:=public.pazo_admin_paypal_settings();
 IF value->>'active_environment' IS DISTINCT FROM 'live' OR value->>'live_checkout_enabled' IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION 'admin metadata reports stale sandbox during canary %',value; END IF;
 value:=public.pazo_f16_live_service_release_change(actor,'public',revision+1,gen_random_uuid());
 IF value->>'code'<>'release_canary_evidence_pending' THEN RAISE EXCEPTION 'public release without real ledger evidence %',value; END IF;
 -- SQL admission must reject another owner even if a server caller bypasses UI.
 SELECT terms_digest INTO digest FROM supporter_private.pazo_live_offer_versions WHERE locale='es';
 value:=public.pazo_f16_live_service_checkout_begin(other,gen_random_uuid(),9001,'es','pazo-supporter-live.beta20261021-v1',digest);
 IF value->>'code'<>'controlled_release_admission_denied' THEN RAISE EXCEPTION 'SQL owner scope bypass %',value; END IF;
 value:=public.pazo_f16_live_service_checkout_begin(actor,request_key,9001,'es','pazo-supporter-live.beta20261021-v1',digest);
 IF value->>'ok'<>'true' THEN RAISE EXCEPTION 'approved original canary could not begin %',value; END IF;
 intent:=value->>'intentId';
 IF NOT public.pazo_f16_live_service_provider_claim_with_origin(actor,intent,request_key,9001,'https://pazo-app-t83r.vercel.app')
 THEN RAISE EXCEPTION 'original provider claim rejected'; END IF;
 -- Full canary evidence is synthetic SQL fixture data, not a provider test.
 UPDATE supporter_private.pazo_paypal_live_checkout_intents SET state='bound',provider_subscription_id='I-CONTROLLAB1234' WHERE intent_id=intent;
 INSERT INTO supporter_private.pazo_paypal_live_event_inbox(merchant_generation,provider_event_id,event_type,linked_intent_id,processing_state)
 VALUES(9001,'WH-CONTROL-SALE','PAYMENT.SALE.COMPLETED',intent,'processed');
 INSERT INTO supporter_private.pazo_paypal_live_paid_periods(sale_id,intent_id,merchant_generation,provider_event_id,
  cycle_key,service_start,service_end,merchant_verified_at)
 VALUES('SALE-CONTROLLAB',intent,9001,'WH-CONTROL-SALE','CYCLE-CONTROL',clock_timestamp()-interval '1 second',clock_timestamp()+interval '30 days',clock_timestamp());
 INSERT INTO supporter_private.pazo_paypal_live_cancel_claims(intent_id,merchant_generation,state,provider_confirmed_at)
 VALUES(intent,9001,'confirmed',clock_timestamp());
 value:=public.pazo_f16_live_service_release_change(actor,'public',revision+1,gen_random_uuid());
 IF value->>'code'<>'release_canary_evidence_pending' THEN RAISE EXCEPTION 'unsigned ledger row passed public gate %',value; END IF;
 INSERT INTO supporter_private.pazo_paypal_live_signed_receipts(merchant_generation,provider_event_id,event_type,
  proof_source,signed_body_sha256,signature_webhook_id,subscription_id,subject_id,provider_event_at,subject_at)
 VALUES(9001,'WH-CONTROL-SALE','PAYMENT.SALE.COMPLETED','paypal_live_postback_success',repeat('d',64),
  'WH-CONTROLLAB123456','I-CONTROLLAB1234','SALE-CONTROLLAB',clock_timestamp(),clock_timestamp());
 UPDATE supporter_private.pazo_live_dispute_monitors SET ever_clear=true,last_result='clear',
  last_checked_at=clock_timestamp(),next_check_at=clock_timestamp()+interval '30 minutes' WHERE sale_id='SALE-CONTROLLAB';
 INSERT INTO supporter_private.pazo_paypal_live_period_holds(sale_id,hold_id,kind,verified_at)
 VALUES('SALE-CONTROLLAB','HOLD-CONTROL','dispute',clock_timestamp());
 value:=public.pazo_f16_live_service_release_change(actor,'public',revision+1,gen_random_uuid());
 IF value->>'code'<>'release_canary_evidence_pending' THEN RAISE EXCEPTION 'held canary passed public gate %',value; END IF;
 UPDATE supporter_private.pazo_paypal_live_period_holds SET released_at=clock_timestamp() WHERE hold_id='HOLD-CONTROL';
 value:=public.pazo_f16_live_service_release_change(actor,'public',revision+1,gen_random_uuid());
 IF value->>'mode'<>'public' OR NOT public.pazo_f16_live_service_release_admit(other,9001)
 THEN RAISE EXCEPTION 'verified original canary failed public CAS %',value; END IF;
 value:=public.pazo_f16_live_service_release_change(actor,'stop',revision+2,gen_random_uuid());
 IF value->>'mode'<>'off' OR public.pazo_f16_live_service_release_admit(actor,9001)
  OR public.pazo_f16_live_service_active_route() IS NOT NULL
  OR public.pazo_f16_live_service_recovery_claim(actor,intent) IS NOT NULL
 THEN RAISE EXCEPTION 'kill did not stop new admission/recovery %',value; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton AND processing_enabled)
  OR NOT public.pazo_f16_live_service_release_runtime('webhook','pazo_live_webhook_controlled_v1')
 THEN RAISE EXCEPTION 'stop disabled original historical processing'; END IF;
 -- Retrying the old activation reports the CURRENT stopped state, never old success.
 value:=public.pazo_f16_live_service_release_change(actor,'canary',revision,req);
 IF value->>'mode'<>'off' OR (value->>'revision')::bigint<>revision+3
 THEN RAISE EXCEPTION 'late activation retry claimed old active state %',value; END IF;
 value:=public.pazo_f16_live_service_release_change(actor,'canary',revision,gen_random_uuid());
 IF value->>'code'<>'release_revision_changed' THEN RAISE EXCEPTION 'stale CAS accepted'; END IF;
 DELETE FROM admin_private.admin_grants WHERE user_id=actor;
 BEGIN
  PERFORM public.pazo_f16_live_service_release_change(actor,'canary',revision+3,gen_random_uuid());
  RAISE EXCEPTION 'revoked administrator activated release';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated"}',true);
 BEGIN
  PERFORM public.pazo_f16_live_service_release_change(actor,'stop',revision+3,gen_random_uuid());
  RAISE EXCEPTION 'user JWT called service bridge';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF has_function_privilege('authenticated','public.pazo_f16_live_service_release_change(uuid,text,bigint,uuid)','EXECUTE')
  OR has_function_privilege('anon','public.pazo_admin_live_release_status()','EXECUTE')
  OR has_table_privilege('service_role','admin_private.pazo_live_release_artifact','INSERT')
  OR has_table_privilege('authenticated','admin_private.pazo_live_release_control','UPDATE')
 THEN RAISE EXCEPTION 'release private ACL bypass'; END IF;
 RAISE NOTICE 'PAZO_CONTROLLED_RELEASE_CAS_REPLAY_OWNER_KILL_REVOCATION_PG17_PASS';
END $control$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $deny$ BEGIN
 BEGIN
  PERFORM public.pazo_f16_live_service_release_runtime('checkout','pazo_live_checkout_controlled_v1');
  RAISE EXCEPTION 'anon executed privileged runtime gate';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $deny$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $deny$ BEGIN
 BEGIN
  PERFORM public.pazo_f16_live_service_release_change('a9456789-1234-4234-8234-123456789abc','canary',0,gen_random_uuid());
  RAISE EXCEPTION 'authenticated role executed financial controller';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $deny$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $inert$ BEGIN
 IF public.pazo_f16_live_service_release_runtime('webhook','pazo_live_webhook_controlled_v1')
 THEN RAISE EXCEPTION 'real service role invented artifact after synthetic rollback'; END IF;
END $inert$;
ROLLBACK;
\i supabase/rollbacks/20261021230000_pazo_f16_live_controlled_release.sql
\i supabase/migrations/20261021230000_pazo_f16_live_controlled_release.sql
