-- F14 A3: ACCOUNT DELETION REQUEST INTAKE -- DRAFT, NOT APPLIED.
-- Prohibited until separate PO approval, reviewed SQL/RLS/pgTAP and beta gates.
-- Hard fail closed: MUST deliberately remove the following guard after approval.
BEGIN;

DO $a3_do_not_apply$
BEGIN
  RAISE EXCEPTION 'A3 DRAFT ONLY: explicit Product Owner approval and preflight required';
END
$a3_do_not_apply$;

-- BEGIN approved migration only below this point.


CREATE SCHEMA IF NOT EXISTS account_private;
REVOKE ALL ON SCHEMA account_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS account_private.deletion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'reviewing', 'blocked', 'archiving',
      'media_pending', 'deleting_data', 'deleting_auth', 'completed', 'failed', 'cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (updated_at >= requested_at),
  -- Audit row survives only after the final verified Auth step unlinks the ID.
  CHECK (user_id IS NOT NULL OR status = 'completed')
);

-- An active request is unique per user. Cancelled/completed history is preserved
-- while the account exists; finalization must explicitly unlink the user only
-- at status completed. FK RESTRICT blocks direct Auth deletion before unlinking.
CREATE UNIQUE INDEX IF NOT EXISTS deletion_jobs_one_active_per_user
ON account_private.deletion_jobs (user_id)
WHERE status NOT IN ('cancelled', 'completed');

CREATE INDEX IF NOT EXISTS deletion_jobs_status_requested
ON account_private.deletion_jobs (status, requested_at, id);

