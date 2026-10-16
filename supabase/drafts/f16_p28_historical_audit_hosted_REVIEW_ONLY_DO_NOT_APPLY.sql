-- PAZO F16-P28: HOSTED REVIEW CANDIDATE. NOT AUTHORIZED TO APPLY.
-- Adapted from PG17-only rehearsal. Installs ONLY an isolated minimal audit log.
-- Does not install historical metadata reader, activate worker, or grant benefits.
BEGIN;
DO $preflight$
BEGIN
 IF to_regnamespace('supporter_private') IS NULL THEN
  RAISE EXCEPTION 'missing private schema';
 END IF;
 IF to_regclass('supporter_private.p28_historical_read_audit') IS NOT NULL
 OR to_regprocedure('public.f16_p28_draft_ack_historical_audit(uuid)') IS NOT NULL THEN
  RAISE EXCEPTION 'existing P28 audit object, manual reconciliation required';
 END IF;
END
$preflight$;
CREATE TABLE supporter_private.p28_historical_read_audit (
 request_id uuid PRIMARY KEY,
 action text NOT NULL DEFAULT 'historical_candidate_exact_read'
   CHECK(action='historical_candidate_exact_read'),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
ALTER TABLE supporter_private.p28_historical_read_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.p28_historical_read_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supporter_private.p28_historical_read_audit
 FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.f16_p28_draft_ack_historical_audit(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 IF p_request_id IS NULL THEN RETURN NULL; END IF;
 INSERT INTO supporter_private.p28_historical_read_audit(request_id)
 VALUES(p_request_id) ON CONFLICT(request_id) DO NOTHING;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN pg_catalog.jsonb_build_object('persisted',true,'requestId',p_request_id);
END
$fn$;
REVOKE ALL ON FUNCTION public.f16_p28_draft_ack_historical_audit(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p28_draft_ack_historical_audit(uuid)
 TO service_role;
COMMIT;
