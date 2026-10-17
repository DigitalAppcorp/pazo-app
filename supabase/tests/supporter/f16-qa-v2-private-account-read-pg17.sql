-- PAZO F16 owner-scoped V2 account receipt: PostgreSQL disposable only.
BEGIN;
SET LOCAL ROLE postgres;
DO $test$
DECLARE
 owner uuid:='61111111-1111-4111-8111-111111111111';
 foreign_owner uuid:='62222222-2222-4222-8222-222222222222';
 request_key uuid:='74444444-4444-4444-8444-444444444444';
 v_intent text;
 digest text;
 result jsonb;
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR to_regprocedure('public.f16_qa_v2_read_owner_account(uuid,text)') IS NULL
 OR has_function_privilege('anon','public.f16_qa_v2_read_owner_account(uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.f16_qa_v2_read_owner_account(uuid,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.f16_qa_v2_read_owner_account(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'V2 account read unavailable or leaked'; END IF;
 INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
 VALUES (owner,'authenticated','authenticated','pazo-v2-owner@example.invalid','{}','{}');
 INSERT INTO supporter_private.f16_sandbox_qa_owners(owner_id,status,expires_at)
 VALUES(owner,'enabled',pg_catalog.clock_timestamp()+interval '1 day');
 INSERT INTO supporter_private.paypal_subscription_intents(intent_id,owner_id,provider,plan_id,state)
 VALUES('intent-72222222-2222-4222-8222-222222222222',owner,
  'paypal','P-14V25407JP6850922NLHMDKI','pending');
 INSERT INTO supporter_private.paypal_p06_checkout_attempts
 (owner_id,request_key,intent_id,locale,terms_version,terms_sha256)
 SELECT owner,'73333333-3333-4333-8333-333333333333',
   'intent-72222222-2222-4222-8222-222222222222',locale,version,sha256
 FROM supporter_private.paypal_p06_offers
 WHERE version='pazo-supporter-sandbox.qa20261016-v1' AND locale='es';
 SELECT sha256 INTO digest FROM supporter_private.paypal_p06_offers
 WHERE version='pazo-supporter-sandbox.benefits-v2' AND locale='es';
 IF digest IS NULL THEN RAISE EXCEPTION 'V2 offer missing'; END IF;
 result:=public.f16_qa_v2_begin_checkout(owner,request_key,'es',
  'pazo-supporter-sandbox.benefits-v2',digest,true);
 v_intent:=result->>'intentId';
 result:=public.f16_qa_v2_read_owner_account(owner,v_intent);
 IF result->>'intentId'<>v_intent OR result->>'state'<>'pending'
 OR result->>'provider'<>'paypal'
 OR result->>'termsVersion'<>'pazo-supporter-sandbox.benefits-v2'
 OR result->>'termsDigest'<>digest
 OR result->>'externalSubscriptionId' IS NOT NULL
 OR pg_catalog.length(result->>'exactCopy')<500
 OR result->>'consentedAt' IS NULL
 THEN RAISE EXCEPTION 'V2 pending account missing correct accepted terms'; END IF;
 IF public.f16_qa_v2_read_owner_account(owner,NULL)->>'intentId'<>v_intent
 THEN RAISE EXCEPTION 'V2 account list for owner failed'; END IF;
 IF public.f16_qa_v2_read_owner_account(owner,
   'intent-72222222-2222-4222-8222-222222222222') IS NOT NULL
 THEN RAISE EXCEPTION 'Historical V1 subscription leaked via V2 reader'; END IF;
 IF public.f16_qa_v2_read_owner_account(foreign_owner,v_intent) IS NOT NULL
 THEN RAISE EXCEPTION 'Foreign owner accessed private V2 record'; END IF;
 IF public.f16_qa_v2_read_owner_account(owner,'not-an-intent') IS NOT NULL
 THEN RAISE EXCEPTION 'Invalid intent ID was accepted'; END IF;
 -- Merchant binding is a separate verified operation in runtime.
 UPDATE supporter_private.paypal_subscription_intents
 SET state='bound',external_subscription_id='I-PAYPAL-SYNTH-V2',bound_at=pg_catalog.clock_timestamp()
 WHERE intent_id=v_intent AND owner_id=owner;
 result:=public.f16_qa_v2_read_owner_account(owner,v_intent);
 IF result->>'state'<>'bound'
 OR result->>'externalSubscriptionId'<>'I-PAYPAL-SYNTH-V2'
 THEN RAISE EXCEPTION 'Bound V2 intent missing from scoped account'; END IF;
 -- Cancellation read needs to work after this QA membership is disabled;
 -- owner still owns the subscription even after benefit access expires.
 UPDATE supporter_private.f16_sandbox_qa_owners
 SET status='disabled' WHERE owner_id=owner;
 IF public.f16_qa_v2_read_owner_account(owner,v_intent)->>'state'<>'bound'
 THEN RAISE EXCEPTION 'Expired QA entitlement prevented account cancellation lookup'; END IF;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'F16_QA_V2_PRIVATE_ACCOUNT_READ_PG17_PASS';