CREATE TABLE IF NOT EXISTS account_private.deletion_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES account_private.deletion_jobs(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('requested', 'cancelled', 'reviewed',
    'blocked', 'archived', 'media_verified', 'data_verified', 'auth_verified',
    'completed', 'retry', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deletion_events_by_job
ON account_private.deletion_events (job_id, created_at);

ALTER TABLE account_private.deletion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_private.deletion_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA account_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA account_private FROM PUBLIC, anon, authenticated;

-- Only exposes counts related to auth.uid(). Returns no content, emails or paths.
CREATE OR REPLACE FUNCTION public.f14_a3_deletion_preflight()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pets int;
  v_posts int;
  v_owned int;
  v_foreign_comm_posts int;
  v_foreign_feed_comments int;
  v_docs int;
  v_care int;
  v_legacy_comments int;
  v_feed_photos int;
  v_community_photos int;
  v_pet_avatars int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000'; END IF;

  SELECT count(*)::int INTO v_pets FROM public.pets WHERE owner_id=v_uid;
  SELECT count(*)::int INTO v_posts FROM public.posts WHERE user_id=v_uid;
  SELECT count(*)::int INTO v_owned FROM public.communities WHERE owner_user_id=v_uid;

  SELECT count(*)::int INTO v_foreign_comm_posts
  FROM public.community_posts p JOIN public.communities c ON c.id=p.community_id
  WHERE c.owner_user_id=v_uid AND p.author_user_id<>v_uid;

  SELECT count(*)::int INTO v_foreign_feed_comments
  FROM public.post_comments cm
  JOIN public.posts p ON p.id=cm.post_id
  JOIN public.pets author_pet ON author_pet.id=cm.author_pet_id
  WHERE p.user_id=v_uid AND author_pet.owner_id<>v_uid;

  SELECT count(*)::int INTO v_docs FROM public.pet_documents d
  JOIN public.pets pt ON pt.id=d.pet_id WHERE pt.owner_id=v_uid;

  SELECT count(*)::int INTO v_care FROM public.care_items c
  JOIN public.pets pt ON pt.id=c.pet_id WHERE pt.owner_id=v_uid;


  -- Embedded legacy JSON comments may not have verified account authorship.
  -- Never assume they are duplicates of post_comments or safe to discard.
  SELECT coalesce(sum(CASE
    WHEN jsonb_typeof(p.comments)='array' THEN jsonb_array_length(p.comments)
    ELSE 0 END),0)::int INTO v_legacy_comments
  FROM public.posts p WHERE p.user_id=v_uid;

  SELECT count(*)::int INTO v_feed_photos
  FROM public.posts p WHERE p.user_id=v_uid
    AND nullif(btrim(coalesce(p.photo_url,'')),'') IS NOT NULL;

  SELECT count(*)::int INTO v_community_photos
  FROM public.community_posts p JOIN public.communities c ON c.id=p.community_id
  WHERE (c.owner_user_id=v_uid OR p.author_user_id=v_uid)
    AND (nullif(btrim(coalesce(p.photo_url,'')),'') IS NOT NULL
      OR nullif(btrim(coalesce(p.photo_storage_path,'')),'') IS NOT NULL);

  SELECT count(*)::int INTO v_pet_avatars
  FROM public.pets p WHERE p.owner_id=v_uid
    AND nullif(btrim(coalesce(p.photo_url,'')),'') IS NOT NULL;

  RETURN pg_catalog.jsonb_build_object(
    'pets',v_pets, 'posts',v_posts, 'communities_owned',v_owned,
    'foreign_community_posts',v_foreign_comm_posts,
    'foreign_feed_comments',v_foreign_feed_comments,
    'documents',v_docs,'care_items',v_care,
    'legacy_embedded_comments',v_legacy_comments,
    'feed_posts_with_photos',v_feed_photos,
    'community_posts_with_photos',v_community_photos,
    'pet_profiles_with_photos',v_pet_avatars,
    'requires_manual_review',(v_owned>0 OR v_foreign_comm_posts>0 OR v_foreign_feed_comments>0
       OR v_docs>0 OR v_legacy_comments>0 OR v_feed_photos>0
       OR v_community_photos>0 OR v_pet_avatars>0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.f14_a3_deletion_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_uid uuid := auth.uid(); v_job account_private.deletion_jobs%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000'; END IF;
  SELECT * INTO v_job FROM account_private.deletion_jobs
  WHERE user_id=v_uid ORDER BY requested_at DESC, id DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN pg_catalog.jsonb_build_object('status',v_job.status,
    'requested_at',v_job.requested_at,'updated_at',v_job.updated_at);
END;
$$;

-- Reversible intake only. This does NOT delete data or start a worker.
-- Every job remains pending manual review until worker and D3-A are approved.
CREATE OR REPLACE FUNCTION public.f14_a3_request_deletion()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_uid uuid := auth.uid(); v_job account_private.deletion_jobs%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000'; END IF;

  INSERT INTO account_private.deletion_jobs (user_id,status)
  VALUES (v_uid,'requested')
  ON CONFLICT (user_id) WHERE status NOT IN ('cancelled', 'completed')
  DO UPDATE SET updated_at=account_private.deletion_jobs.updated_at
  RETURNING * INTO v_job;

  -- Idempotent request receipt; do not add repeated audit events for retries.
  INSERT INTO account_private.deletion_events (job_id,action)
  SELECT v_job.id,'requested'
  WHERE NOT EXISTS (SELECT 1 FROM account_private.deletion_events ev
    WHERE ev.job_id=v_job.id AND ev.action='requested');

  RETURN pg_catalog.jsonb_build_object('status',v_job.status,
    'requested_at',v_job.requested_at,'updated_at',v_job.updated_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.f14_a3_cancel_deletion()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_uid uuid := auth.uid(); v_job account_private.deletion_jobs%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000'; END IF;
  SELECT * INTO v_job FROM account_private.deletion_jobs
  WHERE user_id=v_uid AND status NOT IN ('cancelled','completed')
  ORDER BY requested_at DESC, id DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active request to cancel' USING ERRCODE='P0001'; END IF;
  IF v_job.status <> 'requested' THEN
    RAISE EXCEPTION 'Request already processing; manual review needed' USING ERRCODE='P0001';
  END IF;
  UPDATE account_private.deletion_jobs
  SET status='cancelled', updated_at=pg_catalog.now()
  WHERE id=v_job.id RETURNING * INTO v_job;
  INSERT INTO account_private.deletion_events(job_id,action) VALUES (v_job.id,'cancelled');
  RETURN pg_catalog.jsonb_build_object('status',v_job.status,
    'requested_at',v_job.requested_at,'updated_at',v_job.updated_at);
END;
$$;

-- Postgres defaults EXECUTE to PUBLIC; revoked explicitly. No anon RPC calls.
REVOKE ALL ON FUNCTION public.f14_a3_deletion_preflight() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.f14_a3_deletion_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.f14_a3_request_deletion() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.f14_a3_cancel_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.f14_a3_deletion_preflight() TO authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_deletion_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_request_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_cancel_deletion() TO authenticated;

COMMIT;

-- No worker, archival of third-party contributions, Auth delete, Storage delete,
-- CDN guarantee or retention scheduler implemented in this intake migration.
-- Do not promote it as a complete self-service deletion flow.
