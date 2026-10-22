-- Validate hosted audit candidate in disposable PG17 only, in rollback transaction.
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE one jsonb; replay jsonb; wrong jsonb; n int;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'disposable only'; END IF;
 IF has_table_privilege('anon','supporter_private.p28_historical_read_audit','SELECT')
  OR has_table_privilege('authenticated','supporter_private.p28_historical_read_audit','INSERT')
  OR has_table_privilege('service_role','supporter_private.p28_historical_read_audit','INSERT')
  OR has_function_privilege('authenticated','public.f16_p28_draft_ack_historical_audit(uuid,text)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.f16_p28_draft_ack_historical_audit(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'audit grants unsafe'; END IF;
 one:=public.f16_p28_draft_ack_historical_audit('11111111-1111-4111-8111-111111111111','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
 replay:=public.f16_p28_draft_ack_historical_audit('11111111-1111-4111-8111-111111111111','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
 wrong:=public.f16_p28_draft_ack_historical_audit('22222222-2222-4222-8222-222222222222','invalid');
 SELECT count(*) INTO n FROM supporter_private.p28_historical_read_audit;
 IF one->>'persisted'<>'true' OR replay IS NOT NULL OR wrong IS NOT NULL OR n<>1
 THEN RAISE EXCEPTION 'audit insert/replay/validation failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.p28_historical_read_audit
  WHERE request_id='11111111-1111-4111-8111-111111111111'
  AND event_fingerprint='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
 THEN RAISE EXCEPTION 'audit fingerprint mutated by replay'; END IF;
END $$;
ROLLBACK;
