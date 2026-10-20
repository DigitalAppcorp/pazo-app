-- PAZO F16 isolated, synthetic PostgreSQL 17 bootstrap + event lease test.
-- Invoked AFTER f16-live-gateway-disposable-lab.sql has built its fixture.
-- NEVER run this against a hosted/shared/user database.
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY' USING ERRCODE='42501'; END IF;
END $guard$;

UPDATE admin_private.paypal_gateway_settings
 SET plan_id='P-PAZOTESTABCDE1234'
 WHERE environment='live';
UPDATE admin_private.pazo_paypal_new_checkout_switch
 SET environment='sandbox',live_enabled=false,kill_switch=true,active_generation=NULL
 WHERE singleton;
INSERT INTO admin_private.admin_grants(user_id)
 VALUES('12345678-1234-4234-8234-123456789abc') ON CONFLICT DO NOTHING;

\i supabase/drafts/f16_live_bootstrap_generation_REVIEW_REQUIRED.sql
\i supabase/drafts/f16_live_durable_inbox_lease_REVIEW_REQUIRED.sql
DO $verify$
DECLARE
 actor uuid='12345678-1234-4234-8234-123456789abc';
 v jsonb; attempt jsonb; claimed jsonb; next_claim jsonb;
 gen bigint; t uuid;
BEGIN
 IF has_function_privilege('anon',
  'public.pazo_f16_live_service_bootstrap_reserve(uuid,text)','EXECUTE')
  OR has_function_privilege('authenticated',
  'public.pazo_f16_live_service_inbox_claim(bigint,text)','EXECUTE')
  OR has_table_privilege('service_role',
  'admin_private.pazo_paypal_live_bootstrap_reservations','SELECT')
 THEN RAISE EXCEPTION 'Invalid LIVE bootstrap/lease ACL'; END IF;
 BEGIN
  PERFORM public.pazo_f16_live_service_bootstrap_reserve(actor,'P-PAZOTESTABCDE1234');
  RAISE EXCEPTION 'Missing service JWT accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM pg_catalog.set_config('request.jwt.claim.role','service_role',true);
 attempt:=public.pazo_f16_live_service_bootstrap_reserve(actor,'P-PAZOTESTABCDE1234');
 IF attempt->>'reserved'<>'true' OR attempt->>'mayCharge'<>'false'
 THEN RAISE EXCEPTION 'Unable to reserve genuine DB sequence'; END IF;
 gen:=(attempt->>'generation')::bigint;
 v:=public.pazo_f16_live_service_bootstrap_reserve(actor,'P-PAZOTESTABCDE1234');
 IF v->>'reserved' IS DISTINCT FROM 'false'
 THEN RAISE EXCEPTION 'Duplicate plan reserved another generation'; END IF;
 v:=public.pazo_f16_live_service_bootstrap_finalize(
  actor,gen,'P-PAZOTESTABCDE1234','WH-PAZOTESTORIGINAL',repeat('f',64));
 IF v->>'finalized'<>'true' OR (v->>'generation')::bigint<>gen
 THEN RAISE EXCEPTION 'Provider-proven generation cannot be finalized'; END IF;
 v:=public.pazo_f16_live_service_bootstrap_finalize(
  actor,gen,'P-PAZOTESTABCDE1234','WH-PAZOTESTORIGINAL',repeat('f',64));
 IF v->>'finalized' IS DISTINCT FROM 'false'
 THEN RAISE EXCEPTION 'Generation finalized twice'; END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_merchant_generations
   WHERE generation=gen AND environment='live'
    AND credential_source='edge_secrets'
    AND webhook_id='WH-PAZOTESTORIGINAL' AND
    client_id_vault IS NULL AND client_secret_vault IS NULL)
 THEN RAISE EXCEPTION 'Live metadata not immutable'; END IF;

 INSERT INTO supporter_private.pazo_paypal_live_event_inbox(
  merchant_generation,provider_event_id,event_type,linked_intent_id)
 VALUES(1,'WH-EVENT-LEASE-1','PAYMENT.SALE.COMPLETED',
  'intent-12345678-1234-4234-8234-123456789abc');
 claimed:=public.pazo_f16_live_service_inbox_claim(1,'WH-EVENT-LEASE-1');
 IF claimed->>'claimed'<>'true'
  OR claimed->>'financialEvidenceVerified'<>'false'
  OR claimed->>'mayGrantBenefits'<>'false'
 THEN RAISE EXCEPTION 'Claimed event wrongly considered paid'; END IF;
 t:=(claimed->>'leaseToken')::uuid;
 IF public.pazo_f16_live_service_inbox_finish(
   1,'WH-EVENT-LEASE-1',t,'processed')
 THEN RAISE EXCEPTION 'Event acknowledged without ledger'; END IF;
 IF NOT public.pazo_f16_live_service_inbox_finish(
   1,'WH-EVENT-LEASE-1',t,'pending')
 THEN RAISE EXCEPTION 'Unable to return leased event to pending'; END IF;
 next_claim:=public.pazo_f16_live_service_inbox_claim(1,'WH-EVENT-LEASE-1');
 IF next_claim->>'claimed'<>'true' OR
  next_claim->>'leaseToken'=claimed->>'leaseToken'
 THEN RAISE EXCEPTION 'Lease token reused on retry'; END IF;
 IF public.pazo_f16_live_service_inbox_finish(1,'WH-EVENT-LEASE-1',t,'held')
 THEN RAISE EXCEPTION 'Old token completed new lease'; END IF;
 IF NOT public.pazo_f16_live_service_inbox_finish(1,'WH-EVENT-LEASE-1',
  (next_claim->>'leaseToken')::uuid,'held')
 THEN RAISE EXCEPTION 'Cannot hold review-required lease'; END IF;
 IF EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE environment<>'sandbox' OR live_enabled OR NOT kill_switch OR active_generation IS NOT NULL)
 THEN RAISE EXCEPTION 'LIVE switched on by bootstrap lab'; END IF;
 RAISE NOTICE 'F16_LIVE_BOOTSTRAP_AND_DURABLE_LEASE_PG17_PASS_NO_HOSTED_WRITE';
END $verify$;
