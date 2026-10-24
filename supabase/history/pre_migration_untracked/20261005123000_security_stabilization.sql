BEGIN;

-- =============================================================================
-- PAZO - Fase 4
-- Seguridad y estabilizacion de Data API, RLS, RPCs, Storage e indices
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Funciones sensibles: search_path seguro y privilegios minimos
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, is_founder)
  VALUES (NEW.id, false)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_user()
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_recommended_posts(
  p_actor_pet_id uuid,
  p_limit integer DEFAULT 10
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
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = p_actor_pet_id
      AND p.owner_id = (SELECT auth.uid())
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

  IF COALESCE(array_length(v_combined, 1), 0) = 0 THEN
    RETURN QUERY
    SELECT p.*
    FROM public.posts p
    WHERE p.pet_id <> p_actor_pet_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.interactions i
        WHERE i.actor_pet_id = p_actor_pet_id
          AND i.target_id = p.id
          AND i.target_type = 'post'
          AND i.action_type IN ('impression', 'view', 'like')
          AND i.created_at > now() - interval '48 hours'
      )
    ORDER BY
      (COALESCE(p.likes, 0) * 2 + 1)
      / power((extract(epoch FROM (now() - p.created_at)) / 3600.0 + 2), 1.5) DESC
    LIMIT v_limit;

    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM public.posts p
  WHERE p.pet_id <> p_actor_pet_id
    AND p.tags && v_combined
    AND NOT EXISTS (
      SELECT 1
      FROM public.interactions i
      WHERE i.actor_pet_id = p_actor_pet_id
        AND i.target_id = p.id
        AND i.target_type = 'post'
        AND i.action_type IN ('impression', 'view', 'like')
        AND i.created_at > now() - interval '48 hours'
    )
  ORDER BY
    (COALESCE(p.likes, 0) * 2 + 1)
    / power((extract(epoch FROM (now() - p.created_at)) / 3600.0 + 2), 1.5) DESC
  LIMIT v_limit;
END;
$function$;

