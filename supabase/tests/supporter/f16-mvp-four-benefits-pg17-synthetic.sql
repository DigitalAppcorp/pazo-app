-- PAZO F16: end-to-end synthetic four benefits, PostgreSQL 17 ONLY.
-- This test NEVER persists users, pets, payments, consent or theme changes.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'f14_admin'
 OR to_regprocedure('public.pazo_supporter_public_pet_benefits(uuid)') IS NULL
 THEN RAISE EXCEPTION 'F16 four-benefits test is disposable-only'; END IF;
END $guard$;
SET LOCAL ROLE postgres;
INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
VALUES ('31111111-1111-4111-8111-111111111111','authenticated','authenticated',
        'mvp-test-a@example.invalid','{}','{}'),
       ('32222222-2222-4222-8222-222222222222','authenticated','authenticated',
        'mvp-test-b@example.invalid','{}','{}');
INSERT INTO public.pets(id,owner_id,name,species)
VALUES ('41111111-1111-4111-8111-111111111111',
        '31111111-1111-4111-8111-111111111111','Test Mascota A','gato'),
       ('42222222-2222-4222-8222-222222222222',
        '32222222-2222-4222-8222-222222222222','Test Mascota B','perro');

-- Public reads are permitted but must start as false, with zero private rows.
SET LOCAL ROLE anon;
DO $test$
DECLARE v jsonb;
BEGIN
 v:=public.pazo_supporter_public_pet_benefits('41111111-1111-4111-8111-111111111111');
 IF v->>'badge'<>'false' OR v->>'theme' IS NOT NULL OR v->>'milestone'<>'0'
 THEN RAISE EXCEPTION 'Free pet received public badge'; END IF;
 IF EXISTS(SELECT 1 FROM public.pazo_supporter_public_wall(48))
 THEN RAISE EXCEPTION 'Wall must start empty'; END IF;
 IF has_table_privilege('anon','supporter_private.f16_mvp_pet_themes','SELECT')
 OR has_table_privilege('service_role','supporter_private.f16_mvp_pet_themes','SELECT')
 OR has_function_privilege('anon','public.pazo_supporter_set_pet_theme(uuid,text)','EXECUTE')
 OR has_function_privilege('service_role','public.pazo_supporter_set_pet_theme(uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','supporter_private.wall_has_verified_entitlement(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Secret role ACL leaked'; END IF;
END $test$;

-- Authenticated owner cannot buy benefits using only UI or consent.
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub',
  '31111111-1111-4111-8111-111111111111',true);
DO $test$
BEGIN
 BEGIN
  PERFORM public.pazo_supporter_set_pet_theme('41111111-1111-4111-8111-111111111111','nature');
  RAISE EXCEPTION 'Unpaid user set paid theme';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.pazo_wall_consent_enable('41111111-1111-4111-8111-111111111111','wall_consent_v1');
  RAISE EXCEPTION 'Unpaid user enrolled in wall';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF NOT public.pazo_supporter_set_pet_theme('41111111-1111-4111-8111-111111111111',NULL)
 THEN RAISE EXCEPTION 'Unpaid user could not reset original theme'; END IF;
END $test$;

-- Insert three synthetic, distinct and non-overlapping month cycles.
SET LOCAL ROLE postgres;
INSERT INTO supporter_private.f16_mvp_paid_period_proofs
(provider_sale_id,provider_subscription_id,owner_id,cycle_key,provider_event_id,
 offer_terms_sha256,service_start,service_end,merchant_verified_at)
VALUES
('PAYMENT-MVP-001','I-TEST-MVP-01','31111111-1111-4111-8111-111111111111',
 'MVP-CYCLE-001','EVT-MVP-001',repeat('f',64),
  pg_catalog.clock_timestamp()-interval '65 days',
  pg_catalog.clock_timestamp()-interval '35 days',pg_catalog.clock_timestamp()),
('PAYMENT-MVP-002','I-TEST-MVP-01','31111111-1111-4111-8111-111111111111',
 'MVP-CYCLE-002','EVT-MVP-002',repeat('f',64),
  pg_catalog.clock_timestamp()-interval '35 days',
  pg_catalog.clock_timestamp()-interval '5 days',pg_catalog.clock_timestamp()),
