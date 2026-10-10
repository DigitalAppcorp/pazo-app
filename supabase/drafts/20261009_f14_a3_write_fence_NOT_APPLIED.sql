-- F14 A3: write fence for owner and affected-counterparty rows.
-- DRAFT ONLY. No migration applied; no mutations to hosted Supabase.
-- Depends on the NOT_APPLIED A3 request intake draft.
BEGIN;
DO $a3_fence_not_applied$
BEGIN
  RAISE EXCEPTION 'F14 A3 WRITE FENCE DRAFT ONLY — not approved for Supabase';
END
$a3_fence_not_applied$;

-- Resolve OWNERS of both actor and affected content, not client-provided role.
-- SECURITY DEFINER for narrow read-only lookups; private, not exposed to API.
CREATE OR REPLACE FUNCTION account_private.f14_a3_row_owners(p_table text,p_row jsonb)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_owner uuid;
  v_secondary uuid;
  v_third uuid;
  v_pet uuid;
  v_post uuid;
  v_comm uuid;
  v_post_author uuid;
BEGIN
  CASE p_table
    WHEN 'pets' THEN
      v_owner := (p_row->>'owner_id')::uuid;
    WHEN 'posts' THEN
      v_owner := (p_row->>'user_id')::uuid;
      SELECT owner_id INTO v_secondary FROM public.pets WHERE id=(p_row->>'pet_id')::uuid;
    WHEN 'communities' THEN
      v_owner := (p_row->>'owner_user_id')::uuid;
    WHEN 'community_posts' THEN
      v_owner := (p_row->>'author_user_id')::uuid;
      SELECT owner_user_id INTO v_secondary FROM public.communities WHERE id=(p_row->>'community_id')::uuid;
      SELECT owner_id INTO v_third FROM public.pets WHERE id=(p_row->>'author_pet_id')::uuid;
    WHEN 'post_comments' THEN
      v_pet := (p_row->>'author_pet_id')::uuid;
      v_post := (p_row->>'post_id')::uuid;
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=v_pet;
      SELECT user_id INTO v_secondary FROM public.posts WHERE id=v_post;
    WHEN 'community_post_comments' THEN
      v_pet := (p_row->>'author_pet_id')::uuid;
      v_post := (p_row->>'post_id')::uuid;
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=v_pet;
      SELECT p.author_user_id,c.owner_user_id INTO v_secondary,v_third
        FROM public.community_posts p JOIN public.communities c ON c.id=p.community_id WHERE p.id=v_post;
    WHEN 'community_memberships' THEN
      v_owner := (p_row->>'user_id')::uuid;
      SELECT owner_user_id INTO v_secondary FROM public.communities WHERE id=(p_row->>'community_id')::uuid;
      SELECT owner_id INTO v_third FROM public.pets WHERE id=(p_row->>'display_pet_id')::uuid;
    WHEN 'follows' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=(p_row->>'follower_id')::uuid;
      SELECT owner_id INTO v_secondary FROM public.pets WHERE id=(p_row->>'following_id')::uuid;
    WHEN 'interactions' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=(p_row->>'actor_pet_id')::uuid;
      IF (p_row->>'target_type')='post' THEN
        SELECT user_id INTO v_secondary FROM public.posts WHERE id=(p_row->>'target_id')::uuid;
      ELSE
        RAISE EXCEPTION 'Unsupported interaction target for A3 freeze' USING ERRCODE='42501';
      END IF;
      IF v_owner IS NULL OR v_secondary IS NULL THEN
        RAISE EXCEPTION 'Unknown interaction owner during A3 freeze' USING ERRCODE='42501';
      END IF;
    WHEN 'community_post_likes' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=(p_row->>'actor_pet_id')::uuid;
      SELECT p.author_user_id,c.owner_user_id INTO v_secondary,v_third
        FROM public.community_posts p JOIN public.communities c ON c.id=p.community_id
        WHERE p.id=(p_row->>'post_id')::uuid;
      IF v_owner IS NULL OR v_secondary IS NULL THEN
        RAISE EXCEPTION 'Unknown community like owner during A3 freeze' USING ERRCODE='42501';
      END IF;
    WHEN 'pet_place_checkins' THEN
      v_owner := (p_row->>'user_id')::uuid;
      SELECT owner_id INTO v_secondary FROM public.pets WHERE id=(p_row->>'pet_id')::uuid;
      IF v_owner IS NULL OR v_secondary IS NULL THEN
        RAISE EXCEPTION 'Unknown check-in owner during A3 freeze' USING ERRCODE='42501';
      END IF;

    WHEN 'hidden_posts' THEN
      v_owner := (p_row->>'user_id')::uuid;
      SELECT user_id INTO v_secondary FROM public.posts WHERE id=(p_row->>'post_id')::uuid;
      IF v_owner IS NULL OR v_secondary IS NULL THEN
        RAISE EXCEPTION 'Unresolvable hidden-post relationship' USING ERRCODE='42501';
      END IF;
    WHEN 'lost_pet_alerts' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=(p_row->>'pet_id')::uuid;
      IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Unresolvable lost-pet alert owner' USING ERRCODE='42501';
      END IF;
    WHEN 'module_validation_intents' THEN
      v_owner := (p_row->>'user_id')::uuid;
    WHEN 'module_validation_interests' THEN
      v_owner := (p_row->>'user_id')::uuid;
    WHEN 'module_validation_views' THEN
      v_owner := (p_row->>'user_id')::uuid;
    WHEN 'notifications' THEN
      v_owner := (p_row->>'user_id')::uuid;
      IF (p_row->>'pet_id') IS NOT NULL THEN
        SELECT owner_id INTO v_secondary FROM public.pets WHERE id=(p_row->>'pet_id')::uuid;
        IF v_secondary IS NULL THEN
          RAISE EXCEPTION 'Unresolvable notification pet owner' USING ERRCODE='42501';
        END IF;
      END IF;
    WHEN 'pet_private_details' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=(p_row->>'pet_id')::uuid;
    WHEN 'pet_private_metrics' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=(p_row->>'pet_id')::uuid;
    WHEN 'pet_public_links' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=(p_row->>'pet_id')::uuid;
    WHEN 'profiles' THEN
      -- profiles.id is the account owner (FK to auth.users).
      v_owner := (p_row->>'id')::uuid;
      IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Unknown profile owner during A3 freeze' USING ERRCODE='42501';
      END IF;
    WHEN 'place_suggestions' THEN
      v_owner := (p_row->>'submitter_user_id')::uuid;
      IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Unknown place suggestion owner during A3 freeze' USING ERRCODE='42501';
      END IF;
    WHEN 'pet_sightings' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=(p_row->>'pet_id')::uuid;
      IF (p_row->>'alert_id') IS NOT NULL THEN
        SELECT owner_id INTO v_secondary
          FROM public.lost_pet_alerts a JOIN public.pets p ON p.id=a.pet_id
          WHERE a.id=(p_row->>'alert_id')::uuid;
        IF v_secondary IS NULL THEN
          RAISE EXCEPTION 'Unresolvable sighting alert owner' USING ERRCODE='42501';
        END IF;
      END IF;
      IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Unresolvable sighted pet owner' USING ERRCODE='42501';
      END IF;
    WHEN 'place_usage_events' THEN
      v_owner := (p_row->>'user_id')::uuid;
    WHEN 'search_usage_events' THEN
      v_owner := (p_row->>'user_id')::uuid;
    WHEN 'care_items' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=(p_row->>'pet_id')::uuid;
    WHEN 'care_completions' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=(p_row->>'pet_id')::uuid;
      SELECT pet.owner_id INTO v_secondary FROM public.care_items c
        JOIN public.pets pet ON pet.id=c.pet_id WHERE c.id=(p_row->>'care_item_id')::uuid;
    WHEN 'pet_documents' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=(p_row->>'pet_id')::uuid;
    ELSE
      RAISE EXCEPTION 'Unmapped A3 write table' USING ERRCODE='42501';
  END CASE;
  RETURN ARRAY_REMOVE(ARRAY[v_owner,v_secondary,v_third],NULL);
