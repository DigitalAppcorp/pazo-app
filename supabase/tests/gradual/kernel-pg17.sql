\connect f14_synthetic
DO $$ BEGIN IF current_database()<>'f14_synthetic' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Disposable PostgreSQL only';END IF;END $$;
\i supabase/tests/supporter/fixtures/f16-gradual-rollback.generated.sql
DO $$ BEGIN
 IF to_regclass('supporter_private.gradual_campaign') IS NOT NULL OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='supporter_state') THEN RAISE EXCEPTION 'Rollback left changes';END IF;
END $$;
\i supabase/migrations/20261023224519_pazo_f16_gradual_live_event_rollout.sql
CREATE SCHEMA gradual_test;
CREATE FUNCTION gradual_test.assert(p_id text,p_true boolean) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF p_true IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL %',p_id;END IF;RAISE NOTICE 'PASS %',p_id;END $$;
SELECT gradual_test.assert('INSTALL_INERT',(SELECT lifecycle='inactive' AND NOT hosted_gate_verified FROM supporter_private.gradual_campaign));
SELECT gradual_test.assert('RLS_ACL',NOT has_table_privilege('authenticated','supporter_private.gradual_interest','INSERT') AND NOT has_function_privilege('authenticated','public.pazo_f16_gradual_tick(boolean,boolean)','EXECUTE') AND NOT has_function_privilege('service_role','supporter_private.gradual_original_provider_claim(uuid,text,uuid,bigint,text)','EXECUTE'));
INSERT INTO auth.users(id,email_confirmed_at,is_anonymous,created_at) SELECT ('82000000-0000-4000-8000-'||lpad(to_hex(n),12,'0'))::uuid,clock_timestamp(),false,clock_timestamp()+n*interval '1 second' FROM generate_series(1,60)n;
INSERT INTO public.profiles SELECT id,true FROM auth.users WHERE id::text LIKE '82000000-%';
INSERT INTO auth.users(id,email_confirmed_at,is_anonymous) VALUES('82000000-0000-4000-8000-00000000ffff',now(),false);
INSERT INTO admin_private.admin_grants(user_id) VALUES('82000000-0000-4000-8000-00000000ffff');
INSERT INTO admin_private.pazo_live_release_artifact(singleton,frontend_commit,checkout_build,webhook_build,control_build,worker_build,return_origin,evidence_sha256,verified_at)
VALUES(true,repeat('a',40),'pazo_live_checkout_controlled_v1','pazo_live_webhook_controlled_v1','pazo_live_control_v1','pazo_live_worker_v2','https://pazo-app-t83r.vercel.app',repeat('b',64),statement_timestamp()-interval '1 second');
UPDATE admin_private.pazo_paypal_merchant_generations SET retired_at=NULL WHERE generation=1;
UPDATE admin_private.paypal_gateway_settings SET plan_id='P-ABCDEFGHIJKLMN',webhook_id='WH-12345678900',return_origin='https://pazo-app-t83r.vercel.app',validation_status='valid' WHERE environment='live';
UPDATE admin_private.pazo_live_release_control SET mode='canary',revision=1,merchant_generation=1,canary_owner='82000000-0000-4000-8000-00000000ffff',canary_started_at=now();
UPDATE admin_private.pazo_paypal_new_checkout_switch SET revision=1,environment='live',live_enabled=true,kill_switch=false,active_generation=1;
UPDATE supporter_private.pazo_paypal_live_worker_control SET enabled=true,processing_enabled=true,last_heartbeat_at=clock_timestamp(),last_outcome='idle';
SELECT set_config('request.jwt.claims','{"role":"service_role"}',false);
SELECT gradual_test.assert('ISSUE84_INACTIVE_CANARY_CLOSED',NOT admin_private.pazo_live_control_admits('82000000-0000-4000-8000-00000000ffff',1));
SELECT gradual_test.assert('ISSUE84_INACTIVE_BEGIN_DENIED',(SELECT public.pazo_f16_live_service_checkout_begin('82000000-0000-4000-8000-00000000ffff',gen_random_uuid(),1,'es',terms_version,terms_digest)->>'code'='controlled_release_admission_denied' FROM supporter_private.pazo_live_offer_versions WHERE locale='es'));
SELECT gradual_test.assert('HOSTED_GATE_REQUIRED',public.pazo_f16_gradual_admin_action('82000000-0000-4000-8000-00000000ffff','start',0,gen_random_uuid())->>'code'='hosted_gate_required');
UPDATE supporter_private.gradual_campaign SET hosted_gate_verified=true,webhook_ok_at=clock_timestamp();
-- Synthetic operator proof of the open legacy intent barrier; never executed hosted.
INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(intent_id,owner_id,request_key,merchant_generation,plan_id,locale,terms_version,terms_digest,affirmative_consent)
SELECT 'intent-82000000-0000-4000-8000-00000000ffff','82000000-0000-4000-8000-00000000ffff',gen_random_uuid(),1,'P-ABCDEFGHIJKLMN','es',terms_version,terms_digest,true FROM supporter_private.pazo_live_offer_versions WHERE locale='es';
SELECT gradual_test.assert('EVT-15_LEGACY_BARRIER',public.pazo_f16_gradual_admin_action('82000000-0000-4000-8000-00000000ffff','start',0,gen_random_uuid())->>'code'='legacy_intent_requires_reconciliation');
-- The already-claimed legacy intent remains recoverable, but no new claim can start.
SELECT gradual_test.assert('ISSUE84_INACTIVE_PROVIDER_CLAIM_DENIED',NOT public.pazo_f16_live_service_provider_claim_with_origin('82000000-0000-4000-8000-00000000ffff','intent-82000000-0000-4000-8000-00000000ffff',(SELECT request_key FROM supporter_private.pazo_paypal_live_checkout_intents WHERE intent_id='intent-82000000-0000-4000-8000-00000000ffff'),1,'https://pazo-app-t83r.vercel.app'));
BEGIN;
UPDATE supporter_private.pazo_paypal_live_checkout_intents SET provider_create_claimed_at=clock_timestamp() WHERE intent_id='intent-82000000-0000-4000-8000-00000000ffff';
SELECT gradual_test.assert('ISSUE84_LEGACY_RECOVERY_PRESERVED',supporter_private.gradual_recovery_admits('82000000-0000-4000-8000-00000000ffff',1));
ROLLBACK;
SELECT public.pazo_f16_live_service_abandon_unclaimed('82000000-0000-4000-8000-00000000ffff','intent-82000000-0000-4000-8000-00000000ffff');
SELECT gradual_test.assert('START',public.pazo_f16_gradual_admin_action('82000000-0000-4000-8000-00000000ffff','start',0,gen_random_uuid())->>'code'='updated');
SELECT gradual_test.assert('GR-02_FIVE_INVITATIONS',(SELECT count(*)=5 AND min(expires_at)>statement_timestamp()+interval '71 hours' FROM supporter_private.gradual_invitation));
CREATE FUNCTION gradual_test.interest(p_number integer) RETURNS jsonb LANGUAGE plpgsql AS $$ DECLARE owner uuid:=('82000000-0000-4000-8000-'||lpad(to_hex(p_number),12,'0'))::uuid;BEGIN
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',owner)::text,true);
 RETURN public.pazo_gradual_interest('interest');
