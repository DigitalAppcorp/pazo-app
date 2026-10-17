-- P28 executable lab verification. Run ONLY after applying guarded draft in disposable f14_synthetic DB.
\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin' THEN
  RAISE EXCEPTION 'P28 lab only';
 END IF;
 IF has_table_privilege('authenticated','supporter_private.p28_historical_read_audit','SELECT')
 OR has_table_privilege('anon','supporter_private.p28_historical_read_audit','INSERT')
 OR has_table_privilege('service_role','supporter_private.p28_historical_read_audit','INSERT')
 OR has_function_privilege('authenticated','public.f16_p28_draft_ack_historical_audit(uuid)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.f16_p28_draft_ack_historical_audit(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'P28 audit grants violation'; END IF;
END $$;
DO $$
DECLARE first jsonb;duplicate jsonb; second jsonb; ct int;
BEGIN
 first:=public.f16_p28_draft_ack_historical_audit('11111111-1111-4111-8111-111111111111'::uuid);
 duplicate:=public.f16_p28_draft_ack_historical_audit('11111111-1111-4111-8111-111111111111'::uuid);
 second:=public.f16_p28_draft_ack_historical_audit('22222222-2222-4222-8222-222222222222'::uuid);
 SELECT count(*) INTO ct FROM supporter_private.p28_historical_read_audit;
 IF first->>'persisted'<>'true' OR duplicate IS NOT NULL OR
 second->>'persisted'<>'true' OR ct<>2 THEN
  RAISE EXCEPTION 'P28 audit persistence/idempotency test failed';
 END IF;
 IF (SELECT count(*) FROM information_schema.columns
 WHERE table_schema='supporter_private' AND table_name='p28_historical_read_audit')<>3 THEN
  RAISE EXCEPTION 'P28 audit minimization failed';
 END IF;
END $$;
ROLLBACK;
