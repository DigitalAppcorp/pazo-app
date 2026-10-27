-- Issue130 live provider accepted a replay. Enforce single use independently.
-- Persist only an irreversible SHA-256 digest for abuse protection, never the
-- challenge, IP, account, URL or provider secret. Logical expiry is five minutes.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE marketing_private.challenge_uses(
 digest text PRIMARY KEY CHECK(digest ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL DEFAULT(statement_timestamp()+interval '5 minutes')
);
CREATE INDEX marketing_challenge_expiry ON marketing_private.challenge_uses(expires_at);
ALTER TABLE marketing_private.challenge_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.challenge_uses FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.challenge_uses FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.pazo_marketing_claim_challenge_v1(p_digest text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_digest IS NULL OR p_digest !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
 IF NOT pg_try_advisory_xact_lock(170096,3) THEN RETURN false; END IF;
 DELETE FROM marketing_private.challenge_uses WHERE expires_at<=statement_timestamp();
 IF (SELECT count(*) FROM marketing_private.challenge_uses)>=2048 THEN RETURN false; END IF;
 INSERT INTO marketing_private.challenge_uses(digest) VALUES(p_digest) ON CONFLICT DO NOTHING;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.pazo_marketing_claim_challenge_v1(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_marketing_claim_challenge_v1(text) TO service_role;
-- Existing six-hour purge also removes security digests, including with intake OFF.
-- Do not alter the named Cron, financial jobs or retention health contract.
DO $guard$ BEGIN
 IF md5(pg_get_functiondef('public.pazo_marketing_prune_all_v1()'::regprocedure))<>'8fe6011b677d8b9d3bbb4fd4ed4e0042'
 THEN RAISE EXCEPTION 'Marketing prune baseline differs'; END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.pazo_marketing_prune_all_v1() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE a integer;l integer;days smallint;version text;
BEGIN
 IF NOT pg_try_advisory_xact_lock(170096,1) THEN
  RETURN jsonb_build_object('status','busy','acquisition_removed',0,'aggregate_or_window_rows_removed',0);END IF;
 SELECT g.retention_days,g.policy_version INTO days,version FROM marketing_private.collection_gate g WHERE singleton FOR SHARE;
 a:=marketing_private.prune_expired();l:=public.pazo_marketing_prune_landing_v1();
 DELETE FROM marketing_private.challenge_uses WHERE expires_at<=statement_timestamp();
 UPDATE marketing_private.retention_runtime SET last_success_at=statement_timestamp(),last_days=days,last_policy=version,
  acquisitions_removed=a,aggregate_or_window_rows_removed=l WHERE singleton;
 RETURN jsonb_build_object('status','pruned','acquisition_removed',a,'aggregate_or_window_rows_removed',l);
END $$;
COMMIT;
