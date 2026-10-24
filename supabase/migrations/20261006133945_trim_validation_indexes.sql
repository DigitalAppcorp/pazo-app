BEGIN;

DROP INDEX IF EXISTS public.idx_module_validation_views_module_created;
DROP INDEX IF EXISTS public.idx_module_validation_intents_module_intent;

COMMIT;