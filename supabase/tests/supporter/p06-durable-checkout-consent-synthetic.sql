-- PAZO F16-P06 synthetic: durable exact-copy opt-in before ANY PayPal call.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE postgres;
DO $test$
DECLARE
 owner uuid:='67676767-1111-4111-8111-111111111111';
 key_a uuid:='67676767-2222-4222-8222-222222222222';
 key_b uuid:='67676767-3333-4333-8333-333333333333';
 version text:='pazo-supporter-p06.v1';
 raw text:='Amigo de PAZO es una suscripción opcional de 2.99 USD al mes que se renueva automáticamente. Puedes cancelarla por internet. La aplicación principal permanece gratuita. Este texto es solo sintético.';
 digest text;
 a jsonb;b jsonb;c jsonb;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'P06 test only disposable'; END IF;
 IF has_function_privilege('anon','public.f16_p06_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 OR has_function_privilege('authenticated','public.f16_p06_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.f16_p06_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 OR has_function_privilege('anon','public.f16_p06_read_published_offer(text)','EXECUTE')
 OR has_table_privilege('service_role','supporter_private.paypal_p06_checkout_attempts','SELECT')
 THEN RAISE EXCEPTION 'P06 untrusted RPC or table access'; END IF;
 IF (SELECT count(*) FROM pg_class c WHERE
  c.oid IN('supporter_private.paypal_p06_offers'::regclass,
           'supporter_private.paypal_p06_checkout_attempts'::regclass)
   AND c.relrowsecurity AND c.relforcerowsecurity)<>2
 THEN RAISE EXCEPTION 'P06 private RLS missing'; END IF;
 INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
 VALUES(owner,'authenticated','authenticated','p06-only@test.invalid','{}','{}');
 -- No published legal terms: cannot start or even advertise checkout.
 IF public.f16_p06_read_published_offer('es') IS NOT NULL
 THEN RAISE EXCEPTION 'P06 advertised unpublished terms'; END IF;
 BEGIN
  PERFORM public.f16_p06_begin_checkout(owner,key_a,'es',version,
   repeat('f',64),true);
  RAISE EXCEPTION 'P06 accepted unpublished terms';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 INSERT INTO supporter_private.paypal_p06_offers(
  version,locale,exact_copy,plan_id,published_at)
 VALUES(version,'es',raw,'P-14V25407JP6850922NLHMDKI',pg_catalog.clock_timestamp());
 SELECT o.sha256 INTO digest FROM supporter_private.paypal_p06_offers o
 WHERE o.version='pazo-supporter-p06.v1' AND o.locale='es';
 IF digest IS NULL THEN RAISE EXCEPTION 'P06 digest generation missing'; END IF;
 IF public.f16_p06_read_published_offer('en') IS NOT NULL
 THEN RAISE EXCEPTION 'P06 cross-locale leaked incorrect version'; END IF;
 a:=public.f16_p06_read_published_offer('es');
 IF a->>'termsDigest'<>digest OR a->>'exactCopy'<>raw
 THEN RAISE EXCEPTION 'P06 returned mismatching terms copy or digest'; END IF;
 BEGIN
  PERFORM public.f16_p06_begin_checkout(owner,key_a,'es',version,
   digest,false);
  RAISE EXCEPTION 'P06 missing explicit checkbox accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 BEGIN
  PERFORM public.f16_p06_begin_checkout(owner,key_a,'es',version,
   repeat('0',64),true);
  RAISE EXCEPTION 'P06 altered consent hash accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 a:=public.f16_p06_begin_checkout(owner,key_a,'es',version,digest,true);
 b:=public.f16_p06_begin_checkout(owner,key_a,'es',version,digest,true);
 IF a->>'intentId'<>b->>'intentId' OR b->>'state'<>'pending' OR
  (SELECT count(*) FROM supporter_private.paypal_p06_checkout_attempts)!=1 OR
  (SELECT count(*) FROM supporter_private.paypal_subscription_intents
   WHERE owner_id=owner)!=1
 THEN RAISE EXCEPTION 'P06 same-key idempotency failed'; END IF;
 IF a->>'createdAt' IS NULL OR b->>'createdAt' IS NULL
 THEN RAISE EXCEPTION 'P06 missing durable consent creation date'; END IF;
 BEGIN
  PERFORM public.f16_p06_begin_checkout(owner,key_b,'es',version,digest,true);
  RAISE EXCEPTION 'P06 second idempotency key opened second subscription';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 BEGIN
  PERFORM public.f16_p06_begin_checkout(owner,key_a,'en',version,digest,true);
  RAISE EXCEPTION 'P06 changed locale on same key';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 UPDATE supporter_private.paypal_subscription_intents
  SET state='bound',external_subscription_id='I-P06-SYNTH-BOUND',
      bound_at=pg_catalog.clock_timestamp()
 WHERE intent_id=a->>'intentId';
 c:=public.f16_p06_begin_checkout(owner,key_a,'es',version,digest,true);
 IF c->>'intentId'<>a->>'intentId' OR c->>'state'<>'bound'
 THEN RAISE EXCEPTION 'P06 repeat bind state not preserved'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries)
 OR EXISTS(SELECT 1 FROM supporter_private.paypal_first_period_reviews)
 THEN RAISE EXCEPTION 'P06 checkout created synthetic financial credit'; END IF;
END
$test$;
ROLLBACK;
