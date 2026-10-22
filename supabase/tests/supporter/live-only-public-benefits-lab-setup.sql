-- Synthetic PostgreSQL 17 ONLY. No hosted credentials or real pet/merchant data.
CREATE SCHEMA supporter_private;
CREATE TABLE public.pets(id uuid PRIMARY KEY,owner_id uuid NOT NULL,name text NOT NULL);
CREATE TABLE supporter_private.pazo_live_pet_themes(
 pet_id uuid NOT NULL,owner_id_at_set uuid NOT NULL,theme text NOT NULL
);
CREATE TABLE supporter_private.lab_live_periods(
 owner_id uuid PRIMARY KEY,environment text NOT NULL,active boolean NOT NULL,cycles integer
);
CREATE TABLE supporter_private.lab_sandbox_qa(
 owner_id uuid PRIMARY KEY,active boolean NOT NULL
);
CREATE OR REPLACE FUNCTION public.f14_content_visible(p_kind text,p_id uuid)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT p_kind='pet_profile'
  AND p_id IS DISTINCT FROM '00000000-0000-4000-8000-000000000009'::uuid
$$;
CREATE OR REPLACE FUNCTION supporter_private.pazo_live_project_paid_periods(
 p_owner uuid,p_now timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT pg_catalog.jsonb_build_object(
  'sourceEnvironment',environment,'active',active,'completedCycles',cycles)
 FROM supporter_private.lab_live_periods
 WHERE owner_id=p_owner
$$;
INSERT INTO public.pets(id,owner_id,name)
SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       'Synthetic pet '||n
FROM pg_catalog.generate_series(1,9) AS n;
-- Two fictitious Sandbox QA customers have no independently paid Live period.
INSERT INTO supporter_private.lab_sandbox_qa(owner_id,active)
VALUES ('10000000-0000-4000-8000-000000000001',true),
       ('10000000-0000-4000-8000-000000000002',true),
       ('10000000-0000-4000-8000-000000000004',true);
-- A suspended Live period, two paid Live members, a forged Sandbox source,
-- insufficient provider metadata and a removed profile are distinguishable.
INSERT INTO supporter_private.lab_live_periods(owner_id,environment,active,cycles)
VALUES ('10000000-0000-4000-8000-000000000002','live',false,1),
       ('10000000-0000-4000-8000-000000000003','live',true,3),
       ('10000000-0000-4000-8000-000000000004','sandbox',true,12),
       ('10000000-0000-4000-8000-000000000005','live',true,NULL),
       ('10000000-0000-4000-8000-000000000006','live',true,12),
       ('10000000-0000-4000-8000-000000000007','live',true,1),
       ('10000000-0000-4000-8000-000000000009','live',true,12);
INSERT INTO supporter_private.pazo_live_pet_themes(pet_id,owner_id_at_set,theme)
VALUES ('00000000-0000-4000-8000-000000000003',
        '10000000-0000-4000-8000-000000000003','Naturaleza');
