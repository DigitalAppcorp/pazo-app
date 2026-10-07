BEGIN;

-- =============================================================================
-- PAZO — Generic module validation instrumentation
-- First consumer: Communities
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS validation_private;
REVOKE ALL ON SCHEMA validation_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA validation_private TO service_role;

CREATE TABLE validation_private.modules (
  module_key text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT validation_module_key_format
    CHECK (module_key ~ '^[a-z0-9_]{2,64}$')
);

CREATE TABLE validation_private.intent_options (
  module_key text NOT NULL
    REFERENCES validation_private.modules(module_key) ON DELETE CASCADE,
  intent_key text NOT NULL,
  sort_order smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (module_key, intent_key),
  CONSTRAINT validation_intent_key_format
    CHECK (intent_key ~ '^[a-z0-9_]{2,64}$'),
  CONSTRAINT validation_intent_sort_order_positive
    CHECK (sort_order > 0)
);

REVOKE ALL ON TABLE validation_private.modules
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE validation_private.intent_options
  FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE validation_private.modules TO service_role;
GRANT ALL ON TABLE validation_private.intent_options TO service_role;

INSERT INTO validation_private.modules (module_key)
VALUES ('communities')
ON CONFLICT (module_key) DO NOTHING;

INSERT INTO validation_private.intent_options (
  module_key,
  intent_key,
  sort_order
)
VALUES
  ('communities', 'similar_people_pets', 1),
  ('communities', 'advice', 2),
  ('communities', 'plans_events_challenges', 3),
  ('communities', 'create_grow_community', 4),
  ('communities', 'recognition_badges', 5),
  ('communities', 'other', 6)
ON CONFLICT (module_key, intent_key)
DO UPDATE SET sort_order = EXCLUDED.sort_order;

CREATE TABLE public.module_validation_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL
    REFERENCES validation_private.modules(module_key) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT module_validation_views_source_format
    CHECK (source ~ '^[a-z0-9_]{2,64}$'),
  CONSTRAINT module_validation_views_unique_session
    UNIQUE (user_id, module_key, session_id)
);

CREATE TABLE public.module_validation_interests (
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL
    REFERENCES validation_private.modules(module_key) ON DELETE RESTRICT,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_key),
  CONSTRAINT module_validation_interests_source_format
    CHECK (source ~ '^[a-z0-9_]{2,64}$')
);

CREATE TABLE public.module_validation_intents (
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  intent_key text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_key),
  CONSTRAINT module_validation_intents_interest_fk
    FOREIGN KEY (user_id, module_key)
    REFERENCES public.module_validation_interests(user_id, module_key)
    ON DELETE CASCADE,
  CONSTRAINT module_validation_intents_option_fk
    FOREIGN KEY (module_key, intent_key)
    REFERENCES validation_private.intent_options(module_key, intent_key)
    ON DELETE RESTRICT,
  CONSTRAINT module_validation_intents_source_format
    CHECK (source ~ '^[a-z0-9_]{2,64}$')
);

CREATE INDEX idx_module_validation_views_module_created
  ON public.module_validation_views (module_key, created_at DESC);

CREATE INDEX idx_module_validation_interests_module_created
  ON public.module_validation_interests (module_key, created_at DESC);

CREATE INDEX idx_module_validation_intents_module_intent
  ON public.module_validation_intents (module_key, intent_key);

ALTER TABLE public.module_validation_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_validation_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_validation_intents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.module_validation_views
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.module_validation_interests
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.module_validation_intents
  FROM PUBLIC, anon, authenticated;

GRANT INSERT (module_key, session_id, source)
  ON TABLE public.module_validation_views
  TO authenticated;

GRANT SELECT
  ON TABLE public.module_validation_interests
  TO authenticated;
GRANT INSERT (module_key, source)
  ON TABLE public.module_validation_interests
  TO authenticated;

GRANT SELECT
  ON TABLE public.module_validation_intents
  TO authenticated;
GRANT INSERT (module_key, intent_key, source)
  ON TABLE public.module_validation_intents
  TO authenticated;
GRANT UPDATE (intent_key, source)
  ON TABLE public.module_validation_intents
  TO authenticated;

GRANT ALL ON TABLE public.module_validation_views TO service_role;
GRANT ALL ON TABLE public.module_validation_interests TO service_role;
GRANT ALL ON TABLE public.module_validation_intents TO service_role;

CREATE POLICY module_validation_views_insert_own
ON public.module_validation_views
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
);

CREATE POLICY module_validation_interests_select_own
ON public.module_validation_interests
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

CREATE POLICY module_validation_interests_insert_own
ON public.module_validation_interests
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
);

CREATE POLICY module_validation_intents_select_own
ON public.module_validation_intents
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

CREATE POLICY module_validation_intents_insert_own
ON public.module_validation_intents
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
);

CREATE POLICY module_validation_intents_update_own
ON public.module_validation_intents
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
);

CREATE OR REPLACE FUNCTION validation_private.touch_validation_intent_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

ALTER FUNCTION validation_private.touch_validation_intent_updated_at()
  OWNER TO postgres;
REVOKE ALL ON FUNCTION validation_private.touch_validation_intent_updated_at()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_module_validation_intents_updated_at
BEFORE UPDATE ON public.module_validation_intents
FOR EACH ROW
EXECUTE FUNCTION validation_private.touch_validation_intent_updated_at();

COMMIT;
