CREATE SCHEMA IF NOT EXISTS community_private;
REVOKE ALL ON SCHEMA community_private FROM PUBLIC, anon, authenticated;

CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  species text,
  zone text,
  image_url text,
  image_storage_path text,
  rules text,
  status text NOT NULL DEFAULT 'active',
  members_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communities_name_length
    CHECK (char_length(btrim(name)) BETWEEN 3 AND 80),
  CONSTRAINT communities_description_length
    CHECK (char_length(btrim(description)) BETWEEN 1 AND 1000),
  CONSTRAINT communities_category_length
    CHECK (char_length(btrim(category)) BETWEEN 2 AND 40),
  CONSTRAINT communities_species_allowed
    CHECK (species IS NULL OR species IN ('gato','perro','conejo','ave','otro')),
  CONSTRAINT communities_zone_length
    CHECK (zone IS NULL OR char_length(btrim(zone)) <= 100),
  CONSTRAINT communities_rules_length
    CHECK (rules IS NULL OR char_length(btrim(rules)) <= 2000),
  CONSTRAINT communities_image_pair
    CHECK ((image_url IS NULL) = (image_storage_path IS NULL)),
  CONSTRAINT communities_status_allowed
    CHECK (status IN ('active','archived')),
  CONSTRAINT communities_members_count_nonnegative
    CHECK (members_count >= 0)
);

CREATE TABLE public.community_memberships (
  community_id uuid NOT NULL
    REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  display_pet_id uuid
    REFERENCES public.pets(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id),
  CONSTRAINT community_memberships_role_allowed
    CHECK (role IN ('owner','member'))
);

CREATE UNIQUE INDEX community_one_owner_idx
  ON public.community_memberships (community_id)
  WHERE role = 'owner';

CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL
    REFERENCES public.communities(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  author_pet_id uuid NOT NULL
    REFERENCES public.pets(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  photo_url text,
  photo_storage_path text,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_posts_body_length
    CHECK (char_length(body) <= 4000),
  CONSTRAINT community_posts_content_required
    CHECK (btrim(body) <> '' OR photo_url IS NOT NULL),
  CONSTRAINT community_posts_photo_pair
    CHECK ((photo_url IS NULL) = (photo_storage_path IS NULL)),
  CONSTRAINT community_posts_likes_nonnegative
    CHECK (likes_count >= 0),
  CONSTRAINT community_posts_comments_nonnegative
    CHECK (comments_count >= 0)
);

CREATE TABLE public.community_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL
    REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_pet_id uuid NOT NULL
    REFERENCES public.pets(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_post_comments_body_length
    CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000)
);

CREATE TABLE public.community_post_likes (
  post_id uuid NOT NULL
    REFERENCES public.community_posts(id) ON DELETE CASCADE,
  actor_pet_id uuid NOT NULL
    REFERENCES public.pets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, actor_pet_id)
);

CREATE INDEX communities_status_created_idx
  ON public.communities (status, created_at DESC);
CREATE INDEX communities_owner_idx
  ON public.communities (owner_user_id);
CREATE INDEX communities_category_status_idx
  ON public.communities (category, status);
CREATE INDEX communities_species_status_idx
  ON public.communities (species, status);

CREATE INDEX community_memberships_user_joined_idx
  ON public.community_memberships (user_id, joined_at DESC);
CREATE INDEX community_memberships_display_pet_idx
  ON public.community_memberships (display_pet_id);

CREATE INDEX community_posts_community_created_idx
  ON public.community_posts (community_id, created_at DESC, id DESC);
CREATE INDEX community_posts_author_created_idx
  ON public.community_posts (author_pet_id, created_at DESC);
CREATE INDEX community_posts_author_user_idx
  ON public.community_posts (author_user_id);

CREATE INDEX community_comments_post_created_idx
  ON public.community_post_comments (post_id, created_at, id);
CREATE INDEX community_comments_author_idx
  ON public.community_post_comments (author_pet_id);

CREATE INDEX community_likes_actor_idx
  ON public.community_post_likes (actor_pet_id);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.communities FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.community_memberships FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.community_posts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.community_post_comments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.community_post_likes FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.communities TO authenticated;
GRANT INSERT (name, description, category, species, zone, image_url, rules)
  ON TABLE public.communities TO authenticated;
GRANT UPDATE (name, description, category, species, zone, image_url, image_storage_path, rules, status)
  ON TABLE public.communities TO authenticated;

GRANT SELECT ON TABLE public.community_memberships TO authenticated;
GRANT INSERT (community_id, display_pet_id, role)
  ON TABLE public.community_memberships TO authenticated;
GRANT UPDATE (display_pet_id)
  ON TABLE public.community_memberships TO authenticated;
GRANT DELETE ON TABLE public.community_memberships TO authenticated;

