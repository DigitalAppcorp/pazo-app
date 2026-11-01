-- #169 LOCAL GoTrue + real Meta candidate SQL lab only.
-- DO NOT APPLY TO HOSTED SUPABASE. This file intentionally reconstructs
-- ONLY the small first-party prerequisites; it is NOT production migration.
-- Run in a disposable local Supabase CLI database with existing auth.users.
BEGIN;
CREATE SCHEMA marketing_private;
REVOKE ALL ON SCHEMA marketing_private FROM PUBLIC, anon, authenticated;
CREATE TABLE marketing_private.collection_gate (
 singleton boolean PRIMARY KEY CHECK(singleton),
 enabled boolean NOT NULL,
 retention_days smallint NOT NULL,
 policy_version text NOT NULL
);
INSERT INTO marketing_private.collection_gate(singleton,enabled,retention_days,policy_version)
 VALUES (true,false,14,'pazo-marketing-attribution-notice-v1');
ALTER TABLE marketing_private.collection_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.collection_gate FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.collection_gate FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE marketing_private.acquisition (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 signup_verified_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
ALTER TABLE marketing_private.acquisition ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.acquisition FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.acquisition FROM PUBLIC,anon,authenticated,service_role;

-- Local synthetic eligibility fixture; NOT a substitute for PAZO's real
-- supporter_private/admin_private/profile exclusion checks in #168.
CREATE FUNCTION marketing_private.is_eligible_owner(p_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
   SELECT 1 FROM auth.users u
   WHERE u.id=p_owner
     AND u.email_confirmed_at IS NOT NULL
     AND u.is_anonymous IS DISTINCT FROM TRUE
     AND COALESCE(u.raw_app_meta_data->>'pazo_marketing_qa','false')<>'true'
 ) $$;
REVOKE ALL ON FUNCTION marketing_private.is_eligible_owner(uuid)
 FROM PUBLIC,anon,authenticated,service_role;

-- Minimal local retention contract. Independent PG17 suite runs the full
-- first-party retention migration and QA/admin exclusion model separately.
CREATE FUNCTION marketing_private.retention_ready(p_days integer,p_version text)
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT p_days=14 AND p_version='pazo-marketing-attribution-notice-v1'
$$;
REVOKE ALL ON FUNCTION marketing_private.retention_ready(integer,text)
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
