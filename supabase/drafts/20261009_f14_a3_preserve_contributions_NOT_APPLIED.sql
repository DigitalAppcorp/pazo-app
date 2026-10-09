-- F14 A3: PRESERVE THIRD-PARTY CONTRIBUTIONS -- DRAFT, NOT APPLIED.
-- Requires intake migration, approved write-freeze/worker + media relocation.
-- Hard abort before DDL to prevent accidental production execution.
BEGIN;

DO $a3_archive_not_applied$
BEGIN
  RAISE EXCEPTION 'A3 ARCHIVE DRAFT ONLY: approval and worker write-freeze required';
END
$a3_archive_not_applied$;



-- Private tombstone: NEVER copy removed account's names, posts, avatar or text.
CREATE TABLE account_private.deletion_post_tombstones (
  job_id uuid NOT NULL REFERENCES account_private.deletion_jobs(id) ON DELETE RESTRICT,
  source_post_id uuid NOT NULL,
  source_created_at timestamptz NOT NULL,
  PRIMARY KEY (job_id,source_post_id)
);

-- Third-party contribution payload accessible only to approved worker/reviewer;
-- NOT exposed as another public feed, view or Storage bucket.
CREATE TABLE account_private.deletion_preserved_posts (
  job_id uuid NOT NULL REFERENCES account_private.deletion_jobs(id) ON DELETE RESTRICT,
  source_post_id uuid NOT NULL,
  source_community_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  author_pet_id uuid NOT NULL,
  body text NOT NULL,
  source_created_at timestamptz NOT NULL,
  PRIMARY KEY (job_id,source_post_id)
);

CREATE TABLE account_private.deletion_preserved_comments (
  job_id uuid NOT NULL REFERENCES account_private.deletion_jobs(id) ON DELETE RESTRICT,
  origin text NOT NULL CHECK (origin IN ('feed','community')),
  source_comment_id uuid NOT NULL,
  source_post_id uuid NOT NULL,
  author_pet_id uuid NOT NULL,
  body text NOT NULL,
  source_created_at timestamptz NOT NULL,
  PRIMARY KEY (job_id,origin,source_comment_id)
);

ALTER TABLE account_private.deletion_post_tombstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_private.deletion_preserved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_private.deletion_preserved_comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_private.deletion_post_tombstones FROM PUBLIC,anon,authenticated;
REVOKE ALL ON account_private.deletion_preserved_posts FROM PUBLIC,anon,authenticated;
REVOKE ALL ON account_private.deletion_preserved_comments FROM PUBLIC,anon,authenticated;

