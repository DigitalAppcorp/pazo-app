-- Delete ONLY earlier synthetic checkout fixtures in this throwaway DB.
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres' THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
DELETE FROM supporter_private.pazo_paypal_live_cancel_claims;
DELETE FROM supporter_private.pazo_paypal_live_checkout_intents;
\i supabase/migrations/20261021164222_pazo_f16_live_immutable_bilingual_offer.sql
BEGIN;
DO $offer$
DECLARE owner_id uuid:='12345678-1234-4234-8234-123456789abc';
 intent text:='intent-88888888-1234-4234-8234-123456789abc';receipt jsonb; digest text;
BEGIN
 IF (SELECT count(*) FROM supporter_private.pazo_live_offer_versions)<>2 OR
  has_table_privilege('service_role','supporter_private.pazo_live_offer_versions','SELECT') OR
  has_function_privilege('authenticated','public.pazo_f16_live_service_acceptance_read(uuid,text)','EXECUTE') OR
  has_function_privilege('anon','supporter_private.pazo_live_offer_immutable()','EXECUTE')
 THEN RAISE EXCEPTION 'immutable offer count/ACL failed'; END IF;
 SELECT terms_digest INTO digest FROM supporter_private.pazo_live_offer_versions WHERE locale='es';
 IF digest<>'b3b6614d95ea6bb600fe9479ac4be115d39769f1e38a4fc30b7cb4273573dbb1'
 THEN RAISE EXCEPTION 'SQL/Edge Spanish terms digest mismatch'; END IF;
 BEGIN
  INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(intent_id,owner_id,request_key,merchant_generation,
   plan_id,locale,terms_version,terms_digest,affirmative_consent)
  SELECT intent,owner_id,'88888888-1234-4234-8234-123456789abc',generation,plan_id,'es',
   'pazo-supporter-live.beta20261021-v1',repeat('a',64),true FROM admin_private.pazo_paypal_merchant_generations WHERE generation=1;
  RAISE EXCEPTION 'unregistered consent digest accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(intent_id,owner_id,request_key,merchant_generation,
  plan_id,locale,terms_version,terms_digest,affirmative_consent)
 SELECT intent,owner_id,'88888888-1234-4234-8234-123456789abc',generation,plan_id,'es',
  'pazo-supporter-live.beta20261021-v1',digest,true FROM admin_private.pazo_paypal_merchant_generations WHERE generation=1;
 BEGIN
  UPDATE supporter_private.pazo_live_offer_versions SET title='Rewritten offer' WHERE locale='es';
  RAISE EXCEPTION 'registered offer modified';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  DELETE FROM supporter_private.pazo_live_offer_versions;
  RAISE EXCEPTION 'registered offer deleted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  TRUNCATE supporter_private.pazo_live_offer_versions CASCADE;
  RAISE EXCEPTION 'registered offer truncated';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE supporter_private.pazo_paypal_live_checkout_intents SET locale='en',terms_digest=
   (SELECT terms_digest FROM supporter_private.pazo_live_offer_versions WHERE locale='en') WHERE intent_id=intent;
  RAISE EXCEPTION 'buyer original language/terms changed';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE supporter_private.pazo_paypal_live_checkout_intents SET owner_id='33333333-3333-4333-8333-333333333333' WHERE intent_id=intent;
  RAISE EXCEPTION 'original buyer reassigned';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE supporter_private.pazo_paypal_live_checkout_intents SET provider_create_claimed_at=clock_timestamp(),
  provider_subscription_id='I-IMMUTABLE-OFFER-TEST',state='bound' WHERE intent_id=intent;
 BEGIN
  UPDATE supporter_private.pazo_paypal_live_checkout_intents SET provider_create_claimed_at=clock_timestamp() WHERE intent_id=intent;
  RAISE EXCEPTION 'idempotency window reset after original claim';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE supporter_private.pazo_paypal_live_checkout_intents SET provider_subscription_id='I-OTHER-OFFER-TEST' WHERE intent_id=intent;
  RAISE EXCEPTION 'original provider binding changed';
 EXCEPTION WHEN check_violation THEN NULL; END;
 -- Legitimate later provider status observations remain writable.
 UPDATE supporter_private.pazo_paypal_live_checkout_intents SET provider_status='CANCELLED',provider_status_at=clock_timestamp() WHERE intent_id=intent;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated"}',true);
 BEGIN
  PERFORM public.pazo_f16_live_service_acceptance_read(owner_id,intent);
  RAISE EXCEPTION 'non-service claims read acceptance';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 receipt:=public.pazo_f16_live_service_acceptance_read(owner_id,intent);
 IF receipt->>'source'<>'original_live_offer_acceptance' OR receipt->>'termsDigest'<>digest OR
  receipt->>'locale'<>'es' OR receipt->>'affirmativeConsent'<>'true' OR
  receipt->>'exactCopy' IS DISTINCT FROM (SELECT exact_copy FROM supporter_private.pazo_live_offer_versions WHERE locale='es') OR
  receipt ? 'subscriptionId' OR receipt ? 'ownerId' OR
  public.pazo_f16_live_service_acceptance_read('33333333-3333-4333-8333-333333333333',intent) IS NOT NULL
 THEN RAISE EXCEPTION 'original owner acceptance not immutable and scoped'; END IF;
 IF (public.pazo_f16_live_service_paid_period_projection(owner_id,clock_timestamp())->>'active')='true'
 THEN RAISE EXCEPTION 'consent or bound contract granted paid membership'; END IF;
 RAISE NOTICE 'F16_LIVE_IMMUTABLE_BILINGUAL_OFFER_OWNER_ACK_PG17_PASS';
END $offer$;
ROLLBACK;
\i supabase/rollbacks/f16_live_immutable_offer_REVIEW_REQUIRED.sql
\i supabase/migrations/20261021164222_pazo_f16_live_immutable_bilingual_offer.sql
DO $pass$ BEGIN
 IF (SELECT count(*) FROM supporter_private.pazo_live_offer_versions)<>2
 THEN RAISE EXCEPTION 'offer empty rollback/reapply failed'; END IF;
 RAISE NOTICE 'F16_LIVE_OFFER_EMPTY_ROLLBACK_REAPPLY_PASS';
END $pass$;
