BEGIN;

-- =============================================================================
-- PAZO - Fase 6
-- Pasaporte QR público, alertas de mascota perdida, avistamientos y notificaciones
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Privacidad adicional para visitantes anónimos
-- -----------------------------------------------------------------------------

REVOKE SELECT (owner_id, last_seen_location)
ON TABLE public.pets
FROM anon;

-- -----------------------------------------------------------------------------
-- 1. Enlace público revocable por mascota
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pet_public_links (
  pet_id uuid PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
  public_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);

ALTER TABLE public.pet_public_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_public_links_owner_select" ON public.pet_public_links;

CREATE POLICY "pet_public_links_owner_select"
ON public.pet_public_links
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

REVOKE ALL PRIVILEGES ON TABLE public.pet_public_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.pet_public_links TO authenticated;
GRANT ALL ON TABLE public.pet_public_links TO service_role;

INSERT INTO public.pet_public_links (pet_id)
SELECT p.id
FROM public.pets p
ON CONFLICT (pet_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.ensure_pet_public_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.pet_public_links (pet_id)
  VALUES (NEW.id)
  ON CONFLICT (pet_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION private.ensure_pet_public_link() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.ensure_pet_public_link()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_ensure_pet_public_link ON public.pets;
CREATE TRIGGER trg_ensure_pet_public_link
AFTER INSERT ON public.pets
FOR EACH ROW
EXECUTE FUNCTION private.ensure_pet_public_link();

CREATE OR REPLACE FUNCTION public.rotate_pet_public_link(
  p_pet_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_token uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = p_pet_id
      AND p.owner_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Pet not found or not owned by authenticated user.';
  END IF;

  UPDATE public.pet_public_links
  SET
    public_token = gen_random_uuid(),
    enabled = true,
    rotated_at = now()
  WHERE pet_id = p_pet_id
  RETURNING public_token INTO v_token;

  IF v_token IS NULL THEN
    INSERT INTO public.pet_public_links (pet_id)
    VALUES (p_pet_id)
    RETURNING public_token INTO v_token;
  END IF;

  RETURN v_token;
END;
$function$;

ALTER FUNCTION public.rotate_pet_public_link(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rotate_pet_public_link(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_pet_public_link(uuid)
TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Alertas de mascota perdida
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lost_pet_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  last_seen_location text NOT NULL,
  last_seen_at timestamptz NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT lost_pet_alert_location_length
    CHECK (char_length(btrim(last_seen_location)) BETWEEN 2 AND 250),
  CONSTRAINT lost_pet_alert_details_length
    CHECK (details IS NULL OR char_length(details) <= 1500)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_lost_alert_per_pet
ON public.lost_pet_alerts (pet_id)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_lost_pet_alerts_pet_created
ON public.lost_pet_alerts (pet_id, created_at DESC);

ALTER TABLE public.lost_pet_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lost_pet_alerts_owner_select" ON public.lost_pet_alerts;

CREATE POLICY "lost_pet_alerts_owner_select"
ON public.lost_pet_alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pets p
    WHERE p.id = pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

REVOKE ALL PRIVILEGES ON TABLE public.lost_pet_alerts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.lost_pet_alerts TO authenticated;
GRANT ALL ON TABLE public.lost_pet_alerts TO service_role;

-- -----------------------------------------------------------------------------
-- 3. Avistamientos públicos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pet_sightings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES public.lost_pet_alerts(id) ON DELETE SET NULL,
  message text NOT NULL,
  location_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_sighting_message_length
    CHECK (char_length(btrim(message)) BETWEEN 3 AND 1000),
  CONSTRAINT pet_sighting_location_length
    CHECK (location_text IS NULL OR char_length(location_text) <= 250)
);

CREATE INDEX IF NOT EXISTS idx_pet_sightings_pet_created
ON public.pet_sightings (pet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pet_sightings_alert_id
ON public.pet_sightings (alert_id);

ALTER TABLE public.pet_sightings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_sightings_owner_select" ON public.pet_sightings;

CREATE POLICY "pet_sightings_owner_select"
ON public.pet_sightings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pets p
    WHERE p.id = pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
);

REVOKE ALL PRIVILEGES ON TABLE public.pet_sightings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.pet_sightings TO authenticated;
GRANT ALL ON TABLE public.pet_sightings TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Notificaciones privadas
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('sighting','system')),
  title text NOT NULL,
  body text NOT NULL,
  source_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_title_length CHECK (char_length(title) BETWEEN 1 AND 160),
  CONSTRAINT notifications_body_length CHECK (char_length(body) BETWEEN 1 AND 1200)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON public.notifications (user_id, created_at DESC)
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_pet_id
ON public.notifications (pet_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_owner_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_owner_update" ON public.notifications;

CREATE POLICY "notifications_owner_select"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "notifications_owner_update"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL PRIVILEGES ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (read_at) ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

-- -----------------------------------------------------------------------------
-- 5. RPC: activar / resolver alerta
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_lost_pet_alert(
  p_pet_id uuid,
  p_last_seen_location text,
  p_last_seen_at timestamptz,
  p_details text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_alert_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = p_pet_id
      AND p.owner_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Pet not found or not owned by authenticated user.';
  END IF;

  IF char_length(btrim(COALESCE(p_last_seen_location,''))) < 2 THEN
    RAISE EXCEPTION 'Last seen location is required.';
  END IF;

  IF p_last_seen_at IS NULL THEN
    RAISE EXCEPTION 'Last seen date and time are required.';
  END IF;

  IF p_last_seen_at > now() + interval '10 minutes' THEN
    RAISE EXCEPTION 'Last seen date and time cannot be in the future.';
  END IF;

  UPDATE public.lost_pet_alerts
  SET
    last_seen_location = btrim(p_last_seen_location),
    last_seen_at = p_last_seen_at,
    details = NULLIF(btrim(COALESCE(p_details,'')), ''),
    resolved_at = NULL
  WHERE pet_id = p_pet_id
    AND status = 'active'
  RETURNING id INTO v_alert_id;

  IF v_alert_id IS NULL THEN
    INSERT INTO public.lost_pet_alerts (
      pet_id,
      last_seen_location,
      last_seen_at,
      details
    )
    VALUES (
      p_pet_id,
      btrim(p_last_seen_location),
      p_last_seen_at,
      NULLIF(btrim(COALESCE(p_details,'')), '')
    )
    RETURNING id INTO v_alert_id;
  END IF;

  UPDATE public.pets
  SET
    is_lost = true,
    last_seen_location = btrim(p_last_seen_location)
  WHERE id = p_pet_id;

  RETURN v_alert_id;
END;
$function$;

ALTER FUNCTION public.activate_lost_pet_alert(uuid,text,timestamptz,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.activate_lost_pet_alert(uuid,text,timestamptz,text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_lost_pet_alert(uuid,text,timestamptz,text)
TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_lost_pet_alert(
  p_pet_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = p_pet_id
      AND p.owner_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Pet not found or not owned by authenticated user.';
  END IF;

  UPDATE public.lost_pet_alerts
  SET
    status = 'resolved',
    resolved_at = now()
  WHERE pet_id = p_pet_id
    AND status = 'active';

  UPDATE public.pets
  SET
    is_lost = false,
    last_seen_location = NULL
  WHERE id = p_pet_id;

  RETURN true;
END;
$function$;

ALTER FUNCTION public.resolve_lost_pet_alert(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.resolve_lost_pet_alert(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_lost_pet_alert(uuid)
TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. RPC pública: estado fundador sin exponer owner_id
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_pet_founder_status(
  p_pet_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE((
    SELECT pr.is_founder
    FROM public.pets p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = p_pet_id
    LIMIT 1
  ), false);
$function$;

ALTER FUNCTION public.get_pet_founder_status(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_pet_founder_status(uuid)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pet_founder_status(uuid)
TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. RPC pública: consultar pasaporte de rescate por token
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_pet_rescue_profile(
  p_token uuid
)
RETURNS TABLE (
  name text,
  species text,
  breed text,
  photo_url text,
  bio text,
  is_lost boolean,
  last_seen_location text,
  alert_last_seen_at timestamptz,
  alert_details text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    p.name,
    p.species,
    p.breed,
    p.photo_url,
    p.bio,
    p.is_lost,
    CASE WHEN a.id IS NOT NULL THEN a.last_seen_location ELSE NULL END,
    a.last_seen_at,
    a.details
  FROM public.pet_public_links l
  JOIN public.pets p ON p.id = l.pet_id
  LEFT JOIN LATERAL (
    SELECT la.id, la.last_seen_location, la.last_seen_at, la.details
    FROM public.lost_pet_alerts la
    WHERE la.pet_id = p.id
      AND la.status = 'active'
    ORDER BY la.created_at DESC
    LIMIT 1
  ) a ON true
  WHERE l.public_token = p_token
    AND l.enabled = true
  LIMIT 1;
$function$;

ALTER FUNCTION public.get_public_pet_rescue_profile(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_pet_rescue_profile(uuid)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pet_rescue_profile(uuid)
TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 8. RPC pública: enviar avistamiento + crear notificación privada
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_pet_sighting(
  p_token uuid,
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
  v_message text := btrim(COALESCE(p_message,''));
  v_location text := NULLIF(btrim(COALESCE(p_location,'')), '');
BEGIN
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
    message,
    location_text
  )
  VALUES (
    v_pet_id,
    v_alert_id,
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

ALTER FUNCTION public.submit_pet_sighting(uuid,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.submit_pet_sighting(uuid,text,text)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_pet_sighting(uuid,text,text)
TO anon, authenticated;

COMMIT;
