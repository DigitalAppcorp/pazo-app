-- PAZO F14 A3 WRITE FENCE — NOT APPLIED / SAFETY DRAFT
-- Neither installed nor linked to the live executor. Requires complete
-- integration + destructive test gate before conversion to one migration.
BEGIN;
DO $never_apply$
BEGIN
  RAISE EXCEPTION 'A3 WRITE FENCE DRAFT MUST NOT BE APPLIED';
END $never_apply$;

-- This draft depends on A3 review tables + processing transition being
-- installed after a separate full-migration review. This schema is private.
-- Explicit registry persists the identity of posts/pets/communities removed
-- or archived after the freeze, so third-party references stay blocked.
CREATE TABLE account_requests_private.deletion_frozen_targets (
  subject_user_id uuid NOT NULL
    REFERENCES account_requests_private.deletion_requests(subject_user_id),
  target_type text NOT NULL
    CHECK (target_type IN ('pet','post','community','cpost','storage')),
  target_id text NOT NULL CHECK (pg_catalog.length(target_id)>0),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY (target_type,target_id,subject_user_id)
);
ALTER TABLE account_requests_private.deletion_frozen_targets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_requests_private.deletion_frozen_targets FROM PUBLIC,anon,authenticated;
-- No direct writes from client or service_role. Only audited definer RPC
-- may populate snapshots and freeze while holding request/target row locks.

-- Technical-only snapshot of third-party contributions. It stores no
-- message text, media URLs, coordinates, emails or telephone numbers.
-- Capture under the SAME request lock/transaction as the freeze, so a
-- follow-up verification can detect a lost reply after a CASCADE.
CREATE TABLE account_requests_private.deletion_third_party_evidence (
  subject_user_id uuid NOT NULL
    REFERENCES account_requests_private.deletion_requests(subject_user_id),
  contribution_kind text NOT NULL
    CHECK (contribution_kind IN ('feed_reply','community_reply','community_post')),
  contribution_id uuid NOT NULL,
  author_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY (subject_user_id,contribution_kind,contribution_id)
);
ALTER TABLE account_requests_private.deletion_third_party_evidence
  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_requests_private.deletion_third_party_evidence
  FROM PUBLIC,anon,authenticated,service_role;

-- Per-path, short-lived media grant. No Storage API can pass a SQL
-- transaction-local GUC across HTTP requests, so DELETE must be authorized
-- by an exact, server-issued generation+lease grant. An UPDATE or INSERT
-- never uses this bypass. No grants exist by default.
CREATE TABLE account_requests_private.deletion_media_grants (
  subject_user_id uuid NOT NULL
    REFERENCES account_requests_private.deletion_requests(subject_user_id),
  bucket_id text NOT NULL,
  object_path text NOT NULL,
  object_version text NOT NULL,
  review_revision bigint NOT NULL CHECK (review_revision>0),
  reviewer_user_id uuid NOT NULL,
  lease_token uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  removed_at timestamptz,
  PRIMARY KEY(subject_user_id,bucket_id,object_path)
);
ALTER TABLE account_requests_private.deletion_media_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_requests_private.deletion_media_grants
  FROM PUBLIC,anon,authenticated;

-- Guards any account with a PROCESSING deletion request. SELECT FOR SHARE
-- serializes competing writes with the atomic REQUESTED->PROCESSING transition.
-- For a service-only cleanup bypass, the authorized RPC must set a LOCAL
-- opaque lease token, verified against the current job in the same txn.
CREATE OR REPLACE FUNCTION account_requests_private.a3_assert_user_not_frozen(
  p_subject_user_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $gate$
DECLARE
  v_status text;
  v_cleanup_token text;
BEGIN
  IF p_subject_user_id IS NULL THEN RETURN; END IF;
  SELECT r.status INTO v_status
  FROM account_requests_private.deletion_requests r
  WHERE r.subject_user_id=p_subject_user_id FOR SHARE;
  IF v_status IS DISTINCT FROM 'processing' THEN RETURN; END IF;

  v_cleanup_token:=pg_catalog.current_setting('pazo.a3_cleanup_lease',true);
  IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'')
      = 'service_role'
      AND v_cleanup_token IS NOT NULL
      AND pg_catalog.length(v_cleanup_token)=36
      AND EXISTS (
        SELECT 1 FROM account_requests_private.deletion_review_jobs j
        WHERE j.subject_user_id=p_subject_user_id
          AND j.lease_token::text=v_cleanup_token
          AND j.lease_expires_at>pg_catalog.clock_timestamp()
          AND j.phase<>'review_request'
      ) THEN RETURN;
  END IF;

  RAISE EXCEPTION 'Account is processing deletion'
    USING ERRCODE='42501';
