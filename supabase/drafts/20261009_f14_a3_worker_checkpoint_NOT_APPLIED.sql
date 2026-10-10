-- F14 A3 review checkpoints. NOT APPLIED; never authorize deletion.
BEGIN;
DO $a3_review_guard$
BEGIN
 RAISE EXCEPTION 'A3 CHECKPOINT DRAFT ONLY: independent PO gate required';
END
$a3_review_guard$;
CREATE TABLE account_private.deletion_review_checkpoints(
 job_id uuid PRIMARY KEY REFERENCES account_private.deletion_jobs(id) ON DELETE RESTRICT,
 revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
 last_gate text,last_outcome text,last_issue text,observed_at timestamptz DEFAULT now()
);
CREATE TABLE account_private.deletion_review_events(
 job_id uuid NOT NULL REFERENCES account_private.deletion_jobs(id) ON DELETE RESTRICT,
 revision bigint NOT NULL CHECK(revision>=1),
 gate text NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('passed','blocked','error')),
 issue text,
 observed_at timestamptz DEFAULT now(),
 PRIMARY KEY(job_id,revision),
 CHECK((outcome='passed' AND issue IS NULL) OR (outcome<>'passed' AND issue IS NOT NULL))
);
ALTER TABLE account_private.deletion_review_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_private.deletion_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_private.deletion_review_checkpoints FROM PUBLIC,anon,authenticated;
REVOKE ALL ON account_private.deletion_review_events FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.f14_a3_worker_job_status(p_job_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_status$
DECLARE v_status text;
BEGIN
 IF COALESCE(current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN
   RAISE EXCEPTION 'Worker access required' USING ERRCODE='42501';
 END IF;
 SELECT status INTO v_status FROM account_private.deletion_jobs WHERE id=p_job_id;
 RETURN v_status;
END
$a3_status$;

CREATE OR REPLACE FUNCTION public.f14_a3_worker_review_revision(p_job_id uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_revision$
DECLARE v_revision bigint;
BEGIN
 IF COALESCE(current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN
   RAISE EXCEPTION 'Worker access required' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM account_private.deletion_jobs WHERE id=p_job_id AND status='reviewing') THEN
   RAISE EXCEPTION 'Job not in review' USING ERRCODE='42501';
 END IF;
 SELECT revision INTO v_revision FROM account_private.deletion_review_checkpoints WHERE job_id=p_job_id;
 RETURN COALESCE(v_revision,0);
END
$a3_revision$;

CREATE OR REPLACE FUNCTION public.f14_a3_worker_review_checkpoint(
 p_job_id uuid,p_token uuid,p_version bigint,p_expected_revision bigint,
 p_gate text,p_outcome text,p_issue text DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_checkpoint$
DECLARE v_revision bigint;
BEGIN
 IF COALESCE(current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN
   RAISE EXCEPTION 'Worker access required' USING ERRCODE='42501';
 END IF;
 IF p_expected_revision IS NULL OR p_expected_revision<0
 OR p_gate IS NULL OR p_gate NOT IN(
   'recent_reauthentication','worker_lease_valid','writes_frozen',
   'third_party_contributions_preserved','legacy_authorship_reconciled',
   'media_identity_and_references_verified','media_origin_and_public_urls_verified',
   'dependent_rows_and_foreign_keys_verified','old_sessions_invalidated',
   'retention_and_backup_policy_verified')
 OR p_outcome IS NULL OR p_outcome NOT IN('passed','blocked','error')
 OR (p_outcome='passed' AND p_issue IS NOT NULL)
 OR (p_outcome<>'passed' AND (p_issue IS NULL OR p_issue NOT IN (
   'missing_evidence','unsafe_dependency','unverified_media',
   'stale_session','requires_human_review','inspection_failed'))) THEN
   RAISE EXCEPTION 'Invalid worker checkpoint' USING ERRCODE='22023';
 END IF;

 -- Lock job and lease; same version token is mandatory on every checkpoint.
 PERFORM 1 FROM account_private.deletion_jobs
   WHERE id=p_job_id AND status='reviewing' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job not reviewable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM account_private.deletion_worker_leases
   WHERE job_id=p_job_id AND lease_token=p_token AND lease_version=p_version
     AND expires_at>pg_catalog.clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Worker lease expired' USING ERRCODE='42501'; END IF;
 -- First revision must be 0; subsequent writes use compare-and-set.
 IF p_expected_revision=0 THEN
   INSERT INTO account_private.deletion_review_checkpoints
    (job_id,revision,last_gate,last_outcome,last_issue,observed_at)
   VALUES(p_job_id,1,p_gate,p_outcome,p_issue,pg_catalog.now())
   ON CONFLICT(job_id) DO NOTHING RETURNING revision INTO v_revision;
 ELSE
   UPDATE account_private.deletion_review_checkpoints
     SET revision=revision+1,last_gate=p_gate,last_outcome=p_outcome,
       last_issue=p_issue,observed_at=pg_catalog.now()
   WHERE job_id=p_job_id AND revision=p_expected_revision
   RETURNING revision INTO v_revision;
 END IF;
 IF NOT FOUND OR v_revision<>p_expected_revision+1 THEN
   RAISE EXCEPTION 'Checkpoint revision conflict' USING ERRCODE='40001';
 END IF;
 INSERT INTO account_private.deletion_review_events(job_id,revision,gate,outcome,issue)
 VALUES(p_job_id,v_revision,p_gate,p_outcome,p_issue);
 RETURN v_revision;
END
$a3_checkpoint$;
REVOKE ALL ON FUNCTION public.f14_a3_worker_job_status(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.f14_a3_worker_review_revision(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.f14_a3_worker_review_checkpoint(uuid,uuid,bigint,bigint,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_worker_job_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.f14_a3_worker_review_revision(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.f14_a3_worker_review_checkpoint(uuid,uuid,bigint,bigint,text,text,text) TO service_role;
COMMIT;
-- No content deletion, storage removal, Auth admin action, worker deployment.
