BEGIN;

-- =============================================================================
-- PAZO - Fase 5
-- Impedir follows entre mascotas del mismo propietario
-- =============================================================================

CREATE OR REPLACE FUNCTION private.validate_follow_relationship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_follower_owner uuid;
  v_following_owner uuid;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    RAISE EXCEPTION 'A pet cannot follow itself.';
  END IF;

  SELECT p.owner_id
  INTO v_follower_owner
  FROM public.pets p
  WHERE p.id = NEW.follower_id;

  SELECT p.owner_id
  INTO v_following_owner
  FROM public.pets p
  WHERE p.id = NEW.following_id;

  IF v_follower_owner IS NULL OR v_following_owner IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Follower or following pet does not exist.';
  END IF;

  IF v_follower_owner = v_following_owner THEN
    RAISE EXCEPTION 'Pets from the same account cannot follow each other.';
  END IF;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION private.validate_follow_relationship() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.validate_follow_relationship()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_follow_relationship ON public.follows;
CREATE TRIGGER trg_validate_follow_relationship
BEFORE INSERT OR UPDATE OF follower_id, following_id
ON public.follows
FOR EACH ROW
EXECUTE FUNCTION private.validate_follow_relationship();

DROP POLICY IF EXISTS "follows_owner_insert" ON public.follows;

CREATE POLICY "follows_owner_insert"
ON public.follows
FOR INSERT
TO authenticated
WITH CHECK (
  follower_id <> following_id
  AND EXISTS (
    SELECT 1
    FROM public.pets follower
    WHERE follower.id = follower_id
      AND follower.owner_id = (SELECT auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.pets follower
    JOIN public.pets following
      ON following.id = following_id
    WHERE follower.id = follower_id
      AND follower.owner_id = following.owner_id
  )
);

COMMIT;
