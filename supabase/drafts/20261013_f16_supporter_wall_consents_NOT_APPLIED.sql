-- F16 SUPPORTER | DRAFT ONLY | NOT APPLIED to hosted Supabase.
-- DO NOT move to supabase/migrations or invoke apply_migration without a new
-- explicit Product Owner gate. This file is exercised only against the
-- disposable f14_synthetic PostgreSQL 17 service in CI.
-- This implements PRIVATE per-pet consent controls only. No verified payments,
-- public wall rows, badge assignment, PayPal/webhook or frontend activation.
-- The positive authorization gate intentionally returns FALSE until a later
-- separately approved entitlement migration with an approved notice revision.
BEGIN;

CREATE SCHEMA supporter_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA supporter_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE supporter_private.wall_consents (
  pet_id uuid PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
  owner_id_at_grant uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notice_version text NOT NULL
    CHECK (notice_version = 'wall_consent_v1'),
  granted_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT wall_consent_revocation_after_grant
    CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

ALTER TABLE supporter_private.wall_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.wall_consents FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supporter_private.wall_consents FROM PUBLIC, anon, authenticated, service_role;

-- Intentional deny-all entitlement stub. NOT A PAID SUBSCRIPTION CHECK.
-- A separately approved payment gate must REPLACE this with server-side
-- verified coverage, AND approve the final, user-visible consent notice.
-- Never infer payment from profiles.is_founder or paypal_subscription_id.
CREATE FUNCTION supporter_private.wall_has_verified_entitlement(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $f$
  SELECT false;
$f$;
REVOKE ALL ON FUNCTION supporter_private.wall_has_verified_entitlement(uuid)
FROM PUBLIC, anon, authenticated, service_role;

-- This function is not usable to opt in on an unverified membership because
-- wall_has_verified_entitlement() always fails closed in THIS DRAFT.
CREATE FUNCTION public.pazo_wall_consent_enable(
  p_pet_id uuid,
  p_notice_version text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $f$
DECLARE
  v_uid uuid := auth.uid();
  v_owner_id uuid;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users AS u WHERE u.id = v_uid
  ) THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- The row lock serializes this action with pet ownership changes/deletion.
  SELECT p.owner_id INTO v_owner_id
  FROM public.pets AS p
  WHERE p.id = p_pet_id
  FOR UPDATE;

  IF v_owner_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Pet not available to authenticated owner'
      USING ERRCODE = '42501';
  END IF;

  IF p_notice_version IS DISTINCT FROM 'wall_consent_v1' THEN
    RAISE EXCEPTION 'Consent notice revision is not supported'
      USING ERRCODE = '22023';
  END IF;

  IF NOT supporter_private.wall_has_verified_entitlement(v_uid) THEN
    RAISE EXCEPTION 'Verified supporter coverage is not yet available'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO supporter_private.wall_consents AS c (
    pet_id, owner_id_at_grant, notice_version, granted_at, revoked_at, updated_at
  ) VALUES (
    p_pet_id, v_uid, 'wall_consent_v1',
    pg_catalog.clock_timestamp(), NULL, pg_catalog.clock_timestamp()
  )
  ON CONFLICT (pet_id) DO UPDATE SET
    owner_id_at_grant = EXCLUDED.owner_id_at_grant,
    notice_version = EXCLUDED.notice_version,
    granted_at = EXCLUDED.granted_at,
    revoked_at = NULL,
    updated_at = pg_catalog.clock_timestamp()
  WHERE c.revoked_at IS NOT NULL
     OR c.owner_id_at_grant IS DISTINCT FROM EXCLUDED.owner_id_at_grant
     OR c.notice_version IS DISTINCT FROM EXCLUDED.notice_version;

  RETURN true; -- repeated same owner/notice authorization is idempotent
END;
$f$;

-- Revocation NEVER requires an active subscription, including after expiry.
-- A missing/already-revoked consent is an idempotent success for the owner.
CREATE FUNCTION public.pazo_wall_consent_disable(p_pet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $f$
DECLARE
  v_uid uuid := auth.uid();
  v_owner_id uuid;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users AS u WHERE u.id = v_uid
  ) THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT p.owner_id INTO v_owner_id
  FROM public.pets AS p
  WHERE p.id = p_pet_id
  FOR UPDATE;

  IF v_owner_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Pet not available to authenticated owner'
      USING ERRCODE = '42501';
  END IF;

  UPDATE supporter_private.wall_consents AS c
  SET revoked_at = pg_catalog.clock_timestamp(),
      updated_at = pg_catalog.clock_timestamp()
  WHERE c.pet_id = p_pet_id
    AND c.revoked_at IS NULL;

  RETURN true;
END;
$f$;

-- Private status is limited to currently owned pets. This does NOT indicate
-- that a pet is visible on the public wall: no eligible wall exists yet.
CREATE FUNCTION public.pazo_wall_my_consents()
RETURNS TABLE (
  pet_id uuid,
  opted_in boolean,
  granted_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $f$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users AS u WHERE u.id = v_uid
  ) THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT c.pet_id,
         (c.revoked_at IS NULL AND c.owner_id_at_grant = v_uid),
         c.granted_at, c.revoked_at
  FROM supporter_private.wall_consents AS c
  JOIN public.pets AS p ON p.id = c.pet_id
  WHERE p.owner_id = v_uid
    AND c.owner_id_at_grant = v_uid;
END;
$f$;

ALTER FUNCTION supporter_private.wall_has_verified_entitlement(uuid) OWNER TO postgres;
ALTER FUNCTION public.pazo_wall_consent_enable(uuid,text) OWNER TO postgres;
ALTER FUNCTION public.pazo_wall_consent_disable(uuid) OWNER TO postgres;
ALTER FUNCTION public.pazo_wall_my_consents() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.pazo_wall_consent_enable(uuid,text)
FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.pazo_wall_consent_disable(uuid)
FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.pazo_wall_my_consents()
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pazo_wall_consent_enable(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_wall_consent_disable(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_wall_my_consents() TO authenticated;

COMMIT;
