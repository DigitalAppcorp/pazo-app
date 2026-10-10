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

-- Blockers requiring integration testing before removing top RAISE:
-- 1) Bypass proof/lease must be established only by reviewed privileged RPC.
-- 2) Atomic freeze must snapshot ALL targets (pet/post/community/cpost/storage)
--    while holding locks and serializing concurrent writes.
-- 3) Additional server-side writers and unlisted table/trigger paths must
--    be audited. This fence is a candidate, NOT proven exhaustive.
-- 4) Parallel DB/Storage requests, Auth JWT revocation and CDN verification.
COMMIT;
