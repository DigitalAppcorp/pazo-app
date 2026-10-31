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
 lease_id uuid,
 leased_until timestamptz,
 CONSTRAINT meta_outbox_candidate_lease_check CHECK(
   (status='leased' AND leased_until IS NOT NULL AND lease_id IS NOT NULL)
   OR (status<>'leased' AND leased_until IS NULL AND lease_id IS NULL)
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


-- A worker can reserve only a verified, opt-in, non-QA event. Never send
-- delayed events after explicit withdrawal or after the event's freshness TTL.
-- No pre-existing acquisitions are automatically converted (claim above).
CREATE FUNCTION marketing_private.meta_send_eligible_candidate(p_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $policy$
 SELECT EXISTS (
   SELECT 1 FROM marketing_private.meta_outbox_candidate o
   JOIN marketing_private.meta_purpose_candidate p ON p.owner_id=o.owner_id
   JOIN marketing_private.acquisition a ON a.owner_id=o.owner_id
   JOIN marketing_private.collection_gate g ON g.singleton
   WHERE o.owner_id=p_owner
     AND g.enabled
     AND marketing_private.retention_ready(g.retention_days,g.policy_version)
     AND marketing_private.is_eligible_owner(o.owner_id)
     AND a.signup_verified_at=o.event_time
     AND o.event_time >= statement_timestamp()-interval '7 days'
     AND o.event_time<=statement_timestamp()
     AND p.purpose='meta_conversions_v1'
     AND p.version='pazo-meta-conversions-v1'
     AND p.decision='granted'
     AND p.withdrawn_at IS NULL
     AND p.gpc_at_last_request IS FALSE
     AND p.sharing_opt_out IS FALSE
     AND p.decided_at<=a.signup_verified_at
 )
$policy$;
REVOKE ALL ON FUNCTION marketing_private.meta_send_eligible_candidate(uuid)
 FROM PUBLIC,anon,authenticated,service_role;

-- FOR UPDATE SKIP LOCKED enforces a single current worker lease. Re-leasing
-- after transient failure reuses the SAME stored event_id. A distinct lease_id
-- fences late acknowledgements from earlier workers.
CREATE FUNCTION marketing_private.meta_lease_candidate()
RETURNS TABLE(owner_id uuid,event_id uuid,event_time timestamptz,lease_id uuid)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $lease$
 WITH chosen AS (
  SELECT o.owner_id
  FROM marketing_private.meta_outbox_candidate o
  WHERE (
    o.status IN('pending','retryable')
    OR (o.status='leased' AND o.leased_until<statement_timestamp())
   )
   AND o.attempts<4
   AND marketing_private.meta_send_eligible_candidate(o.owner_id)
  ORDER BY o.created_at,o.owner_id
  FOR UPDATE OF o SKIP LOCKED LIMIT 1
 )
 UPDATE marketing_private.meta_outbox_candidate o
 SET status='leased',attempts=o.attempts+1,
     lease_id=gen_random_uuid(),leased_until=statement_timestamp()+interval '2 minutes'
 FROM chosen c WHERE o.owner_id=c.owner_id
 RETURNING o.owner_id,o.event_id,o.event_time,o.lease_id
$lease$;
REVOKE ALL ON FUNCTION marketing_private.meta_lease_candidate()
 FROM PUBLIC,anon,authenticated,service_role;

-- Never allow an old lease to settle a re-leased event. A retryable event
-- remains eligible only under live privacy authorization when leased again.
CREATE FUNCTION marketing_private.meta_settle_candidate(
 p_event uuid,p_lease uuid,p_success boolean
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $settle$
BEGIN
 IF p_event IS NULL OR p_lease IS NULL OR p_success IS NULL
 THEN RETURN FALSE; END IF;
 UPDATE marketing_private.meta_outbox_candidate o
 SET status=CASE WHEN p_success THEN 'sent'
                 WHEN o.attempts>=4 THEN 'suppressed'
                 ELSE 'retryable' END,
     lease_id=NULL,leased_until=NULL
 WHERE o.event_id=p_event AND o.lease_id=p_lease AND o.status='leased'
   AND (NOT p_success OR marketing_private.meta_send_eligible_candidate(o.owner_id));
 RETURN FOUND;
END
$settle$;
REVOKE ALL ON FUNCTION marketing_private.meta_settle_candidate(uuid,uuid,boolean)
 FROM PUBLIC,anon,authenticated,service_role;

-- Bridge remains service_role ONLY, and MUST never be called directly from
-- an unverified browser/JWT. A future Edge service binds all access to trusted
-- Auth and an independently verified Meta-specific purpose decision.
CREATE FUNCTION public.pazo_meta_lease_candidate()
RETURNS TABLE(owner_id uuid,event_id uuid,event_time timestamptz,lease_id uuid)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $$ SELECT * FROM marketing_private.meta_lease_candidate() $$;
REVOKE ALL ON FUNCTION public.pazo_meta_lease_candidate()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_meta_lease_candidate() TO service_role;

CREATE FUNCTION public.pazo_meta_settle_candidate(
 p_event uuid,p_lease uuid,p_success boolean
) RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $$ SELECT marketing_private.meta_settle_candidate(p_event,p_lease,p_success) $$;
REVOKE ALL ON FUNCTION public.pazo_meta_settle_candidate(uuid,uuid,boolean)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_meta_settle_candidate(uuid,uuid,boolean)
 TO service_role;

COMMIT;
