DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres' THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
\i supabase/migrations/20261021181431_pazo_f16_live_owner_checkout_slot.sql
BEGIN;
-- Earlier disposable labs intentionally retire merchant generation 1 and
-- change the gateway plan. Restore the synthetic fixture for this isolated
-- checkout test only (the entire section ROLLBACKs after assertions).
UPDATE admin_private.pazo_paypal_merchant_generations SET retired_at=NULL
 WHERE generation=1 AND environment='live';
UPDATE admin_private.paypal_gateway_settings
 SET plan_id='P-ABCDEFGHIJKLMN',webhook_id='WH-12345678900',
  return_origin='https://pazo-app-t83r.vercel.app'
 WHERE environment='live';
DO $fixture$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_merchant_generations
  WHERE generation=1 AND environment='live' AND retired_at IS NULL
    AND plan_id='P-ABCDEFGHIJKLMN') OR
  NOT EXISTS(SELECT 1 FROM admin_private.paypal_gateway_settings
   WHERE environment='live' AND plan_id='P-ABCDEFGHIJKLMN'
    AND webhook_id='WH-12345678900'
    AND return_origin='https://pazo-app-t83r.vercel.app')
 THEN RAISE EXCEPTION 'synthetic owner-slot fixture not restored'; END IF;
END $fixture$;
UPDATE admin_private.pazo_paypal_new_checkout_switch SET environment='live',live_enabled=true,kill_switch=false,active_generation=1 WHERE singleton;
DO $slot$
DECLARE owner_id uuid:='12345678-1234-4234-8234-123456789abc';
 key1 uuid:='88888888-1234-4234-8234-123456789abc';key2 uuid:='99999999-1234-4234-8234-123456789abc';
 intent text; d text; r jsonb; pending jsonb; recovery jsonb; ev jsonb; outcome text;