('PAYMENT-MVP-003','I-TEST-MVP-01','31111111-1111-4111-8111-111111111111',
 'MVP-CYCLE-003','EVT-MVP-003',repeat('f',64),
  pg_catalog.clock_timestamp()-interval '5 days',
  pg_catalog.clock_timestamp()+interval '25 days',pg_catalog.clock_timestamp());

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub',
  '31111111-1111-4111-8111-111111111111',true);
DO $test$
DECLARE v jsonb;
BEGIN
 IF NOT public.pazo_supporter_set_pet_theme('41111111-1111-4111-8111-111111111111','stars')
 THEN RAISE EXCEPTION 'Verified user could not save theme'; END IF;
 BEGIN
  PERFORM public.pazo_supporter_set_pet_theme('42222222-2222-4222-8222-222222222222','nature');
  RAISE EXCEPTION 'Cross-owner theme update succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.pazo_supporter_set_pet_theme('41111111-1111-4111-8111-111111111111','unapproved');
  RAISE EXCEPTION 'Invalid theme saved';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF NOT public.pazo_wall_consent_enable('41111111-1111-4111-8111-111111111111','wall_consent_v1')
 THEN RAISE EXCEPTION 'Owner could not opt in'; END IF;
 v:=public.pazo_supporter_public_pet_benefits('41111111-1111-4111-8111-111111111111');
 IF v->>'badge'<>'true' OR v->>'theme'<>'stars' OR v->>'milestone'<>'3'
 THEN RAISE EXCEPTION 'Profile perks not derived from three verified cycles'; END IF;
END $test$;
SET LOCAL ROLE anon;
DO $test$
BEGIN
 IF (SELECT count(*) FROM public.pazo_supporter_public_wall(48)) <> 1
 THEN RAISE EXCEPTION 'Consented paid pet missing from public wall'; END IF;
 IF (SELECT pet_name FROM public.pazo_supporter_public_wall(48) LIMIT 1)<>'Test Mascota A'
 THEN RAISE EXCEPTION 'Unexpected public pet projection'; END IF;
 IF EXISTS(SELECT 1 FROM public.pazo_supporter_public_wall(48)
   WHERE pet_id='42222222-2222-4222-8222-222222222222')
 THEN RAISE EXCEPTION 'Free pet leaked to public wall'; END IF;
END $test$;

-- Refund/dispute blocks current benefits but must not delete stored consent.
SET LOCAL ROLE postgres;
INSERT INTO supporter_private.f16_mvp_paid_period_holds
(provider_sale_id,hold_id,hold_kind,verified_at)
VALUES ('PAYMENT-MVP-003','HOLD-MVP-003','dispute',pg_catalog.clock_timestamp());
SET LOCAL ROLE anon;
DO $test$
DECLARE v jsonb;
BEGIN
 v:=public.pazo_supporter_public_pet_benefits('41111111-1111-4111-8111-111111111111');
 IF v->>'badge'<>'false' OR v->>'theme' IS NOT NULL OR v->>'milestone'<>'0'
 THEN RAISE EXCEPTION 'Disputed current period still publicly credited'; END IF;
 IF EXISTS(SELECT 1 FROM public.pazo_supporter_public_wall(48))
 THEN RAISE EXCEPTION 'Disputed pet leaked into wall'; END IF;
END $test$;

-- Opt-out works even after membership is blocked.
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub',
  '31111111-1111-4111-8111-111111111111',true);
DO $test$
BEGIN
 IF NOT public.pazo_wall_consent_disable('41111111-1111-4111-8111-111111111111')
 THEN RAISE EXCEPTION 'Expired supporter could not revoke'; END IF;
 IF NOT public.pazo_supporter_set_pet_theme('41111111-1111-4111-8111-111111111111',NULL)
 THEN RAISE EXCEPTION 'Unpaid user could not clear saved theme'; END IF;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'F16_MVP_FOUR_BENEFITS_PG17_SYNTHETIC_PASS';