GRANT SELECT ON TABLE public.community_posts TO authenticated;
GRANT INSERT (community_id, author_pet_id, body, photo_url, photo_storage_path)
  ON TABLE public.community_posts TO authenticated;
GRANT DELETE ON TABLE public.community_posts TO authenticated;

GRANT SELECT ON TABLE public.community_post_comments TO authenticated;
GRANT INSERT (post_id, author_pet_id, body)
  ON TABLE public.community_post_comments TO authenticated;
GRANT DELETE ON TABLE public.community_post_comments TO authenticated;

GRANT SELECT ON TABLE public.community_post_likes TO authenticated;
GRANT INSERT (post_id, actor_pet_id)
  ON TABLE public.community_post_likes TO authenticated;
GRANT DELETE ON TABLE public.community_post_likes TO authenticated;

GRANT ALL ON TABLE public.communities TO service_role;
GRANT ALL ON TABLE public.community_memberships TO service_role;
GRANT ALL ON TABLE public.community_posts TO service_role;
GRANT ALL ON TABLE public.community_post_comments TO service_role;
GRANT ALL ON TABLE public.community_post_likes TO service_role;

CREATE POLICY communities_read_authenticated
ON public.communities
FOR SELECT
TO authenticated
USING (
  status = 'active'
  OR owner_user_id = (SELECT auth.uid())
);

CREATE POLICY communities_insert_owner
ON public.communities
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = (SELECT auth.uid())
);

CREATE POLICY communities_update_owner
ON public.communities
FOR UPDATE
TO authenticated
USING (
  owner_user_id = (SELECT auth.uid())
)
WITH CHECK (
  owner_user_id = (SELECT auth.uid())
);

CREATE POLICY community_memberships_read_authenticated
ON public.community_memberships
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = community_memberships.community_id
      AND (
        c.status = 'active'
        OR c.owner_user_id = (SELECT auth.uid())
      )
  )
);

CREATE POLICY community_memberships_insert_self
ON public.community_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND display_pet_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = community_memberships.display_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = community_memberships.community_id
      AND c.status = 'active'
      AND (
        community_memberships.role = 'member'
        OR (
          community_memberships.role = 'owner'
          AND c.owner_user_id = (SELECT auth.uid())
        )
      )
  )
);