BEGIN
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 SELECT terms_digest INTO d FROM supporter_private.pazo_live_offer_versions WHERE locale='es';
 r:=public.pazo_f16_live_service_checkout_begin(owner_id,key1,1,'es','pazo-supporter-live.beta20261021-v1',d);
 IF r->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'begin failed %',r; END IF;
 intent:=r->>'intentId';
 r:=public.pazo_f16_live_service_checkout_begin(owner_id,key2,1,'es','pazo-supporter-live.beta20261021-v1',d);
 IF r->>'code' IS DISTINCT FROM 'owner_slot_occupied' THEN RAISE EXCEPTION 'second key bypassed owner slot %',r; END IF;
 IF public.pazo_f16_live_service_abandon_unclaimed('33333333-3333-4333-8333-333333333333',intent)
 THEN RAISE EXCEPTION 'foreign owner closed slot'; END IF;
 IF NOT public.pazo_f16_live_service_abandon_unclaimed(owner_id,intent) THEN RAISE EXCEPTION 'unclaimed abandon failed'; END IF;
 r:=public.pazo_f16_live_service_checkout_begin(owner_id,key1,1,'es','pazo-supporter-live.beta20261021-v1',d);
 IF r->>'code' IS DISTINCT FROM 'closed_checkout_requires_new_consent' THEN RAISE EXCEPTION 'closed consent reused'; END IF;
 r:=public.pazo_f16_live_service_checkout_begin(owner_id,key2,1,'es','pazo-supporter-live.beta20261021-v1',d);
 intent:=r->>'intentId';
 IF r->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'fresh consent rejected'; END IF;
 IF public.pazo_f16_live_service_provider_claim_with_origin(owner_id,intent,key2,1,'https://attacker.example')
 THEN RAISE EXCEPTION 'untrusted provider origin accepted'; END IF;
 IF NOT public.pazo_f16_live_service_provider_claim_with_origin(owner_id,intent,key2,1,'https://pazo-app-t83r.vercel.app')
 THEN RAISE EXCEPTION 'original claim failed'; END IF;
 IF public.pazo_f16_live_service_provider_claim_with_origin(owner_id,intent,key2,1,'https://pazo-app-t83r.vercel.app') OR
  public.pazo_f16_live_service_abandon_unclaimed(owner_id,intent)
 THEN RAISE EXCEPTION 'claimed create reset or abandoned'; END IF;
 BEGIN
  UPDATE supporter_private.pazo_paypal_live_checkout_intents SET provider_request_origin='https://different.example' WHERE intent_id=intent;
  RAISE EXCEPTION 'original request changed';
 EXCEPTION WHEN check_violation THEN NULL; END;
 pending:=public.pazo_f16_live_service_pending_checkout_read(intent,1);
 IF pending->>'ownerId' IS DISTINCT FROM owner_id::text OR pending->>'source' IS DISTINCT FROM 'original_pending_live_checkout'
 THEN RAISE EXCEPTION 'pending scope missing'; END IF;
 IF public.pazo_f16_live_service_recovery_claim('33333333-3333-4333-8333-333333333333',intent) IS NOT NULL
 THEN RAISE EXCEPTION 'foreign recovery lease'; END IF;
 recovery:=public.pazo_f16_live_service_recovery_claim(owner_id,intent);
 IF recovery->>'requestKey' IS DISTINCT FROM key2::text OR recovery->>'providerOrigin' IS DISTINCT FROM 'https://pazo-app-t83r.vercel.app' OR
  public.pazo_f16_live_service_recovery_claim(owner_id,intent) IS NOT NULL
 THEN RAISE EXCEPTION 'recovery lost immutable request or concurrent lease'; END IF;
 ev:=jsonb_build_object('proofSource','paypal_live_postback_success','signedBodySha256',repeat('b',64),
  'webhookId','WH-12345678900','subscriptionId','I-ORPHAN-RECOVERED','subjectId','I-ORPHAN-RECOVERED',
  'providerEventAt','2026-10-21T12:00:00.000Z','subjectAt','2026-10-21T12:00:00.000Z','activationAt',NULL,'nextBillingAt',NULL);
 outcome:=public.pazo_f16_live_service_signed_event_queue(owner_id,intent,'I-ORPHAN-RECOVERED',1,'WH-ORPHAN-CREATED','BILLING.SUBSCRIPTION.CREATED',ev||'{"webhookId":"WRONG-WEBHOOK"}'::jsonb);
 IF outcome IS DISTINCT FROM 'signed_evidence_invalid' THEN RAISE EXCEPTION 'invalid orphan receipt not rejected %',outcome; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents WHERE intent_id=intent AND state='bound') OR
  EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox WHERE provider_event_id='WH-ORPHAN-CREATED')
 THEN RAISE EXCEPTION 'orphan bind and receipt not atomic'; END IF;
 outcome:=public.pazo_f16_live_service_signed_event_queue(owner_id,intent,'I-ORPHAN-RECOVERED',1,'WH-ORPHAN-CREATED','BILLING.SUBSCRIPTION.CREATED',ev);
 IF outcome IS DISTINCT FROM 'queued' THEN RAISE EXCEPTION 'signed orphan failed %',outcome; END IF;
 IF public.pazo_f16_live_service_pending_checkout_read(intent,1) IS NOT NULL OR
  NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents WHERE intent_id=intent AND state='bound' AND recovery_lease IS NULL) OR
  public.pazo_f16_live_service_signed_event_queue(owner_id,intent,'I-ORPHAN-RECOVERED',1,'WH-ORPHAN-CREATED','BILLING.SUBSCRIPTION.CREATED',ev)<>'duplicate_verified_event'
 THEN RAISE EXCEPTION 'orphan finalization or duplicate failed'; END IF;
 IF (public.pazo_f16_live_service_paid_period_projection(owner_id,clock_timestamp())->>'active')='true'
 THEN RAISE EXCEPTION 'signed creation granted benefits'; END IF;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated"}',true);
 BEGIN
  PERFORM public.pazo_f16_live_service_owner_checkouts_read(owner_id);
  RAISE EXCEPTION 'non-service owner lookup';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF has_function_privilege('service_role','supporter_private.pazo_live_queue_signed_bound_original(uuid,text,text,bigint,text,text,jsonb)','EXECUTE') OR
  has_function_privilege('service_role','public.pazo_f16_live_service_provider_claim(uuid,text,uuid,bigint)','EXECUTE') OR
  has_function_privilege('authenticated','public.pazo_f16_live_service_pending_checkout_read(text,bigint)','EXECUTE')
 THEN RAISE EXCEPTION 'slot/receipt bridges exposed'; END IF;
 RAISE NOTICE 'F16_LIVE_OWNER_SLOT_ORIGINAL_REQUEST_RECOVERY_ORPHAN_ATOMIC_PG17_PASS';
END $slot$;
ROLLBACK;
