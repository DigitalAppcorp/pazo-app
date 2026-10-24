BEGIN;

-- =============================================================================
-- PAZO - Fase 6B
-- Datos de contacto privados para avistamientos
-- =============================================================================

ALTER TABLE public.pet_sightings
  ADD COLUMN IF NOT EXISTS reporter_name text,
  ADD COLUMN IF NOT EXISTS reporter_phone text;

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pet_sighting_reporter_name_length'
      AND conrelid = 'public.pet_sightings'::regclass
  ) THEN
    ALTER TABLE public.pet_sightings
      ADD CONSTRAINT pet_sighting_reporter_name_length
      CHECK (
        reporter_name IS NULL
        OR char_length(btrim(reporter_name)) BETWEEN 2 AND 100
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pet_sighting_reporter_phone_length'
      AND conrelid = 'public.pet_sightings'::regclass
  ) THEN
    ALTER TABLE public.pet_sightings
      ADD CONSTRAINT pet_sighting_reporter_phone_length
      CHECK (
        reporter_phone IS NULL
        OR char_length(btrim(reporter_phone)) BETWEEN 7 AND 40
      );
  END IF;
END;
$block$;

-- Retirar la versión anterior para que no exista una ruta pública que omita
-- nombre/teléfono en nuevos avistamientos.
REVOKE ALL ON FUNCTION public.submit_pet_sighting(uuid,text,text)
FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.submit_pet_sighting(uuid,text,text);

CREATE OR REPLACE FUNCTION public.submit_pet_sighting(
  p_token uuid,
  p_reporter_name text,
  p_reporter_phone text,
  p_message text,
  p_location text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_pet_id uuid;
  v_owner_id uuid;
  v_pet_name text;
  v_alert_id uuid;
  v_sighting_id uuid;
  v_recent_count integer;
  v_reporter_name text := btrim(COALESCE(p_reporter_name,''));
  v_reporter_phone text := btrim(COALESCE(p_reporter_phone,''));
  v_message text := btrim(COALESCE(p_message,''));
  v_location text := NULLIF(btrim(COALESCE(p_location,'')), '');
BEGIN
  IF char_length(v_reporter_name) < 2 OR char_length(v_reporter_name) > 100 THEN
    RAISE EXCEPTION 'Reporter name must contain between 2 and 100 characters.';
  END IF;

  IF char_length(v_reporter_phone) < 7 OR char_length(v_reporter_phone) > 40 THEN
    RAISE EXCEPTION 'Reporter phone must contain between 7 and 40 characters.';
  END IF;

  IF char_length(v_message) < 3 OR char_length(v_message) > 1000 THEN
    RAISE EXCEPTION 'Sighting message must contain between 3 and 1000 characters.';
  END IF;

  IF v_location IS NOT NULL AND char_length(v_location) > 250 THEN
    RAISE EXCEPTION 'Sighting location is too long.';
  END IF;

  SELECT p.id, p.owner_id, p.name
  INTO v_pet_id, v_owner_id, v_pet_name
  FROM public.pet_public_links l
  JOIN public.pets p ON p.id = l.pet_id
  WHERE l.public_token = p_token
    AND l.enabled = true;

  IF v_pet_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or disabled rescue link.';
  END IF;

  SELECT count(*)::integer
  INTO v_recent_count
  FROM public.pet_sightings s
  WHERE s.pet_id = v_pet_id
    AND s.created_at > now() - interval '10 minutes';

  IF v_recent_count >= 10 THEN
    RAISE EXCEPTION 'Too many recent sighting reports. Please try again later.';
  END IF;

  SELECT a.id
  INTO v_alert_id
  FROM public.lost_pet_alerts a
  WHERE a.pet_id = v_pet_id
    AND a.status = 'active'
  ORDER BY a.created_at DESC
  LIMIT 1;

  INSERT INTO public.pet_sightings (
    pet_id,
    alert_id,
    reporter_name,
    reporter_phone,
    message,
    location_text
  )
  VALUES (
    v_pet_id,
    v_alert_id,
    v_reporter_name,
    v_reporter_phone,
    v_message,
    v_location
  )
  RETURNING id INTO v_sighting_id;

  INSERT INTO public.notifications (
    user_id,
    pet_id,
    type,
    title,
    body,
    source_id
  )
  VALUES (
    v_owner_id,
    v_pet_id,
    'sighting',
    'Nuevo aviso sobre ' || v_pet_name,
    left(
      CASE
        WHEN v_location IS NOT NULL
          THEN v_message || ' · Ubicación: ' || v_location
        ELSE v_message
      END,
      1200
    ),
    v_sighting_id
  );

  RETURN v_sighting_id;
END;
$function$;

ALTER FUNCTION public.submit_pet_sighting(uuid,text,text,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.submit_pet_sighting(uuid,text,text,text,text)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_pet_sighting(uuid,text,text,text,text)
TO anon, authenticated;

COMMIT;
