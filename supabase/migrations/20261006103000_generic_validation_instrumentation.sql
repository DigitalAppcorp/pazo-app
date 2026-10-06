BEGIN;

-- -----------------------------------------------------------------------------
-- Generic validation instrumentation
-- -----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS validation_private;
REVOKE ALL ON SCHEMA validation_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA validation_private TO authenticated, service_role;

CREATE TABLE validation_private.module_configs (
  module_key text PRIMARY KEY,
  allowed_intents text[] NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT module_configs_key_check
    CHECK (module_key ~ '^[a-z0-9_]{2,64}$')
);

REVOKE ALL ON TABLE validation_private.module_configs
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE validation_private.module_configs TO service_role;

INSERT INTO validation_private.module_configs (
  module_key,
  allowed_intents,
  active
)
VALUES
  (
    'communities',
    ARRAY[
      'local_people_pets',
      'species_breed_groups',
      'create_community',
      'meetups',
      'advice',
      'other'
    ]::text[],
    true
  ),
  (
    'map_radar',
    ARRAY[
      'pet_friendly_parks',
      'vets_services',
      'pet_friendly_food',
      'nearby_people_pets',
      'check_ins',
      'other'
    ]::text[],
    true
  )
ON CONFLICT (module_key)
DO UPDATE SET
  allowed_intents = EXCLUDED.allowed_intents,
  active = EXCLUDED.active,
  updated_at = now();

CREATE TABLE public.module_validation_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  signal_type text NOT NULL,
  intent_key text,
  session_id uuid NOT NULL,
  source text,
  active_pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT module_validation_module_key_check
    CHECK (module_key ~ '^[a-z0-9_]{2,64}$'),
  CONSTRAINT module_validation_signal_type_check
    CHECK (signal_type IN ('view', 'interest', 'intent')),
  CONSTRAINT module_validation_source_check
    CHECK (
      source IS NULL
      OR source ~ '^[a-z0-9_]{2,64}$'
    ),
  CONSTRAINT module_validation_intent_key_check
    CHECK (
      (signal_type IN ('view', 'interest') AND intent_key IS NULL)
      OR
      (
        signal_type = 'intent'
        AND intent_key IS NOT NULL
        AND intent_key ~ '^[a-z0-9_]{2,64}$'
      )
    )
);

CREATE UNIQUE INDEX uq_module_validation_view_session
  ON public.module_validation_signals (
    user_id,
    module_key,
    session_id
  )
  WHERE signal_type = 'view';

CREATE UNIQUE INDEX uq_module_validation_interest
  ON public.module_validation_signals (
    user_id,
    module_key
  )
  WHERE signal_type = 'interest';

CREATE UNIQUE INDEX uq_module_validation_intent
  ON public.module_validation_signals (
    user_id,
    module_key
  )
  WHERE signal_type = 'intent';

CREATE INDEX idx_module_validation_module_type_created
  ON public.module_validation_signals (
    module_key,
    signal_type,
    created_at DESC
  );

ALTER TABLE public.module_validation_signals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.module_validation_signals
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.module_validation_signals TO service_role;

-- -----------------------------------------------------------------------------
-- Shared validation
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validation_private.require_validation_context(
  p_module_key text,
  p_intent_key text DEFAULT NULL,
  p_active_pet_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_allowed_intents text[];
  v_active boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT c.allowed_intents, c.active
  INTO v_allowed_intents, v_active
  FROM validation_private.module_configs c
  WHERE c.module_key = p_module_key;

  IF NOT FOUND OR NOT v_active THEN
    RAISE EXCEPTION 'Unknown or inactive validation module.';
  END IF;

  IF p_intent_key IS NOT NULL
     AND NOT (p_intent_key = ANY (v_allowed_intents)) THEN
    RAISE EXCEPTION 'Unsupported validation intent.';
  END IF;

  IF p_active_pet_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.pets p
       WHERE p.id = p_active_pet_id
         AND p.owner_id = v_user_id
     ) THEN
    RAISE EXCEPTION 'Active pet is not owned by authenticated user.';
  END IF;

  RETURN v_user_id;
END;
$function$;

