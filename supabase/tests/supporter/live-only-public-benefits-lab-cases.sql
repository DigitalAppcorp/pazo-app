-- Execute the real candidate function against a disposable PostgreSQL 17
-- lab. ASSERT each branch, not just string matches.
DO $$
DECLARE
 result jsonb;
 n integer;
 expected_badge boolean;
 expected_milestone integer;
BEGIN
 FOR n IN 1..9 LOOP
  result:=public.pazo_supporter_public_pet_benefits(
    ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid);
  expected_badge:=n IN (3,6,7);
  expected_milestone:=CASE n WHEN 3 THEN 3 WHEN 6 THEN 12 ELSE 0 END;
  IF pg_catalog.jsonb_typeof(result) IS DISTINCT FROM 'object' OR
     result->>'badge' IS DISTINCT FROM expected_badge::text OR
     (result->>'milestone')::integer IS DISTINCT FROM expected_milestone THEN
   RAISE EXCEPTION 'Public Live-only benefit failed for synthetic case % (payload %)',n,result;
  END IF;
  IF n=3 AND result->>'theme' IS DISTINCT FROM 'Naturaleza' THEN
   RAISE EXCEPTION 'Verified Live theme was lost';
  ELSIF n<>3 AND result->>'theme' IS NOT NULL THEN
   RAISE EXCEPTION 'Theme leaked without correct Live entitlement on case %',n;
  END IF;
 END LOOP;
 IF (public.pazo_supporter_public_pet_benefits(NULL::uuid)->>'badge')::boolean
  IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'Null pet must fail closed';
 END IF;
END
$$;

DO $$
DECLARE body text;
BEGIN
 SELECT pg_catalog.pg_get_functiondef('public.pazo_supporter_public_pet_benefits(uuid)'::regprocedure)
 INTO body;
 IF body ~* 'f16_sandbox_qa_projection|f16_sandbox_qa_pet_themes|lab_sandbox_qa' THEN
  RAISE EXCEPTION 'Public function still references Sandbox/QA benefits';
 END IF;
 IF body NOT LIKE '%pazo_live_project_paid_periods%' OR
    body NOT LIKE '%f14_content_visible%' THEN
  RAISE EXCEPTION 'Live payment or moderation visibility proof absent';
 END IF;
END
$$;
SELECT 'F16_PUBLIC_BADGES_LIVE_ONLY_PG17_PASS' AS gate;