CREATE POLICY community_memberships_update_display_pet
ON public.community_memberships
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = community_memberships.display_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_memberships_delete_self_or_owner
ON public.community_memberships
FOR DELETE
TO authenticated
USING (
  (
    user_id = (SELECT auth.uid())
    AND role = 'member'
  )
  OR (
    role = 'member'
    AND EXISTS (
      SELECT 1
      FROM public.communities c
      WHERE c.id = community_memberships.community_id
        AND c.owner_user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY community_posts_read_authenticated
ON public.community_posts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = community_posts.community_id
      AND (
        c.status = 'active'
        OR c.owner_user_id = (SELECT auth.uid())
      )
  )
);

CREATE POLICY community_posts_insert_member
ON public.community_posts
FOR INSERT
TO authenticated
WITH CHECK (
  author_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = community_posts.author_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.communities c
    JOIN public.community_memberships m
      ON m.community_id = c.id
    WHERE c.id = community_posts.community_id
      AND c.status = 'active'
      AND m.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_posts_delete_author_or_owner
ON public.community_posts
FOR DELETE
TO authenticated
USING (
  author_user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = community_posts.community_id
      AND c.owner_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_comments_read_authenticated
ON public.community_post_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.community_posts cp
    JOIN public.communities c ON c.id = cp.community_id
    WHERE cp.id = community_post_comments.post_id
      AND (
        c.status = 'active'
        OR c.owner_user_id = (SELECT auth.uid())
      )
  )
);

CREATE POLICY community_comments_insert_member
ON public.community_post_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = community_post_comments.author_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.community_posts cp
    JOIN public.communities c ON c.id = cp.community_id
    JOIN public.community_memberships m ON m.community_id = c.id
    WHERE cp.id = community_post_comments.post_id
      AND c.status = 'active'
      AND m.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_comments_delete_author_or_owner
ON public.community_post_comments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = community_post_comments.author_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.community_posts cp
    JOIN public.communities c ON c.id = cp.community_id
    WHERE cp.id = community_post_comments.post_id
      AND c.owner_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_likes_read_own
ON public.community_post_likes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = community_post_likes.actor_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_likes_insert_member
ON public.community_post_likes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = community_post_likes.actor_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.community_posts cp
    JOIN public.communities c ON c.id = cp.community_id
    JOIN public.community_memberships m ON m.community_id = c.id
    WHERE cp.id = community_post_likes.post_id
      AND c.status = 'active'
      AND m.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_likes_delete_own
ON public.community_post_likes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = community_post_likes.actor_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

CREATE OR REPLACE FUNCTION community_private.normalize_community_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := now();
  NEW.name := btrim(NEW.name);
  NEW.description := btrim(NEW.description);
  NEW.category := btrim(NEW.category);
  NEW.species := NULLIF(btrim(NEW.species), '');
  NEW.zone := NULLIF(btrim(NEW.zone), '');
  NEW.rules := NULLIF(btrim(NEW.rules), '');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION community_private.ensure_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_memberships m
    WHERE m.community_id = NEW.id
      AND m.user_id = NEW.owner_user_id
      AND m.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Community owner membership is required.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION community_private.adjust_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities
    SET members_count = members_count + 1
    WHERE id = NEW.community_id;
    RETURN NEW;
  END IF;

  UPDATE public.communities
  SET members_count = GREATEST(0, members_count - 1)
  WHERE id = OLD.community_id;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION community_private.adjust_community_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  UPDATE public.community_posts
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION community_private.adjust_community_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  UPDATE public.community_posts
  SET comments_count = GREATEST(0, comments_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$function$;

ALTER FUNCTION community_private.normalize_community_row() OWNER TO postgres;
ALTER FUNCTION community_private.ensure_owner_membership() OWNER TO postgres;
ALTER FUNCTION community_private.adjust_member_count() OWNER TO postgres;
ALTER FUNCTION community_private.adjust_community_like_count() OWNER TO postgres;
ALTER FUNCTION community_private.adjust_community_comment_count() OWNER TO postgres;

REVOKE ALL ON FUNCTION community_private.normalize_community_row() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION community_private.ensure_owner_membership() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION community_private.adjust_member_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION community_private.adjust_community_like_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION community_private.adjust_community_comment_count() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_communities_normalize
BEFORE INSERT OR UPDATE ON public.communities
FOR EACH ROW
EXECUTE FUNCTION community_private.normalize_community_row();

CREATE CONSTRAINT TRIGGER trg_communities_require_owner_membership
AFTER INSERT OR UPDATE OF owner_user_id ON public.communities
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION community_private.ensure_owner_membership();

CREATE TRIGGER trg_community_memberships_count
AFTER INSERT OR DELETE ON public.community_memberships
FOR EACH ROW
EXECUTE FUNCTION community_private.adjust_member_count();

CREATE TRIGGER trg_community_likes_count
AFTER INSERT OR DELETE ON public.community_post_likes
FOR EACH ROW
EXECUTE FUNCTION community_private.adjust_community_like_count();

CREATE TRIGGER trg_community_comments_count
AFTER INSERT OR DELETE ON public.community_post_comments
FOR EACH ROW
EXECUTE FUNCTION community_private.adjust_community_comment_count();

CREATE OR REPLACE FUNCTION public.create_community(
  p_name text,
  p_description text,
  p_category text,
  p_species text,
  p_zone text,
  p_rules text,
  p_display_pet_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_community_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = p_display_pet_id
      AND p.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'La mascota no pertenece al usuario autenticado.';
  END IF;

  INSERT INTO public.communities (
    name,
    description,
    category,
    species,
    zone,
    rules
  )
  VALUES (
    btrim(p_name),
    btrim(p_description),
    btrim(p_category),
    NULLIF(btrim(p_species), ''),
    NULLIF(btrim(p_zone), ''),
    NULLIF(btrim(p_rules), '')
  )
  RETURNING id INTO v_community_id;

  INSERT INTO public.community_memberships (
    community_id,
    display_pet_id,
    role
  )
  VALUES (
    v_community_id,
    p_display_pet_id,
    'owner'
  );

  RETURN v_community_id;
END;
$function$;

ALTER FUNCTION public.create_community(text,text,text,text,text,text,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_community(text,text,text,text,text,text,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_community(text,text,text,text,text,text,uuid)
  TO authenticated, service_role;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES
  (
    'community-avatars',
    'community-avatars',
    true,
    5242880,
    ARRAY['image/jpeg','image/png','image/webp']::text[]
  ),
  (
    'community-post-photos',
    'community-post-photos',
    true,
    5242880,
    ARRAY['image/jpeg','image/png','image/webp']::text[]
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY community_avatar_owner_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-avatars'
  AND array_length(storage.foldername(name), 1) = 2
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.owner_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_avatar_owner_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-avatars'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.owner_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_post_photo_member_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-post-photos'
  AND array_length(storage.foldername(name), 1) = 2
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.communities c
    JOIN public.community_memberships m ON m.community_id = c.id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.status = 'active'
      AND m.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_post_photo_author_or_owner_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-post-photos'
  AND (
    (storage.foldername(name))[2] = (SELECT auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.communities c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.owner_user_id = (SELECT auth.uid())
    )
  )
);
