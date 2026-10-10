-- F14 A3: synthetic PostgreSQL-only FK cascade gate, ALL DATA pg_temp.
-- EXECUTION AUTHORIZED only as BEGIN / ROLLBACK, without real-account DML.
-- This fixture models the exact A3 status rejection predicate for profiles.
-- It is not a full installation of the draft A3 guard, not two sessions.
BEGIN;
CREATE TEMP TABLE a3_cascade_users (id uuid PRIMARY KEY) ON COMMIT DROP;
CREATE TEMP TABLE a3_cascade_profiles (
  id uuid PRIMARY KEY REFERENCES pg_temp.a3_cascade_users(id) ON DELETE CASCADE
) ON COMMIT DROP;
CREATE TEMP TABLE a3_cascade_jobs (
  user_id uuid PRIMARY KEY, status text NOT NULL
) ON COMMIT DROP;
CREATE OR REPLACE FUNCTION pg_temp.a3_cascade_profile_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=''
AS $a3_guard$
DECLARE v_owner uuid;
BEGIN
  v_owner := (to_jsonb(OLD)->>'id')::uuid;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text,901426));
  IF EXISTS (
    SELECT 1 FROM pg_temp.a3_cascade_jobs j
    WHERE j.user_id=v_owner AND j.status NOT IN ('requested','cancelled')
  ) THEN
    RAISE EXCEPTION 'Account write paused for deletion review'
      USING ERRCODE='42501';
  END IF;
  RETURN OLD;
END;
$a3_guard$;
CREATE TRIGGER a3_cascade_profile_guard BEFORE DELETE
ON pg_temp.a3_cascade_profiles FOR EACH ROW
EXECUTE FUNCTION pg_temp.a3_cascade_profile_guard();
INSERT INTO pg_temp.a3_cascade_users(id) VALUES
  ('a2a1a3a4-0000-4000-8000-000000000001'::uuid),
  ('a2a1a3a4-0000-4000-8000-000000000002'::uuid),
  ('a2a1a3a4-0000-4000-8000-000000000003'::uuid);
INSERT INTO pg_temp.a3_cascade_profiles(id)
SELECT id FROM pg_temp.a3_cascade_users;
INSERT INTO pg_temp.a3_cascade_jobs(user_id,status) VALUES
  ('a2a1a3a4-0000-4000-8000-000000000001'::uuid,'reviewing'),
  ('a2a1a3a4-0000-4000-8000-000000000003'::uuid,'requested');
DO $a3_assert$
DECLARE v_denied boolean := false;
BEGIN
  BEGIN
    DELETE FROM pg_temp.a3_cascade_users
     WHERE id='a2a1a3a4-0000-4000-8000-000000000001'::uuid;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'Frozen account Auth cascade unexpectedly allowed';
  END IF;
  IF (SELECT count(*) FROM pg_temp.a3_cascade_users)<>3
     OR (SELECT count(*) FROM pg_temp.a3_cascade_profiles)<>3 THEN
    RAISE EXCEPTION 'Blocked cascade changed synthetic rows';
  END IF;
  DELETE FROM pg_temp.a3_cascade_users
   WHERE id='a2a1a3a4-0000-4000-8000-000000000002'::uuid;
  DELETE FROM pg_temp.a3_cascade_users
   WHERE id='a2a1a3a4-0000-4000-8000-000000000003'::uuid;
  IF (SELECT count(*) FROM pg_temp.a3_cascade_users)<>1
     OR (SELECT count(*) FROM pg_temp.a3_cascade_profiles)<>1 THEN
    RAISE EXCEPTION 'Active/requested synthetic cascade did not complete';
  END IF;
END;
$a3_assert$;
ROLLBACK;
SELECT 'PASS: synthetic frozen DELETE blocked / active and requested cascades allowed; ROLLBACK' AS result;
