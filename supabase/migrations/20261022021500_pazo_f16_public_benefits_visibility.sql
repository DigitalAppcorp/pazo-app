-- Public read hardening only: moderation applies even inside SECURITY DEFINER.
-- No payment writes, new data, grants, or release-state changes.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $prerequisite$ BEGIN
 IF pg_catalog.to_regprocedure('public.f14_content_visible(text,uuid)') IS NULL
 THEN RAISE EXCEPTION 'Existing moderation visibility contract required'; END IF;
END $prerequisite$;
CREATE OR REPLACE FUNCTION public.pazo_supporter_public_pet_benefits(p_pet_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_owner uuid;
 v_live jsonb;
 v_qa jsonb;
 v_months integer;
 v_theme text;
BEGIN
 SELECT owner_id INTO v_owner FROM public.pets WHERE id=p_pet_id
  AND public.f14_content_visible('pet_profile',id);
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
  SELECT t.theme INTO v_theme FROM supporter_private.pazo_live_pet_themes t
   WHERE t.pet_id=p_pet_id AND t.owner_id_at_set=v_owner;
  RETURN pg_catalog.jsonb_build_object('badge',true,'theme',v_theme,
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
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_supporter_public_badges_batch(p_pet_ids uuid[])
 RETURNS TABLE(pet_id uuid, badge boolean, milestone integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF p_pet_ids IS NULL OR pg_catalog.array_ndims(p_pet_ids) IS DISTINCT FROM 1
    OR pg_catalog.cardinality(p_pet_ids) NOT BETWEEN 1 AND 48
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
$function$;

COMMIT;
