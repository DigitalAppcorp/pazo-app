BEGIN;

-- =============================================================================
-- PAZO - Fase 2.2
-- Comentarios normalizados: post_comments como fuente de verdad
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  legacy_id text UNIQUE,
  applied_learning boolean NOT NULL DEFAULT false,
  target_tags text[] DEFAULT NULL,
  CONSTRAINT post_comments_body_length
    CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000)
);

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_post_comments_post_created
  ON public.post_comments (post_id, created_at);

CREATE INDEX IF NOT EXISTS idx_post_comments_author
  ON public.post_comments (author_pet_id);

-- Migrar comentarios JSON históricos sin reaplicar aprendizaje.
-- En el estado auditado todos los autores tienen una única mascota coincidente.
INSERT INTO public.post_comments (
  post_id,
  author_pet_id,
  body,
  created_at,
  legacy_id,
  applied_learning,
  target_tags
)
SELECT
  p.id,
  pet.id,
  btrim(c ->> 'text'),
  COALESCE(NULLIF(c ->> 'createdAt', '')::timestamptz, p.created_at),
  c ->> 'id',
  false,
  NULL
FROM public.posts p
CROSS JOIN LATERAL jsonb_array_elements(p.comments) c
JOIN public.pets pet
  ON lower(pet.name) = lower(c ->> 'authorName')
WHERE jsonb_typeof(p.comments) = 'array'
  AND NULLIF(c ->> 'id', '') IS NOT NULL
  AND char_length(btrim(COALESCE(c ->> 'text', ''))) BETWEEN 1 AND 1000
  AND (
    SELECT count(*)
    FROM public.pets p2
    WHERE lower(p2.name) = lower(c ->> 'authorName')
  ) = 1
ON CONFLICT (legacy_id) DO NOTHING;

UPDATE public.posts p
SET comments_count = (
  SELECT count(*)::integer
  FROM public.post_comments pc
  WHERE pc.post_id = p.id
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_comments_public_read" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_owner_insert" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_owner_delete" ON public.post_comments;

CREATE POLICY "post_comments_public_read"
ON public.post_comments
FOR SELECT
TO public
USING (true);

CREATE POLICY "post_comments_owner_insert"
ON public.post_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = author_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "post_comments_owner_delete"
ON public.post_comments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = author_pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

REVOKE ALL ON TABLE public.post_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.post_comments TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.post_comments TO authenticated;
GRANT ALL ON TABLE public.post_comments TO service_role;

CREATE OR REPLACE FUNCTION private.normalize_post_comment_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_tags text[];
BEGIN
  NEW.body := btrim(NEW.body);

  IF NEW.body = '' OR char_length(NEW.body) > 1000 THEN
    RAISE EXCEPTION 'Comentario inválido.';
  END IF;

  SELECT p.tags
  INTO v_tags
  FROM public.posts p
  WHERE p.id = NEW.post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Target post does not exist.';
  END IF;

  NEW.target_tags := COALESCE(v_tags, ARRAY[]::text[]);
  NEW.applied_learning := COALESCE(array_length(NEW.target_tags, 1), 0) > 0;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION private.normalize_post_comment_before_insert() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.normalize_post_comment_before_insert()
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.process_post_comment_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET comments_count = GREATEST(0, COALESCE(comments_count, 0) + 1)
    WHERE id = NEW.post_id;

    IF NEW.applied_learning THEN
      PERFORM private.adjust_pet_learning_tags(
        NEW.author_pet_id,
        NEW.target_tags,
        5
      );
    END IF;

    INSERT INTO public.interactions (
      actor_pet_id,
      target_id,
      target_type,
      action_type
    )
    VALUES (
      NEW.author_pet_id,
      NEW.post_id,
      'post',
      'comment'
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1)
    WHERE id = OLD.post_id;

    IF OLD.applied_learning THEN
      PERFORM private.adjust_pet_learning_tags(
        OLD.author_pet_id,
        OLD.target_tags,
        -5
      );
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;

ALTER FUNCTION private.process_post_comment_side_effects() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.process_post_comment_side_effects()
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.guard_comment_interaction_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.action_type = 'comment' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Comment interactions must originate from post_comments.';
  END IF;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION private.guard_comment_interaction_insert() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.guard_comment_interaction_insert()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_normalize_post_comment_before_insert
ON public.post_comments;

CREATE TRIGGER trg_normalize_post_comment_before_insert
BEFORE INSERT ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION private.normalize_post_comment_before_insert();

DROP TRIGGER IF EXISTS trg_process_post_comment_side_effects
ON public.post_comments;

CREATE TRIGGER trg_process_post_comment_side_effects
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION private.process_post_comment_side_effects();

DROP TRIGGER IF EXISTS trg_guard_comment_interaction_insert
ON public.interactions;

CREATE TRIGGER trg_guard_comment_interaction_insert
BEFORE INSERT ON public.interactions
FOR EACH ROW
EXECUTE FUNCTION private.guard_comment_interaction_insert();

-- comments_count es un cache derivado; clientes no deben modificarlo.
REVOKE UPDATE (comments_count) ON TABLE public.posts FROM anon, authenticated;

COMMIT;
