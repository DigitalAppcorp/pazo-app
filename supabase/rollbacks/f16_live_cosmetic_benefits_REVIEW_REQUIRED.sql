-- Preserve preferences: rollback is refused once any Live theme is stored.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_live_pet_themes)
 THEN RAISE EXCEPTION 'Live themes exist: retain user preferences and prepare a forward correction'; END IF;
END $guard$;
CREATE OR REPLACE FUNCTION supporter_private.wall_has_verified_entitlement(p_owner_id uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
 SELECT COALESCE(
   (supporter_private.f16_sandbox_qa_projection(
     p_owner_id,pg_catalog.clock_timestamp())->>'active')::boolean,
   false
 );
$f$;
ALTER FUNCTION supporter_private.wall_has_verified_entitlement(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION supporter_private.wall_has_verified_entitlement(uuid)
 FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pazo_supporter_set_pet_theme(p_pet_id uuid,p_theme text)
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
   DELETE FROM supporter_private.f16_sandbox_qa_pet_themes t WHERE t.pet_id=p_pet_id;
   RETURN true;
 END IF;
 IF p_theme NOT IN ('classic','nature','hearts','stars','adventure')
 THEN RAISE EXCEPTION 'Unsupported theme' USING ERRCODE='22023'; END IF;
 IF NOT supporter_private.wall_has_verified_entitlement(v_owner)
 THEN RAISE EXCEPTION 'Verified coverage required' USING ERRCODE='42501'; END IF;
 INSERT INTO supporter_private.f16_sandbox_qa_pet_themes AS t
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

CREATE OR REPLACE FUNCTION public.pazo_supporter_public_pet_benefits(
 p_pet_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $pet$
DECLARE
 v_owner uuid;
 v_live jsonb;
 v_qa jsonb;
 v_months integer;
 v_theme text;
BEGIN
 SELECT owner_id INTO v_owner FROM public.pets WHERE id=p_pet_id;
 IF v_owner IS NULL THEN
  RETURN pg_catalog.jsonb_build_object('badge',false,'theme',NULL,'milestone',0);
 END IF;
 v_live:=supporter_private.pazo_live_project_paid_periods(
  v_owner,pg_catalog.clock_timestamp());
 IF v_live IS NULL OR pg_catalog.jsonb_typeof(v_live)<>'object' OR
  v_live->>'sourceEnvironment' IS DISTINCT FROM 'live' OR
  (v_live->>'active') NOT IN ('true','false') OR
  (v_live->>'completedCycles') IS NULL
 THEN RETURN pg_catalog.jsonb_build_object(
  'badge',false,'theme',NULL,'milestone',0); END IF;
 IF v_live->>'active'='true' THEN
  v_months:=LEAST(100000,GREATEST(0,(v_live->>'completedCycles')::integer));
  -- Live theme settings require their own owner-scope/consent gate, so do
  -- not reuse the separate Sandbox theme table.
  RETURN pg_catalog.jsonb_build_object('badge',true,'theme',NULL,
   'milestone',CASE WHEN v_months>=12 THEN 12
    WHEN v_months>=6 THEN 6 WHEN v_months>=3 THEN 3 ELSE 0 END);
 END IF;
 v_qa:=supporter_private.f16_sandbox_qa_projection(
  v_owner,pg_catalog.clock_timestamp());
 IF COALESCE((v_qa->>'active')::boolean,false) IS DISTINCT FROM true
 THEN RETURN pg_catalog.jsonb_build_object(
  'badge',false,'theme',NULL,'milestone',0); END IF;
 v_months:=COALESCE((v_qa->>'completedCycles')::integer,0);
 SELECT theme INTO v_theme FROM supporter_private.f16_sandbox_qa_pet_themes
 WHERE pet_id=p_pet_id AND owner_id_at_set=v_owner;
 RETURN pg_catalog.jsonb_build_object('badge',true,'theme',v_theme,
  'milestone',CASE WHEN v_months>=12 THEN 12
   WHEN v_months>=6 THEN 6 WHEN v_months>=3 THEN 3 ELSE 0 END);
END $pet$;
DROP TABLE supporter_private.pazo_live_pet_themes;
COMMIT;
