-- Existing-owner V1 consent MUST stay immutable when a fresh V2 starts.
BEGIN;
SET LOCAL ROLE postgres;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR to_regprocedure('public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)') IS NULL
 THEN RAISE EXCEPTION 'Not synthetic PG17'; END IF;
 IF has_function_privilege('anon','public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 OR has_function_privilege('authenticated','public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 OR has_table_privilege('service_role','supporter_private.f16_sandbox_qa_v2_checkout_attempts','SELECT')
 THEN RAISE EXCEPTION 'V2 checkout owner/ACL leak'; END IF;
END $guard$;
INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
VALUES ('61111111-1111-4111-8111-111111111111','authenticated','authenticated',
 'v2-existing-owner@test.invalid','{}','{}');
INSERT INTO supporter_private.f16_sandbox_qa_owners(owner_id,status,expires_at)
VALUES ('61111111-1111-4111-8111-111111111111','enabled',
pg_catalog.clock_timestamp()+interval '1 day');
INSERT INTO supporter_private.paypal_subscription_intents
 (intent_id,owner_id,provider,plan_id,state)
VALUES ('intent-72222222-2222-4222-8222-222222222222',
 '61111111-1111-4111-8111-111111111111','paypal',
 'P-14V25407JP6850922NLHMDKI','pending');
INSERT INTO supporter_private.paypal_p06_checkout_attempts
 (owner_id,request_key,intent_id,locale,terms_version,terms_sha256)
SELECT '61111111-1111-4111-8111-111111111111',
 '73333333-3333-4333-8333-333333333333',
 'intent-72222222-2222-4222-8222-222222222222',
 o.locale,o.version,o.sha256 FROM supporter_private.paypal_p06_offers o
 WHERE o.version='pazo-supporter-sandbox.qa20261016-v1' AND o.locale='es';
DO $test$
DECLARE owner_id uuid:='61111111-1111-4111-8111-111111111111';
 request_a uuid:='74444444-4444-4444-8444-444444444444';
 request_b uuid:='75555555-5555-4555-8555-555555555555';
 digest text;
 a jsonb;b jsonb;
BEGIN
 SELECT sha256 INTO digest FROM supporter_private.paypal_p06_offers
 WHERE version='pazo-supporter-sandbox.benefits-v2' AND locale='es';
 IF digest IS NULL THEN RAISE EXCEPTION 'V2 published offer absent'; END IF;
 BEGIN
  PERFORM public.f16_qa_v2_begin_checkout(owner_id,request_a,'es',
   'pazo-supporter-sandbox.qa20261016-v1',digest,true);
  RAISE EXCEPTION 'Old offer accepted for V2 benefits';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.f16_qa_v2_begin_checkout(owner_id,request_a,'es',
   'pazo-supporter-sandbox.benefits-v2',digest,false);
  RAISE EXCEPTION 'Unmarked consent was accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.f16_qa_v2_begin_checkout(owner_id,request_a,'es',
   'pazo-supporter-sandbox.benefits-v2',repeat('a',64),true);
  RAISE EXCEPTION 'Forged acceptance hash accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 a:=public.f16_qa_v2_begin_checkout(owner_id,request_a,'es',
   'pazo-supporter-sandbox.benefits-v2',digest,true);
 b:=public.f16_qa_v2_begin_checkout(owner_id,request_a,'es',
   'pazo-supporter-sandbox.benefits-v2',digest,true);
 IF a->>'intentId' IS NULL OR b->>'intentId'<>a->>'intentId'
 OR a->>'state'<>'pending'
 OR (SELECT count(*) FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
   WHERE owner_id=owner_id)<>1
 THEN RAISE EXCEPTION 'New V2 idempotency was not isolated'; END IF;
 BEGIN
  PERFORM public.f16_qa_v2_begin_checkout(owner_id,request_b,'es',
   'pazo-supporter-sandbox.benefits-v2',digest,true);
  RAISE EXCEPTION 'A second V2 key was accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 IF NOT public.f16_qa_v2_claim_provider_create(owner_id,request_a,a->>'intentId')
 OR public.f16_qa_v2_claim_provider_create(owner_id,request_a,a->>'intentId')
 THEN RAISE EXCEPTION 'PayPal POST claim was not one-shot'; END IF;
 IF (SELECT count(*) FROM supporter_private.paypal_p06_checkout_attempts
   WHERE owner_id=owner_id AND terms_version='pazo-supporter-sandbox.qa20261016-v1')<>1
 OR (SELECT count(*) FROM supporter_private.paypal_subscription_intents
   WHERE owner_id=owner_id)<>2
 THEN RAISE EXCEPTION 'Existing P06 history modified or V2 not separated'; END IF;
END $test$;
DO $test$
BEGIN
 UPDATE supporter_private.f16_sandbox_qa_owners SET status='disabled'
 WHERE owner_id='61111111-1111-4111-8111-111111111111';
 IF public.f16_qa_v2_claim_provider_create(
   '61111111-1111-4111-8111-111111111111',
   '74444444-4444-4444-8444-444444444444',
   'intent-72222222-2222-4222-8222-222222222222')
 THEN RAISE EXCEPTION 'Disabled owner claimed another PayPal POST'; END IF;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'F16_QA_V2_EXISTING_OWNER_SECOND_CHECKOUT_PG17_PASS';
