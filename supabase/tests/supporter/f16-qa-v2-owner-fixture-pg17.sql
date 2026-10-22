-- Disposable PG17 fixture. Never apply to PAZO hosted.
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 OR to_regclass('supporter_private.paypal_p06_offers') IS NULL
 OR to_regclass('supporter_private.f16_sandbox_qa_owners') IS NOT NULL
 THEN RAISE EXCEPTION 'Disposable F16 V2 QA owner fixture only'; END IF;
END $guard$;
CREATE TABLE supporter_private.f16_sandbox_qa_owners (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id),
 status text NOT NULL CHECK(status IN ('enabled','disabled')),
 expires_at timestamptz NOT NULL
);
ALTER TABLE supporter_private.f16_sandbox_qa_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_sandbox_qa_owners FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.f16_sandbox_qa_owners FROM PUBLIC,anon,authenticated,service_role;
