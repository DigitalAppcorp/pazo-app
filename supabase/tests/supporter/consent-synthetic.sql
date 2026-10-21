-- This is a ROLLBACK-only local synthetic test; never execute on hosted PAZO.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
  IF current_database() <> 'f14_synthetic'
    OR session_user <> 'f14_admin'
    OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
  THEN RAISE EXCEPTION 'Refusing non-synthetic PostgreSQL test'; END IF;
END;
$guard$;

-- Create two throwaway actors/pets inside a transaction that is always rolled back.
SET LOCAL ROLE postgres;
INSERT INTO auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
VALUES
  ('16161616-1111-4111-8111-111111111111','authenticated','authenticated','f16-synthetic-1@example.invalid','{}','{}'),
  ('16161616-2222-4222-8222-222222222222','authenticated','authenticated','f16-synthetic-2@example.invalid','{}','{}');
INSERT INTO public.pets (id,owner_id,name,species)
VALUES
  ('26262626-1111-4111-8111-111111111111','16161616-1111-4111-8111-111111111111','Test pet A','gato'),
  ('26262626-2222-4222-8222-222222222222','16161616-2222-4222-8222-222222222222','Test pet B','perro');

-- Entitlement gate is still deny-all in migration. No positive permission.
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub',
  '16161616-1111-4111-8111-111111111111', true);
DO $test$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pazo_wall_my_consents())
  THEN RAISE EXCEPTION 'Consent was created by default'; END IF;
  BEGIN
    PERFORM public.pazo_wall_consent_enable(
      '26262626-1111-4111-8111-111111111111', 'wall_consent_v1');
    RAISE EXCEPTION 'Deny-all payment stub was bypassed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.pazo_wall_consent_disable('26262626-2222-4222-8222-222222222222');
    RAISE EXCEPTION 'Cross-owner revocation was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.pazo_wall_consent_enable(
      '26262626-2222-4222-8222-222222222222', 'wall_consent_v1');
    RAISE EXCEPTION 'Cross-owner authorization was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF NOT public.pazo_wall_consent_disable('26262626-1111-4111-8111-111111111111')
  THEN RAISE EXCEPTION 'Owner must be allowed to revoke with no entitlement'; END IF;
END;
$test$;