END;
$$;
REVOKE ALL ON FUNCTION account_private.f14_a3_row_owners(text,jsonb)
  FROM PUBLIC,anon,authenticated;

-- Every UPDATE checks both OLD and NEW row owners to prevent reparenting
-- from a frozen account. All account locks are acquired in UUID order.
CREATE OR REPLACE FUNCTION account_private.f14_a3_guard_social_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_owners uuid[] := '{}'::uuid[];
  v_uid uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := TO_JSONB(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_new := TO_JSONB(NEW); END IF;
  IF TG_OP <> 'INSERT' THEN
    v_owners := ARRAY_CAT(v_owners,account_private.f14_a3_row_owners(TG_TABLE_NAME,v_old));
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_owners := ARRAY_CAT(v_owners,account_private.f14_a3_row_owners(TG_TABLE_NAME,v_new));
  END IF;

  -- IMPORTANT: the future worker must acquire the exact same advisory
  -- transaction lock before changing job status to a frozen state. Otherwise
  -- this row guard alone does NOT close a concurrent transition race.
  FOR v_uid IN SELECT DISTINCT uid FROM UNNEST(v_owners) AS owner(uid)
    WHERE uid IS NOT NULL ORDER BY uid LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,901426));
    IF EXISTS (
      SELECT 1 FROM account_private.deletion_jobs
      WHERE user_id=v_uid
        AND status NOT IN ('requested','cancelled')
    ) THEN
      RAISE EXCEPTION 'Account write paused for deletion review' USING ERRCODE='42501';
    END IF;
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION account_private.f14_a3_guard_social_write()
  FROM PUBLIC,anon,authenticated;

