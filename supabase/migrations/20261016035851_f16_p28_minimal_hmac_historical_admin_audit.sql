DO $preflight$ BEGIN IF to_regnamespace('supporter_private') IS NULL OR to_regclass('supporter_private.p28_historical_read_audit') IS NOT NULL OR to_regprocedure('public.f16_p28_draft_ack_historical_audit(uuid,text)') IS NOT NULL THEN RAISE EXCEPTION 'P28 audit preflight mismatch'; END IF; END $preflight$;
CREATE TABLE supporter_private.p28_historical_read_audit (
 request_id uuid PRIMARY KEY,
 event_fingerprint text NOT NULL CHECK (event_fingerprint ~ '^[0-9a-f]{64}$'),
 action text NOT NULL DEFAULT 'historical_candidate_exact_read' CHECK (action='historical_candidate_exact_read'),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
ALTER TABLE supporter_private.p28_historical_read_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.p28_historical_read_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.p28_historical_read_audit FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.f16_p28_draft_ack_historical_audit(p_request_id uuid,p_event_fingerprint text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$ BEGIN
 IF p_request_id IS NULL OR p_event_fingerprint IS NULL OR p_event_fingerprint !~ '^[0-9a-f]{64}$' THEN RETURN NULL; END IF;
 INSERT INTO supporter_private.p28_historical_read_audit(request_id,event_fingerprint)
 VALUES(p_request_id,p_event_fingerprint) ON CONFLICT(request_id) DO NOTHING;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN pg_catalog.jsonb_build_object('persisted',true,'requestId',p_request_id);
END $fn$;
REVOKE ALL ON FUNCTION public.f16_p28_draft_ack_historical_audit(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p28_draft_ack_historical_audit(uuid,text) TO service_role;