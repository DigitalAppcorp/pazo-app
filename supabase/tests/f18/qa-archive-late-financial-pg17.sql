-- Only called by the guarded, networkless f18_admin_synthetic laboratory.
DO $$ BEGIN
 IF current_database()<>'f18_admin_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'Disposable archive late-event lab only'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',false);
DO $late_finance$
DECLARE
 who uuid:=f18_test.owner(180);
 intent text:='intent-18000000-0000-4000-8000-000000000180';
 subscription text:='I-TEST-F18-ARCHIVE';
 sale text:='SALE-F18-ARCHIVE-LATE';
 observed timestamptz:=date_trunc('milliseconds',clock_timestamp());
 observed_iso text;
 evidence jsonb; lease jsonb; token uuid; outcome text;
BEGIN
 PERFORM f18_test.check('ARCHIVE_CREATED_HAS_NO_PAID_BENEFITS',
   NOT supporter_private.public_supporter_paid(who)
   AND (SELECT count(*)=0 FROM supporter_private.pazo_paypal_live_paid_periods));
 PERFORM f18_test.check('ARCHIVE_OTHER_REAL_ACCOUNT_REMAINS_ELIGIBLE',
   supporter_private.public_supporter_eligible(f18_test.owner(170)));
 observed_iso:=to_char(observed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 evidence:=jsonb_build_object('proofSource','paypal_live_postback_success',
   'signedBodySha256',repeat('b',64),'webhookId',
   (SELECT webhook_id FROM admin_private.pazo_paypal_merchant_generations WHERE generation=1),
   'subscriptionId',subscription,'subjectId',sale,
   'providerEventAt',observed_iso,'subjectAt',observed_iso,
   'activationAt',NULL,'nextBillingAt',NULL);
 outcome:=public.pazo_f16_live_service_signed_event_queue(who,intent,subscription,
   1,'WH-F18-LATE-SALE','PAYMENT.SALE.COMPLETED',evidence);
 PERFORM f18_test.check('ARCHIVE_LATE_SIGNED_SALE_QUEUED',outcome='queued');
 PERFORM f18_test.check('ARCHIVE_LATE_SIGNED_SALE_DUPLICATE_SAFE',
   public.pazo_f16_live_service_signed_event_queue(who,intent,subscription,
    1,'WH-F18-LATE-SALE','PAYMENT.SALE.COMPLETED',evidence)='duplicate_verified_event');
 lease:=public.pazo_f16_live_service_inbox_claim(1,'WH-F18-LATE-SALE');
 token:=(lease->>'leaseToken')::uuid;
 PERFORM f18_test.check('ARCHIVE_LATE_SALE_CLAIMED',token IS NOT NULL);
 PERFORM f18_test.check('ARCHIVE_LATE_SALE_REJECTS_WRONG_LEASE',
   public.pazo_f16_live_service_leased_sale_record(who,intent,subscription,1,
    'WH-F18-LATE-SALE',sale,'CYCLE-F18-ARCHIVE',299,'USD',
    observed-interval '1 minute',observed+interval '30 days',gen_random_uuid())='current_signed_lease_required');
 outcome:=public.pazo_f16_live_service_leased_sale_record(who,intent,subscription,1,
   'WH-F18-LATE-SALE',sale,'CYCLE-F18-ARCHIVE',299,'USD',
   observed-interval '1 minute',observed+interval '30 days',token);
 PERFORM f18_test.check('ARCHIVE_LATE_SALE_WRITER_STILL_WORKS',outcome='recorded');
 PERFORM f18_test.check('ARCHIVE_LATE_SALE_REPLAY_NO_DUPLICATE_PERIOD',
   public.pazo_f16_live_service_leased_sale_record(who,intent,subscription,1,
    'WH-F18-LATE-SALE',sale,'CYCLE-F18-ARCHIVE',299,'USD',
    observed-interval '1 minute',observed+interval '30 days',token)='already_recorded'
   AND (SELECT count(*)=1 FROM supporter_private.pazo_paypal_live_paid_periods));
 -- Only the disposable fixture completes the existing dispute-monitor read.
 UPDATE supporter_private.pazo_live_dispute_monitors
 SET last_checked_at=clock_timestamp(),last_result='clear',ever_clear=true,
   next_check_at=clock_timestamp()+interval '1 day' WHERE sale_id=sale;
 PERFORM f18_test.check('ARCHIVE_VERIFIED_SALE_CAN_PROJECT_BENEFITS',
   supporter_private.public_supporter_paid(who));
 evidence:=evidence||jsonb_build_object('subjectId',subscription);
 outcome:=public.pazo_f16_live_service_signed_event_queue(who,intent,subscription,
   1,'WH-F18-LATE-CANCEL','BILLING.SUBSCRIPTION.CANCELLED',evidence);
 lease:=public.pazo_f16_live_service_inbox_claim(1,'WH-F18-LATE-CANCEL');
 token:=(lease->>'leaseToken')::uuid;
 PERFORM f18_test.check('ARCHIVE_LATE_CANCELLATION_PROCESSED',outcome='queued'
   AND public.pazo_f16_live_service_leased_lifecycle_record(1,'WH-F18-LATE-CANCEL',
    token,'CANCELLED',observed)='recorded');
 PERFORM f18_test.check('ARCHIVE_CANCEL_PRESERVES_PAID_PERIOD_AND_QUARANTINE',
   supporter_private.public_supporter_paid(who)
   AND NOT supporter_private.public_supporter_eligible(who)
   AND (SELECT closed_at IS NULL AND provider_status='CANCELLED'
    FROM supporter_private.pazo_paypal_live_checkout_intents WHERE intent_id=intent));
 evidence:=evidence||jsonb_build_object('subjectId','REFUND-F18-ARCHIVE');
 outcome:=public.pazo_f16_live_service_signed_event_queue(who,intent,subscription,
   1,'WH-F18-LATE-REFUND','PAYMENT.SALE.REFUNDED',evidence);
 lease:=public.pazo_f16_live_service_inbox_claim(1,'WH-F18-LATE-REFUND');
 token:=(lease->>'leaseToken')::uuid;
 PERFORM f18_test.check('ARCHIVE_LATE_REFUND_PROCESSED',outcome='queued'
   AND public.pazo_f16_live_service_leased_refund_record(who,intent,subscription,1,
    sale,'WH-F18-LATE-REFUND','REFUND-F18-ARCHIVE','refunded',token)='recorded');
 PERFORM f18_test.check('ARCHIVE_REFUND_REMOVES_PAID_BENEFITS_NO_EVIDENCE_DELETION',
   NOT supporter_private.public_supporter_paid(who)
   AND (SELECT count(*)=1 FROM supporter_private.pazo_paypal_live_paid_periods)
   AND (SELECT count(*)=1 FROM supporter_private.pazo_paypal_live_period_holds)
   AND (SELECT count(*)=1 FROM supporter_private.pazo_paypal_live_signed_receipts
    WHERE provider_event_id='WH-F18-ARCHIVE-ORIGINAL')
   AND (SELECT count(*)=1 FROM supporter_private.gradual_incident
    WHERE code='financial_review' AND resolved_at IS NULL));
END $late_finance$;
