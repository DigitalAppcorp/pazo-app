-- P24 must reject legacy/no-consent, stale lease, malformed offer,
-- incorrect owner, unpublished copy and invalid ordering. All rolled back.
\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE
 uid uuid:='11111111-1111-4111-8111-111111111111';
 wrong_uid uuid:='22222222-2222-4222-8222-222222222222';
 intent text:='intent-77777777-7777-4777-8777-777777777777';
 legacy text:='intent-99999999-9999-4999-8999-999999999999';
 sub text:='I-P24-NEW-SUB001';
 other text:='I-P24-LEGACY001';
 t timestamptz:=pg_catalog.clock_timestamp();
 claim jsonb; result jsonb; token uuid;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres' THEN RAISE EXCEPTION 'P24 synthetic only';END IF;
 IF NOT has_function_privilege('service_role','public.f16_p24_read_claimed_original_consent(text,uuid,text,text)','EXECUTE')
 OR has_function_privilege('anon','public.f16_p24_read_claimed_original_consent(text,uuid,text,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.f16_p24_read_claimed_original_consent(text,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'P24 consent RPC grants invalid'; END IF;

 INSERT INTO supporter_private.paypal_subscription_intents
 (intent_id,owner_id,provider,plan_id,state,external_subscription_id,bound_at)
 VALUES
 (intent,uid,'paypal','P-14V25407JP6850922NLHMDKI','bound',sub,t-interval '1 hour'),
 (legacy,uid,'paypal','P-14V25407JP6850922NLHMDKI','bound',other,t-interval '1 hour');
 INSERT INTO supporter_private.paypal_verified_event_inbox
 (provider_event_id,event_type,verified_at)
 VALUES('P24-NEW-SALE','PAYMENT.SALE.COMPLETED',t);
 -- Even after roll-out, a legacy account without P06 acceptance can NEVER pass.
 IF public.f16_p24_read_claimed_original_consent(
 'P24-NEW-SALE',pg_catalog.gen_random_uuid(),other,legacy) IS NOT NULL
 THEN RAISE EXCEPTION 'P24 legacy intent accepted'; END IF;
 INSERT INTO supporter_private.paypal_p06_offers
 (version,locale,sha256,plan_id,price_minor,currency,cadence,published_at)
 VALUES ('pazo-supporter-p24lab','es',repeat('a',64),
 'P-14V25407JP6850922NLHMDKI',299,'USD','MONTH_1',t-interval '3 hours');
 INSERT INTO supporter_private.paypal_p06_checkout_attempts
 (owner_id,request_key,intent_id,locale,terms_version,terms_sha256,
 consented_at,created_at,provider_create_claimed_at,retention_hold)
 VALUES(uid,pg_catalog.gen_random_uuid(),intent,'es',
 'pazo-supporter-p24lab',repeat('a',64),
 t-interval '2 hours',t-interval '115 minutes',t-interval '90 minutes',true);

 IF public.f16_p24_read_claimed_original_consent(
 'P24-NEW-SALE',pg_catalog.gen_random_uuid(),sub,intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P24 passed gate OFF'; END IF;
 UPDATE supporter_private.p05_inbox_worker_gate SET
 enabled=true,not_before=t-interval '1 minute' WHERE id=1;
 claim:=public.f16_p05_draft_claim_next_verified_event();
 IF claim IS NULL OR claim->>'eventId'<>'P24-NEW-SALE'
 THEN RAISE EXCEPTION 'P24 claim failed'; END IF;
 token:=(claim->>'leaseToken')::uuid;
 result:=public.f16_p24_read_claimed_original_consent('P24-NEW-SALE',token,sub,intent);
 IF result IS NULL OR result->>'ownerId'<>uid::text
 OR result->>'priceMinor'<>'299'
 OR result->>'cadence'<>'MONTH_1' OR result->>'locale'<>'es'
 OR result ? 'exactCopy' OR result ? 'payer_email'
 THEN RAISE EXCEPTION 'P24 legitimate consent projection absent/unsafe'; END IF;
 IF public.f16_p24_read_claimed_original_consent(
 'P24-NEW-SALE',pg_catalog.gen_random_uuid(),sub,intent) IS NOT NULL
 OR public.f16_p24_read_claimed_original_consent(
 'P24-NEW-SALE',token,other,legacy) IS NOT NULL
 THEN RAISE EXCEPTION 'P24 stale token/legacy exposed'; END IF;

 UPDATE supporter_private.paypal_p06_checkout_attempts
 SET owner_id=wrong_uid WHERE intent_id=intent;
 IF public.f16_p24_read_claimed_original_consent(
 'P24-NEW-SALE',token,sub,intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P24 owner mismatch allowed'; END IF;
 UPDATE supporter_private.paypal_p06_checkout_attempts
 SET owner_id=uid,terms_sha256=repeat('b',64) WHERE intent_id=intent;
 IF public.f16_p24_read_claimed_original_consent(
 'P24-NEW-SALE',token,sub,intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P24 digest mismatch allowed'; END IF;
 UPDATE supporter_private.paypal_p06_checkout_attempts
 SET terms_sha256=repeat('a',64) WHERE intent_id=intent;
 UPDATE supporter_private.paypal_p06_offers
 SET published_at=NULL WHERE version='pazo-supporter-p24lab';
 IF public.f16_p24_read_claimed_original_consent(
 'P24-NEW-SALE',token,sub,intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P24 unpublished terms allowed'; END IF;
 UPDATE supporter_private.paypal_p06_offers
 SET published_at=t-interval '3 hours' WHERE version='pazo-supporter-p24lab';

 IF NOT public.f16_p05_draft_finish_claimed_event(
 'P24-NEW-SALE',token,'review','cycle_unproven')
 THEN RAISE EXCEPTION 'P24 finish claim failed'; END IF;
 IF public.f16_p24_read_claimed_original_consent(
 'P24-NEW-SALE',token,sub,intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P24 quarantined claim read allowed'; END IF;
 IF (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>0
 THEN RAISE EXCEPTION 'P24 test credited ledger'; END IF;
END
$test$;
ROLLBACK;
