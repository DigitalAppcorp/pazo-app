CREATE SCHEMA IF NOT EXISTS place_private;
REVOKE ALL ON SCHEMA place_private FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Curated place catalog
-- ---------------------------------------------------------------------------

ALTER TABLE public.pet_places
  RENAME COLUMN type TO category;

ALTER TABLE public.pet_places
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision,
  ADD COLUMN pet_rules text,
  ADD COLUMN status text NOT NULL DEFAULT 'active',
  ADD COLUMN source text NOT NULL DEFAULT 'pazo_curated',
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Existing rows are demo data with non-verifiable addresses/counts.
UPDATE public.pet_places
SET
  category = CASE category
    WHEN 'parque' THEN 'park'
    WHEN 'cafeteria' THEN 'food'
    ELSE category
  END,
  status = 'archived',
  source = 'legacy_demo',
  updated_at = now();

ALTER TABLE public.pet_places
  DROP COLUMN active_check_ins;

ALTER TABLE public.pet_places
  ADD CONSTRAINT pet_places_category_allowed
    CHECK (
      category IN (
        'park',
        'trail',
        'food',
        'veterinary',
        'grooming',
        'pet_store'
      )
    ),
  ADD CONSTRAINT pet_places_status_allowed
    CHECK (status IN ('active', 'archived')),
  ADD CONSTRAINT pet_places_latitude_valid
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT pet_places_longitude_valid
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT pet_places_active_requires_coordinates
    CHECK (
      status <> 'active'
      OR (latitude IS NOT NULL AND longitude IS NOT NULL)
    ),
  ADD CONSTRAINT pet_places_name_length
    CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  ADD CONSTRAINT pet_places_address_length
    CHECK (char_length(btrim(address)) BETWEEN 3 AND 300),
  ADD CONSTRAINT pet_places_zone_length
    CHECK (char_length(btrim(zone)) BETWEEN 1 AND 120),
  ADD CONSTRAINT pet_places_rules_length
    CHECK (pet_rules IS NULL OR char_length(btrim(pet_rules)) <= 2000),
  ADD CONSTRAINT pet_places_description_length
    CHECK (description IS NULL OR char_length(btrim(description)) <= 3000),
  ADD CONSTRAINT pet_places_source_length
    CHECK (char_length(btrim(source)) BETWEEN 2 AND 80);

CREATE INDEX pet_places_status_category_idx
  ON public.pet_places (status, category);

CREATE INDEX pet_places_status_coordinates_idx
  ON public.pet_places (status, latitude, longitude);

CREATE OR REPLACE FUNCTION place_private.normalize_place_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.name := btrim(NEW.name);
  NEW.category := btrim(NEW.category);
  NEW.zone := btrim(NEW.zone);
  NEW.address := btrim(NEW.address);
  NEW.hours := NULLIF(btrim(NEW.hours), '');
  NEW.species_allowed := NULLIF(btrim(NEW.species_allowed), '');
  NEW.pet_rules := NULLIF(btrim(NEW.pet_rules), '');
  NEW.description := NULLIF(btrim(NEW.description), '');
  NEW.photo_url := NULLIF(btrim(NEW.photo_url), '');
  NEW.source := btrim(NEW.source);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

ALTER FUNCTION place_private.normalize_place_row() OWNER TO postgres;
REVOKE ALL ON FUNCTION place_private.normalize_place_row()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_pet_places_normalize
BEFORE INSERT OR UPDATE ON public.pet_places
FOR EACH ROW
EXECUTE FUNCTION place_private.normalize_place_row();

ALTER TABLE public.pet_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lugares publicos" ON public.pet_places;

CREATE POLICY pet_places_read_active
ON public.pet_places
FOR SELECT
TO anon, authenticated
USING (status = 'active');

REVOKE ALL ON TABLE public.pet_places FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.pet_places TO anon, authenticated;
GRANT ALL ON TABLE public.pet_places TO service_role;

-- ---------------------------------------------------------------------------
-- Private check-in source of truth
-- ---------------------------------------------------------------------------

CREATE TABLE public.pet_place_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL
    REFERENCES public.pet_places(id) ON DELETE RESTRICT,
  pet_id uuid NOT NULL
    REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  visible boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  ended_at timestamptz,
  CONSTRAINT pet_place_checkins_expiry_after_start
    CHECK (expires_at > checked_in_at),
  CONSTRAINT pet_place_checkins_end_after_start
    CHECK (ended_at IS NULL OR ended_at >= checked_in_at)
);

CREATE UNIQUE INDEX pet_place_checkins_one_open_per_pet_idx
  ON public.pet_place_checkins (pet_id)
  WHERE ended_at IS NULL;

CREATE INDEX pet_place_checkins_pet_history_idx
  ON public.pet_place_checkins (pet_id, checked_in_at DESC);

CREATE INDEX pet_place_checkins_place_idx
  ON public.pet_place_checkins (place_id, checked_in_at DESC);