END $$;
DO $$ BEGIN FOR n IN 1..25 LOOP PERFORM gradual_test.interest(n);END LOOP;END $$;
SELECT gradual_test.assert('EVT-01_25_FIFO',(SELECT count(*)=25 AND count(*) FILTER(WHERE state='slot_granted')=1 AND count(*) FILTER(WHERE state='waiting')=24 FROM supporter_private.gradual_interest));
SELECT gradual_test.assert('GR-04_INTEREST_NOT_CHARGE',(SELECT count(*)=1 FROM supporter_private.pazo_paypal_live_checkout_intents));
SELECT gradual_test.interest(1);
SELECT gradual_test.assert('GR-03_ACCOUNT_DEDUPE',(SELECT count(*)=25 FROM supporter_private.gradual_interest));
-- Expiry is safe only BEFORE provider claim. It rotates a provisional slot.
UPDATE supporter_private.gradual_interest SET slot_expires_at=clock_timestamp()-interval '1 second' WHERE owner_id='82000000-0000-4000-8000-000000000001';
SELECT supporter_private.gradual_pump();
SELECT gradual_test.assert('EVT-04_UNSTARTED_RELEASE',(SELECT state='slot_granted' FROM supporter_private.gradual_interest WHERE owner_id='82000000-0000-4000-8000-000000000002'));
-- Add real baseline financial records with synthetic IDs. Production adapters
-- can only create these via the existing signed/leased settlement pipeline.
CREATE FUNCTION gradual_test.pay(p_number integer,p_signed boolean DEFAULT true,p_projected boolean DEFAULT true) RETURNS void LANGUAGE plpgsql AS $$
DECLARE who uuid:=('82000000-0000-4000-8000-'||lpad(to_hex(p_number),12,'0'))::uuid;intent text:='intent-'||who::text;event text:='WH-GRADUAL-'||p_number;sale text:='SALE-GRADUAL-'||p_number;subscription text:='I-GRADUAL-'||p_number;
BEGIN
 INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(intent_id,owner_id,request_key,merchant_generation,plan_id,locale,terms_version,terms_digest,affirmative_consent,created_at,provider_create_claimed_at,provider_subscription_id,state,provider_status)
 SELECT intent,who,gen_random_uuid(),1,'P-ABCDEFGHIJKLMN','es',terms_version,terms_digest,true,clock_timestamp()-interval '1 second',clock_timestamp(),subscription,'bound','ACTIVE' FROM supporter_private.pazo_live_offer_versions WHERE locale='es' ON CONFLICT DO NOTHING;
 UPDATE supporter_private.gradual_interest SET intent_id=intent,provider_started=true WHERE owner_id=who;
 INSERT INTO supporter_private.pazo_paypal_live_event_inbox(merchant_generation,provider_event_id,event_type,linked_intent_id,processing_state) VALUES(1,event,'PAYMENT.SALE.COMPLETED',intent,'processed') ON CONFLICT DO NOTHING;
 IF p_signed THEN INSERT INTO supporter_private.pazo_paypal_live_signed_receipts(merchant_generation,provider_event_id,event_type,proof_source,signed_body_sha256,signature_webhook_id,subscription_id,subject_id,provider_event_at,subject_at)
 VALUES(1,event,'PAYMENT.SALE.COMPLETED','paypal_live_postback_success',repeat('a',64),'WH-12345678900',subscription,sale,clock_timestamp(),clock_timestamp()) ON CONFLICT DO NOTHING;END IF;
 INSERT INTO supporter_private.pazo_paypal_live_paid_periods(sale_id,intent_id,merchant_generation,provider_event_id,cycle_key,service_start,service_end,merchant_verified_at)
 VALUES(sale,intent,1,event,'CYCLE-GRADUAL-'||p_number,clock_timestamp()+CASE WHEN p_projected THEN interval '-1 day' ELSE interval '1 day' END,clock_timestamp()+interval '20 days',clock_timestamp()) ON CONFLICT DO NOTHING;
 IF p_projected THEN UPDATE supporter_private.pazo_live_dispute_monitors SET last_checked_at=clock_timestamp(),last_result='clear',ever_clear=true,next_check_at=clock_timestamp()+interval '1 day' WHERE sale_id=sale;END IF;
