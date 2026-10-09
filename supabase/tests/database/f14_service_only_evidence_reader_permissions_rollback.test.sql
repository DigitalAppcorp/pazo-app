-- F14 A2: non-destructive hosted RPC permissions smoke. NO DML/DDL.
BEGIN;
DO $acl$
BEGIN
  IF has_function_privilege('anon','public.f14_get_media_claim_evidence(uuid)','EXECUTE')
    OR has_function_privilege('authenticated','public.f14_get_media_claim_evidence(uuid)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.f14_get_media_claim_evidence(uuid)','EXECUTE')
    OR has_schema_privilege('service_role','moderation_private','USAGE')
  THEN RAISE EXCEPTION 'F14 reader role grants are too broad or service denied'; END IF;
END $acl$;
SET LOCAL ROLE anon;
DO $anon$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
    PERFORM public.f14_get_media_claim_evidence('ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid);
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'anon can execute reader'; END IF;
END $anon$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $auth$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
    PERFORM public.f14_get_media_claim_evidence('ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid);
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'authenticated can execute reader'; END IF;
END $auth$;
RESET ROLE;
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE service_role;
DO $spoof$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
    PERFORM public.f14_get_media_claim_evidence('ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid);
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'missing service JWT check'; END IF;
END $spoof$;
RESET ROLE;
SELECT set_config('request.jwt.claim.role','service_role',true);
SET LOCAL ROLE service_role;
DO $service$
BEGIN
  IF public.f14_get_media_claim_evidence('ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid) IS NOT NULL
    OR public.f14_get_media_claim_evidence(NULL::uuid) IS NOT NULL
  THEN RAISE EXCEPTION 'unknown claim produced evidence'; END IF;
END $service$;
RESET ROLE;
ROLLBACK;