CREATE TRIGGER a3_write_fence_pets BEFORE INSERT OR UPDATE OR DELETE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_profiles BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_posts BEFORE INSERT OR UPDATE OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_communities BEFORE INSERT OR UPDATE OR DELETE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_community_posts BEFORE INSERT OR UPDATE OR DELETE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_post_comments BEFORE INSERT OR UPDATE OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_community_post_comments BEFORE INSERT OR UPDATE OR DELETE ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_community_memberships BEFORE INSERT OR UPDATE OR DELETE ON public.community_memberships
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_follows BEFORE INSERT OR UPDATE OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_interactions BEFORE INSERT OR UPDATE OR DELETE ON public.interactions
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_community_post_likes BEFORE INSERT OR UPDATE OR DELETE ON public.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_pet_place_checkins BEFORE INSERT OR UPDATE OR DELETE ON public.pet_place_checkins
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_hidden_posts BEFORE INSERT OR UPDATE OR DELETE ON public.hidden_posts
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_lost_pet_alerts BEFORE INSERT OR UPDATE OR DELETE ON public.lost_pet_alerts
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_module_validation_intents BEFORE INSERT OR UPDATE OR DELETE ON public.module_validation_intents
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_module_validation_interests BEFORE INSERT OR UPDATE OR DELETE ON public.module_validation_interests
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_module_validation_views BEFORE INSERT OR UPDATE OR DELETE ON public.module_validation_views
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_notifications BEFORE INSERT OR UPDATE OR DELETE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_pet_private_details BEFORE INSERT OR UPDATE OR DELETE ON public.pet_private_details
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_pet_private_metrics BEFORE INSERT OR UPDATE OR DELETE ON public.pet_private_metrics
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_pet_public_links BEFORE INSERT OR UPDATE OR DELETE ON public.pet_public_links
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_pet_sightings BEFORE INSERT OR UPDATE OR DELETE ON public.pet_sightings
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_place_suggestions BEFORE INSERT OR UPDATE OR DELETE ON public.place_suggestions
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_place_usage_events BEFORE INSERT OR UPDATE OR DELETE ON public.place_usage_events
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_search_usage_events BEFORE INSERT OR UPDATE OR DELETE ON public.search_usage_events
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_care_items BEFORE INSERT OR UPDATE OR DELETE ON public.care_items
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_care_completions BEFORE INSERT OR UPDATE OR DELETE ON public.care_completions
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();
CREATE TRIGGER a3_write_fence_pet_documents BEFORE INSERT OR UPDATE OR DELETE ON public.pet_documents
  FOR EACH ROW EXECUTE FUNCTION account_private.f14_a3_guard_social_write();

COMMIT;

-- NOT COVERED: account_blocks (user safety and follow-cleanup semantics),
-- pet_place_presence (derived writes through checkin triggers / nullable pet),
-- NOT COVERED: Storage API, unknown future interaction targets, unmapped
-- private/legacy tables, privileged Edge/RPC operations, direct Auth
-- deletes or service-side functions on unmapped tables.
-- Do not consider write freeze complete; no worker may delete data using this alone.