END $$;
SELECT gradual_test.pay(2);
SELECT set_config('request.jwt.claims','{"role":"service_role"}',false);
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('EVT-02_FIRST_TO_FIVE',(SELECT capacity=5 AND stage='L2_SMALL' FROM supporter_private.gradual_campaign));
SELECT gradual_test.assert('GR-10_THANKS_ONCE',(SELECT count(*)=1 FROM supporter_private.gradual_outbox WHERE kind='verified'));
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('EVT-06_DUPLICATE_NO_RECOUNT',(SELECT count(*)=1 FROM supporter_private.gradual_admission));
-- Another verified cycle of the SAME owner is not a distinct buyer.
INSERT INTO supporter_private.pazo_paypal_live_event_inbox(merchant_generation,provider_event_id,event_type,linked_intent_id,processing_state) VALUES(1,'WH-GRADUAL-RENEWAL','PAYMENT.SALE.COMPLETED','intent-82000000-0000-4000-8000-000000000002','processed');
INSERT INTO supporter_private.pazo_paypal_live_signed_receipts(merchant_generation,provider_event_id,event_type,proof_source,signed_body_sha256,signature_webhook_id,subscription_id,subject_id,provider_event_at,subject_at) VALUES(1,'WH-GRADUAL-RENEWAL','PAYMENT.SALE.COMPLETED','paypal_live_postback_success',repeat('c',64),'WH-12345678900','I-GRADUAL-2','SALE-GRADUAL-RENEWAL',statement_timestamp()-interval '40 days',statement_timestamp()-interval '40 days');
INSERT INTO supporter_private.pazo_paypal_live_paid_periods(sale_id,intent_id,merchant_generation,provider_event_id,cycle_key,service_start,service_end,merchant_verified_at) VALUES('SALE-GRADUAL-RENEWAL','intent-82000000-0000-4000-8000-000000000002',1,'WH-GRADUAL-RENEWAL','EXPIRED-GRADUAL-CYCLE',statement_timestamp()-interval '40 days',statement_timestamp()-interval '10 days',statement_timestamp());
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('EVT-06_RENEWAL_NOT_NEW_BUYER',(SELECT count(*)=1 FROM supporter_private.gradual_admission) AND (SELECT capacity=5 FROM supporter_private.gradual_campaign) AND (SELECT count(*)=1 FROM supporter_private.gradual_outbox WHERE kind='verified'));

