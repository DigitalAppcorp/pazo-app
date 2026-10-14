-- F16 subscription owner-binding QA. Disposable PostgreSQL only.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'Isolated F16 database required'; END IF;
END $guard$;

DO $permissions$ BEGIN
 IF EXISTS (
   SELECT 1 FROM pg_catalog.pg_class
   WHERE oid='supporter_private.paypal_subscription_intents'::regclass
     AND (NOT relrowsecurity OR NOT relforcerowsecurity)
 ) OR
 has_table_privilege('anon','supporter_private.paypal_subscription_intents','SELECT') OR
 has_table_privilege('authenticated','supporter_private.paypal_subscription_intents','INSERT') OR
 has_table_privilege('service_role','supporter_private.paypal_subscription_intents','SELECT') OR
 has_function_privilege('anon','supporter_private.f16_lab_bind_subscription(text,uuid,text,text,text)','EXECUTE') OR
 has_function_privilege('authenticated','supporter_private.f16_lab_bind_subscription(text,uuid,text,text,text)','EXECUTE') OR
 has_function_privilege('service_role','supporter_private.f16_lab_bind_subscription(text,uuid,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Client could access F16 subscription intent'; END IF;
 IF to_regclass('supporter_private.coverage_periods') IS NOT NULL
 THEN RAISE EXCEPTION 'Intent gate must not create paid membership'; END IF;
END $permissions$;

DO $cases$
DECLARE
 a uuid := '63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
 b uuid := '8b134f73-5ee3-49a2-9a36-3e1592e5af81';
 plan text := 'P-14V25407JP6850922NLHMDKI';
 result text;
 denied boolean;
BEGIN
 INSERT INTO supporter_private.paypal_subscription_intents
  (intent_id,owner_id,plan_id) VALUES
  ('intent-a-abcdefghijklmnop',a,plan),
  ('intent-b-abcdefghijklmnop',b,plan),
  ('intent-c-abcdefghijklmnop',b,plan);
 -- A must never hijack B's pending intent.
 denied:=false;
 BEGIN
  PERFORM supporter_private.f16_lab_bind_subscription(
  'intent-b-abcdefghijklmnop',a,'I-SANDBOX-BBBB',plan,'intent-b-abcdefghijklmnop');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-owner binding accepted'; END IF;

 -- PayPal custom_id must match the exact pre-existing owner intent.
 denied:=false;
 BEGIN
  PERFORM supporter_private.f16_lab_bind_subscription(
  'intent-a-abcdefghijklmnop',a,'I-SANDBOX-AAAA',plan,'intent-b-abcdefghijklmnop');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Forged PayPal custom_id accepted'; END IF;

 denied:=false;
 BEGIN
  PERFORM supporter_private.f16_lab_bind_subscription(
  'intent-a-abcdefghijklmnop',a,'I-SANDBOX-AAAA','P-WRONG','intent-a-abcdefghijklmnop');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Wrong PayPal plan accepted'; END IF;

 result:=supporter_private.f16_lab_bind_subscription(
   'intent-a-abcdefghijklmnop',a,'I-SANDBOX-AAAA',plan,'intent-a-abcdefghijklmnop');
 IF result<>'new_binding' THEN RAISE EXCEPTION 'Verified owner intent not bound'; END IF;
 result:=supporter_private.f16_lab_bind_subscription(
   'intent-a-abcdefghijklmnop',a,'I-SANDBOX-AAAA',plan,'intent-a-abcdefghijklmnop');
 IF result<>'already_bound' THEN RAISE EXCEPTION 'Retry duplicated binding'; END IF;

 -- Intent cannot be relinked once bound.
 denied:=false;
 BEGIN
  PERFORM supporter_private.f16_lab_bind_subscription(
   'intent-a-abcdefghijklmnop',a,'I-SANDBOX-OTHER',plan,'intent-a-abcdefghijklmnop');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Rebinding existing intent accepted'; END IF;

 -- A second owner must not claim the same subscription.
 denied:=false;
 BEGIN
  PERFORM supporter_private.f16_lab_bind_subscription(
   'intent-b-abcdefghijklmnop',b,'I-SANDBOX-AAAA',plan,'intent-b-abcdefghijklmnop');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Duplicate owner claim accepted'; END IF;

 IF (SELECT count(*) FROM supporter_private.paypal_subscription_intents WHERE state='bound')<>1 OR
    (SELECT count(*) FROM supporter_private.paypal_subscription_intents WHERE state='pending')<>2
 THEN RAISE EXCEPTION 'Claim failure altered pending intent'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_subscription_intents
           WHERE owner_id=b AND external_subscription_id IS NOT NULL)
 THEN RAISE EXCEPTION 'Other owner acquired subscription'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries)
 THEN RAISE EXCEPTION 'Intent binding wrote payment'; END IF;
 RAISE NOTICE 'PASS F16 ownership: cross-owner, forged custom_id, wrong plan, replay and conflicting subscription denied';
END $cases$;
ROLLBACK;
