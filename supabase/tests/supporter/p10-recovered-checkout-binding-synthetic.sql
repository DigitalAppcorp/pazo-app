-- PAZO F16-P10 — synthetic owner/claim/unique subscription binding.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE postgres;
DO $test$
DECLARE
 owner_a uuid:='87878787-1111-4111-8111-111111111111';
 owner_b uuid:='87878787-2222-4222-8222-222222222222';
 key_a uuid:='87878787-3333-4333-8333-333333333333';
 key_b uuid:='87878787-4444-4444-8444-444444444444';
 ver text:='pazo-supporter-p10.v1';
 plan text:='P-14V25407JP6850922NLHMDKI';
 sub text:='I-P10-SYNTHETIC';
 digest_a text;
 digest_b text;
 a jsonb;
 b jsonb;
 result text;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres' THEN RAISE EXCEPTION 'P10 disposable only'; END IF;
 IF has_function_privilege('anon','public.f16_p10_bind_recovered_checkout(uuid,uuid,text,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.f16_p10_bind_recovered_checkout(uuid,uuid,text,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.f16_p10_bind_recovered_checkout(uuid,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'P10 privileged function exposed'; END IF;
 INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
 VALUES (owner_a,'authenticated','authenticated','p10-a@invalid.test','{}','{}'),
        (owner_b,'authenticated','authenticated','p10-b@invalid.test','{}','{}');
 INSERT INTO supporter_private.paypal_p06_offers(version,locale,exact_copy,plan_id,published_at)
 VALUES (ver,'es',repeat('Aviso opcional mensual PAZO 2.99 USD. ',5),plan,pg_catalog.clock_timestamp()),
        (ver,'en',repeat('PAZO optional monthly supporter USD 2.99. ',5),plan,pg_catalog.clock_timestamp());
 SELECT sha256 INTO digest_a FROM supporter_private.paypal_p06_offers
 WHERE version=ver AND locale='es';
 SELECT sha256 INTO digest_b FROM supporter_private.paypal_p06_offers
 WHERE version=ver AND locale='en';
 a:=public.f16_p06_begin_checkout(owner_a,key_a,'es',ver,digest_a,true);
 b:=public.f16_p06_begin_checkout(owner_b,key_b,'en',ver,digest_b,true);
 BEGIN
  PERFORM public.f16_p10_bind_recovered_checkout(owner_a,key_a,a->>'intentId',sub);
  RAISE EXCEPTION 'P10 accepted intent without P07 claim';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 IF NOT public.f16_p07_claim_provider_create(owner_a,key_a,a->>'intentId') THEN
  RAISE EXCEPTION 'P10 original claim missing'; END IF;
 IF NOT public.f16_p07_claim_provider_create(owner_b,key_b,b->>'intentId') THEN
  RAISE EXCEPTION 'P10 second original claim missing'; END IF;
 BEGIN
  PERFORM public.f16_p10_bind_recovered_checkout(owner_b,key_a,a->>'intentId',sub);
  RAISE EXCEPTION 'P10 accepted forged owner';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 BEGIN
  PERFORM public.f16_p10_bind_recovered_checkout(owner_a,key_b,a->>'intentId',sub);
  RAISE EXCEPTION 'P10 accepted forged request key';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 result:=public.f16_p10_bind_recovered_checkout(owner_a,key_a,a->>'intentId',sub);
 IF result<>'new_binding' THEN RAISE EXCEPTION 'P10 bind failed'; END IF;
 result:=public.f16_p10_bind_recovered_checkout(owner_a,key_a,a->>'intentId',sub);
 IF result<>'already_bound' THEN RAISE EXCEPTION 'P10 same-id replay not idempotent'; END IF;
 BEGIN
  PERFORM public.f16_p10_bind_recovered_checkout(owner_b,key_b,b->>'intentId',sub);
  RAISE EXCEPTION 'P10 duplicate PayPal sub claimed by second user';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 BEGIN
  PERFORM public.f16_p10_bind_recovered_checkout(owner_a,key_a,a->>'intentId','I-DIFFERENT');
  RAISE EXCEPTION 'P10 original intent switched to different PayPal sub';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 IF (SELECT count(*) FROM supporter_private.paypal_subscription_intents
     WHERE external_subscription_id=sub AND state='bound')<>1
 OR (SELECT count(*) FROM supporter_private.paypal_subscription_intents
     WHERE state='bound')<>1
 OR (SELECT count(*) FROM supporter_private.paypal_p06_checkout_attempts
     WHERE provider_create_claimed_at IS NOT NULL)<>2
 OR (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>0
 THEN RAISE EXCEPTION 'P10 integrity or no-payment invariant failed'; END IF;
END
$test$;
ROLLBACK;