SELECT gradual_test.pay(3);SELECT gradual_test.pay(4);
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('EVT-03_THIRD_TO_TWENTY',(SELECT capacity=20 AND stage='L3_BETA' FROM supporter_private.gradual_campaign));
SELECT gradual_test.assert('EVT-08_BEFORE_TENTH',(SELECT count(*)>=4 FROM supporter_private.gradual_interest WHERE state='waiting'));
DO $$ BEGIN FOR n IN 5..10 LOOP PERFORM gradual_test.pay(n);END LOOP;END $$;
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('EVT-17_NINE_NOT_TEN',(SELECT capacity=20 FROM supporter_private.gradual_campaign));
SELECT gradual_test.pay(11);
INSERT INTO supporter_private.pazo_paypal_live_period_holds(sale_id,hold_id,kind,verified_at) VALUES('SALE-GRADUAL-11','GRADUAL-PRE-TENTH','refunded',statement_timestamp());
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('EVT-17_TENTH_HELD_NOT_COUNTED',(SELECT capacity=20 AND lifecycle='paused_automatic' FROM supporter_private.gradual_campaign));
UPDATE supporter_private.pazo_paypal_live_period_holds SET released_at=clock_timestamp() WHERE hold_id='GRADUAL-PRE-TENTH';
SELECT public.pazo_f16_gradual_tick(true);
SELECT public.pazo_f16_gradual_admin_action('82000000-0000-4000-8000-00000000ffff','resolve',(SELECT revision FROM supporter_private.gradual_campaign),gen_random_uuid());
SELECT public.pazo_f16_gradual_admin_action('82000000-0000-4000-8000-00000000ffff','resume',(SELECT revision FROM supporter_private.gradual_campaign),gen_random_uuid());
SELECT public.pazo_f16_gradual_tick(true);
SELECT gradual_test.assert('EVT-16_TENTH_TO_FIFTY',(SELECT capacity=50 AND stage='L4_EXTENDED' FROM supporter_private.gradual_campaign));
SELECT gradual_test.assert('EVT-19_QUEUE_PRESERVED',(SELECT count(*)=25 FROM supporter_private.gradual_interest));
-- Pausing denies CREATE admission, keeps original subscriptions/ledger untouched.
SELECT public.pazo_f16_gradual_admin_action('82000000-0000-4000-8000-00000000ffff','pause',(SELECT revision FROM supporter_private.gradual_campaign),gen_random_uuid());
SELECT gradual_test.assert('EVT-11_PAUSE_NEW_ONLY',NOT admin_private.pazo_live_control_admits('82000000-0000-4000-8000-00000000000c',1) AND (SELECT count(*)=11 FROM supporter_private.pazo_paypal_live_paid_periods) AND (SELECT live_enabled AND NOT kill_switch FROM admin_private.pazo_paypal_new_checkout_switch));
SELECT gradual_test.assert('PUBLIC_NEVER_AUTOMATIC',(SELECT mode='limited' FROM admin_private.pazo_live_release_control));