-- Private, service-role-only snapshot. A future worker must block new writes
-- and settle concurrent submissions BEFORE invoking this function.
-- This DOES NOT remove any row from public.* or Storage.
CREATE OR REPLACE FUNCTION account_private.f14_a3_snapshot_contributions(p_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_uid uuid;
  v_status text;
  v_communities int;
  v_feed_comments int;
  v_community_posts int;
  v_community_comments int;
BEGIN
  SELECT user_id,status INTO v_uid,v_status
    FROM account_private.deletion_jobs WHERE id=p_job_id FOR UPDATE;
  IF v_uid IS NULL OR v_status <> 'archiving' THEN
    RAISE EXCEPTION 'Deletion job must be assigned and in archiving phase'
      USING ERRCODE='42501';
  END IF;


  -- Embedded legacy comments lack verified author identity; fail closed.
  -- Their eventual preservation requires a separate legacy migration.
  IF EXISTS (
    SELECT 1 FROM public.posts p WHERE p.user_id=v_uid
      AND CASE WHEN jsonb_typeof(p.comments)='array'
        THEN jsonb_array_length(p.comments)>0
        ELSE false END
  ) THEN
    RAISE EXCEPTION 'Legacy embedded comments require manual author reconciliation'
      USING ERRCODE='P0001';
  END IF;

  -- Refuse unverified public media and every unknown shared path.
  -- Archive is not a substitute for Storage migration, CDN or D3-A.
  IF EXISTS (
    SELECT 1 FROM public.communities c WHERE c.owner_user_id=v_uid
      AND (NULLIF(BTRIM(COALESCE(c.image_url,'')),'') IS NOT NULL
        OR NULLIF(BTRIM(COALESCE(c.image_storage_path,'')),'') IS NOT NULL)
  ) OR EXISTS (
    SELECT 1 FROM public.community_posts p
    JOIN public.communities c ON c.id=p.community_id
    WHERE c.owner_user_id=v_uid
      AND (NULLIF(BTRIM(COALESCE(p.photo_url,'')),'') IS NOT NULL
        OR NULLIF(BTRIM(COALESCE(p.photo_storage_path,'')),'') IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Manual Storage/media archival required before snapshot'
      USING ERRCODE='P0001';
  END IF;

  -- Capture foreign contributions in private archive, only; no public copies.
  INSERT INTO account_private.deletion_preserved_posts
    (job_id,source_post_id,source_community_id,author_user_id,author_pet_id,body,source_created_at)
  SELECT p_job_id,p.id,p.community_id,p.author_user_id,p.author_pet_id,p.body,p.created_at
    FROM public.community_posts p
    JOIN public.communities c ON c.id=p.community_id
   WHERE c.owner_user_id=v_uid AND p.author_user_id<>v_uid
  ON CONFLICT (job_id,source_post_id) DO NOTHING;

  -- All comments of people other than the deleted user on their Feed posts.
  INSERT INTO account_private.deletion_preserved_comments
    (job_id,origin,source_comment_id,source_post_id,author_pet_id,body,source_created_at)
  SELECT p_job_id,'feed',cm.id,cm.post_id,cm.author_pet_id,cm.body,cm.created_at
    FROM public.post_comments cm
    JOIN public.posts p ON p.id=cm.post_id
    JOIN public.pets pet ON pet.id=cm.author_pet_id
   WHERE p.user_id=v_uid AND pet.owner_id<>v_uid
  ON CONFLICT (job_id,origin,source_comment_id) DO NOTHING;

  -- Foreign comments across any post in communities owned by deleted user.
  INSERT INTO account_private.deletion_preserved_comments
    (job_id,origin,source_comment_id,source_post_id,author_pet_id,body,source_created_at)
  SELECT p_job_id,'community',cm.id,cm.post_id,cm.author_pet_id,cm.body,cm.created_at
    FROM public.community_post_comments cm
    JOIN public.community_posts p ON p.id=cm.post_id
    JOIN public.communities c ON c.id=p.community_id
    JOIN public.pets pet ON pet.id=cm.author_pet_id
   WHERE c.owner_user_id=v_uid AND pet.owner_id<>v_uid
  ON CONFLICT (job_id,origin,source_comment_id) DO NOTHING;

  -- Minimal tombstone key; parent identity/text NEVER retained.
  INSERT INTO account_private.deletion_post_tombstones
    (job_id,source_post_id,source_created_at)
  SELECT DISTINCT p_job_id,p.id,p.created_at
    FROM public.posts p JOIN public.post_comments cm ON cm.post_id=p.id
    JOIN public.pets pet ON pet.id=cm.author_pet_id
   WHERE p.user_id=v_uid AND pet.owner_id<>v_uid
  ON CONFLICT (job_id,source_post_id) DO NOTHING;

  SELECT count(*)::int INTO v_communities FROM public.communities WHERE owner_user_id=v_uid;
  SELECT count(*)::int INTO v_feed_comments FROM account_private.deletion_preserved_comments WHERE job_id=p_job_id AND origin='feed';
  SELECT count(*)::int INTO v_community_posts FROM account_private.deletion_preserved_posts WHERE job_id=p_job_id;
  SELECT count(*)::int INTO v_community_comments FROM account_private.deletion_preserved_comments WHERE job_id=p_job_id AND origin='community';

  -- Worker MUST independently verify counts against live data and ownership
  -- in a quiesced transaction, then archive/privatize community, THEN clean.
  RETURN pg_catalog.jsonb_build_object(
    'owned_communities',v_communities,
    'archived_foreign_feed_comments',v_feed_comments,
    'archived_foreign_community_posts',v_community_posts,
    'archived_foreign_community_comments',v_community_comments,
    'ready_to_delete_auth',false,
    'ready_to_delete_media',false
  );
END;
$$;
REVOKE ALL ON FUNCTION account_private.f14_a3_snapshot_contributions(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION account_private.f14_a3_snapshot_contributions(uuid)
  TO service_role;

-- Public RPC wrapper for a server-only service-role client. The private schema
-- stays OUT of the PostgREST exposed schema list; no browser receives the key.
CREATE OR REPLACE FUNCTION public.f14_a3_worker_snapshot_contributions(p_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_worker_wrapper$
BEGIN
  -- Callable only with a signed service_role JWT, never with user metadata.
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service authorization required' USING ERRCODE='42501';
  END IF;
  RETURN account_private.f14_a3_snapshot_contributions(p_job_id);
END;
$a3_worker_wrapper$;
REVOKE ALL ON FUNCTION public.f14_a3_worker_snapshot_contributions(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_worker_snapshot_contributions(uuid)
  TO service_role;

COMMIT;

-- No deletion, transfer of community ownership, PUBLIC read,
-- or final Auth cleanup is ever performed here.
