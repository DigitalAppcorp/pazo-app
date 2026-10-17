-- PAZO F16 MVP — Four benefits backend, DISPOSABLE PG17 ONLY.
-- Needs f16_mvp_verified_paid_period_source_DISPOSABLE_ONLY.sql already installed
-- inside f14_synthetic. NOT A DEPLOYABLE MIGRATION; no real credentials.
BEGIN;
DO $guard$
BEGIN
 IF current_database() <> 'f14_synthetic'
    OR current_user <> 'postgres'
    OR to_regclass('supporter_private.f16_mvp_paid_period_proofs') IS NULL
    OR to_regclass('supporter_private.wall_consents') IS NULL
 THEN RAISE EXCEPTION 'MVP BENEFITS: DISPOSABLE ONLY' USING ERRCODE='42501'; END IF;
END $guard$;

CREATE TABLE supporter_private.f16_mvp_pet_themes (
 pet_id uuid PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
 owner_id_at_set uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 theme text NOT NULL CHECK (theme IN ('classic','nature','hearts','stars','adventure')),
 updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
ALTER TABLE supporter_private.f16_mvp_pet_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_mvp_pet_themes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.f16_mvp_pet_themes
 FROM PUBLIC, anon, authenticated, service_role;

-- Replace only in the disposable environment. Production stub still returns false.
CREATE OR REPLACE FUNCTION supporter_private.wall_has_verified_entitlement(p_owner_id uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
 SELECT COALESCE(
   (supporter_private.f16_mvp_private_period_projection(
     p_owner_id,pg_catalog.clock_timestamp())->>'active')::boolean,
   false
 );
$f$;
ALTER FUNCTION supporter_private.wall_has_verified_entitlement(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION supporter_private.wall_has_verified_entitlement(uuid)
 FROM PUBLIC, anon, authenticated, service_role;

-- May only change own pet. A former member may RESET theme to Original.
-- Caller never supplies owner or paid status; database verifies them.
CREATE FUNCTION public.pazo_supporter_set_pet_theme(p_pet_id uuid,p_theme text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v_owner uuid := auth.uid();
BEGIN
 IF v_owner IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=v_owner)
 THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.pets p WHERE p.id=p_pet_id
   AND p.owner_id=v_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pet not owned' USING ERRCODE='42501'; END IF;
 IF p_theme IS NULL THEN
   DELETE FROM supporter_private.f16_mvp_pet_themes t WHERE t.pet_id=p_pet_id;
   RETURN true;
 END IF;
 IF p_theme NOT IN ('classic','nature','hearts','stars','adventure')
 THEN RAISE EXCEPTION 'Unsupported theme' USING ERRCODE='22023'; END IF;
 IF NOT supporter_private.wall_has_verified_entitlement(v_owner)
 THEN RAISE EXCEPTION 'Verified coverage required' USING ERRCODE='42501'; END IF;
 INSERT INTO supporter_private.f16_mvp_pet_themes AS t
  (pet_id,owner_id_at_set,theme)
 VALUES(p_pet_id,v_owner,p_theme)
 ON CONFLICT(pet_id) DO UPDATE
 SET owner_id_at_set=EXCLUDED.owner_id_at_set,
     theme=EXCLUDED.theme,
     updated_at=pg_catalog.clock_timestamp()
 WHERE t.owner_id_at_set IS DISTINCT FROM EXCLUDED.owner_id_at_set
    OR t.theme IS DISTINCT FROM EXCLUDED.theme;
 RETURN true;
END;
$f$;
ALTER FUNCTION public.pazo_supporter_set_pet_theme(uuid,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_supporter_set_pet_theme(uuid,text)
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pazo_supporter_set_pet_theme(uuid,text)
 TO authenticated;

-- Public output contains ONLY boolean + theme enum + milestone enum.
-- No private owner, payment identity, consent or customer information.
CREATE FUNCTION public.pazo_supporter_public_pet_benefits(p_pet_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE
 v_owner uuid;
 v_result jsonb;
 v_paid boolean := false;
 v_months int := 0;
 v_theme text;
BEGIN
 SELECT p.owner_id INTO v_owner FROM public.pets p WHERE p.id=p_pet_id;
 IF v_owner IS NULL THEN
   RETURN pg_catalog.jsonb_build_object('badge',false,'theme',NULL,
                                         'milestone',0);
 END IF;
 v_result:=supporter_private.f16_mvp_private_period_projection(
   v_owner,pg_catalog.clock_timestamp());
 v_paid:=COALESCE((v_result->>'active')::boolean,false);
 IF NOT v_paid THEN
   RETURN pg_catalog.jsonb_build_object('badge',false,'theme',NULL,
                                         'milestone',0);
 END IF;
 v_months:=COALESCE((v_result->>'completedCycles')::int,0);
 SELECT t.theme INTO v_theme FROM supporter_private.f16_mvp_pet_themes t
 WHERE t.pet_id=p_pet_id AND t.owner_id_at_set=v_owner;
 RETURN pg_catalog.jsonb_build_object(
   'badge',true,'theme',v_theme,
   'milestone', CASE WHEN v_months >= 12 THEN 12 WHEN v_months >= 6 THEN 6
                     WHEN v_months >= 3 THEN 3 ELSE 0 END);
END;
$f$;
ALTER FUNCTION public.pazo_supporter_public_pet_benefits(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_supporter_public_pet_benefits(uuid)
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pazo_supporter_public_pet_benefits(uuid)
 TO anon,authenticated;

-- Feed uses ONE bounded, output-only query for displayed distinct pet IDs.
-- Never return owner IDs, subscription details, dates or payment records.
CREATE FUNCTION public.pazo_supporter_public_badges_batch(p_pet_ids uuid[])
RETURNS TABLE(pet_id uuid,badge boolean,milestone integer)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
BEGIN
 IF p_pet_ids IS NULL OR pg_catalog.array_length(p_pet_ids,1) IS NULL
    OR pg_catalog.array_length(p_pet_ids,1)>48
    OR pg_catalog.array_position(p_pet_ids,NULL) IS NOT NULL
 THEN RAISE EXCEPTION 'Invalid batch' USING ERRCODE='22023'; END IF;
 RETURN QUERY
 SELECT ids.id,
   COALESCE((benefits.value->>'badge')::boolean,false),
   COALESCE((benefits.value->>'milestone')::integer,0)
 FROM (SELECT DISTINCT req.pet_id AS id
       FROM pg_catalog.unnest(p_pet_ids) AS req(pet_id)) ids
 CROSS JOIN LATERAL (
   SELECT public.pazo_supporter_public_pet_benefits(ids.id) AS value
 ) AS benefits;
END;
$f$;
ALTER FUNCTION public.pazo_supporter_public_badges_batch(uuid[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_supporter_public_badges_batch(uuid[])
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_supporter_public_badges_batch(uuid[])
 TO anon,authenticated;

-- A public gallery lists only opted-in pets with CURRENT verified coverage.
-- No owner UUID, email, subscription identifiers or payment fields exposed.
CREATE FUNCTION public.pazo_supporter_public_wall(p_limit integer DEFAULT 48)
RETURNS TABLE(pet_id uuid,pet_name text,photo_url text,milestone integer)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
BEGIN
 IF p_limit IS NULL OR p_limit < 1 OR p_limit > 48
 THEN RAISE EXCEPTION 'Invalid page size' USING ERRCODE='22023'; END IF;
 RETURN QUERY
 SELECT p.id,LEFT(p.name,120),p.photo_url,
  (b.value->>'milestone')::integer
 FROM supporter_private.wall_consents c
 JOIN public.pets p ON p.id=c.pet_id
 CROSS JOIN LATERAL
  (SELECT public.pazo_supporter_public_pet_benefits(p.id) AS value) b
 WHERE c.revoked_at IS NULL
   AND c.owner_id_at_grant=p.owner_id
   AND (b.value->>'badge')::boolean IS TRUE
 ORDER BY c.granted_at ASC,p.id ASC
 LIMIT p_limit;
END;
$f$;
ALTER FUNCTION public.pazo_supporter_public_wall(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_supporter_public_wall(integer)
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pazo_supporter_public_wall(integer)
 TO anon,authenticated;
COMMIT;
