-- F14 A1: migration PREPARED only. DO NOT apply without specific PO approval.
-- D1: retain anon/public reading of pets and social Feed posts.
BEGIN;
CREATE TABLE public.account_blocks (
  blocker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  CONSTRAINT f14_block_distinct CHECK (blocker_user_id <> blocked_user_id)
);
CREATE INDEX f14_blocks_incoming_idx ON public.account_blocks(blocked_user_id,blocker_user_id);
CREATE TABLE public.hidden_posts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,post_id)
);
ALTER TABLE public.account_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_blocks, public.hidden_posts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT(blocker_user_id,blocked_user_id), DELETE ON public.account_blocks TO authenticated;
GRANT SELECT, INSERT(user_id,post_id), DELETE ON public.hidden_posts TO authenticated;
GRANT ALL ON public.account_blocks, public.hidden_posts TO service_role;
CREATE POLICY f14_blocks_select ON public.account_blocks FOR SELECT TO authenticated USING (blocker_user_id = (SELECT auth.uid()));
CREATE POLICY f14_blocks_insert ON public.account_blocks FOR INSERT TO authenticated WITH CHECK (blocker_user_id = (SELECT auth.uid()));
CREATE POLICY f14_blocks_delete ON public.account_blocks FOR DELETE TO authenticated USING (blocker_user_id = (SELECT auth.uid()));
CREATE POLICY f14_hidden_select ON public.hidden_posts FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY f14_hidden_insert ON public.hidden_posts FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY f14_hidden_delete ON public.hidden_posts FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- Public RPC checks only relationships involving auth.uid(); cannot inspect arbitrary pairs.
CREATE FUNCTION public.f14_can_interact(p_target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $f$
 SELECT auth.uid() IS NOT NULL AND p_target IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM public.account_blocks b WHERE
     (b.blocker_user_id=auth.uid() AND b.blocked_user_id=p_target)
     OR (b.blocked_user_id=auth.uid() AND b.blocker_user_id=p_target)
 );
