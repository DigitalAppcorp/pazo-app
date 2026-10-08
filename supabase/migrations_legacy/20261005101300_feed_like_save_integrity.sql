BEGIN;

-- =============================================================================
-- PAZO - Fase 2.1A
-- Integridad backend de Likes / Saves
-- PostgreSQL 17 / Supabase
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS private AUTHORIZATION postgres;
ALTER SCHEMA private OWNER TO postgres;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS applied_learning boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_tags text[] DEFAULT NULL;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY actor_pet_id, target_id, target_type, action_type
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.interactions
  WHERE target_type = 'post'
    AND action_type IN ('like', 'save')
)
DELETE FROM public.interactions i
USING ranked r
WHERE i.id = r.id
  AND r.rn > 1;

UPDATE public.posts p
SET likes = COALESCE((
  SELECT count(*)::integer
  FROM public.interactions i
  WHERE i.target_id = p.id
    AND i.target_type = 'post'
    AND i.action_type = 'like'
), 0);

DROP INDEX IF EXISTS public.idx_unique_active_post_likes_saves;
CREATE UNIQUE INDEX idx_unique_active_post_likes_saves
ON public.interactions (actor_pet_id, target_id, action_type)
WHERE target_type = 'post'
  AND action_type IN ('like', 'save');