-- Override the deny-all helper INSIDE THIS ROLLBACK TRANSACTION ONLY,
-- to exercise positive authorization/revocation lifecycle without any
-- hosted subscriptions or fabricated permanent entitlements.
SET LOCAL ROLE postgres;
CREATE OR REPLACE FUNCTION supporter_private.wall_has_verified_entitlement(p_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $only_synthetic$
  SELECT p_owner_id IN (
    '16161616-1111-4111-8111-111111111111'::uuid,
    '16161616-2222-4222-8222-222222222222'::uuid
  );
$only_synthetic$;
REVOKE ALL ON FUNCTION supporter_private.wall_has_verified_entitlement(uuid)
FROM PUBLIC, anon, authenticated, service_role;

SET LOCAL ROLE authenticated;
DO $test$
DECLARE v_before timestamptz; v_after timestamptz; v_revoked timestamptz;
BEGIN
  IF NOT public.pazo_wall_consent_enable(
    '26262626-1111-4111-8111-111111111111','wall_consent_v1')
  THEN RAISE EXCEPTION 'Valid owner failed to enable consent'; END IF;
  SELECT c.granted_at INTO v_before
    FROM public.pazo_wall_my_consents() c
    WHERE c.pet_id='26262626-1111-4111-8111-111111111111' AND c.opted_in=true;
  IF v_before IS NULL THEN RAISE EXCEPTION 'Owner status missing'; END IF;
  PERFORM public.pazo_wall_consent_enable(
    '26262626-1111-4111-8111-111111111111','wall_consent_v1');
  SELECT c.granted_at INTO v_after
    FROM public.pazo_wall_my_consents() c
    WHERE c.pet_id='26262626-1111-4111-8111-111111111111';
  IF v_after IS DISTINCT FROM v_before
  THEN RAISE EXCEPTION 'Repeat enable changed consent timestamp'; END IF;
  IF NOT public.pazo_wall_consent_disable('26262626-1111-4111-8111-111111111111')
  THEN RAISE EXCEPTION 'Owner revoke failed'; END IF;
  SELECT c.revoked_at INTO v_revoked FROM public.pazo_wall_my_consents() c;
  IF v_revoked IS NULL THEN RAISE EXCEPTION 'Revocation not recorded'; END IF;
  PERFORM public.pazo_wall_consent_disable('26262626-1111-4111-8111-111111111111');
  IF (SELECT c.revoked_at FROM public.pazo_wall_my_consents() c)
      IS DISTINCT FROM v_revoked
  THEN RAISE EXCEPTION 'Repeat revoke mutated timestamp'; END IF;
  PERFORM public.pazo_wall_consent_enable(
    '26262626-1111-4111-8111-111111111111','wall_consent_v1');
  IF (SELECT c.opted_in FROM public.pazo_wall_my_consents() c) IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'Opt-in after revoke failed'; END IF;
  BEGIN
    PERFORM public.pazo_wall_consent_enable(
      '26262626-1111-4111-8111-111111111111','unapproved_notice_v2');
    RAISE EXCEPTION 'Unapproved notice was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF (SELECT count(*) FROM public.pazo_wall_my_consents())<>1
  THEN RAISE EXCEPTION 'My-consents leaked another actor'; END IF;
END;
$test$;

-- No owner can take action on another pet, even when synthetic paid.
SELECT pg_catalog.set_config('request.jwt.claim.sub',
  '16161616-2222-4222-8222-222222222222', true);
DO $test$
BEGIN
  BEGIN
    PERFORM public.pazo_wall_consent_disable('26262626-1111-4111-8111-111111111111');
    RAISE EXCEPTION 'Owner B disabled owner A consent';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF (SELECT count(*) FROM public.pazo_wall_my_consents())<>0
  THEN RAISE EXCEPTION 'Owner B can view owner A consents'; END IF;
END;
$test$;

-- Ownership transfer invalidates the previous opt-in without B doing anything.
SET LOCAL ROLE postgres;
UPDATE public.pets SET owner_id='16161616-2222-4222-8222-222222222222'
WHERE id='26262626-1111-4111-8111-111111111111';
SET LOCAL ROLE authenticated;
DO $test$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pazo_wall_my_consents())
  THEN RAISE EXCEPTION 'Transferred pet inherited old opt-in'; END IF;
  PERFORM public.pazo_wall_consent_enable(
    '26262626-1111-4111-8111-111111111111','wall_consent_v1');
  IF (SELECT count(*) FROM public.pazo_wall_my_consents() WHERE opted_in)<>1
  THEN RAISE EXCEPTION 'New owner explicit opt-in did not replace old owner'; END IF;
END;
$test$;

-- Expiration safety: with helper returning false, reauthorization is denied,
-- yet owner can still revoke (and the UI must never equate opt-in with paid).
SET LOCAL ROLE postgres;
CREATE OR REPLACE FUNCTION supporter_private.wall_has_verified_entitlement(p_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $only_synthetic$
  SELECT false;
$only_synthetic$;
SET LOCAL ROLE authenticated;
DO $test$
BEGIN
  PERFORM public.pazo_wall_consent_disable('26262626-1111-4111-8111-111111111111');
  BEGIN
    PERFORM public.pazo_wall_consent_enable(
      '26262626-1111-4111-8111-111111111111','wall_consent_v1');
    RAISE EXCEPTION 'Expired supporter was reauthorized without coverage';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;

-- No test or entitlement override remains after this ROLLBACK.
RESET ROLE;
ROLLBACK;
