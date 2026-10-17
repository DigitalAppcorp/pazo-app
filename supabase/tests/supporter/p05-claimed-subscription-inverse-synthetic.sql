-- F16-P05 synthetic inverse lookup: claimed event, provider subscription ID
-- AND merchant custom_id must match one privately BOUND intent.
\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE
 ev text:='WH-INVERSE-CLAIM-001';
 historical text:='WH-INVERSE-HISTORICAL-001';
 first_intent text:='intent-syntheticfirst123';
 second_intent text:='intent-syntheticsecond456';
 first_sub text:='I-INVERSESYNTHETIC111';
 second_sub text:='I-INVERSESYNTHETIC222';
 first_claim jsonb;
 lease uuid;
 result jsonb;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
  OR current_user<>'postgres' THEN
   RAISE EXCEPTION 'F16 P05 inverse tests only in disposable PostgreSQL'; END IF;
 INSERT INTO supporter_private.paypal_subscription_intents
  (intent_id,owner_id,plan_id,provider,state,external_subscription_id,bound_at)
 VALUES
  (first_intent,'11111111-1111-4111-8111-111111111111',
   'P-14V25407JP6850922NLHMDKI','paypal','bound',first_sub,
   pg_catalog.clock_timestamp()-interval '30 minutes'),
  (second_intent,'22222222-2222-4222-8222-222222222222',
   'P-14V25407JP6850922NLHMDKI','paypal','bound',second_sub,
   pg_catalog.clock_timestamp()-interval '30 minutes');
 INSERT INTO supporter_private.paypal_verified_event_inbox
  (provider_event_id,event_type,verified_at,processing_state,next_attempt_at)
 VALUES
  (ev,'PAYMENT.SALE.COMPLETED',pg_catalog.clock_timestamp()-interval '1 minute',
   'pending',pg_catalog.clock_timestamp()-interval '1 second'),
  (historical,'PAYMENT.SALE.COMPLETED',
   pg_catalog.clock_timestamp()-interval '5 days','pending',
   pg_catalog.clock_timestamp()-interval '1 second');
 IF public.f16_p05_draft_resolve_claimed_subscription(
  ev,pg_catalog.gen_random_uuid(),first_sub,first_intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 lookup returned data while rollout disabled'; END IF;
 UPDATE supporter_private.p05_inbox_worker_gate SET enabled=true,
   not_before=pg_catalog.clock_timestamp()-interval '2 minutes' WHERE id=1;
 IF public.f16_p05_draft_resolve_claimed_subscription(
  ev,pg_catalog.gen_random_uuid(),first_sub,first_intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 lookup permitted without a valid claim'; END IF;
 first_claim:=public.f16_p05_draft_claim_next_verified_event();
 IF first_claim IS NULL OR first_claim->>'eventId'<>ev
 THEN RAISE EXCEPTION 'P05 expected event not claimed'; END IF;
 lease:=(first_claim->>'leaseToken')::uuid;
 result:=public.f16_p05_draft_resolve_claimed_subscription(
  ev,lease,first_sub,first_intent);
 IF result IS NULL
  OR result->>'intentId'<>first_intent
  OR result->>'subscriptionId'<>first_sub
  OR result->>'state'<>'bound'
  OR result->>'planId'<>'P-14V25407JP6850922NLHMDKI'
 THEN RAISE EXCEPTION 'P05 correct BOUND identity not resolved'; END IF;
 IF public.f16_p05_draft_resolve_claimed_subscription(
  ev,lease,first_sub,second_intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 cross-intent substitution succeeded'; END IF;
 IF public.f16_p05_draft_resolve_claimed_subscription(
  ev,lease,second_sub,first_intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 cross-subscription substitution succeeded'; END IF;
 IF public.f16_p05_draft_resolve_claimed_subscription(
  ev,pg_catalog.gen_random_uuid(),first_sub,first_intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 guessed lease granted private identity'; END IF;
 IF public.f16_p05_draft_resolve_claimed_subscription(
  historical,lease,first_sub,first_intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 historical/other event reused a lease'; END IF;
 IF public.f16_p05_draft_resolve_claimed_subscription(
  ev,lease,'I-FOREIGN/ILLEGAL',first_intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 malformed subscription bypassed lookup'; END IF;
 -- Valid but missing pending intent: the inverse lookup must not resolve.
 INSERT INTO supporter_private.paypal_subscription_intents
  (intent_id,owner_id,plan_id,state)
 VALUES ('intent-pendingprivate123',
  '33333333-3333-4333-8333-333333333333',
  'P-14V25407JP6850922NLHMDKI','pending');
 IF public.f16_p05_draft_resolve_claimed_subscription(
  ev,lease,'I-ANOTHERPENDING123','intent-pendingprivate123') IS NOT NULL
 THEN RAISE EXCEPTION 'P05 pending intent became a BOUND owner'; END IF;
 -- Unbound at (even with state=bound) is not a proof of a completed bind.
 UPDATE supporter_private.paypal_subscription_intents
  SET bound_at=NULL WHERE intent_id=first_intent;
 IF public.f16_p05_draft_resolve_claimed_subscription(
  ev,lease,first_sub,first_intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 missing bound_at treated as verified binding'; END IF;
 UPDATE supporter_private.paypal_subscription_intents
  SET bound_at=pg_catalog.clock_timestamp() WHERE intent_id=first_intent;
 -- The lease expires; SQL cannot resolve any subscription with it.
 UPDATE supporter_private.paypal_verified_event_inbox
  SET next_attempt_at=pg_catalog.clock_timestamp()-interval '1 second'
  WHERE provider_event_id=ev;
 IF public.f16_p05_draft_resolve_claimed_subscription(
  ev,lease,first_sub,first_intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 expired lease still resolved identity'; END IF;
 -- Reclaim rotates the lease, denying a stale worker.
 first_claim:=public.f16_p05_draft_claim_next_verified_event();
 IF first_claim IS NULL OR first_claim->>'eventId'<>ev THEN
  RAISE EXCEPTION 'P05 event not reclaimable'; END IF;
 IF public.f16_p05_draft_resolve_claimed_subscription(
  ev,lease,first_sub,first_intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 stale lease resolved private intent'; END IF;
 IF public.f16_p05_draft_resolve_claimed_subscription(
  ev,(first_claim->>'leaseToken')::uuid,first_sub,first_intent) IS NULL
 THEN RAISE EXCEPTION 'P05 new lease unexpectedly denied'; END IF;
 UPDATE supporter_private.p05_inbox_worker_gate SET enabled=false,
   not_before=NULL WHERE id=1;
 IF public.f16_p05_draft_resolve_claimed_subscription(
  ev,(first_claim->>'leaseToken')::uuid,first_sub,first_intent) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 disabled gate did not fence inverse lookup'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries)
  OR EXISTS(SELECT 1 FROM supporter_private.paypal_first_period_reviews)
 THEN RAISE EXCEPTION 'P05 lookup touched financial tables'; END IF;
END
$test$;
ROLLBACK;