ALTER FUNCTION validation_private.require_validation_context(text, text, uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION validation_private.require_validation_context(text, text, uuid)
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Internal privileged writers/readers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validation_private.record_module_validation_view_internal(
  p_module_key text,
  p_session_id uuid,
  p_source text,
  p_active_pet_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'Validation session is required.';
  END IF;

  IF p_source IS NOT NULL
     AND p_source !~ '^[a-z0-9_]{2,64}$' THEN
    RAISE EXCEPTION 'Invalid validation source.';
  END IF;

  v_user_id :=
    validation_private.require_validation_context(
      p_module_key,
      NULL,
      p_active_pet_id
    );

  INSERT INTO public.module_validation_signals (
    user_id,
    module_key,
    signal_type,
    intent_key,
    session_id,
    source,
    active_pet_id
  )
  VALUES (
    v_user_id,
    p_module_key,
    'view',
    NULL,
    p_session_id,
    p_source,
    p_active_pet_id
  )
  ON CONFLICT (user_id, module_key, session_id)
    WHERE signal_type = 'view'
  DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION validation_private.record_module_validation_interest_internal(
  p_module_key text,
  p_session_id uuid,
  p_source text,
  p_active_pet_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'Validation session is required.';
  END IF;

  IF p_source IS NOT NULL
     AND p_source !~ '^[a-z0-9_]{2,64}$' THEN
    RAISE EXCEPTION 'Invalid validation source.';
  END IF;

  v_user_id :=
    validation_private.require_validation_context(
      p_module_key,
      NULL,
      p_active_pet_id
    );

  INSERT INTO public.module_validation_signals (
    user_id,
    module_key,
    signal_type,
    intent_key,
    session_id,
    source,
    active_pet_id
  )
  VALUES (
    v_user_id,
    p_module_key,
    'interest',
    NULL,
    p_session_id,
    p_source,
    p_active_pet_id
  )
  ON CONFLICT (user_id, module_key)
    WHERE signal_type = 'interest'
  DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION validation_private.save_module_validation_intent_internal(
  p_module_key text,
  p_intent_key text,
  p_session_id uuid,
  p_source text,
  p_active_pet_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'Validation session is required.';
  END IF;

  IF p_source IS NOT NULL
     AND p_source !~ '^[a-z0-9_]{2,64}$' THEN
    RAISE EXCEPTION 'Invalid validation source.';
  END IF;

  v_user_id :=
    validation_private.require_validation_context(
      p_module_key,
      p_intent_key,
      p_active_pet_id
    );

  IF NOT EXISTS (
    SELECT 1
    FROM public.module_validation_signals s
    WHERE s.user_id = v_user_id
      AND s.module_key = p_module_key
      AND s.signal_type = 'interest'
  ) THEN
    RAISE EXCEPTION 'Interest must be recorded before intent.';
  END IF;

  INSERT INTO public.module_validation_signals (
    user_id,
    module_key,
    signal_type,
    intent_key,
    session_id,
    source,
    active_pet_id
  )
  VALUES (
    v_user_id,
    p_module_key,
    'intent',
    p_intent_key,
    p_session_id,
    p_source,
    p_active_pet_id
  )
  ON CONFLICT (user_id, module_key)
    WHERE signal_type = 'intent'
  DO UPDATE SET
    intent_key = EXCLUDED.intent_key,
    session_id = EXCLUDED.session_id,
    source = EXCLUDED.source,
    active_pet_id = EXCLUDED.active_pet_id,
    updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION validation_private.get_my_module_validation_state_internal(
  p_module_key text
)
RETURNS TABLE (
  interested boolean,
  intent_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id :=
    validation_private.require_validation_context(
      p_module_key,
      NULL,
      NULL
    );

  RETURN QUERY
  SELECT
    EXISTS (
      SELECT 1
      FROM public.module_validation_signals s
      WHERE s.user_id = v_user_id
        AND s.module_key = p_module_key
        AND s.signal_type = 'interest'
    ),
    (
      SELECT s.intent_key
      FROM public.module_validation_signals s
      WHERE s.user_id = v_user_id
        AND s.module_key = p_module_key
        AND s.signal_type = 'intent'
      LIMIT 1
    );
END;
$function$;

ALTER FUNCTION validation_private.record_module_validation_view_internal(text, uuid, text, uuid)
  OWNER TO postgres;
ALTER FUNCTION validation_private.record_module_validation_interest_internal(text, uuid, text, uuid)
  OWNER TO postgres;
ALTER FUNCTION validation_private.save_module_validation_intent_internal(text, text, uuid, text, uuid)
  OWNER TO postgres;
ALTER FUNCTION validation_private.get_my_module_validation_state_internal(text)
  OWNER TO postgres;

REVOKE ALL ON FUNCTION validation_private.record_module_validation_view_internal(text, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION validation_private.record_module_validation_interest_internal(text, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION validation_private.save_module_validation_intent_internal(text, text, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION validation_private.get_my_module_validation_state_internal(text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION validation_private.record_module_validation_view_internal(text, uuid, text, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION validation_private.record_module_validation_interest_internal(text, uuid, text, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION validation_private.save_module_validation_intent_internal(text, text, uuid, text, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION validation_private.get_my_module_validation_state_internal(text)
  TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Public SECURITY INVOKER wrappers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_module_validation_view(
  p_module_key text,
  p_session_id uuid,
  p_source text,
  p_active_pet_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT validation_private.record_module_validation_view_internal(
    p_module_key,
    p_session_id,
    p_source,
    p_active_pet_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.record_module_validation_interest(
  p_module_key text,
  p_session_id uuid,
  p_source text,
  p_active_pet_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT validation_private.record_module_validation_interest_internal(
    p_module_key,
    p_session_id,
    p_source,
    p_active_pet_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.save_module_validation_intent(
  p_module_key text,
  p_intent_key text,
  p_session_id uuid,
  p_source text,
  p_active_pet_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT validation_private.save_module_validation_intent_internal(
    p_module_key,
    p_intent_key,
    p_session_id,
    p_source,
    p_active_pet_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_my_module_validation_state(
  p_module_key text
)
RETURNS TABLE (
  interested boolean,
  intent_key text
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT *
  FROM validation_private.get_my_module_validation_state_internal(
    p_module_key
  );
$function$;

ALTER FUNCTION public.record_module_validation_view(text, uuid, text, uuid)
  OWNER TO postgres;
ALTER FUNCTION public.record_module_validation_interest(text, uuid, text, uuid)
  OWNER TO postgres;
ALTER FUNCTION public.save_module_validation_intent(text, text, uuid, text, uuid)
  OWNER TO postgres;
ALTER FUNCTION public.get_my_module_validation_state(text)
  OWNER TO postgres;

REVOKE ALL ON FUNCTION public.record_module_validation_view(text, uuid, text, uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_module_validation_interest(text, uuid, text, uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_module_validation_intent(text, text, uuid, text, uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_module_validation_state(text)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_module_validation_view(text, uuid, text, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_module_validation_interest(text, uuid, text, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_module_validation_intent(text, text, uuid, text, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_module_validation_state(text)
  TO authenticated;

COMMIT;
