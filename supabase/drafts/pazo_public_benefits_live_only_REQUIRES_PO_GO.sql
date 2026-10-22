-- PAZO beta hardening: public supporter badges/themes/wall must derive from
-- verified LIVE paid periods only, never allowlisted Sandbox QA projections.
-- DRAFT: NOT APPLIED. Requires a new PO-authorized, versioned migration and
-- independent hosted-readback; preserve existing grants and SECURITY DEFINER.
-- The private Sandbox QA receipts and owner-facing diagnostic routes remain intact.
BEGIN;

CREATE OR REPLACE FUNCTION public.pazo_supporter_public_pet_benefits(p_pet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $pet$
DECLARE
 v_owner uuid;
 v_live jsonb;
 v_months integer;
 v_theme text;
BEGIN
 SELECT owner_id INTO v_owner
 FROM public.pets
 WHERE id=p_pet_id
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
 THEN
  RETURN pg_catalog.jsonb_build_object('badge',false,'theme',NULL,'milestone',0);
 END IF;

 IF v_live->>'active'='true' THEN
  v_months:=LEAST(100000,GREATEST(0,(v_live->>'completedCycles')::integer));
  SELECT t.theme INTO v_theme
   FROM supporter_private.pazo_live_pet_themes t
   WHERE t.pet_id=p_pet_id AND t.owner_id_at_set=v_owner;
  RETURN pg_catalog.jsonb_build_object(
   'badge',true,'theme',v_theme,
   'milestone',CASE WHEN v_months>=12 THEN 12
    WHEN v_months>=6 THEN 6 WHEN v_months>=3 THEN 3 ELSE 0 END);
 END IF;

 RETURN pg_catalog.jsonb_build_object('badge',false,'theme',NULL,'milestone',0);
END $pet$;

COMMENT ON FUNCTION public.pazo_supporter_public_pet_benefits(uuid)
 IS 'Public PAZO supporter entitlements derive ONLY from independently verified Live paid periods; Sandbox QA cannot create a public badge, theme or gratitude-wall entry.';
COMMIT;