ALTER FUNCTION public.get_recommended_posts(uuid, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_recommended_posts(uuid, integer)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recommended_posts(uuid, integer)
TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Posts: fuente normalizada, RLS simple y privilegios minimos
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.normalize_post_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_owner_id uuid;
  v_pet_name text;
  v_pet_species text;
  v_pet_avatar text;
  v_uid uuid := auth.uid();
BEGIN
  SELECT p.owner_id, p.name, p.species, p.photo_url
  INTO v_owner_id, v_pet_name, v_pet_species, v_pet_avatar
  FROM public.pets p
  WHERE p.id = NEW.pet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Pet does not exist.';
  END IF;

  IF v_uid IS NOT NULL AND v_owner_id <> v_uid THEN
    RAISE EXCEPTION 'La mascota no pertenece al usuario autenticado.';
  END IF;

  NEW.user_id := v_owner_id;
  NEW.pet_name := v_pet_name;
  NEW.pet_species := v_pet_species;
  NEW.pet_avatar := v_pet_avatar;
  NEW.likes := 0;
  NEW.comments := '[]'::jsonb;
  NEW.comments_count := 0;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION private.normalize_post_before_insert() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.normalize_post_before_insert()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_normalize_post_before_insert ON public.posts;
CREATE TRIGGER trg_normalize_post_before_insert
BEFORE INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION private.normalize_post_before_insert();

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Actualizar posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can read posts" ON public.posts;
DROP POLICY IF EXISTS "Crear posts" ON public.posts;
DROP POLICY IF EXISTS "Permitir insercion de posts" ON public.posts;
DROP POLICY IF EXISTS "Permitir todo a posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Ver posts" ON public.posts;
DROP POLICY IF EXISTS "posts_public_read" ON public.posts;
DROP POLICY IF EXISTS "posts_owner_insert" ON public.posts;

CREATE POLICY "posts_public_read"
ON public.posts
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "posts_owner_insert"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

REVOKE ALL PRIVILEGES ON TABLE public.posts FROM anon, authenticated;

REVOKE UPDATE (
  id, user_id, pet_id, pet_name, pet_species, pet_avatar, location,
  text, photo_url, likes, comments, created_at, tags, comments_count
) ON TABLE public.posts FROM anon, authenticated;

GRANT SELECT ON TABLE public.posts TO anon, authenticated;
GRANT INSERT (pet_id, location, text, photo_url, tags)
ON TABLE public.posts TO authenticated;

CREATE INDEX IF NOT EXISTS idx_posts_pet_id
ON public.posts (pet_id);

CREATE INDEX IF NOT EXISTS idx_posts_user_id
ON public.posts (user_id);

CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc
ON public.posts (created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Interactions: comportamiento privado por mascota
-- -----------------------------------------------------------------------------

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de interacciones" ON public.interactions;
DROP POLICY IF EXISTS "interactions_select_owner_policy" ON public.interactions;

CREATE POLICY "interactions_select_owner_policy"
ON public.interactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = actor_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

REVOKE ALL PRIVILEGES ON TABLE public.interactions FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.interactions TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. Follows: UUID + ownership + integridad referencial
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados en follows"
ON public.follows;
DROP POLICY IF EXISTS "follows_public_read"
ON public.follows;
DROP POLICY IF EXISTS "follows_owner_insert"
ON public.follows;
DROP POLICY IF EXISTS "follows_owner_delete"
ON public.follows;

ALTER TABLE public.follows
  ALTER COLUMN follower_id TYPE uuid USING follower_id::uuid,
  ALTER COLUMN following_id TYPE uuid USING following_id::uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.follows'::regclass
      AND conname = 'follows_follower_pet_fkey'
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_follower_pet_fkey
      FOREIGN KEY (follower_id)
      REFERENCES public.pets(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.follows'::regclass
      AND conname = 'follows_following_pet_fkey'
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_following_pet_fkey
      FOREIGN KEY (following_id)
      REFERENCES public.pets(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.follows'::regclass
      AND conname = 'follows_no_self_follow'
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_no_self_follow
      CHECK (follower_id <> following_id);
  END IF;
END
$$;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_public_read"
ON public.follows
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "follows_owner_insert"
ON public.follows
FOR INSERT
TO authenticated
WITH CHECK (
  follower_id <> following_id
  AND EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = follower_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "follows_owner_delete"
ON public.follows
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = follower_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

REVOKE ALL PRIVILEGES ON TABLE public.follows FROM anon, authenticated;
GRANT SELECT ON TABLE public.follows TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.follows TO authenticated;

CREATE INDEX IF NOT EXISTS idx_follows_following_id
ON public.follows (following_id);

-- -----------------------------------------------------------------------------
-- 5. Private metrics: minimo necesario para el motor actual
-- -----------------------------------------------------------------------------

ALTER TABLE public.pet_private_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Strict owner access to pet private metrics"
ON public.pet_private_metrics;
DROP POLICY IF EXISTS "pet_private_metrics_owner_select"
ON public.pet_private_metrics;
DROP POLICY IF EXISTS "pet_private_metrics_owner_insert"
ON public.pet_private_metrics;
DROP POLICY IF EXISTS "pet_private_metrics_owner_update"
ON public.pet_private_metrics;

CREATE POLICY "pet_private_metrics_owner_select"
ON public.pet_private_metrics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "pet_private_metrics_owner_insert"
ON public.pet_private_metrics
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "pet_private_metrics_owner_update"
ON public.pet_private_metrics
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

REVOKE ALL PRIVILEGES ON TABLE public.pet_private_metrics FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE
ON TABLE public.pet_private_metrics TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. Profiles: founder/billing protegidos
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfiles visibles públicamente" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;

CREATE POLICY "profiles_public_read"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "profiles_owner_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = (SELECT auth.uid())
)
WITH CHECK (
  id = (SELECT auth.uid())
);

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon, authenticated;

REVOKE UPDATE (
  id, username, avatar_url, is_founder, paypal_subscription_id,
  created_at, onboarding_completed
) ON TABLE public.profiles FROM anon, authenticated;

GRANT SELECT (id, username, avatar_url, is_founder, created_at)
ON TABLE public.profiles TO anon, authenticated;

GRANT UPDATE (username, avatar_url, onboarding_completed)
ON TABLE public.profiles TO authenticated;

-- -----------------------------------------------------------------------------
-- 7. Pet places: catalogo de solo lectura para clientes
-- -----------------------------------------------------------------------------

REVOKE ALL PRIVILEGES ON TABLE public.pet_places FROM anon, authenticated;
GRANT SELECT ON TABLE public.pet_places TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 8. Storage: uploads de posts aislados por usuario
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "post_photos_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "post_photos_owner_delete" ON storage.objects;

CREATE POLICY "post_photos_owner_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "post_photos_owner_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- -----------------------------------------------------------------------------
-- 9. Defaults futuros: nuevas tablas no quedan expuestas accidentalmente
-- -----------------------------------------------------------------------------

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated;

COMMIT;
