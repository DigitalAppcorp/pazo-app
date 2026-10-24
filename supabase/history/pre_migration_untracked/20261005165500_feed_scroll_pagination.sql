BEGIN;

-- =============================================================================
-- PAZO - Fase 6C
-- Recomendaciones paginadas para infinite scroll del Feed
-- =============================================================================

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
