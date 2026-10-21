-- Only after the existing disposable gateway fixture, never a hosted database.
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
\i supabase/migrations/20261021064239_pazo_f16_live_signed_event_evidence.sql
BEGIN;
INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(
 intent_id,owner_id,request_key,merchant_generation,plan_id,locale,terms_version,terms_digest,
 affirmative_consent,created_at,provider_create_claimed_at,provider_subscription_id,state)
SELECT 'intent-87654321-1234-4234-8234-123456789abc','87654321-1234-4234-8234-123456789abc',
 '87654321-2222-4222-8222-123456789abc',generation,plan_id,'es','pazo-supporter-live.test',
 repeat('b',64),true,'2026-10-01T00:00:00Z','2026-10-01T00:01:00Z','I-SIGNED-RECEIPT-TEST','bound'
 FROM admin_private.pazo_paypal_merchant_generations WHERE generation=1 AND environment='live';
DO $acl$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='supporter_private' AND c.relname='pazo_paypal_live_signed_receipts'
   AND c.relrowsecurity AND c.relforcerowsecurity)
  OR has_table_privilege('anon','supporter_private.pazo_paypal_live_signed_receipts','SELECT')
  OR has_table_privilege('authenticated','supporter_private.pazo_paypal_live_signed_receipts','SELECT')
  OR has_table_privilege('service_role','supporter_private.pazo_paypal_live_signed_receipts','INSERT')
  OR has_function_privilege('authenticated','public.pazo_f16_live_service_signed_receipt_read(bigint,text,uuid)','EXECUTE')
  OR has_function_privilege('anon','public.pazo_f16_live_service_signed_event_queue(uuid,text,text,bigint,text,text,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'signed receipt ACL/RLS regression'; END IF;
END $acl$;
-- Set the real DB role, not just a mocked JWT string.
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $positive$
DECLARE evidence jsonb; result text; lease jsonb; receipt jsonb; legacy jsonb;
 hook text; owner_id uuid='87654321-1234-4234-8234-123456789abc';
 intent text='intent-87654321-1234-4234-8234-123456789abc';
BEGIN
 -- The synthetic fixture's original merchant webhook is public test data.
 hook:='WH-12345678900';
 evidence:=jsonb_build_object('proofSource','paypal_live_postback_success',
  'signedBodySha256',repeat('a',64),'webhookId',hook,'subscriptionId','I-SIGNED-RECEIPT-TEST',
  'subjectId','SALE-SIGNED-RECEIPT','providerEventAt','2026-10-21T06:00:00.000Z',
  'subjectAt','2026-10-21T05:59:59.000Z','activationAt',NULL,'nextBillingAt',NULL);
 result:=public.pazo_f16_live_service_signed_event_queue(owner_id,intent,'I-SIGNED-RECEIPT-TEST',
  1,'WH-SIGNED-RECEIPT','PAYMENT.SALE.COMPLETED',evidence);
 IF result<>'queued' THEN RAISE EXCEPTION 'signed receipt queue failed: %',result; END IF;
 IF public.pazo_f16_live_service_signed_receipt_read(1,'WH-SIGNED-RECEIPT',gen_random_uuid()) IS NOT NULL
 THEN RAISE EXCEPTION 'receipt exposed without lease'; END IF;
 result:=public.pazo_f16_live_service_signed_event_queue(owner_id,intent,'I-SIGNED-RECEIPT-TEST',
  1,'WH-SIGNED-RECEIPT','PAYMENT.SALE.COMPLETED',evidence);
 IF result<>'duplicate_verified_event' THEN RAISE EXCEPTION 'signed receipt duplicated'; END IF;
 lease:=public.pazo_f16_live_service_inbox_claim(1,'WH-SIGNED-RECEIPT');
 receipt:=public.pazo_f16_live_service_signed_receipt_read(1,'WH-SIGNED-RECEIPT',(lease->>'leaseToken')::uuid);
 IF receipt->>'signatureVerified' IS DISTINCT FROM 'true'
  OR receipt->>'signedBodySha256'<>repeat('a',64)
  OR receipt->>'subjectId'<>'SALE-SIGNED-RECEIPT'
  OR receipt->>'financialEvidenceVerified'<>'false'
  OR receipt->>'subjectAt'<>'2026-10-21T05:59:59.000Z'
 THEN RAISE EXCEPTION 'durable signed provenance missing'; END IF;
 IF public.pazo_f16_live_service_inbox_claim(1,'WH-SIGNED-RECEIPT') IS NOT NULL
 THEN RAISE EXCEPTION 'concurrent second lease issued'; END IF;
 -- A different formatting digest may redeliver matching signed semantics.
 result:=public.pazo_f16_live_service_signed_event_queue(owner_id,intent,'I-SIGNED-RECEIPT-TEST',
  1,'WH-SIGNED-RECEIPT','PAYMENT.SALE.COMPLETED',evidence||jsonb_build_object('signedBodySha256',repeat('c',64)));
 IF result<>'duplicate_verified_event' THEN RAISE EXCEPTION 'valid redelivery rejected'; END IF;
 result:=public.pazo_f16_live_service_signed_event_queue(owner_id,intent,'I-SIGNED-RECEIPT-TEST',
  1,'WH-SIGNED-RECEIPT','PAYMENT.SALE.COMPLETED',evidence||jsonb_build_object('subjectId','SALE-OTHER'));
 IF result<>'signed_evidence_conflict' THEN RAISE EXCEPTION 'event reference was overwritten'; END IF;
 IF public.pazo_f16_live_service_inbox_finish(1,'WH-SIGNED-RECEIPT',(lease->>'leaseToken')::uuid,'processed')
 THEN RAISE EXCEPTION 'unpaid signed event became processed'; END IF;
 IF NOT public.pazo_f16_live_service_inbox_finish(1,'WH-SIGNED-RECEIPT',(lease->>'leaseToken')::uuid,'pending')
 THEN RAISE EXCEPTION 'pending retry failed'; END IF;
 IF public.pazo_f16_live_service_signed_receipt_read(1,'WH-SIGNED-RECEIPT',(lease->>'leaseToken')::uuid) IS NOT NULL
 THEN RAISE EXCEPTION 'finished lease still reads evidence'; END IF;
 -- The old queue does not manufacture a signed receipt for historical events.
 result:=public.pazo_f16_live_service_verified_event_queue(owner_id,intent,'I-SIGNED-RECEIPT-TEST',
  1,'WH-LEGACY-NO-PROOF','PAYMENT.SALE.COMPLETED');
 legacy:=public.pazo_f16_live_service_inbox_claim(1,'WH-LEGACY-NO-PROOF');
 IF public.pazo_f16_live_service_signed_receipt_read(1,'WH-LEGACY-NO-PROOF',(legacy->>'leaseToken')::uuid) IS NOT NULL
 THEN RAISE EXCEPTION 'legacy queue was mistaken for postback proof'; END IF;
 -- Reject arbitrary data, malformed references and wrong original merchant.
 FOR evidence IN SELECT value FROM jsonb_array_elements(jsonb_build_array(
  'null'::jsonb,'[]'::jsonb,'123'::jsonb,'"invalid"'::jsonb,
  '{}'::jsonb,evidence||jsonb_build_object('payer_email','PRIVATE'),
  evidence||jsonb_build_object('webhookId','WH-OTHER-WEBHOOK'),
  evidence||jsonb_build_object('providerEventAt','2026-02-30T06:00:00.000Z'),
  evidence||jsonb_build_object('subscriptionId','I-OTHER-SUBSCRIPTION')))
 LOOP
  result:=public.pazo_f16_live_service_signed_event_queue(owner_id,intent,'I-SIGNED-RECEIPT-TEST',
   1,'WH-INVALID-RECEIPT','PAYMENT.SALE.COMPLETED',evidence);
  IF result<>'signed_evidence_invalid' THEN RAISE EXCEPTION 'invalid signed metadata accepted: %',result; END IF;
 END LOOP;
END $positive$;
RESET ROLE;
DO $expiry$
DECLARE lease jsonb;
BEGIN
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 lease:=public.pazo_f16_live_service_inbox_claim(1,'WH-SIGNED-RECEIPT');
 UPDATE supporter_private.pazo_paypal_live_event_inbox SET
  leased_at=clock_timestamp()-interval '3 minutes',lease_expires_at=clock_timestamp()-interval '1 minute'
 WHERE merchant_generation=1 AND provider_event_id='WH-SIGNED-RECEIPT';
 IF public.pazo_f16_live_service_signed_receipt_read(1,'WH-SIGNED-RECEIPT',(lease->>'leaseToken')::uuid) IS NOT NULL
 THEN RAISE EXCEPTION 'expired lease retained receipt access'; END IF;
 IF public.pazo_f16_live_service_inbox_claim(1,'WH-SIGNED-RECEIPT') IS NULL
 THEN RAISE EXCEPTION 'crash recovery claim unavailable'; END IF;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated"}',true);
 BEGIN
  PERFORM public.pazo_f16_live_service_signed_receipt_read(1,'WH-SIGNED-RECEIPT',gen_random_uuid());
  RAISE EXCEPTION 'wrong claims accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RAISE NOTICE 'F16_LIVE_SIGNED_RECEIPT_PG17_PASS';
END $expiry$;
ROLLBACK;
\i supabase/rollbacks/f16_live_signed_event_evidence_REVIEW_REQUIRED.sql
\i supabase/migrations/20261021064239_pazo_f16_live_signed_event_evidence.sql
DO $restored$ BEGIN
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_signed_receipts)
 THEN RAISE EXCEPTION 'rollback/reapply retained synthetic receipt data'; END IF;
 RAISE NOTICE 'F16_SIGNED_RECEIPT_EMPTY_ROLLBACK_REAPPLY_PASS';
END $restored$;
