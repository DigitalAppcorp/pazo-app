-- F16 service-only subscription + conservative reversal read; PG17 CI ONLY.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
DECLARE f text;
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'Read QA only in disposable PG17'; END IF;
 FOREACH f IN ARRAY ARRAY[
  'public.f16_lab_read_bound_intent_by_subscription(text)',
  'public.f16_lab_read_known_reversal_ids(text)'
 ] LOOP
  IF pg_catalog.pg_get_userbyid((SELECT proowner FROM pg_catalog.pg_proc WHERE oid=f::regprocedure))<>'postgres'
    OR NOT (SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid=f::regprocedure)
    OR has_function_privilege('anon',f,'EXECUTE')
    OR has_function_privilege('authenticated',f,'EXECUTE')
    OR NOT has_function_privilege('service_role',f,'EXECUTE')
  THEN RAISE EXCEPTION 'F16 private read RPC privilege bypass'; END IF;
 END LOOP;
 IF has_table_privilege('service_role','supporter_private.paypal_subscription_intents','SELECT')
 OR has_table_privilege('service_role','supporter_private.paypal_payment_reversals','SELECT')
 THEN RAISE EXCEPTION 'LAB accidentally granted direct finance SELECT'; END IF;
END $guard$;
SET LOCAL ROLE service_role;
DO $binding$
DECLARE a uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
        i text:='intent-68b9c7e5-41d6-47a4-9027-0c83fb8f8b09';
        v jsonb;
BEGIN
 IF NOT public.f16_paypal_create_private_intent(a,i)
 THEN RAISE EXCEPTION 'Synthetic owner missing'; END IF;
 IF public.f16_paypal_bind_private_intent(i,a,'I-READ-BOUND-QA','P-14V25407JP6850922NLHMDKI')<>'new_binding'
 THEN RAISE EXCEPTION 'Private test subscription not bound'; END IF;
 v:=public.f16_lab_read_bound_intent_by_subscription('I-READ-BOUND-QA');
 IF v IS NULL OR v->>'id'<>i OR v->>'owner_id'<>a::text OR
    v->>'external_subscription_id'<>'I-READ-BOUND-QA' OR
    v->>'state'<>'bound' OR
    (SELECT count(*) FROM pg_catalog.jsonb_object_keys(v))<>6
 THEN RAISE EXCEPTION 'Service bound owner projection mismatch'; END IF;
 IF public.f16_lab_read_bound_intent_by_subscription('I-NOTFOUND-QA') IS NOT NULL
 THEN RAISE EXCEPTION 'Nonexistent subscription returned owner'; END IF;
END $binding$;
DO $input$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN
  PERFORM public.f16_lab_read_bound_intent_by_subscription('I-../../other');
 EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Bad subscription reference allowed'; END IF;
 rejected:=false;
 BEGIN
  PERFORM public.f16_lab_read_known_reversal_ids('I-../other');
 EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Bad reversal reference allowed'; END IF;
END $input$;
SET LOCAL ROLE postgres;
-- An unmatched refund tombstone must disable ALL "empty" reversal decisions.
INSERT INTO supporter_private.paypal_payment_reversals
  (external_payment_id,reversal_kind,provider_verified_at)
VALUES ('PAY-UNMATCHED-READ-QA','refunded','2026-10-14 10:00:00+00');
SET LOCAL ROLE service_role;
DO $fail_closed$
BEGIN
 IF public.f16_lab_read_known_reversal_ids('I-READ-BOUND-QA') IS NOT NULL
 THEN RAISE EXCEPTION 'Orphan refund counted as absent'; END IF;
END $fail_closed$;
SET LOCAL ROLE postgres;
DELETE FROM supporter_private.paypal_payment_reversals WHERE external_payment_id='PAY-UNMATCHED-READ-QA';
-- A signed refund in the private inbox that is not yet processed is also unknown.
INSERT INTO supporter_private.paypal_verified_event_inbox(provider_event_id,event_type)
VALUES ('WH-UNRESOLVED-READ-QA','PAYMENT.SALE.REFUNDED');
SET LOCAL ROLE service_role;
DO $pending$
BEGIN
 IF public.f16_lab_read_known_reversal_ids('I-READ-BOUND-QA') IS NOT NULL
 THEN RAISE EXCEPTION 'Unresolved refund notification was treated as absent'; END IF;
END $pending$;
SET LOCAL ROLE postgres;
DELETE FROM supporter_private.paypal_verified_event_inbox WHERE provider_event_id='WH-UNRESOLVED-READ-QA';
-- Known reversed sale from a matching subscription is returned, if the
-- remainder of the disposable fixture contains no unmatched reversals.
DO $positive$
DECLARE p text:='PAY-READ-QA-NEW';
        ids jsonb;
BEGIN
 PERFORM supporter_private.f16_private_record_payment(
  p,'I-READ-BOUND-QA','63e812b0-a7e5-49f6-b2dd-c11d2c72af57',
  'P-14V25407JP6850922NLHMDKI',299,'USD','2026-10-13 19:00:00+00');
 PERFORM supporter_private.f16_private_record_reversal(p,'refunded','2026-10-14 10:00:00+00');
 ids:=public.f16_lab_read_known_reversal_ids('I-READ-BOUND-QA');
 IF ids IS NOT NULL AND (pg_catalog.jsonb_typeof(ids)<>'array' OR NOT ids @> '["PAY-READ-QA-NEW"]'::jsonb)
 THEN RAISE EXCEPTION 'Known refund ID missing from scoped projection'; END IF;
 IF supporter_private.wall_has_verified_entitlement(NULL::uuid)
 THEN RAISE EXCEPTION 'Read granted coverage'; END IF;
END $positive$;
ROLLBACK;
SELECT 'PASS: F16 private owner binding, conservative orphan/event recovery, ACL no access';