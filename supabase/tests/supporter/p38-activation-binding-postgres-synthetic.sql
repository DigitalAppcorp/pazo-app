\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE token uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; ok boolean; rejected boolean;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin' THEN RAISE EXCEPTION 'LAB ONLY'; END IF;
 INSERT INTO supporter_private.paypal_subscription_intents(intent_id,owner_id,provider,plan_id,state,external_subscription_id,bound_at)
 VALUES('intent-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','paypal','P-14V25407JP6850922NLHMDKI','bound','I-P38-OWNER',clock_timestamp()),
 ('intent-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','paypal','P-14V25407JP6850922NLHMDKI','bound','I-P38-OTHER',clock_timestamp());
 INSERT INTO supporter_private.paypal_verified_event_inbox(provider_event_id,event_type,verified_at,processing_state,p05_claim_token,next_attempt_at,retention_hold)
 VALUES('P38-ACT-EVENT','BILLING.SUBSCRIPTION.ACTIVATED',clock_timestamp(),'processing',token,clock_timestamp()+interval '5 minutes',true),
 ('P38-ACT-UNBOUND','BILLING.SUBSCRIPTION.ACTIVATED',clock_timestamp(),'processing',token,clock_timestamp()+interval '5 minutes',true);
 INSERT INTO supporter_private.p38_lab_verified_activation_binding(provider_event_id,subscription_id,owner_id,provider_provenance)
 VALUES('P38-ACT-EVENT','I-P38-OWNER','11111111-1111-4111-8111-111111111111','verified_provider_ingestion');
 IF public.f16_p38_lab_read_activation_binding('P38-ACT-EVENT',token,'I-P38-OWNER','11111111-1111-4111-8111-111111111111')
 THEN RAISE EXCEPTION 'worker OFF unexpectedly passed'; END IF;
 UPDATE supporter_private.p05_inbox_worker_gate SET enabled=true,not_before=clock_timestamp()-interval '1 hour' WHERE id=1;
 ok:=public.f16_p38_lab_read_activation_binding('P38-ACT-EVENT',token,'I-P38-OWNER','11111111-1111-4111-8111-111111111111');
 IF NOT ok THEN RAISE EXCEPTION 'valid lab lease rejected'; END IF;
 IF public.f16_p38_lab_read_activation_binding('P38-ACT-EVENT',token,'I-P38-OTHER','11111111-1111-4111-8111-111111111111')
 OR public.f16_p38_lab_read_activation_binding('P38-ACT-EVENT',token,'I-P38-OWNER','22222222-2222-4222-8222-222222222222')
 OR public.f16_p38_lab_read_activation_binding('P38-ACT-UNBOUND',token,'I-P38-OWNER','11111111-1111-4111-8111-111111111111')
 OR public.f16_p38_lab_read_activation_binding('P38-ACT-EVENT','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','I-P38-OWNER','11111111-1111-4111-8111-111111111111')
 THEN RAISE EXCEPTION 'cross-owner, fake binding or token accepted'; END IF;
 UPDATE supporter_private.paypal_verified_event_inbox SET next_attempt_at=clock_timestamp()-interval '1 minute' WHERE provider_event_id='P38-ACT-EVENT';
 IF public.f16_p38_lab_read_activation_binding('P38-ACT-EVENT',token,'I-P38-OWNER','11111111-1111-4111-8111-111111111111')
 THEN RAISE EXCEPTION 'expired lease accepted'; END IF;
 IF has_table_privilege('service_role','supporter_private.p38_lab_verified_activation_binding','INSERT')
 OR has_table_privilege('anon','supporter_private.p38_lab_verified_activation_binding','SELECT')
 THEN RAISE EXCEPTION 'binding table ACL failed'; END IF;
 IF EXISTS (SELECT 1 FROM supporter_private.paypal_payment_entries) THEN RAISE EXCEPTION 'unexpected payment'; END IF;
END $test$;
ROLLBACK;
