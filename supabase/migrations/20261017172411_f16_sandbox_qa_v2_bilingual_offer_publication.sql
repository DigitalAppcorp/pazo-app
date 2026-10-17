-- F16 Sandbox V2 four-benefit bilingual QA offer only, NOT PayPal Live.
-- One private owner was explicitly selected by Product Owner separately;
-- this migration contains no user email/UID/credential/PayPal POST.
BEGIN;
SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='10s';
DO $guard$
BEGIN
 IF current_database()<>'postgres'
 OR (SELECT count(*) FROM supporter_private.paypal_p06_offers
    WHERE version='pazo-supporter-sandbox.benefits-v2' AND published_at IS NULL)<>2
 OR (SELECT count(*) FROM supporter_private.paypal_p06_offers
    WHERE version='pazo-supporter-sandbox.qa20261016-v1' AND published_at IS NOT NULL)<>2
 OR (SELECT count(*) FROM supporter_private.f16_sandbox_qa_owners WHERE status='disabled')<>1
 OR (SELECT count(*) FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts)<>0
 OR (SELECT count(*) FROM supporter_private.f16_sandbox_qa_paid_periods)<>0
 OR (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>0
 OR to_regprocedure('public.f16_qa_v2_owner_can_checkout(uuid)') IS NULL
 OR to_regprocedure('public.f16_qa_v2_record_verified_first_cycle(uuid,text,text,timestamptz,timestamptz,timestamptz)') IS NULL
 THEN RAISE EXCEPTION 'F16 bilingual sandbox V2 release baseline changed'
   USING ERRCODE='55000'; END IF;
END $guard$;
UPDATE supporter_private.paypal_p06_offers
 SET published_at=pg_catalog.clock_timestamp()
 WHERE version='pazo-supporter-sandbox.benefits-v2' AND published_at IS NULL;
DO $post$
BEGIN
 IF (SELECT count(*) FROM supporter_private.paypal_p06_offers
 WHERE version='pazo-supporter-sandbox.benefits-v2' AND published_at IS NOT NULL)<>2
 OR (SELECT count(*) FROM supporter_private.paypal_p06_offers
 WHERE version='pazo-supporter-sandbox.qa20261016-v1' AND published_at IS NOT NULL)<>2
 OR (SELECT count(*) FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts)<>0
 OR (public.f16_p06_read_published_offer('es')->>'version')<>'pazo-supporter-sandbox.benefits-v2'
 OR (public.f16_p06_read_published_offer('en')->>'version')<>'pazo-supporter-sandbox.benefits-v2'
 THEN RAISE EXCEPTION 'F16 V2 QA publication mismatch'; END IF;
END $post$;
COMMIT;