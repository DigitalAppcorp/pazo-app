BEGIN;

-- =============================================================================
-- PAZO - Fase 3
-- Registro y edición persistente de mascotas + privacidad de perfil
-- =============================================================================

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS breed text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS is_lost boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_location text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pets'::regclass
      AND conname = 'pets_name_length'
  ) THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_name_length
      CHECK (char_length(btrim(name)) BETWEEN 1 AND 50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pets'::regclass
      AND conname = 'pets_species_allowed'
  ) THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_species_allowed
      CHECK (species IN ('gato','perro','conejo','ave','otro'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pets'::regclass
      AND conname = 'pets_gender_allowed'
  ) THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_gender_allowed
      CHECK (gender IS NULL OR gender IN ('macho','hembra'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_pets_owner_id
  ON public.pets(owner_id);

CREATE TABLE IF NOT EXISTS public.pet_private_details (
  pet_id uuid PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
  zone text,
  interests text[] NOT NULL DEFAULT ARRAY[]::text[],
  weight text,
  diet_plan text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.pet_private_details (
  pet_id,
  zone,
  interests,
  weight,
  diet_plan
)
SELECT
  p.id,
  p.zone,
  COALESCE(p.interests, ARRAY[]::text[]),
  p.weight,
  p."dietPlan"
FROM public.pets p
ON CONFLICT (pet_id) DO NOTHING;

ALTER TABLE public.pet_private_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_private_details_owner_select" ON public.pet_private_details;
DROP POLICY IF EXISTS "pet_private_details_owner_insert" ON public.pet_private_details;
DROP POLICY IF EXISTS "pet_private_details_owner_update" ON public.pet_private_details;

CREATE POLICY "pet_private_details_owner_select"
ON public.pet_private_details
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

CREATE POLICY "pet_private_details_owner_insert"
ON public.pet_private_details
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

CREATE POLICY "pet_private_details_owner_update"
ON public.pet_private_details
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

REVOKE ALL ON TABLE public.pet_private_details FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.pet_private_details TO authenticated;
GRANT ALL ON TABLE public.pet_private_details TO service_role;

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de mascotas" ON public.pets;
DROP POLICY IF EXISTS "Users can insert their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can view own pets" ON public.pets;
DROP POLICY IF EXISTS "pets_public_read" ON public.pets;
DROP POLICY IF EXISTS "pets_owner_insert" ON public.pets;
DROP POLICY IF EXISTS "pets_owner_update" ON public.pets;

CREATE POLICY "pets_public_read"
ON public.pets
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "pets_owner_insert"
ON public.pets
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = (SELECT auth.uid())
);

CREATE POLICY "pets_owner_update"
ON public.pets
FOR UPDATE
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
)
WITH CHECK (
  owner_id = (SELECT auth.uid())
);

REVOKE ALL ON TABLE public.pets FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  owner_id,
  name,
  species,
  age,
  photo_url,
  created_at,
  bio,
  breed,
  gender,
  is_lost,
  last_seen_location
) ON TABLE public.pets TO anon, authenticated;

GRANT INSERT (
  owner_id,
  name,
  species,
  age,
  photo_url,
  bio,
  breed,
  gender,
  is_lost,
  last_seen_location
) ON TABLE public.pets TO authenticated;

GRANT UPDATE (
  name,
  species,
  age,
  photo_url,
  bio,
  breed,
  gender,
  is_lost,
  last_seen_location
) ON TABLE public.pets TO authenticated;

GRANT ALL ON TABLE public.pets TO service_role;

CREATE OR REPLACE FUNCTION public.create_pet_profile(
  p_name text,
  p_species text,
  p_age text,
  p_photo_url text,
  p_zone text DEFAULT NULL,
  p_interests text[] DEFAULT ARRAY[]::text[],
  p_bio text DEFAULT NULL,
  p_breed text DEFAULT NULL,
  p_gender text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_pet_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  INSERT INTO public.pets (
    owner_id,
    name,
    species,
    age,
    photo_url,
    bio,
    breed,
    gender
  )
  VALUES (
    v_user_id,
    btrim(p_name),
    p_species,
    NULLIF(btrim(COALESCE(p_age, '')), ''),
    NULLIF(btrim(COALESCE(p_photo_url, '')), ''),
    NULLIF(btrim(COALESCE(p_bio, '')), ''),
    NULLIF(btrim(COALESCE(p_breed, '')), ''),
    NULLIF(btrim(COALESCE(p_gender, '')), '')
  )
  RETURNING id INTO v_pet_id;

  INSERT INTO public.pet_private_details (
    pet_id,
    zone,
    interests
  )
  VALUES (
    v_pet_id,
    NULLIF(btrim(COALESCE(p_zone, '')), ''),
    COALESCE(p_interests, ARRAY[]::text[])
  );

  RETURN v_pet_id;
END;
$function$;

ALTER FUNCTION public.create_pet_profile(text,text,text,text,text,text[],text,text,text)
OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_pet_profile(text,text,text,text,text,text[],text,text,text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pet_profile(text,text,text,text,text,text[],text,text,text)
TO authenticated;

CREATE OR REPLACE FUNCTION public.update_pet_profile(
  p_pet_id uuid,
  p_name text,
  p_species text,
  p_age text,
  p_photo_url text,
  p_bio text,
  p_breed text,
  p_gender text,
  p_zone text,
  p_interests text[],
  p_weight text,
  p_diet_plan text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  UPDATE public.pets
  SET
    name = btrim(p_name),
    species = p_species,
    age = NULLIF(btrim(COALESCE(p_age, '')), ''),
    photo_url = NULLIF(btrim(COALESCE(p_photo_url, '')), ''),
    bio = NULLIF(btrim(COALESCE(p_bio, '')), ''),
    breed = NULLIF(btrim(COALESCE(p_breed, '')), ''),
    gender = NULLIF(btrim(COALESCE(p_gender, '')), '')
  WHERE id = p_pet_id
    AND owner_id = v_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Pet not found or not owned by authenticated user.';
  END IF;

  INSERT INTO public.pet_private_details (
    pet_id,
    zone,
    interests,
    weight,
    diet_plan,
    updated_at
  )
  VALUES (
    p_pet_id,
    NULLIF(btrim(COALESCE(p_zone, '')), ''),
    COALESCE(p_interests, ARRAY[]::text[]),
    NULLIF(btrim(COALESCE(p_weight, '')), ''),
    NULLIF(btrim(COALESCE(p_diet_plan, '')), ''),
    now()
  )
  ON CONFLICT (pet_id) DO UPDATE
  SET
    zone = EXCLUDED.zone,
    interests = EXCLUDED.interests,
    weight = EXCLUDED.weight,
    diet_plan = EXCLUDED.diet_plan,
    updated_at = now();

  RETURN true;
END;
$function$;

ALTER FUNCTION public.update_pet_profile(uuid,text,text,text,text,text,text,text,text,text[],text,text)
OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_pet_profile(uuid,text,text,text,text,text,text,text,text,text[],text,text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pet_profile(uuid,text,text,text,text,text,text,text,text,text[],text,text)
TO authenticated;

CREATE OR REPLACE FUNCTION private.sync_pet_public_profile_to_posts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.species IS DISTINCT FROM OLD.species
     OR NEW.photo_url IS DISTINCT FROM OLD.photo_url THEN
    UPDATE public.posts
    SET
      pet_name = NEW.name,
      pet_species = NEW.species,
      pet_avatar = NEW.photo_url
    WHERE pet_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION private.sync_pet_public_profile_to_posts() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.sync_pet_public_profile_to_posts()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_pet_public_profile_to_posts ON public.pets;
CREATE TRIGGER trg_sync_pet_public_profile_to_posts
AFTER UPDATE OF name, species, photo_url ON public.pets
FOR EACH ROW
EXECUTE FUNCTION private.sync_pet_public_profile_to_posts();

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'pet-avatars',
  'pet-avatars',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "pet_avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "pet_avatars_owner_delete" ON storage.objects;

CREATE POLICY "pet_avatars_owner_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pet-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "pet_avatars_owner_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pet-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

COMMIT;