$f$;
ALTER FUNCTION public.f14_can_interact(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f14_can_interact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.f14_can_interact(uuid) TO authenticated;
CREATE FUNCTION public.f14_my_blocked_accounts() RETURNS TABLE(user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $f$
 SELECT DISTINCT CASE WHEN b.blocker_user_id=auth.uid() THEN b.blocked_user_id ELSE b.blocker_user_id END
 FROM public.account_blocks b WHERE auth.uid() IS NOT NULL
 AND (b.blocker_user_id=auth.uid() OR b.blocked_user_id=auth.uid());
$f$;
ALTER FUNCTION public.f14_my_blocked_accounts() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f14_my_blocked_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.f14_my_blocked_accounts() TO authenticated;

-- Serialize follow inserts and block creation for the same pair of human accounts.
CREATE FUNCTION private.f14_pair_lock(a uuid,b uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $f$
BEGIN
 IF a IS NULL OR b IS NULL THEN RETURN; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   LEAST(a::text,b::text)||':'||GREATEST(a::text,b::text), 0));
END;
$f$;
REVOKE ALL ON FUNCTION private.f14_pair_lock(uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.f14_block_before() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $f$
BEGIN
 IF NEW.blocker_user_id IS DISTINCT FROM auth.uid() THEN
   RAISE EXCEPTION 'Invalid block actor' USING ERRCODE='42501';
 END IF;
 PERFORM private.f14_pair_lock(NEW.blocker_user_id,NEW.blocked_user_id);
 RETURN NEW;
END;
$f$;
REVOKE ALL ON FUNCTION private.f14_block_before() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER f14_block_before BEFORE INSERT ON public.account_blocks
FOR EACH ROW EXECUTE FUNCTION private.f14_block_before();
CREATE FUNCTION private.f14_block_after() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $f$
BEGIN
 DELETE FROM public.follows f USING public.pets p1,public.pets p2
 WHERE f.follower_id=p1.id AND f.following_id=p2.id AND
 ((p1.owner_id=NEW.blocker_user_id AND p2.owner_id=NEW.blocked_user_id)
  OR (p1.owner_id=NEW.blocked_user_id AND p2.owner_id=NEW.blocker_user_id));
 RETURN NEW;
END;
$f$;
REVOKE ALL ON FUNCTION private.f14_block_after() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER f14_block_after AFTER INSERT ON public.account_blocks
FOR EACH ROW EXECUTE FUNCTION private.f14_block_after();

-- Backend guard on *all inserts*, including direct PostgREST writes and invoker RPCs.
CREATE FUNCTION private.f14_guard_social_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $f$
DECLARE actor uuid; target uuid; community_owner uuid;
BEGIN
 IF TG_TABLE_NAME='follows' THEN
   SELECT owner_id INTO actor FROM public.pets WHERE id=NEW.follower_id;
   SELECT owner_id INTO target FROM public.pets WHERE id=NEW.following_id;
 ELSIF TG_TABLE_NAME='interactions' THEN
   SELECT owner_id INTO actor FROM public.pets WHERE id=NEW.actor_pet_id;
   IF NEW.target_type='post' THEN SELECT user_id INTO target FROM public.posts WHERE id=NEW.target_id; END IF;
 ELSIF TG_TABLE_NAME='post_comments' THEN
   SELECT owner_id INTO actor FROM public.pets WHERE id=NEW.author_pet_id;
   SELECT user_id INTO target FROM public.posts WHERE id=NEW.post_id;
 ELSIF TG_TABLE_NAME='community_memberships' THEN
   actor:=NEW.user_id;
   SELECT owner_user_id INTO target FROM public.communities WHERE id=NEW.community_id;
 ELSIF TG_TABLE_NAME='community_posts' THEN
   actor:=NEW.author_user_id;
   SELECT owner_user_id INTO target FROM public.communities WHERE id=NEW.community_id;
 ELSIF TG_TABLE_NAME='community_post_comments' THEN
   SELECT owner_id INTO actor FROM public.pets WHERE id=NEW.author_pet_id;
   SELECT p.author_user_id,c.owner_user_id INTO target,community_owner
   FROM public.community_posts p JOIN public.communities c ON c.id=p.community_id WHERE p.id=NEW.post_id;
 ELSIF TG_TABLE_NAME='community_post_likes' THEN
   SELECT owner_id INTO actor FROM public.pets WHERE id=NEW.actor_pet_id;
   SELECT p.author_user_id,c.owner_user_id INTO target,community_owner
   FROM public.community_posts p JOIN public.communities c ON c.id=p.community_id WHERE p.id=NEW.post_id;
 END IF;
 IF actor IS DISTINCT FROM auth.uid() THEN
   RAISE EXCEPTION 'Invalid social actor' USING ERRCODE='42501';
 END IF;
 IF target IS NOT NULL THEN
   PERFORM private.f14_pair_lock(actor,target);
   IF EXISTS(SELECT 1 FROM public.account_blocks b WHERE
     (b.blocker_user_id=actor AND b.blocked_user_id=target)
     OR (b.blocked_user_id=actor AND b.blocker_user_id=target)) THEN
     RAISE EXCEPTION 'Social interaction blocked' USING ERRCODE='42501';
   END IF;
 END IF;
 IF community_owner IS NOT NULL AND community_owner<>target THEN
   PERFORM private.f14_pair_lock(actor,community_owner);
   IF EXISTS(SELECT 1 FROM public.account_blocks b WHERE
     (b.blocker_user_id=actor AND b.blocked_user_id=community_owner)
     OR (b.blocked_user_id=actor AND b.blocker_user_id=community_owner)) THEN
     RAISE EXCEPTION 'Community interaction blocked' USING ERRCODE='42501';
   END IF;
 END IF;
 RETURN NEW;
END;
$f$;
REVOKE ALL ON FUNCTION private.f14_guard_social_insert() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER f14_follows_guard BEFORE INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER f14_interactions_guard BEFORE INSERT ON public.interactions FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER f14_comments_guard BEFORE INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER f14_memberships_guard BEFORE INSERT ON public.community_memberships FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER f14_community_posts_guard BEFORE INSERT ON public.community_posts FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER f14_community_comments_guard BEFORE INSERT ON public.community_post_comments FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();
CREATE TRIGGER f14_community_likes_guard BEFORE INSERT ON public.community_post_likes FOR EACH ROW EXECUTE FUNCTION private.f14_guard_social_insert();

-- Additional restrictive SELECT for authenticated-only Community data.
CREATE POLICY f14_communities_select ON public.communities AS RESTRICTIVE FOR SELECT TO authenticated USING (public.f14_can_interact(owner_user_id));
CREATE POLICY f14_community_posts_select ON public.community_posts AS RESTRICTIVE FOR SELECT TO authenticated USING (
 public.f14_can_interact(author_user_id) AND public.f14_can_interact((SELECT owner_user_id FROM public.communities WHERE id=community_id)));
CREATE POLICY f14_community_comments_select ON public.community_post_comments AS RESTRICTIVE FOR SELECT TO authenticated USING (
 public.f14_can_interact((SELECT owner_id FROM public.pets WHERE id=author_pet_id))
 AND public.f14_can_interact((SELECT author_user_id FROM public.community_posts WHERE id=post_id)));
CREATE POLICY f14_memberships_select ON public.community_memberships AS RESTRICTIVE FOR SELECT TO authenticated USING (public.f14_can_interact(user_id));

CREATE OR REPLACE FUNCTION public.get_recommended_posts_page(
  p_actor_pet_id uuid,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.posts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_explicit_interests text[];
  v_top_learned text[];
  v_combined text[];
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.pets actor
    WHERE actor.id = p_actor_pet_id
      AND actor.owner_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: La mascota no pertenece al usuario autenticado.';
  END IF;

  SELECT ppd.interests
  INTO v_explicit_interests
  FROM public.pet_private_details ppd
  WHERE ppd.pet_id = p_actor_pet_id;

  SELECT array_agg(s.key ORDER BY s.score DESC)
  INTO v_top_learned
  FROM (
    SELECT kv.key, kv.value::numeric AS score
    FROM public.pet_private_metrics ppm
    CROSS JOIN LATERAL jsonb_each_text(ppm.learned_interests) AS kv(key, value)
    WHERE ppm.pet_id = p_actor_pet_id
      AND kv.value::numeric > 0
    ORDER BY kv.value::numeric DESC
    LIMIT 5
  ) s;

  v_combined := ARRAY(
    SELECT DISTINCT interest
    FROM unnest(
      COALESCE(v_explicit_interests, ARRAY[]::text[])
      || COALESCE(v_top_learned, ARRAY[]::text[])
    ) AS interest
    WHERE btrim(interest) <> ''
  );

  RETURN QUERY
  SELECT candidate.*
  FROM public.posts candidate
  JOIN public.pets candidate_pet
    ON candidate_pet.id = candidate.pet_id
  JOIN public.pets actor_pet
    ON actor_pet.id = p_actor_pet_id
  WHERE candidate_pet.owner_id <> actor_pet.owner_id
    AND public.f14_can_interact(candidate_pet.owner_id)
    AND NOT EXISTS(SELECT 1 FROM public.hidden_posts h WHERE h.user_id=auth.uid() AND h.post_id=candidate.id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.follows f
      WHERE f.follower_id = p_actor_pet_id
        AND f.following_id = candidate.pet_id
    )
  ORDER BY
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.interactions i
        WHERE i.actor_pet_id = p_actor_pet_id
          AND i.target_id = candidate.id
          AND i.target_type = 'post'
          AND i.action_type IN ('impression', 'view', 'like')
          AND i.created_at > now() - interval '48 hours'
      )
      THEN 1
      ELSE 0
    END ASC,
    CASE
      WHEN COALESCE(array_length(v_combined, 1), 0) > 0
       AND candidate.tags && v_combined
      THEN 0
      ELSE 1
    END ASC,
    (
      (COALESCE(candidate.likes, 0) * 2 + 1)
      / power(
          (extract(epoch FROM (now() - candidate.created_at)) / 3600.0 + 2),
          1.5
        )
    ) DESC,
    candidate.created_at DESC,
    candidate.id DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$function$;

ALTER FUNCTION public.get_recommended_posts_page(uuid, integer, integer)
OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_recommended_posts_page(uuid, integer, integer)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_recommended_posts_page(uuid, integer, integer)
TO authenticated;


COMMIT;
