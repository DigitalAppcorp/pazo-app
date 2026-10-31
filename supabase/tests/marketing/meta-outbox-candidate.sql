-- #169 EXPERIMENTAL / ISOLATED PG17 ONLY: NOT A DEPLOYABLE MIGRATION.
-- Do NOT apply to any hosted Supabase instance. Review privacy, UX and
-- outbox operational model before generating the approved migration via CLI.
-- Requires #168 contract migration and the existing marketing_private schema.
BEGIN;
SET LOCAL lock_timeout='5s';

-- A separate, specific grant is required before exchanging registration
-- signals with Meta. Absence of a row means NO GRANT.
-- This table is never user-queryable; an authenticated, trusted consent flow
-- must be designed and audited separately before enabling collection.
CREATE TABLE marketing_private.meta_purpose_candidate(
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK(purpose='meta_conversions_v1'),
  version text NOT NULL CHECK(version='pazo-meta-conversions-v1'),
  decision text NOT NULL CHECK(decision IN('granted','denied','withdrawn')),
  decided_at timestamptz NOT NULL,
  withdrawn_at timestamptz,
  gpc_at_last_request boolean NOT NULL DEFAULT true,
  sharing_opt_out boolean NOT NULL DEFAULT true,
  CONSTRAINT meta_purpose_candidate_consistency CHECK(
    (decision='granted' AND withdrawn_at IS NULL)
    OR (decision<>'granted')
  )
);
ALTER TABLE marketing_private.meta_purpose_candidate ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.meta_purpose_candidate FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.meta_purpose_candidate
 FROM PUBLIC,anon,authenticated,service_role;

-- Child of the existing 14-day attribution row: it is automatically erased
-- by existing marketing withdrawal, retention purge and account deletion.
-- The purpose/opt-out row above is separate and is retained as appropriate
-- for preference lifecycle; no automatic erasure of a denial by analytics TTL.
CREATE TABLE marketing_private.meta_outbox_candidate(
 owner_id uuid PRIMARY KEY REFERENCES marketing_private.acquisition(owner_id)
   ON DELETE CASCADE,
 event_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
 event_time timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 status text NOT NULL DEFAULT 'pending'
   CHECK(status IN('pending','leased','retryable','sent','suppressed')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 10),
 leased_until timestamptz,
 CONSTRAINT meta_outbox_candidate_lease_check CHECK(
   (status='leased' AND leased_until IS NOT NULL)
   OR (status<>'leased' AND leased_until IS NULL)
 )
);
ALTER TABLE marketing_private.meta_outbox_candidate ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.meta_outbox_candidate FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.meta_outbox_candidate
 FROM PUBLIC,anon,authenticated,service_role;

-- An event is minted only ONCE after a previously verified acquisition,
-- with prior specific permission. Opt-in after verification never backfills.
-- Neither account age nor an arbitrary browser boolean is the authority.
CREATE FUNCTION marketing_private.claim_meta_candidate(p_owner uuid)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $$
DECLARE v_event uuid;
BEGIN
 IF p_owner IS NULL OR NOT marketing_private.is_eligible_owner(p_owner)
    OR NOT EXISTS(
      SELECT 1 FROM marketing_private.collection_gate g
      WHERE g.singleton AND g.enabled
        AND marketing_private.retention_ready(g.retention_days,g.policy_version)
    ) THEN RETURN NULL; END IF;
 INSERT INTO marketing_private.meta_outbox_candidate(owner_id,event_time)
 SELECT a.owner_id,a.signup_verified_at
 FROM marketing_private.acquisition a
 JOIN marketing_private.meta_purpose_candidate p ON p.owner_id=a.owner_id
 WHERE a.owner_id=p_owner
   AND a.signup_verified_at<=statement_timestamp()
   AND a.signup_verified_at>=statement_timestamp()-interval '10 minutes'
   AND p.purpose='meta_conversions_v1'
   AND p.version='pazo-meta-conversions-v1'
   AND p.decision='granted'
   AND p.withdrawn_at IS NULL
   AND p.gpc_at_last_request IS FALSE
   AND p.sharing_opt_out IS FALSE
   AND p.decided_at<=a.signup_verified_at
 ON CONFLICT(owner_id) DO NOTHING
 RETURNING event_id INTO v_event;
 RETURN v_event;
END $$;
REVOKE ALL ON FUNCTION marketing_private.claim_meta_candidate(uuid)
 FROM PUBLIC,anon,authenticated,service_role;

-- Service-only adapter. Edge must independently authenticate the user and
-- bind p_owner to trusted Supabase Auth before invoking this bridge.
CREATE FUNCTION public.pazo_meta_claim_candidate(p_owner uuid)
RETURNS uuid LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $$ SELECT marketing_private.claim_meta_candidate(p_owner) $$;
REVOKE ALL ON FUNCTION public.pazo_meta_claim_candidate(uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_meta_claim_candidate(uuid)
 TO service_role;

COMMIT;
