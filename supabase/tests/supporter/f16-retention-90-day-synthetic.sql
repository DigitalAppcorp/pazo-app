-- F16 policy QA: isolated database only; all fixtures rolled back.
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'isolated F16 PostgreSQL only'; END IF;
END $$;
WITH records(id,state,age,release_age,hold) AS (
 VALUES
 ('RET-91','processed',91,91,false),
 ('RET-90','processed',90,90,false),
 ('RET-89','processed',89,89,false),
 ('RET-PENDING','pending',NULL::int,NULL::int,true),
 ('RET-DISPUTED','quarantined',NULL::int,NULL::int,true),
 ('RET-HELD','processed',180,NULL::int,true),
 ('RET-LATE-RELEASE','processed',200,80,false)
)
INSERT INTO supporter_private.paypal_verified_event_inbox
(provider_event_id,event_type,verified_at,processing_state,processed_at,retention_hold,retention_released_at)
SELECT id,'PAYMENT.SALE.COMPLETED',
 TIMESTAMPTZ '2025-12-01 12:00+00',state,
 TIMESTAMPTZ '2026-10-14 12:00+00'-age*INTERVAL '1 day',
 hold,TIMESTAMPTZ '2026-10-14 12:00+00'-release_age*INTERVAL '1 day'
FROM records;
DO $test$
DECLARE n int;bad boolean:=false;
BEGIN
 SELECT count(*) INTO n FROM supporter_private.paypal_verified_event_inbox
 WHERE processing_state='processed'
 AND processed_at IS NOT NULL
 AND retention_hold IS FALSE
 AND retention_released_at IS NOT NULL
 AND greatest(processed_at,retention_released_at)
 <= TIMESTAMPTZ '2026-10-14 12:00+00'-INTERVAL '90 days';
 IF n<>2 THEN RAISE EXCEPTION 'retention age test failed: %',n; END IF;
 BEGIN
  UPDATE supporter_private.paypal_verified_event_inbox
  SET retention_hold=false,retention_released_at=now()
  WHERE provider_event_id='RET-PENDING';
 EXCEPTION WHEN check_violation THEN bad:=true; END;
 IF NOT bad THEN RAISE EXCEPTION 'pending retention hold bypass'; END IF;
 RAISE NOTICE 'PASS F16 90-day retention gate';
END $test$;
ROLLBACK;
