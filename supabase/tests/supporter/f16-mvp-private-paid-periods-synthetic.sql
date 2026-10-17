-- F16 MVP — synthetic service-period cases, disposable PostgreSQL ONLY.
-- Every inserted fake proof/hold stays inside ROLLBACK.
BEGIN;
DO $tests$
DECLARE
  v_owner uuid := '11111111-1111-4111-8111-111111111111';
  v_at timestamptz := '2026-10-20T00:00:00Z';
  v jsonb;
BEGIN
 IF current_database() <> 'f14_synthetic' OR current_user <> 'postgres'
   OR to_regclass('supporter_private.f16_mvp_paid_period_proofs') IS NULL
 THEN RAISE EXCEPTION 'MVP paid period test is disposable only'; END IF;
 IF has_table_privilege('authenticated','supporter_private.f16_mvp_paid_period_proofs','SELECT')
 OR has_table_privilege('anon','supporter_private.f16_mvp_paid_period_proofs','SELECT')
 OR has_table_privilege('service_role','supporter_private.f16_mvp_paid_period_proofs','SELECT')
 OR has_table_privilege('authenticated','supporter_private.f16_mvp_paid_period_holds','INSERT')
 OR has_function_privilege('authenticated','supporter_private.f16_mvp_private_period_projection(uuid,timestamptz)','EXECUTE')
 OR has_function_privilege('service_role','supporter_private.f16_mvp_private_period_projection(uuid,timestamptz)','EXECUTE')
 THEN RAISE EXCEPTION 'MVP access leaked to an app role'; END IF;

 v:=supporter_private.f16_mvp_private_period_projection(v_owner,v_at);
 IF v->>'active' <> 'false' OR v->>'completedCycles' <> '0'
   OR v->>'paidThrough' IS NOT NULL
 THEN RAISE EXCEPTION 'An empty ledger granted benefits'; END IF;

 INSERT INTO supporter_private.f16_mvp_paid_period_proofs
   (provider_sale_id,provider_subscription_id,owner_id,cycle_key,provider_event_id,
    offer_terms_sha256,service_start,service_end,merchant_verified_at)
 VALUES
   ('SALE-TEST-001','I-SANDBOXSYNTHETIC',v_owner,'cycle-2026-10','WEBHOOK-TEST-001',
    repeat('a',64),'2026-10-10T00:00:00Z','2026-11-10T00:00:00Z',v_at);

 v:=supporter_private.f16_mvp_private_period_projection(v_owner,v_at);
 IF v->>'active' <> 'true' OR v->>'completedCycles' <> '1'
   OR v->>'paidThrough' NOT LIKE '2026-11-10%'
 THEN RAISE EXCEPTION 'A verified synthetic paid period was not projected'; END IF;

 -- PayPal cancellation ALONE cannot shorten a paid and unreversed interval.
 -- No subscription-status field exists in this projection by design.
 INSERT INTO supporter_private.f16_mvp_paid_period_holds
   (provider_sale_id,hold_id,hold_kind,verified_at)
 VALUES ('SALE-TEST-001','HOLD-TEST-001','partially_refunded',v_at);
 v:=supporter_private.f16_mvp_private_period_projection(v_owner,v_at);
 IF v->>'active' <> 'false' OR v->>'completedCycles' <> '0'
 THEN RAISE EXCEPTION 'An unresolved partial refund granted benefits'; END IF;

 UPDATE supporter_private.f16_mvp_paid_period_holds
 SET hold_active=false
 WHERE provider_sale_id='SALE-TEST-001' AND hold_id='HOLD-TEST-001';
 v:=supporter_private.f16_mvp_private_period_projection(v_owner,v_at);
 IF v->>'active' <> 'true' OR v->>'completedCycles' <> '1'
 THEN RAISE EXCEPTION 'An individually cleared synthetic hold still blocked'; END IF;

 INSERT INTO supporter_private.f16_mvp_paid_period_proofs
   (provider_sale_id,provider_subscription_id,owner_id,cycle_key,provider_event_id,
    offer_terms_sha256,service_start,service_end,merchant_verified_at)
 VALUES ('SALE-TEST-002','I-SANDBOXSYNTHETIC',v_owner,'cycle-2026-11','WEBHOOK-TEST-002',
    repeat('a',64),'2026-11-10T00:00:00Z','2026-12-10T00:00:00Z',v_at);
 v:=supporter_private.f16_mvp_private_period_projection(v_owner,v_at);
 IF v->>'completedCycles' <> '1'
 THEN RAISE EXCEPTION 'A future month counted toward milestones'; END IF;

 v:=supporter_private.f16_mvp_private_period_projection(v_owner,'2026-11-20T00:00:00Z');
 IF v->>'active' <> 'true' OR v->>'completedCycles' <> '2'
 THEN RAISE EXCEPTION 'A second genuine period was not projected'; END IF;

 v:=supporter_private.f16_mvp_private_period_projection(v_owner,'2026-12-10T00:00:00Z');
 IF v->>'active' <> 'false' OR v->>'paidThrough' IS NOT NULL
 THEN RAISE EXCEPTION 'Expiry did not remove benefits'; END IF;

 -- Overlap between two PAID intervals must fail closed for active coverage.
 INSERT INTO supporter_private.f16_mvp_paid_period_proofs
   (provider_sale_id,provider_subscription_id,owner_id,cycle_key,provider_event_id,
    offer_terms_sha256,service_start,service_end,merchant_verified_at)
 VALUES ('SALE-TEST-003','I-OTHERSUBSCRIPTION',v_owner,'cycle-overlap','WEBHOOK-TEST-003',
    repeat('a',64),'2026-10-25T00:00:00Z','2026-11-25T00:00:00Z',v_at);
 v:=supporter_private.f16_mvp_private_period_projection(v_owner,'2026-10-26T00:00:00Z');
 IF v->>'active' <> 'false' OR v->>'completedCycles' <> '0'
 THEN RAISE EXCEPTION 'Overlapping paid periods were trusted'; END IF;
END $tests$;
ROLLBACK;

SELECT 'F16_MVP_PRIVATE_PERIODS_PG17_SYNTHETIC_PASS' AS marker;