CREATE OR REPLACE FUNCTION private.adjust_pet_learning_tags(
  p_pet_id uuid,
  p_tags text[],
  p_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_learned jsonb;
  v_last_decay timestamptz;
  v_tag text;
  v_current_score integer;
  v_new_score integer;
  v_key text;
  v_val jsonb;
  v_transformed_json jsonb := '{}'::jsonb;
BEGIN
  INSERT INTO public.pet_private_metrics (pet_id, learned_interests, last_decay_applied_at)
  VALUES (p_pet_id, '{}'::jsonb, now())
  ON CONFLICT (pet_id) DO NOTHING;

  SELECT ppm.learned_interests, ppm.last_decay_applied_at
  INTO v_learned, v_last_decay
  FROM public.pet_private_metrics ppm
  WHERE ppm.pet_id = p_pet_id
  FOR UPDATE;

  v_learned := COALESCE(v_learned, '{}'::jsonb);

  IF v_last_decay < now() - interval '7 days' THEN
    IF jsonb_typeof(v_learned) = 'object' THEN
      v_transformed_json := '{}'::jsonb;
      FOR v_key, v_val IN SELECT * FROM jsonb_each(v_learned)
      LOOP
        v_transformed_json := jsonb_set(
          v_transformed_json,
          ARRAY[v_key],
          to_jsonb(round((v_val::text::numeric) * 0.8)::integer)
        );
      END LOOP;
      v_learned := v_transformed_json;
    END IF;
    v_last_decay := now();
  END IF;

  IF p_tags IS NOT NULL
     AND COALESCE(array_length(p_tags, 1), 0) > 0
     AND p_delta <> 0 THEN
    FOREACH v_tag IN ARRAY p_tags
    LOOP
      v_current_score := COALESCE((v_learned ->> v_tag)::integer, 0);
      v_new_score := GREATEST(0, v_current_score + p_delta);

      IF v_new_score = 0 THEN
        v_learned := v_learned - v_tag;
      ELSE
        v_learned := jsonb_set(v_learned, ARRAY[v_tag], to_jsonb(v_new_score));
      END IF;
    END LOOP;
  END IF;

  UPDATE public.pet_private_metrics
  SET learned_interests = v_learned,
      last_decay_applied_at = v_last_decay
  WHERE pet_id = p_pet_id;
END;
$function$;

ALTER FUNCTION private.adjust_pet_learning_tags(uuid, text[], integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.adjust_pet_learning_tags(uuid, text[], integer)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.normalize_post_interaction_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_post_tags text[];
BEGIN
  IF NEW.target_type = 'post' THEN
    SELECT p.tags
    INTO v_post_tags
    FROM public.posts p
    WHERE p.id = NEW.target_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503',
        MESSAGE = 'Target post does not exist.';
    END IF;

    IF NEW.action_type IN ('like', 'save') THEN
      NEW.target_tags := COALESCE(v_post_tags, ARRAY[]::text[]);
      NEW.applied_learning := COALESCE(array_length(NEW.target_tags, 1), 0) > 0;
    ELSE
      NEW.target_tags := NULL;
      NEW.applied_learning := false;
    END IF;
  ELSE
    NEW.target_tags := NULL;
    NEW.applied_learning := false;
  END IF;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION private.normalize_post_interaction_before_insert() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.normalize_post_interaction_before_insert()
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.process_reversible_interaction_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'post' AND NEW.action_type = 'like' THEN
      UPDATE public.posts
      SET likes = GREATEST(0, COALESCE(likes, 0) + 1)
      WHERE id = NEW.target_id;

      PERFORM private.adjust_pet_learning_tags(
        NEW.actor_pet_id,
        NEW.target_tags,
        3
      );

    ELSIF NEW.target_type = 'post' AND NEW.action_type = 'save' THEN
      PERFORM private.adjust_pet_learning_tags(
        NEW.actor_pet_id,
        NEW.target_tags,
        7
      );
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' AND OLD.action_type = 'like' THEN
      UPDATE public.posts
      SET likes = GREATEST(0, COALESCE(likes, 0) - 1)
      WHERE id = OLD.target_id;

      IF OLD.applied_learning THEN
        PERFORM private.adjust_pet_learning_tags(
          OLD.actor_pet_id,
          OLD.target_tags,
          -3
        );
      END IF;

    ELSIF OLD.target_type = 'post' AND OLD.action_type = 'save' THEN
      IF OLD.applied_learning THEN
        PERFORM private.adjust_pet_learning_tags(
          OLD.actor_pet_id,
          OLD.target_tags,
          -7
        );
      END IF;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;

ALTER FUNCTION private.process_reversible_interaction_side_effects() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.process_reversible_interaction_side_effects()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_normalize_post_interaction_before_insert ON public.interactions;
CREATE TRIGGER trg_normalize_post_interaction_before_insert
BEFORE INSERT ON public.interactions
FOR EACH ROW
EXECUTE FUNCTION private.normalize_post_interaction_before_insert();

DROP TRIGGER IF EXISTS trg_process_reversible_interaction_side_effects ON public.interactions;
CREATE TRIGGER trg_process_reversible_interaction_side_effects
AFTER INSERT OR DELETE ON public.interactions
FOR EACH ROW
EXECUTE FUNCTION private.process_reversible_interaction_side_effects();

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.interactions FROM anon;

REVOKE UPDATE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.interactions FROM authenticated;

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir inserción de interacciones a usuarios autenticados"
ON public.interactions;
DROP POLICY IF EXISTS "interactions_insert_owner_policy"
ON public.interactions;
DROP POLICY IF EXISTS "interactions_delete_owner_policy"
ON public.interactions;

CREATE POLICY "interactions_insert_owner_policy"
ON public.interactions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = actor_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "interactions_delete_owner_policy"
ON public.interactions
FOR DELETE
TO authenticated
USING (
  target_type = 'post'
  AND action_type IN ('like', 'save')
  AND EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = actor_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.register_interaction_signal(
  p_actor_pet_id uuid,
  p_target_id uuid,
  p_action_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_owner_id uuid;
  v_tags text[];
  v_weight integer := 0;
  v_exists boolean := false;
  v_learned jsonb;
  v_last_decay timestamptz;
  v_tag text;
  v_current_score integer;
  v_new_score integer;
  v_key text;
  v_val jsonb;
  v_transformed_json jsonb := '{}'::jsonb;
BEGIN
  SELECT p.owner_id
  INTO v_owner_id
  FROM public.pets p
  WHERE p.id = p_actor_pet_id;

  IF v_owner_id IS NULL OR v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Acceso denegado: La mascota no pertenece al usuario autenticado.';
  END IF;

  IF p_action_type NOT IN (
    'impression', 'view', 'like', 'unlike',
    'comment', 'save', 'unsave', 'not_interested'
  ) THEN
    RAISE EXCEPTION 'action_type no válido.';
  END IF;

  SELECT p.tags
  INTO v_tags
  FROM public.posts p
  WHERE p.id = p_target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Target post does not exist.';
  END IF;

  v_tags := COALESCE(v_tags, ARRAY[]::text[]);

  IF p_action_type IN ('like', 'save') THEN
    INSERT INTO public.interactions (
      actor_pet_id, target_id, target_type, action_type
    )
    VALUES (
      p_actor_pet_id, p_target_id, 'post', p_action_type
    )
    ON CONFLICT (actor_pet_id, target_id, action_type)
      WHERE target_type = 'post'
        AND action_type IN ('like', 'save')
    DO NOTHING;

    RETURN true;
  END IF;

  IF p_action_type IN ('unlike', 'unsave') THEN
    DELETE FROM public.interactions
    WHERE actor_pet_id = p_actor_pet_id
      AND target_id = p_target_id
      AND target_type = 'post'
      AND action_type = CASE
        WHEN p_action_type = 'unlike' THEN 'like'
        ELSE 'save'
      END;

    RETURN true;
  END IF;

  IF p_action_type = 'impression' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.interactions i
      WHERE i.actor_pet_id = p_actor_pet_id
        AND i.target_id = p_target_id
        AND i.target_type = 'post'
        AND i.action_type IN ('impression', 'view')
        AND i.created_at > now() - interval '24 hours'
    ) INTO v_exists;

    v_weight := 0;

  ELSIF p_action_type = 'view' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.interactions i
      WHERE i.actor_pet_id = p_actor_pet_id
        AND i.target_id = p_target_id
        AND i.target_type = 'post'
        AND i.action_type IN ('impression', 'view')
        AND i.created_at > now() - interval '24 hours'
    ) INTO v_exists;

    IF v_exists THEN
      v_weight := 0;
    ELSE
      v_weight := 1;
    END IF;

  ELSIF p_action_type = 'comment' THEN
    v_weight := 5;

  ELSIF p_action_type = 'not_interested' THEN
    v_weight := -15;
  END IF;

  INSERT INTO public.pet_private_metrics (
    pet_id, learned_interests, last_decay_applied_at
  )
  VALUES (
    p_actor_pet_id, '{}'::jsonb, now()
  )
  ON CONFLICT (pet_id) DO NOTHING;

  SELECT ppm.learned_interests, ppm.last_decay_applied_at
  INTO v_learned, v_last_decay
  FROM public.pet_private_metrics ppm
  WHERE ppm.pet_id = p_actor_pet_id
  FOR UPDATE;

  v_learned := COALESCE(v_learned, '{}'::jsonb);

  IF v_last_decay < now() - interval '7 days' THEN
    IF jsonb_typeof(v_learned) = 'object' THEN
      v_transformed_json := '{}'::jsonb;
      FOR v_key, v_val IN SELECT * FROM jsonb_each(v_learned)
      LOOP
        v_transformed_json := jsonb_set(
          v_transformed_json,
          ARRAY[v_key],
          to_jsonb(round((v_val::text::numeric) * 0.8)::integer)
        );
      END LOOP;
      v_learned := v_transformed_json;
    END IF;
    v_last_decay := now();
  END IF;

  IF v_weight <> 0 AND array_length(v_tags, 1) > 0 THEN
    FOREACH v_tag IN ARRAY v_tags
    LOOP
      v_current_score := COALESCE((v_learned ->> v_tag)::integer, 0);
      v_new_score := GREATEST(0, v_current_score + v_weight);
      v_learned := jsonb_set(v_learned, ARRAY[v_tag], to_jsonb(v_new_score));
    END LOOP;
  END IF;

  UPDATE public.pet_private_metrics
  SET learned_interests = v_learned,
      last_decay_applied_at = v_last_decay
  WHERE pet_id = p_actor_pet_id;

  IF p_action_type = 'impression' AND NOT v_exists THEN
    INSERT INTO public.interactions (
      actor_pet_id, target_id, target_type, action_type
    ) VALUES (
      p_actor_pet_id, p_target_id, 'post', p_action_type
    );

  ELSIF p_action_type = 'view' AND NOT v_exists THEN
    INSERT INTO public.interactions (
      actor_pet_id, target_id, target_type, action_type
    ) VALUES (
      p_actor_pet_id, p_target_id, 'post', p_action_type
    );

  ELSIF p_action_type IN ('comment', 'not_interested') THEN
    INSERT INTO public.interactions (
      actor_pet_id, target_id, target_type, action_type
    ) VALUES (
      p_actor_pet_id, p_target_id, 'post', p_action_type
    );
  END IF;

  RETURN true;
END;
$function$;

ALTER FUNCTION public.register_interaction_signal(uuid, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.register_interaction_signal(uuid, uuid, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_interaction_signal(uuid, uuid, text)
TO authenticated;

REVOKE UPDATE ON TABLE public.posts FROM anon, authenticated;

GRANT UPDATE (
  id,
  user_id,
  pet_id,
  pet_name,
  pet_species,
  pet_avatar,
  location,
  text,
  photo_url,
  comments,
  created_at,
  tags
) ON TABLE public.posts TO anon, authenticated;

COMMIT;