END
$gate$;

CREATE OR REPLACE FUNCTION account_requests_private.a3_assert_row_not_frozen(
  p_row jsonb,p_mode text,p_column text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $row$
DECLARE
  v_raw text;
  v_id uuid;
  v_owner uuid;
  v_mode text;
BEGIN
  IF p_row IS NULL THEN RETURN; END IF;
  v_raw:=NULLIF(p_row->>p_column,'');
  IF v_raw IS NULL THEN RETURN; END IF;

  IF p_mode='user' OR p_mode='owner_text' THEN
    IF v_raw !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN RETURN; END IF;
    PERFORM account_requests_private.a3_assert_user_not_frozen(v_raw::uuid);
    RETURN;
  END IF;
  IF p_mode NOT IN ('pet','post','community','cpost','interaction') THEN
    RAISE EXCEPTION 'Unsupported A3 guard mode' USING ERRCODE='42501';
  END IF;
  IF v_raw !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN RETURN; END IF;
  v_id:=v_raw::uuid;
  v_mode:=p_mode;
  IF p_mode='interaction' THEN
    IF p_row->>'target_type'='post' THEN v_mode:='post';
    ELSIF p_row->>'target_type'='pet' THEN v_mode:='pet';
    ELSE RETURN; END IF;
  END IF;
  CASE v_mode
    WHEN 'pet' THEN SELECT owner_id INTO v_owner FROM public.pets WHERE id=v_id;
    WHEN 'post' THEN SELECT user_id INTO v_owner FROM public.posts WHERE id=v_id;
    WHEN 'community' THEN SELECT owner_user_id INTO v_owner FROM public.communities WHERE id=v_id;
    WHEN 'cpost' THEN SELECT author_user_id INTO v_owner FROM public.community_posts WHERE id=v_id;
    ELSE RAISE EXCEPTION 'Unknown A3 target' USING ERRCODE='42501';
  END CASE;
  PERFORM account_requests_private.a3_assert_user_not_frozen(v_owner);
  -- Frozen snapshot survives detachment/tombstone of original owner.
  PERFORM account_requests_private.a3_assert_user_not_frozen(t.subject_user_id)
  FROM account_requests_private.deletion_frozen_targets t
  WHERE t.target_type=v_mode AND t.target_id=v_id::text;
END
$row$;

CREATE OR REPLACE FUNCTION account_requests_private.a3_guard_application_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $trigger$
DECLARE i int; v_row jsonb;
BEGIN
  IF TG_NARGS=0 OR TG_NARGS % 2 <> 0 THEN
    RAISE EXCEPTION 'A3 guard misconfigured' USING ERRCODE='42501';
  END IF;
  FOR i IN 1..2 LOOP
    IF (i=1 AND TG_OP='DELETE') OR (i=2 AND TG_OP='INSERT') THEN CONTINUE; END IF;
    IF i=1 THEN v_row:=pg_catalog.to_jsonb(NEW);
    ELSE v_row:=pg_catalog.to_jsonb(OLD); END IF;
    FOR k IN 0..(TG_NARGS/2-1) LOOP
      PERFORM account_requests_private.a3_assert_row_not_frozen(
        v_row,TG_ARGV[k*2],TG_ARGV[k*2+1]
      );
    END LOOP;
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END
$trigger$;

-- High-risk account-linked tables from hosted schema inspection.
-- Every trigger checks OLD AND NEW on UPDATE to prevent ownership transfers.
DROP TRIGGER IF EXISTS a3_account_write_fence ON public.profiles;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.pets;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.pets
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','owner_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.posts;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.posts
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','user_id','pet','pet_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.post_comments;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','author_pet_id','post','post_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.communities;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.communities
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','owner_user_id','community','id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.community_memberships;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.community_memberships
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','user_id','pet','display_pet_id','community','community_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.community_posts;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','author_user_id','pet','author_pet_id','community','community_id','cpost','id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.community_post_comments;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.community_post_comments
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','author_pet_id','cpost','post_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.community_post_likes;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.community_post_likes
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','actor_pet_id','cpost','post_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.follows;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','follower_id','pet','following_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.interactions;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.interactions
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','actor_pet_id','interaction','target_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.hidden_posts;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.hidden_posts
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','user_id','post','post_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.care_items;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.care_items
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','pet_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.care_completions;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.care_completions
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','pet_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.pet_documents;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.pet_documents
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','pet_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.pet_private_details;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.pet_private_details
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','pet_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.pet_private_metrics;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.pet_private_metrics
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','pet_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.pet_public_links;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.pet_public_links
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','pet_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.lost_pet_alerts;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.lost_pet_alerts
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','pet_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.pet_sightings;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.pet_sightings
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','pet_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.notifications;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','user_id','pet','pet_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.account_blocks;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.account_blocks
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','blocker_user_id','user','blocked_user_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.pet_place_checkins;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.pet_place_checkins
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','user_id','pet','pet_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.pet_place_presence;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.pet_place_presence
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('pet','visible_pet_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.place_suggestions;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.place_suggestions
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','submitter_user_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.place_usage_events;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.place_usage_events
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','user_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.module_validation_intents;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.module_validation_intents
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','user_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.module_validation_interests;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.module_validation_interests
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','user_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.module_validation_views;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.module_validation_views
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','user_id');

DROP TRIGGER IF EXISTS a3_account_write_fence ON public.search_usage_events;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.search_usage_events
FOR EACH ROW EXECUTE FUNCTION account_requests_private.a3_guard_application_write('user','user_id');

-- Service-only authorization of ONE exact Storage generation. It is
-- only available during the independent processing/remove_media stage,
-- with an approved lease and frozen target. No wildcard or bucket delete.
CREATE OR REPLACE FUNCTION public.f14_a3_allow_exact_media_remove(
  p_subject_user_id uuid,p_reviewer_user_id uuid,p_lease_token uuid,
  p_revision bigint,p_bucket text,p_path text,p_object_version text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $authorize_media$
DECLARE v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role'
    OR p_subject_user_id IS NULL OR p_reviewer_user_id IS NULL
    OR p_lease_token IS NULL OR p_revision IS NULL
    OR p_bucket NOT IN ('pet-avatars','post-photos','community-avatars',
       'community-post-photos','pet-documents')
    OR p_path IS NULL OR pg_catalog.length(p_path)=0
    OR p_object_version IS NULL OR pg_catalog.length(p_object_version)=0
    THEN RAISE EXCEPTION 'Exact media authorization denied' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM account_requests_private.deletion_review_jobs j
    JOIN account_requests_private.deletion_review_operators op
      ON op.operator_user_id=j.reviewer_user_id
    JOIN account_requests_private.deletion_requests req
      ON req.subject_user_id=j.subject_user_id
    JOIN account_requests_private.deletion_frozen_targets t
      ON t.subject_user_id=j.subject_user_id
      AND t.target_type='storage'
      AND t.target_id=p_bucket||':'||p_path
    JOIN storage.objects o
      ON o.bucket_id=p_bucket AND o.name=p_path
      AND o.version=p_object_version
      AND o.owner_id=p_subject_user_id::text
    WHERE req.status='processing' AND j.phase='remove_media'
      AND j.subject_user_id=p_subject_user_id
      AND j.reviewer_user_id=p_reviewer_user_id
      AND j.lease_token=p_lease_token AND j.revision=p_revision
      AND j.lease_expires_at>v_now
  ) THEN RETURN false; END IF;

  -- No shared or cross-owned references may lose bytes. If a reference
  -- cannot be attributed safely, stop the job for manual reconciliation.
  IF EXISTS (
    SELECT 1 FROM public.pet_documents doc
      JOIN public.pets pet ON pet.id=doc.pet_id
      WHERE p_bucket='pet-documents'
        AND doc.storage_path=p_path AND pet.owner_id<>p_subject_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.community_posts cp
      WHERE p_bucket='community-post-photos'
        AND cp.photo_storage_path=p_path
        AND (cp.author_user_id IS NULL OR cp.author_user_id<>p_subject_user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.communities c
      WHERE p_bucket='community-avatars'
        AND c.image_storage_path=p_path
        AND (c.owner_user_id IS NULL OR c.owner_user_id<>p_subject_user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.posts p
      WHERE p_bucket='post-photos'
        AND p.photo_url IS NOT NULL
        AND pg_catalog.right(p.photo_url,
          pg_catalog.length('/storage/v1/object/public/post-photos/'||p_path))
          ='/storage/v1/object/public/post-photos/'||p_path
        AND (p.user_id IS NULL OR p.user_id<>p_subject_user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.pets pet
      WHERE p_bucket='pet-avatars'
        AND pet.photo_url IS NOT NULL
        AND pg_catalog.right(pet.photo_url,
          pg_catalog.length('/storage/v1/object/public/pet-avatars/'||p_path))
          ='/storage/v1/object/public/pet-avatars/'||p_path
        AND pet.owner_id<>p_subject_user_id
  ) THEN RETURN false; END IF;

  INSERT INTO account_requests_private.deletion_media_grants
    (subject_user_id,bucket_id,object_path,object_version,
     reviewer_user_id,review_revision,lease_token,expires_at)
  VALUES(p_subject_user_id,p_bucket,p_path,p_object_version,
     p_reviewer_user_id,p_revision,p_lease_token,v_now+INTERVAL '2 minutes')
  ON CONFLICT(subject_user_id,bucket_id,object_path) DO UPDATE
  SET object_version=excluded.object_version,
      reviewer_user_id=excluded.reviewer_user_id,
      review_revision=excluded.review_revision,
      lease_token=excluded.lease_token,
      expires_at=excluded.expires_at
  WHERE account_requests_private.deletion_media_grants.removed_at IS NULL;
  RETURN FOUND;
END
$authorize_media$;

REVOKE ALL ON FUNCTION public.f14_a3_allow_exact_media_remove(uuid,uuid,uuid,bigint,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_allow_exact_media_remove(uuid,uuid,uuid,bigint,text,text,text)
  TO service_role;

-- Durable exact-object checkpoint AFTER Storage API reports success and
-- the origin record is absent. Idempotent on a repeated service-side call
-- for the same generation while the current lease is still valid.
CREATE OR REPLACE FUNCTION public.f14_a3_checkpoint_media_removed(
  p_subject_user_id uuid,p_reviewer_user_id uuid,p_lease_token uuid,
  p_revision bigint,p_bucket text,p_path text,p_object_version text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $checkpoint_media$
DECLARE v_count integer;
BEGIN
  IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'')<>'service_role'
    OR p_subject_user_id IS NULL OR p_reviewer_user_id IS NULL
    OR p_lease_token IS NULL OR p_revision IS NULL
    OR p_bucket IS NULL OR p_path IS NULL OR p_object_version IS NULL THEN
    RAISE EXCEPTION 'Media checkpoint unauthorized' USING ERRCODE='42501';
  END IF;
  UPDATE account_requests_private.deletion_media_grants g
  SET removed_at=COALESCE(g.removed_at,pg_catalog.clock_timestamp())
  FROM account_requests_private.deletion_review_jobs j,
       account_requests_private.deletion_requests r
  WHERE g.subject_user_id=p_subject_user_id
    AND g.bucket_id=p_bucket AND g.object_path=p_path
    AND g.object_version=p_object_version
    AND g.reviewer_user_id=p_reviewer_user_id
    AND g.lease_token=p_lease_token AND g.review_revision=p_revision
    AND j.subject_user_id=g.subject_user_id
    AND j.phase='remove_media' AND j.lease_token=p_lease_token
    AND j.revision=p_revision AND j.lease_expires_at>pg_catalog.clock_timestamp()
    AND r.subject_user_id=p_subject_user_id AND r.status='processing'
    AND NOT EXISTS (SELECT 1 FROM storage.objects o
      WHERE o.bucket_id=p_bucket AND o.name=p_path)
    AND g.expires_at>pg_catalog.clock_timestamp();
  GET DIAGNOSTICS v_count=ROW_COUNT;
  RETURN v_count=1;
END
$checkpoint_media$;

REVOKE ALL ON FUNCTION public.f14_a3_checkpoint_media_removed(uuid,uuid,uuid,bigint,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_checkpoint_media_removed(uuid,uuid,uuid,bigint,text,text,text)
  TO service_role;

-- Strict read-back for retries: a missing origin object alone cannot
-- substitute for a server-generated checkpoint of an exact generation.
CREATE OR REPLACE FUNCTION public.f14_a3_media_checkpoint_valid(
  p_subject_user_id uuid,p_reviewer_user_id uuid,p_lease_token uuid,
  p_revision bigint,p_bucket text,p_path text,p_object_version text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $verify_media$
BEGIN
  IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'')<>'service_role'
    OR p_subject_user_id IS NULL OR p_reviewer_user_id IS NULL
    OR p_lease_token IS NULL OR p_revision IS NULL THEN
    RAISE EXCEPTION 'Media checkpoint unavailable' USING ERRCODE='42501';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM account_requests_private.deletion_media_grants g
    JOIN account_requests_private.deletion_review_jobs j
      ON j.subject_user_id=g.subject_user_id
    JOIN account_requests_private.deletion_requests req
      ON req.subject_user_id=g.subject_user_id
    WHERE req.status='processing' AND j.phase='remove_media'
      AND g.subject_user_id=p_subject_user_id
      AND g.reviewer_user_id=p_reviewer_user_id
      AND g.bucket_id=p_bucket AND g.object_path=p_path
      AND g.object_version=p_object_version
      AND g.removed_at IS NOT NULL
      AND j.lease_token=p_lease_token AND j.revision=p_revision
      AND j.lease_expires_at>pg_catalog.clock_timestamp()
      AND NOT EXISTS (SELECT 1 FROM storage.objects o
        WHERE o.bucket_id=p_bucket AND o.name=p_path)
  );
END
$verify_media$;
REVOKE ALL ON FUNCTION public.f14_a3_media_checkpoint_valid(uuid,uuid,uuid,bigint,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_media_checkpoint_valid(uuid,uuid,uuid,bigint,text,text,text)
  TO service_role;

-- Storage write fence covers both owner's storage.objects.owner_id and exact
-- bucket:path snapshots. Even service_role bypass requires a reviewed cleanup
-- lease. Never DELETE directly from storage.objects; executor uses Storage API.
CREATE OR REPLACE FUNCTION account_requests_private.a3_guard_storage_object()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $storage$
DECLARE v_row jsonb; i int;
BEGIN
  FOR i IN 1..2 LOOP
    IF (i=1 AND TG_OP='DELETE') OR (i=2 AND TG_OP='INSERT') THEN CONTINUE; END IF;
    IF i=1 THEN v_row:=pg_catalog.to_jsonb(NEW);
    ELSE v_row:=pg_catalog.to_jsonb(OLD); END IF;
    -- Storage API uses a distinct HTTP transaction. A precise, expiring
    -- generation grant replaces the transaction-local cleanup GUC for DELETE
    -- ONLY; uploads/upserts remain frozen.
    IF TG_OP='DELETE'
       AND COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'')='service_role'
       AND EXISTS (
         SELECT 1 FROM account_requests_private.deletion_media_grants g
         JOIN account_requests_private.deletion_review_jobs j
           ON j.subject_user_id=g.subject_user_id
         JOIN account_requests_private.deletion_requests req
           ON req.subject_user_id=g.subject_user_id
         WHERE g.bucket_id=(v_row->>'bucket_id')
           AND g.object_path=(v_row->>'name')
           AND g.object_version=(v_row->>'version')
           AND g.expires_at>pg_catalog.clock_timestamp()
           AND g.removed_at IS NULL
           AND j.phase='remove_media'
           AND req.status='processing'
           AND j.lease_token=g.lease_token
           AND j.revision=g.review_revision
           AND j.reviewer_user_id=g.reviewer_user_id
           AND j.lease_expires_at>pg_catalog.clock_timestamp()
       ) THEN CONTINUE;
    END IF;
    PERFORM account_requests_private.a3_assert_row_not_frozen(v_row,'owner_text','owner_id');
    PERFORM account_requests_private.a3_assert_user_not_frozen(t.subject_user_id)
      FROM account_requests_private.deletion_frozen_targets t
      WHERE t.target_type='storage'
        AND t.target_id=(v_row->>'bucket_id')||':'||(v_row->>'name');
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END
$storage$;
DROP TRIGGER IF EXISTS a3_account_write_fence ON storage.objects;
CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE
  ON storage.objects FOR EACH ROW
  EXECUTE FUNCTION account_requests_private.a3_guard_storage_object();

-- Revoke execution from public; triggers execute under DB owner.
REVOKE ALL ON FUNCTION account_requests_private.a3_assert_user_not_frozen(uuid)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION account_requests_private.a3_assert_row_not_frozen(jsonb,text,text)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION account_requests_private.a3_guard_application_write()
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION account_requests_private.a3_guard_storage_object()
  FROM PUBLIC,anon,authenticated;

-- The only transition from REQUESTED into PROCESSING. The same request
-- row acts as the linearization point for application write triggers:
-- a write that commits first is captured in the snapshot; a write racing
-- after this transaction starts must wait and is rejected after commit.
CREATE OR REPLACE FUNCTION public.f14_a3_start_processing(
  p_subject_user_id uuid,p_operator_user_id uuid,
  p_lease_token uuid,p_revision bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_start$
DECLARE
  v_now timestamptz:=pg_catalog.clock_timestamp();
  v_status text;
  v_session uuid;
  v_authenticated_at timestamptz;
  v_requested_at timestamptz;
BEGIN
  IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'')<>'service_role'
    OR p_subject_user_id IS NULL OR p_operator_user_id IS NULL
    OR p_subject_user_id=p_operator_user_id OR p_lease_token IS NULL
    OR p_revision IS NULL THEN
    RAISE EXCEPTION 'A3 processing unauthorized' USING ERRCODE='42501';
  END IF;

  SELECT status,requested_at INTO v_status,v_requested_at
    FROM account_requests_private.deletion_requests
    WHERE subject_user_id=p_subject_user_id FOR UPDATE;
  IF v_status IS DISTINCT FROM 'requested' THEN
    RAISE EXCEPTION 'Not a pending deletion request' USING ERRCODE='42501';
  END IF;

  SELECT j.reauth_session_id,j.reauthenticated_at
  INTO v_session,v_authenticated_at
    FROM account_requests_private.deletion_review_jobs j
    JOIN account_requests_private.deletion_review_operators op
      ON op.operator_user_id=j.reviewer_user_id
    WHERE j.subject_user_id=p_subject_user_id
      AND j.reviewer_user_id=p_operator_user_id
      AND j.lease_token=p_lease_token
      AND j.revision=p_revision
      AND j.phase='review_request'
      AND j.lease_expires_at>v_now FOR UPDATE OF j;
  IF v_session IS NULL OR v_authenticated_at IS NULL
    OR v_authenticated_at<v_now-INTERVAL '5 minutes'
    OR NOT EXISTS (
      SELECT 1 FROM auth.sessions s
      WHERE s.id=v_session AND s.user_id=p_subject_user_id
        AND s.created_at>=v_requested_at
        AND s.created_at<=v_authenticated_at
        AND s.created_at>=v_now-INTERVAL '5 minutes'
        AND (s.not_after IS NULL OR s.not_after>v_now)
    ) THEN
    RAISE EXCEPTION 'Fresh owner session and lease required'
      USING ERRCODE='42501';
  END IF;

  -- Conservatively capture third-party references before any owner is
  -- detached. These INSERTs and the status transition commit atomically.
  INSERT INTO account_requests_private.deletion_frozen_targets
    (subject_user_id,target_type,target_id)
    SELECT p_subject_user_id,'pet',p.id::text FROM public.pets p
      WHERE p.owner_id=p_subject_user_id
    UNION ALL
    SELECT p_subject_user_id,'post',p.id::text FROM public.posts p
      WHERE p.user_id=p_subject_user_id OR p.pet_id IN (
        SELECT id FROM public.pets WHERE owner_id=p_subject_user_id)
    UNION ALL
    SELECT p_subject_user_id,'community',c.id::text FROM public.communities c
      WHERE c.owner_user_id=p_subject_user_id
    UNION ALL
    SELECT p_subject_user_id,'cpost',cp.id::text FROM public.community_posts cp
      WHERE cp.author_user_id=p_subject_user_id OR cp.author_pet_id IN (
        SELECT id FROM public.pets WHERE owner_id=p_subject_user_id)
    UNION ALL
    SELECT p_subject_user_id,'storage',o.bucket_id||':'||o.name
      FROM storage.objects o WHERE o.owner_id=p_subject_user_id::text
    ON CONFLICT DO NOTHING;

  -- Save exact third-party comment/post row identity before either
  -- author ownership or FK relationships are detached. Avoid copying body.
  INSERT INTO account_requests_private.deletion_third_party_evidence
    (subject_user_id,contribution_kind,contribution_id,author_id)
  SELECT p_subject_user_id,'feed_reply',c.id,c.author_pet_id
  FROM public.post_comments c
  JOIN public.posts p ON p.id=c.post_id
  JOIN public.pets authorpet ON authorpet.id=c.author_pet_id
  WHERE (p.user_id=p_subject_user_id OR EXISTS(
    SELECT 1 FROM public.pets ownpet
    WHERE ownpet.id=p.pet_id AND ownpet.owner_id=p_subject_user_id))
    AND authorpet.owner_id<>p_subject_user_id
  UNION ALL
  SELECT p_subject_user_id,'community_reply',c.id,c.author_pet_id
  FROM public.community_post_comments c
  JOIN public.community_posts cp ON cp.id=c.post_id
  JOIN public.pets authorpet ON authorpet.id=c.author_pet_id
  WHERE (cp.author_user_id=p_subject_user_id OR EXISTS(
    SELECT 1 FROM public.pets ownpet
    WHERE ownpet.id=cp.author_pet_id
      AND ownpet.owner_id=p_subject_user_id))
    AND authorpet.owner_id<>p_subject_user_id
  UNION ALL
  SELECT p_subject_user_id,'community_post',cp.id,cp.author_user_id
  FROM public.community_posts cp
  JOIN public.communities community ON community.id=cp.community_id
  WHERE community.owner_user_id=p_subject_user_id
    AND cp.author_user_id<>p_subject_user_id
  ON CONFLICT DO NOTHING;

  UPDATE account_requests_private.deletion_requests
  SET status='processing',updated_at=v_now
  WHERE subject_user_id=p_subject_user_id AND status='requested';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Processing transition lost' USING ERRCODE='40001';
  END IF;
  UPDATE account_requests_private.deletion_review_jobs
  SET phase='freeze_writes',updated_at=v_now
  WHERE subject_user_id=p_subject_user_id
    AND lease_token=p_lease_token AND revision=p_revision
    AND lease_expires_at>v_now;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review lease expired' USING ERRCODE='40001';
  END IF;
  RETURN pg_catalog.jsonb_build_object(
    'status','processing','frozen',true,
    'revision',p_revision,'destructive_execution_allowed',false
  );
END
$a3_start$;

REVOKE ALL ON FUNCTION public.f14_a3_start_processing(uuid,uuid,uuid,bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_start_processing(uuid,uuid,uuid,bigint)
  TO service_role;

-- Read-only strict survival proof for the exact frozen contribution IDs.
-- Count equality alone is insufficient: another row could replace the
-- deleted contribution. Verify identity and original author's pet/account.
-- This does NOT assert whether media, text, retentions or Auth were removed.
CREATE OR REPLACE FUNCTION public.f14_a3_verify_other_users_survived(
  p_subject_user_id uuid,p_reviewer_user_id uuid,
  p_lease_token uuid,p_revision bigint
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_survival$
DECLARE
  v_expected bigint;
  v_missing bigint;
  v_now timestamptz:=pg_catalog.clock_timestamp();
BEGIN
  IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role'
    OR p_subject_user_id IS NULL OR p_reviewer_user_id IS NULL
    OR p_lease_token IS NULL OR p_revision IS NULL
    OR NOT EXISTS(
      SELECT 1 FROM account_requests_private.deletion_review_jobs j
      JOIN account_requests_private.deletion_requests req
        ON req.subject_user_id=j.subject_user_id
      JOIN account_requests_private.deletion_review_operators op
        ON op.operator_user_id=j.reviewer_user_id
      WHERE req.status='processing'
        AND j.subject_user_id=p_subject_user_id
        AND j.reviewer_user_id=p_reviewer_user_id
        AND j.lease_token=p_lease_token AND j.revision=p_revision
        AND j.lease_expires_at>v_now
        AND j.phase NOT IN ('review_request','freeze_writes')
    ) THEN
    RAISE EXCEPTION 'A3 preservation verification unavailable' USING ERRCODE='42501';
  END IF;

  SELECT count(*) INTO v_expected
  FROM account_requests_private.deletion_third_party_evidence e
  WHERE e.subject_user_id=p_subject_user_id;

  SELECT count(*) INTO v_missing
  FROM account_requests_private.deletion_third_party_evidence e
  WHERE e.subject_user_id=p_subject_user_id
    AND (
      (e.contribution_kind='feed_reply' AND NOT EXISTS(
        SELECT 1 FROM public.post_comments c
        WHERE c.id=e.contribution_id AND c.author_pet_id=e.author_id
      ))
      OR
      (e.contribution_kind='community_reply' AND NOT EXISTS(
        SELECT 1 FROM public.community_post_comments c
        WHERE c.id=e.contribution_id AND c.author_pet_id=e.author_id
      ))
      OR
      (e.contribution_kind='community_post' AND NOT EXISTS(
        SELECT 1 FROM public.community_posts p
        WHERE p.id=e.contribution_id AND p.author_user_id=e.author_id
      ))
    );

  RETURN pg_catalog.jsonb_build_object(
    'expected_contributions',v_expected,
    'missing_contributions',v_missing,
    'survival_verified',v_missing=0,
    'destructive_execution_allowed',false
  );
END
$a3_survival$;
REVOKE ALL ON FUNCTION public.f14_a3_verify_other_users_survived(uuid,uuid,uuid,bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_verify_other_users_survived(uuid,uuid,uuid,bigint)
  TO service_role;

-- Blockers requiring integration testing before removing top RAISE:
-- 1) Bypass proof/lease must be established only by reviewed privileged RPC.
-- 2) Atomic freeze must snapshot ALL targets (pet/post/community/cpost/storage)
--    while holding locks and serializing concurrent writes.
-- 3) Additional server-side writers and unlisted table/trigger paths must
--    be audited. This fence is a candidate, NOT proven exhaustive.
-- 4) Parallel DB/Storage requests, Auth JWT revocation and CDN verification.
COMMIT;
