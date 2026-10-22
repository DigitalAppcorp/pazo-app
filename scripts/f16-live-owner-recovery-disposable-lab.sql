-- Run ONLY after f16-live-gateway-disposable-lab.sql in disposable PG17.
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres' THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
\i supabase/migrations/20261021210000_pazo_f16_live_owner_recovery_finish.sql
BEGIN;
UPDATE admin_private.pazo_paypal_merchant_generations SET retired_at=NULL WHERE generation=1;
UPDATE admin_private.paypal_gateway_settings SET plan_id='P-ABCDEFGHIJKLMN',
 return_origin='https://pazo-app-t83r.vercel.app' WHERE environment='live';
UPDATE admin_private.pazo_paypal_new_checkout_switch SET environment='live',live_enabled=true,
 kill_switch=false,active_generation=1 WHERE singleton;
DO $checks$
DECLARE owner_id uuid:='63456789-1234-4234-8234-123456789abc';
 key_id uuid:='73456789-1234-4234-8234-123456789abc'; i text; offer_digest text;
 record jsonb; recovery jsonb; token uuid; periods_before bigint;
BEGIN
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 SELECT count(*) INTO periods_before FROM supporter_private.pazo_paypal_live_paid_periods;
 SELECT terms_digest INTO offer_digest FROM supporter_private.pazo_live_offer_versions WHERE locale='es';
 record:=public.pazo_f16_live_service_checkout_begin(owner_id,key_id,1,'es','pazo-supporter-live.beta20261021-v1',offer_digest);
 IF record->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'begin failed %',record; END IF;
 i:=record->>'intentId';
 IF NOT public.pazo_f16_live_service_provider_claim_with_origin(owner_id,i,key_id,1,'https://pazo-app-t83r.vercel.app') THEN RAISE EXCEPTION 'claim failed'; END IF;
 recovery:=public.pazo_f16_live_service_recovery_claim(owner_id,i);
 token:=(recovery->>'leaseToken')::uuid;
 IF token IS NULL THEN RAISE EXCEPTION 'no recovery lease'; END IF;
 IF public.pazo_f16_live_service_recovery_finish(owner_id,i,1,gen_random_uuid(),key_id,'P-ABCDEFGHIJKLMN','I-RECOVERED1234') OR
  public.pazo_f16_live_service_recovery_finish('83456789-1234-4234-8234-123456789abc',i,1,token,key_id,'P-ABCDEFGHIJKLMN','I-RECOVERED1234') OR
  public.pazo_f16_live_service_recovery_finish(owner_id,i,2,token,key_id,'P-ABCDEFGHIJKLMN','I-RECOVERED1234') OR
  public.pazo_f16_live_service_recovery_finish(owner_id,i,1,token,gen_random_uuid(),'P-ABCDEFGHIJKLMN','I-RECOVERED1234')
 THEN RAISE EXCEPTION 'recovery scope/lease bypass'; END IF;
 UPDATE supporter_private.pazo_paypal_live_checkout_intents SET recovery_expires_at=clock_timestamp()-interval '1 second' WHERE intent_id=i;
 IF public.pazo_f16_live_service_recovery_finish(owner_id,i,1,token,key_id,'P-ABCDEFGHIJKLMN','I-RECOVERED1234') THEN RAISE EXCEPTION 'expired lease accepted'; END IF;
 UPDATE supporter_private.pazo_paypal_live_checkout_intents SET recovery_expires_at=clock_timestamp()+interval '1 minute' WHERE intent_id=i;
 IF NOT public.pazo_f16_live_service_recovery_finish(owner_id,i,1,token,key_id,'P-ABCDEFGHIJKLMN','I-RECOVERED1234') OR
  NOT public.pazo_f16_live_service_recovery_finish(owner_id,i,1,token,key_id,'P-ABCDEFGHIJKLMN','I-RECOVERED1234') OR
  public.pazo_f16_live_service_recovery_finish(owner_id,i,1,token,key_id,'P-ABCDEFGHIJKLMN','I-DIFFERENT1234')
 THEN RAISE EXCEPTION 'recovery commit/replay/conflict incorrect'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents WHERE intent_id=i AND recovery_lease IS NOT NULL)
 THEN RAISE EXCEPTION 'binding did not clear lease'; END IF;
 IF public.pazo_f16_live_service_terminal_checkout_close(owner_id,i,1,'I-RECOVERED1234','ACTIVE') OR
  public.pazo_f16_live_service_terminal_checkout_close(owner_id,i,1,'I-RECOVERED1234',NULL) OR
  public.pazo_f16_live_service_terminal_checkout_close(owner_id,i,1,'I-WRONG','CANCELLED') OR
  public.pazo_f16_live_service_terminal_checkout_close('83456789-1234-4234-8234-123456789abc',i,1,'I-RECOVERED1234','CANCELLED')
 THEN RAISE EXCEPTION 'terminal scope bypass'; END IF;
 INSERT INTO supporter_private.pazo_paypal_live_event_inbox(merchant_generation,provider_event_id,event_type,linked_intent_id)
 VALUES(1,'WH-RECOVERY-PENDING','BILLING.SUBSCRIPTION.CANCELLED',i);
 IF public.pazo_f16_live_service_terminal_checkout_close(owner_id,i,1,'I-RECOVERED1234','CANCELLED') THEN RAISE EXCEPTION 'pending event bypass'; END IF;
 UPDATE supporter_private.pazo_paypal_live_event_inbox SET processing_state='processed' WHERE provider_event_id='WH-RECOVERY-PENDING';
 INSERT INTO supporter_private.pazo_paypal_live_cancel_claims(intent_id,merchant_generation,state)
 VALUES(i,1,'review_required');
 IF public.pazo_f16_live_service_terminal_checkout_close(owner_id,i,1,'I-RECOVERED1234','CANCELLED')
 THEN RAISE EXCEPTION 'unconfirmed cancellation bypass'; END IF;
 UPDATE supporter_private.pazo_paypal_live_cancel_claims SET state='confirmed',provider_confirmed_at=clock_timestamp() WHERE intent_id=i;
 INSERT INTO supporter_private.pazo_paypal_live_event_inbox(merchant_generation,provider_event_id,event_type,linked_intent_id,processing_state)
 VALUES(1,'WH-RECOVERY-SALE','PAYMENT.SALE.COMPLETED',i,'processed');
 INSERT INTO supporter_private.pazo_paypal_live_paid_periods(sale_id,intent_id,merchant_generation,provider_event_id,
  cycle_key,service_start,service_end,merchant_verified_at)
 VALUES('SALE-RECOVERY',i,1,'WH-RECOVERY-SALE','CYCLE-RECOVERY',clock_timestamp()-interval '1 day',
  clock_timestamp()+interval '20 days',clock_timestamp());
 periods_before:=periods_before+1;
 IF public.pazo_f16_live_service_terminal_checkout_close(owner_id,i,1,'I-RECOVERED1234','CANCELLED')
 THEN RAISE EXCEPTION 'unexpired coverage bypass'; END IF;
 INSERT INTO supporter_private.pazo_paypal_live_period_holds(sale_id,hold_id,kind,verified_at)
 VALUES('SALE-RECOVERY','HOLD-RECOVERY','refunded',clock_timestamp());
 IF public.pazo_f16_live_service_terminal_checkout_close(owner_id,i,1,'I-RECOVERED1234','CANCELLED')
 THEN RAISE EXCEPTION 'held but unexpired coverage bypass'; END IF;
 UPDATE supporter_private.pazo_paypal_live_paid_periods SET service_start=clock_timestamp()-interval '31 days',
  service_end=clock_timestamp()-interval '1 day' WHERE sale_id='SALE-RECOVERY';
 IF NOT public.pazo_f16_live_service_terminal_checkout_close(owner_id,i,1,'I-RECOVERED1234','CANCELLED') OR
  NOT public.pazo_f16_live_service_terminal_checkout_close(owner_id,i,1,'I-RECOVERED1234','CANCELLED')
 THEN RAISE EXCEPTION 'terminal close/replay failed'; END IF;
 record:=public.pazo_f16_live_service_checkout_begin(owner_id,key_id,1,'es','pazo-supporter-live.beta20261021-v1',offer_digest);
 IF record->>'code' IS DISTINCT FROM 'closed_checkout_requires_new_consent' THEN RAISE EXCEPTION 'old consent replayed'; END IF;
 record:=public.pazo_f16_live_service_checkout_begin(owner_id,gen_random_uuid(),1,'es','pazo-supporter-live.beta20261021-v1',offer_digest);
 IF record->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'fresh consent blocked'; END IF;
 IF (SELECT count(*) FROM supporter_private.pazo_paypal_live_paid_periods)<>periods_before THEN RAISE EXCEPTION 'recovery changed financial coverage'; END IF;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated"}',true);
 BEGIN
  PERFORM public.pazo_f16_live_service_recovery_finish(owner_id,i,1,token,key_id,'P-ABCDEFGHIJKLMN','I-RECOVERED1234');
  RAISE EXCEPTION 'authenticated role bypassed guard';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.pazo_f16_live_service_terminal_checkout_close(owner_id,i,1,'I-RECOVERED1234','CANCELLED');
  RAISE EXCEPTION 'authenticated role bypassed close guard';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF has_function_privilege('anon','public.pazo_f16_live_service_recovery_finish(uuid,text,bigint,uuid,uuid,text,text)','EXECUTE') OR
  has_function_privilege('authenticated','public.pazo_f16_live_service_terminal_checkout_close(uuid,text,bigint,text,text)','EXECUTE') OR
  NOT has_function_privilege('service_role','public.pazo_f16_live_service_recovery_finish(uuid,text,bigint,uuid,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'ACL incorrect'; END IF;
 RAISE NOTICE 'PAZO_LIVE_RECOVERY_FENCED_BIND_TERMINAL_RETRY_ACL_PG17_PASS';
END $checks$;
ROLLBACK;
