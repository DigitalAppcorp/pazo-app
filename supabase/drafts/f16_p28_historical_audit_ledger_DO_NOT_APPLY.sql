-- P28 historical administrative audit, isolated PG17 lab draft.
-- DO NOT APPLY TO HOSTED. Does not install historical reader or enable payments.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'P28 audit synthetic-only' USING ERRCODE='42501';
 END IF;
END
$guard$;
CREATE TABLE supporter_private.p28_historical_read_audit (
 request_id uuid PRIMARY KEY,
 action text NOT NULL DEFAULT 'historical_candidate_exact_read'
  CHECK (action='historical_candidate_exact_read'),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
ALTER TABLE supporter_private.p28_historical_read_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.p28_historical_read_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.p28_historical_read_audit FROM PUBLIC,anon,authenticated,service_role;
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
GRANT EXECUTE ON FUNCTION public.f16_p28_draft_ack_historical_audit(uuid) TO service_role;
COMMIT;
