BEGIN;

CREATE INDEX IF NOT EXISTS idx_module_validation_views_module_created
  ON public.module_validation_views (module_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_module_validation_intents_module_intent
  ON public.module_validation_intents (module_key, intent_key);

COMMIT;