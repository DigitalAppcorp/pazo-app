-- Synthetic terminal-quarantine PostgreSQL QA. All DDL and data are pg_temp.
BEGIN;
CREATE TEMP TABLE a3_quarantine_jobs (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL, status text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
) ON COMMIT DROP;
CREATE TEMP TABLE a3_quarantine_leases (
 job_id uuid PRIMARY KEY, token uuid NOT NULL, version bigint NOT NULL,
 expires_at timestamptz NOT NULL
) ON COMMIT DROP;
CREATE TEMP TABLE a3_quarantine_events (
 job_id uuid NOT NULL, action text NOT NULL
) ON COMMIT DROP;
CREATE OR REPLACE FUNCTION pg_temp.a3_quarantine(
 p_job uuid,p_owner uuid,p_token uuid,p_version bigint,p_ready boolean)
RETURNS boolean LANGUAGE plpgsql SET search_path='' AS $qa$
DECLARE v_owner uuid;v_status text;v_now timestamptz;v_count integer;
BEGIN
 IF p_job IS NULL OR p_owner IS NULL OR p_token IS NULL
  OR p_version IS NULL OR p_version<1 OR p_ready IS DISTINCT FROM TRUE
 THEN RETURN false; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_owner::text,901426));
 SELECT owner_id,status INTO v_owner,v_status
 FROM pg_temp.a3_quarantine_jobs WHERE id=p_job FOR UPDATE;
 IF v_owner IS DISTINCT FROM p_owner OR v_status <> 'deleting_auth'
 THEN RETURN false; END IF;
 PERFORM 1 FROM pg_temp.a3_quarantine_leases
  WHERE job_id=p_job FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 v_now:=pg_catalog.clock_timestamp();
 UPDATE pg_temp.a3_quarantine_leases
 SET token=pg_catalog.gen_random_uuid(),version=version+1
 WHERE job_id=p_job AND token=p_token AND version=p_version
  AND version<9223372036854775807 AND expires_at<=v_now;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 IF v_count<>1 THEN RETURN false; END IF;
 UPDATE pg_temp.a3_quarantine_jobs
 SET status='blocked',updated_at=v_now
 WHERE id=p_job AND owner_id=p_owner AND status='deleting_auth';
 IF NOT FOUND THEN RAISE EXCEPTION 'quarantine CAS conflict'; END IF;
 INSERT INTO pg_temp.a3_quarantine_events(job_id,action)
 VALUES(p_job,'blocked');
 RETURN true;
END;$qa$;
INSERT INTO pg_temp.a3_quarantine_jobs (id,owner_id,status) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','deleting_auth'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','dddddddd-dddd-4ddd-8ddd-dddddddddddd','reviewing'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','ffffffff-ffff-4fff-8fff-ffffffffffff','deleting_auth');
INSERT INTO pg_temp.a3_quarantine_leases(job_id,token,version,expires_at) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',3,clock_timestamp()-interval '10 seconds'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111',3,clock_timestamp()-interval '10 seconds'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111',3,clock_timestamp()+interval '1 hour');
DO $a3_assert$
DECLARE id1 uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        id2 uuid:='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
        id3 uuid:='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
        u1 uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        t uuid:='11111111-1111-4111-8111-111111111111';
BEGIN
 IF pg_temp.a3_quarantine(id1,u1,t,3,false)
 OR pg_temp.a3_quarantine(id1,'dddddddd-dddd-4ddd-8ddd-dddddddddddd',t,3,true)
 OR pg_temp.a3_quarantine(id1,u1,t,2,true)
 OR pg_temp.a3_quarantine(id2,'dddddddd-dddd-4ddd-8ddd-dddddddddddd',t,3,true)
 OR pg_temp.a3_quarantine(id3,'ffffffff-ffff-4fff-8fff-ffffffffffff',t,3,true)
 THEN RAISE EXCEPTION 'unexpected quarantine approval';END IF;
 IF NOT pg_temp.a3_quarantine(id1,u1,t,3,true) THEN
  RAISE EXCEPTION 'expired deleting_auth lease should be quarantined'; END IF;
 IF pg_temp.a3_quarantine(id1,u1,t,3,true) THEN
  RAISE EXCEPTION 'stale lease replay accepted';END IF;
 IF (SELECT status FROM pg_temp.a3_quarantine_jobs WHERE id=id1)<>'blocked'
 OR (SELECT version FROM pg_temp.a3_quarantine_leases WHERE job_id=id1)<>4
 OR (SELECT token FROM pg_temp.a3_quarantine_leases WHERE job_id=id1)=t
 OR (SELECT count(*) FROM pg_temp.a3_quarantine_events WHERE job_id=id1 AND action='blocked')<>1
 OR (SELECT status FROM pg_temp.a3_quarantine_jobs WHERE id=id3)<>'deleting_auth'
 THEN RAISE EXCEPTION 'quarantine side-effects incorrect';END IF;
END;$a3_assert$;
ROLLBACK;
SELECT 'PASS: quarantined expired terminal lease, rotated token/version; all other attempts blocked; ROLLBACK' AS result;
