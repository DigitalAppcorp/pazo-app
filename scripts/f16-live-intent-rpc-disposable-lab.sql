-- Only in f14_synthetic AFTER the CAS rollback rehearsal.
-- This laboratory drops constraints only in its disposable PostgreSQL copy.
\i supabase/migrations/20261019234500_pazo_f16_live_intent_private_staging.sql
DO $blocked$
DECLARE r jsonb;
BEGIN
 r:=supporter_private.pazo_live_intent_begin(
 '12345678-1234-4234-8234-123456789abc',
 '66666666-6666-4666-8666-666666666666',1,'es',
 'pazo-supporter-live.offer-v1',repeat('b',64));
 IF r->>'code'<>'live_checkout_not_released'
 THEN RAISE EXCEPTION 'OFF switch created an intent: %',r; END IF;
 IF has_function_privilege('service_role',
 'supporter_private.pazo_live_intent_begin(uuid,uuid,bigint,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated',
 'supporter_private.pazo_live_intent_claim_once(uuid,text,uuid,bigint)','EXECUTE')
 THEN RAISE EXCEPTION 'Live intent RPC was accidentally granted to app/service'; END IF;
END $blocked$;
-- The earlier CAS test removed the OFF constraints in f14_synthetic ONLY.
-- Simulate a later PO release with immutable original merchant generation.
UPDATE admin_private.pazo_paypal_new_checkout_switch
 SET live_enabled=true,kill_switch=false
 WHERE singleton AND environment='live' AND active_generation=1;
DO $live_intent$
DECLARE a jsonb; b jsonb; conflict jsonb; wrong jsonb; claimed bool;
 v_count int;
BEGIN
 a:=supporter_private.pazo_live_intent_begin(
 '12345678-1234-4234-8234-123456789abc',
 '66666666-6666-4666-8666-666666666666',1,'es',
 'pazo-supporter-live.offer-v1',repeat('b',64));
 b:=supporter_private.pazo_live_intent_begin(
 '12345678-1234-4234-8234-123456789abc',
 '66666666-6666-4666-8666-666666666666',1,'es',
 'pazo-supporter-live.offer-v1',repeat('b',64));
 conflict:=supporter_private.pazo_live_intent_begin(
 '12345678-1234-4234-8234-123456789abc',
 '66666666-6666-4666-8666-666666666666',1,'es',
 'pazo-supporter-live.offer-v2',repeat('b',64));
 wrong:=supporter_private.pazo_live_intent_begin(
 '12345678-1234-4234-8234-123456789abc',
 '77777777-7777-4777-8777-777777777777',2,'es',
 'pazo-supporter-live.offer-v1',repeat('b',64));
 IF (a->>'ok')<>'true' OR a->>'state'<>'pending'
  OR b->>'intentId'<>a->>'intentId'
  OR conflict->>'code'<>'request_conflict'
  OR wrong->>'code'<>'live_checkout_not_released'
 THEN RAISE EXCEPTION 'Owner intent idempotency, terms or generation failed'; END IF;
 claimed:=supporter_private.pazo_live_intent_claim_once(
 '12345678-1234-4234-8234-123456789abc',
 a->>'intentId','66666666-6666-4666-8666-666666666666',1);
 IF claimed<>true OR supporter_private.pazo_live_intent_claim_once(
 '12345678-1234-4234-8234-123456789abc',
 a->>'intentId','66666666-6666-4666-8666-666666666666',1)<>false
 OR supporter_private.pazo_live_intent_claim_once(
 '33333333-3333-4333-8333-333333333333',
 a->>'intentId','66666666-6666-4666-8666-666666666666',1)<>false
 THEN RAISE EXCEPTION 'Provider CREATE intent can be claimed twice'; END IF;
 SELECT count(*) INTO v_count
 FROM supporter_private.pazo_paypal_live_checkout_intents
 WHERE request_key='66666666-6666-4666-8666-666666666666';
 IF v_count<>1 THEN RAISE EXCEPTION 'Duplicate Live owner intents'; END IF;
 RAISE NOTICE 'F16_LIVE_INTENT_OWNER_CLAIM_PG17_PASS';
END $live_intent$;
UPDATE admin_private.pazo_paypal_new_checkout_switch
 SET live_enabled=false,kill_switch=true WHERE singleton;