CREATE INDEX pet_place_checkins_user_idx
  ON public.pet_place_checkins (user_id, checked_in_at DESC);

-- ---------------------------------------------------------------------------
-- Privacy-safe public presence projection
-- ---------------------------------------------------------------------------

CREATE TABLE public.pet_place_presence (
  checkin_id uuid PRIMARY KEY
    REFERENCES public.pet_place_checkins(id) ON DELETE CASCADE,
  place_id uuid NOT NULL
    REFERENCES public.pet_places(id) ON DELETE CASCADE,
  visible_pet_id uuid
    REFERENCES public.pets(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX pet_place_presence_place_expiry_idx
  ON public.pet_place_presence (place_id, expires_at);

CREATE INDEX pet_place_presence_visible_pet_idx
  ON public.pet_place_presence (visible_pet_id);

CREATE OR REPLACE FUNCTION place_private.prepare_checkin_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Lock the pet row so two concurrent check-ins for the same pet serialize.
  PERFORM 1
  FROM public.pets p
  WHERE p.id = NEW.pet_id
    AND p.owner_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La mascota no pertenece al usuario autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pet_places pp
    WHERE pp.id = NEW.place_id
      AND pp.status = 'active'
  ) THEN
    RAISE EXCEPTION 'El lugar no está disponible.';
  END IF;

  -- Any previous open row (even naturally expired) becomes closed.
  UPDATE public.pet_place_checkins
  SET ended_at = now()
  WHERE pet_id = NEW.pet_id
    AND ended_at IS NULL;

  NEW.user_id := v_user_id;
  NEW.checked_in_at := now();
  NEW.expires_at := NEW.checked_in_at + interval '2 hours';
  NEW.ended_at := NULL;
  NEW.visible := COALESCE(NEW.visible, false);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION place_private.normalize_checkin_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  -- If the client requests checkout, the server owns the actual timestamp.
  IF OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN
    NEW.ended_at := now();
  END IF;

  -- An ended check-in cannot be reopened through UPDATE.
  IF OLD.ended_at IS NOT NULL THEN
    NEW.ended_at := OLD.ended_at;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION place_private.sync_place_presence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_checkin_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.pet_place_presence
    WHERE checkin_id = OLD.id;
    RETURN OLD;
  END IF;

  v_checkin_id := NEW.id;

  IF NEW.ended_at IS NOT NULL THEN
    DELETE FROM public.pet_place_presence
    WHERE checkin_id = v_checkin_id;
    RETURN NEW;
  END IF;

  INSERT INTO public.pet_place_presence (
    checkin_id,
    place_id,
    visible_pet_id,
    expires_at
  )
  VALUES (
    NEW.id,
    NEW.place_id,
    CASE WHEN NEW.visible THEN NEW.pet_id ELSE NULL END,
    NEW.expires_at
  )
  ON CONFLICT (checkin_id)
  DO UPDATE SET
    place_id = EXCLUDED.place_id,
    visible_pet_id = EXCLUDED.visible_pet_id,
    expires_at = EXCLUDED.expires_at;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION place_private.prepare_checkin_insert() OWNER TO postgres;
ALTER FUNCTION place_private.normalize_checkin_update() OWNER TO postgres;
ALTER FUNCTION place_private.sync_place_presence() OWNER TO postgres;

REVOKE ALL ON FUNCTION place_private.prepare_checkin_insert()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION place_private.normalize_checkin_update()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION place_private.sync_place_presence()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_pet_place_checkins_prepare_insert
BEFORE INSERT ON public.pet_place_checkins
FOR EACH ROW
EXECUTE FUNCTION place_private.prepare_checkin_insert();

CREATE TRIGGER trg_pet_place_checkins_normalize_update
BEFORE UPDATE ON public.pet_place_checkins
FOR EACH ROW
EXECUTE FUNCTION place_private.normalize_checkin_update();

CREATE TRIGGER trg_pet_place_checkins_sync_presence
AFTER INSERT OR UPDATE OR DELETE ON public.pet_place_checkins
FOR EACH ROW
EXECUTE FUNCTION place_private.sync_place_presence();

ALTER TABLE public.pet_place_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_place_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY pet_place_checkins_read_own_active
ON public.pet_place_checkins
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND ended_at IS NULL
  AND expires_at > now()
);

CREATE POLICY pet_place_checkins_insert_own_pet
ON public.pet_place_checkins
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.id = pet_place_checkins.pet_id
      AND p.owner_id = (SELECT auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.pet_places pp
    WHERE pp.id = pet_place_checkins.place_id
      AND pp.status = 'active'
  )
);

CREATE POLICY pet_place_checkins_update_own_active
ON public.pet_place_checkins
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND ended_at IS NULL
  AND expires_at > now()
)
WITH CHECK (
  user_id = (SELECT auth.uid())
);

