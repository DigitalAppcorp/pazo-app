-- PAZO F16: read-only verified Live benefits, preserve existing Sandbox QA.
-- No payments, grants, generation changes or checkout release.
BEGIN;
SET LOCAL lock_timeout='5s';

-- Enforce release-policy invariant: rights are derived from verified service
-- periods, never PayPal approval, subscription ACTIVE or browser state.
CREATE OR REPLACE FUNCTION public.pazo_supporter_my_account_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $status$
DECLARE
 v_owner uuid:=auth.uid();
 v_live jsonb;
 v_qa jsonb;
 v_active boolean;
 v_months integer;
BEGIN
 IF v_owner IS NULL OR NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id=v_owner
   AND u.email_confirmed_at IS NOT NULL
   AND u.is_anonymous IS DISTINCT FROM true
 ) THEN RAISE EXCEPTION 'Confirmed authentication required'
  USING ERRCODE='42501'; END IF;
 v_live:=supporter_private.pazo_live_project_paid_periods(
  v_owner,pg_catalog.clock_timestamp());
 IF v_live IS NULL OR pg_catalog.jsonb_typeof(v_live)<>'object' OR
  v_live->>'sourceEnvironment' IS DISTINCT FROM 'live' OR
  (v_live->>'active') NOT IN ('true','false') OR
  (v_live->>'completedCycles') IS NULL
 THEN RAISE EXCEPTION 'Live projection unavailable'
  USING ERRCODE='P1603'; END IF;
 IF v_live->>'active'='true' THEN
  v_months:=LEAST(100000,GREATEST(0,(v_live->>'completedCycles')::integer));
  RETURN pg_catalog.jsonb_build_object(
   'active',true,'milestone',CASE WHEN v_months>=12 THEN 12
    WHEN v_months>=6 THEN 6 WHEN v_months>=3 THEN 3 ELSE 0 END);
 END IF;

 -- Existing QA remains a separate, explicitly allowlisted Sandbox source.
 -- A pending Live subscription does not suppress previously verified QA.
 v_qa:=supporter_private.f16_sandbox_qa_projection(
  v_owner,pg_catalog.clock_timestamp());
 v_active:=COALESCE((v_qa->>'active')::boolean,false);
 v_months:=COALESCE((v_qa->>'completedCycles')::integer,0);
 RETURN pg_catalog.jsonb_build_object(
  'active',v_active,
  'milestone',CASE WHEN NOT v_active THEN 0
   WHEN v_months>=12 THEN 12 WHEN v_months>=6 THEN 6
   WHEN v_months>=3 THEN 3 ELSE 0 END);
END $status$;

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
COMMIT;