CREATE POLICY pet_place_presence_read_active
ON public.pet_place_presence
FOR SELECT
TO authenticated
USING (
  expires_at > now()
  AND EXISTS (
    SELECT 1
    FROM public.pet_places pp
    WHERE pp.id = pet_place_presence.place_id
      AND pp.status = 'active'
  )
);

REVOKE ALL ON TABLE public.pet_place_checkins
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.pet_place_presence
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.pet_place_checkins TO authenticated;
GRANT INSERT (place_id, pet_id, visible)
  ON TABLE public.pet_place_checkins TO authenticated;
GRANT UPDATE (visible, ended_at)
  ON TABLE public.pet_place_checkins TO authenticated;

GRANT SELECT ON TABLE public.pet_place_presence TO authenticated;

GRANT ALL ON TABLE public.pet_place_checkins TO service_role;
GRANT ALL ON TABLE public.pet_place_presence TO service_role;

-- ---------------------------------------------------------------------------
-- User-submitted place suggestions
-- ---------------------------------------------------------------------------

CREATE TABLE public.place_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  address text NOT NULL,
  zone text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT place_suggestions_category_allowed
    CHECK (
      category IN (
        'park',
        'trail',
        'food',
        'veterinary',
        'grooming',
        'pet_store'
      )
    ),
  CONSTRAINT place_suggestions_status_allowed
    CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT place_suggestions_name_length
    CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  CONSTRAINT place_suggestions_address_length
    CHECK (char_length(btrim(address)) BETWEEN 3 AND 300),
  CONSTRAINT place_suggestions_zone_length
    CHECK (zone IS NULL OR char_length(btrim(zone)) <= 120),
  CONSTRAINT place_suggestions_note_length
    CHECK (note IS NULL OR char_length(btrim(note)) <= 1000)
);

CREATE INDEX place_suggestions_submitter_idx
  ON public.place_suggestions (submitter_user_id, created_at DESC);

CREATE INDEX place_suggestions_status_idx
  ON public.place_suggestions (status, created_at);

CREATE OR REPLACE FUNCTION place_private.normalize_place_suggestion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.name := btrim(NEW.name);
  NEW.category := btrim(NEW.category);
  NEW.address := btrim(NEW.address);
  NEW.zone := NULLIF(btrim(NEW.zone), '');
  NEW.note := NULLIF(btrim(NEW.note), '');
  NEW.submitter_user_id := auth.uid();
  NEW.status := 'pending';
  RETURN NEW;
END;
$function$;

ALTER FUNCTION place_private.normalize_place_suggestion() OWNER TO postgres;
REVOKE ALL ON FUNCTION place_private.normalize_place_suggestion()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_place_suggestions_normalize
BEFORE INSERT ON public.place_suggestions
FOR EACH ROW
EXECUTE FUNCTION place_private.normalize_place_suggestion();

ALTER TABLE public.place_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY place_suggestions_insert_self
ON public.place_suggestions
FOR INSERT
TO authenticated
WITH CHECK (
  submitter_user_id = (SELECT auth.uid())
  AND status = 'pending'
);

REVOKE ALL ON TABLE public.place_suggestions
  FROM PUBLIC, anon, authenticated;

GRANT INSERT (name, category, address, zone, note)
  ON TABLE public.place_suggestions TO authenticated;

GRANT ALL ON TABLE public.place_suggestions TO service_role;

-- ---------------------------------------------------------------------------
-- Minimal privacy-safe product telemetry
-- ---------------------------------------------------------------------------

CREATE TABLE public.place_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  event_type text NOT NULL,
  place_id uuid
    REFERENCES public.pet_places(id) ON DELETE SET NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT place_usage_events_type_allowed
    CHECK (
      event_type IN (
        'map_open',
        'use_location',
        'place_open',
        'search',
        'filter'
      )
    ),
  CONSTRAINT place_usage_events_category_allowed
    CHECK (
      category IS NULL
      OR category IN (
        'park',
        'trail',
        'food',
        'veterinary',
        'grooming',
        'pet_store'
      )
    )
);

CREATE UNIQUE INDEX place_usage_events_map_open_session_idx
  ON public.place_usage_events (user_id, session_id, event_type)
  WHERE event_type = 'map_open';

CREATE INDEX place_usage_events_user_created_idx
  ON public.place_usage_events (user_id, created_at DESC);

CREATE INDEX place_usage_events_place_idx
  ON public.place_usage_events (place_id, created_at DESC);

ALTER TABLE public.place_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY place_usage_events_insert_self
ON public.place_usage_events
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
);

REVOKE ALL ON TABLE public.place_usage_events
  FROM PUBLIC, anon, authenticated;

GRANT INSERT (session_id, event_type, place_id, category)
  ON TABLE public.place_usage_events TO authenticated;

GRANT ALL ON TABLE public.place_usage_events TO service_role;
