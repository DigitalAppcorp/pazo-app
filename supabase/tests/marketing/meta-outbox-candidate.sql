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

-- Independent kill switch. New provider-conversion records are OFF even if
-- first-party PAZO acquisition is active and a consent record is present.
CREATE TABLE marketing_private.meta_release_gate_candidate(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false
);
INSERT INTO marketing_private.meta_release_gate_candidate(singleton,enabled)
 VALUES(true,false);
ALTER TABLE marketing_private.meta_release_gate_candidate ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.meta_release_gate_candidate FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.meta_release_gate_candidate
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
 -- Atomic browser claim: first eligible tab only. Does not change CAPI retry.
 pixel_receipt_claimed_at timestamptz,
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

-- A confirmed, first-party attributed signup can be added to Meta's
-- private outbox only in a deliberately short first-verified-session window.
-- The owner may choose the Meta purpose either just BEFORE first-party
-- acquisition is inserted or just AFTER it, while still recently verified.
-- NEVER convert old/historical signups or use signup_requested as proof.
CREATE FUNCTION marketing_private.meta_try_enqueue_candidate(p_owner uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $enqueue$
DECLARE v_event uuid;
BEGIN
 IF p_owner IS NULL OR NOT EXISTS(
   SELECT 1 FROM marketing_private.meta_release_gate_candidate g
   WHERE g.singleton AND g.enabled
 ) OR NOT marketing_private.is_eligible_owner(p_owner)
 THEN RETURN FALSE; END IF;

 INSERT INTO marketing_private.meta_outbox_candidate(owner_id,event_time)
 SELECT a.owner_id,a.signup_verified_at
 FROM marketing_private.acquisition a
 JOIN marketing_private.meta_purpose_candidate p ON p.owner_id=a.owner_id
 JOIN auth.users u ON u.id=a.owner_id
 WHERE a.owner_id=p_owner AND u.email_confirmed_at IS NOT NULL
   AND a.signup_verified_at=u.email_confirmed_at
   AND a.signup_verified_at<=statement_timestamp()
   AND a.signup_verified_at>=statement_timestamp()-interval '15 minutes'
   AND a.recorded_at<=statement_timestamp()+interval '5 seconds'
   AND a.recorded_at>=statement_timestamp()-interval '15 minutes'
   AND p.purpose='meta_conversions_v1'
   AND p.version='pazo-meta-conversions-v1'
   AND p.decision='granted' AND p.withdrawn_at IS NULL
   AND p.gpc_at_last_request IS FALSE AND p.sharing_opt_out IS FALSE
   AND p.decided_at<=statement_timestamp()
 ON CONFLICT(owner_id) DO NOTHING
 RETURNING event_id INTO v_event;
 RETURN v_event IS NOT NULL;
END
$enqueue$;
REVOKE ALL ON FUNCTION marketing_private.meta_try_enqueue_candidate(uuid)
 FROM PUBLIC,anon,authenticated,service_role;

-- The first-party acquisition trigger remains atomic, but a consent decision
-- collected at first authenticated/confirmed login can invoke the same
-- idempotent helper after attribution (within 15 minutes only).
CREATE FUNCTION marketing_private.meta_on_verified_candidate()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $trigger$
BEGIN
 PERFORM marketing_private.meta_try_enqueue_candidate(NEW.owner_id);
 RETURN NEW;
END
$trigger$;
REVOKE ALL ON FUNCTION marketing_private.meta_on_verified_candidate()
 FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER meta_once_on_verified_candidate
 AFTER INSERT ON marketing_private.acquisition
 FOR EACH ROW EXECUTE FUNCTION marketing_private.meta_on_verified_candidate();

-- An authenticated user's *explicit new choice* is persisted server-side.
-- Never use Auth user_metadata or frontend localStorage as authority.
-- This lab function takes a trusted owner and verified GPC=false signal; its
-- server Edge adapter must check Origin, current Auth and notice version.
-- No automatic re-grant after withdrawal; renewed consent would need
-- its own specifically reviewed re-authorization flow.
CREATE FUNCTION marketing_private.meta_grant_first_session_candidate(
 p_owner uuid,p_notice text,p_gpc boolean
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $grant$
BEGIN
 IF p_owner IS NULL OR p_gpc IS DISTINCT FROM FALSE
    OR p_notice IS DISTINCT FROM 'pazo-meta-conversions-v1'
    OR NOT marketing_private.is_eligible_owner(p_owner)
    OR NOT EXISTS(
      SELECT 1 FROM auth.users u
      WHERE u.id=p_owner AND u.email_confirmed_at IS NOT NULL
        AND u.email_confirmed_at>=statement_timestamp()-interval '15 minutes'
        AND u.email_confirmed_at<=statement_timestamp()
        AND u.created_at<=u.email_confirmed_at
        AND u.created_at>=statement_timestamp()-interval '72 hours'
    )
    OR NOT EXISTS(
      SELECT 1 FROM marketing_private.meta_release_gate_candidate g
      WHERE g.singleton AND g.enabled
    )
 THEN RETURN FALSE; END IF;
 INSERT INTO marketing_private.meta_purpose_candidate(
  owner_id,purpose,version,decision,decided_at,withdrawn_at,
  gpc_at_last_request,sharing_opt_out
 ) VALUES(
  p_owner,'meta_conversions_v1','pazo-meta-conversions-v1',
  'granted',statement_timestamp(),NULL,false,false
 )
 ON CONFLICT(owner_id) DO NOTHING;
 IF NOT FOUND THEN RETURN FALSE; END IF;
 PERFORM marketing_private.meta_try_enqueue_candidate(p_owner);
 RETURN TRUE;
END
$grant$;
REVOKE ALL ON FUNCTION marketing_private.meta_grant_first_session_candidate(uuid,text,boolean)
 FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.pazo_meta_grant_first_session_candidate(
 p_owner uuid,p_notice text,p_gpc boolean
) RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $meta_grant_rpc$
 SELECT marketing_private.meta_grant_first_session_candidate(p_owner,p_notice,p_gpc)
$meta_grant_rpc$;
REVOKE ALL ON FUNCTION public.pazo_meta_grant_first_session_candidate(uuid,text,boolean)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_meta_grant_first_session_candidate(uuid,text,boolean)
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
   JOIN marketing_private.meta_release_gate_candidate m ON m.singleton
   WHERE o.owner_id=p_owner
     AND g.enabled AND m.enabled
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
     AND p.decided_at<=a.recorded_at+interval '15 minutes'
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
 p_event uuid,p_lease uuid,p_status text
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $settle$
BEGIN
 IF p_event IS NULL OR p_lease IS NULL
    OR p_status IS NULL OR p_status NOT IN ('sent','retryable','suppressed')
 THEN RETURN FALSE; END IF;
 UPDATE marketing_private.meta_outbox_candidate o
 SET status=CASE
              WHEN p_status='sent' THEN 'sent'
              WHEN p_status='suppressed' OR o.attempts>=4 THEN 'suppressed'
              ELSE 'retryable' END,
     lease_id=NULL,leased_until=NULL
 WHERE o.event_id=p_event AND o.lease_id=p_lease AND o.status='leased'
   AND (p_status<>'sent' OR marketing_private.meta_send_eligible_candidate(o.owner_id));
 RETURN FOUND;
END
$settle$;
REVOKE ALL ON FUNCTION marketing_private.meta_settle_candidate(uuid,uuid,text)
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
 p_event uuid,p_lease uuid,p_status text
) RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $ SELECT marketing_private.meta_settle_candidate(p_event,p_lease,p_status) $;
REVOKE ALL ON FUNCTION public.pazo_meta_settle_candidate(uuid,uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_meta_settle_candidate(uuid,uuid,text)
 TO service_role;


-- One-time, service-only proof for the *browser* copy of the SAME event.
-- A lost browser response means Pixel may be absent; it must never be
-- reissued or minted again to "fix" a missing browser event. CAPI is separate.
-- Calls are made by trusted Edge AFTER Supabase Auth verifies the owner;
-- never expose the privileged service RPC to client JWTs.
CREATE FUNCTION marketing_private.meta_take_pixel_receipt_candidate(p_owner uuid)
RETURNS TABLE(event_id uuid,event_time timestamptz)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $pixel_receipt$
  WITH chosen AS (
    SELECT o.owner_id
    FROM marketing_private.meta_outbox_candidate o
    JOIN auth.users u ON u.id=o.owner_id
    WHERE o.owner_id=p_owner
      AND o.pixel_receipt_claimed_at IS NULL
      AND o.status <> 'suppressed'
      AND u.email_confirmed_at=o.event_time
      AND o.event_time>=statement_timestamp()-interval '15 minutes'
      AND o.event_time<=statement_timestamp()
      AND marketing_private.meta_send_eligible_candidate(o.owner_id)
    FOR UPDATE OF o SKIP LOCKED
  )
  UPDATE marketing_private.meta_outbox_candidate o
  SET pixel_receipt_claimed_at=statement_timestamp()
  FROM chosen c WHERE o.owner_id=c.owner_id
  RETURNING o.event_id,o.event_time
$pixel_receipt$;
REVOKE ALL ON FUNCTION marketing_private.meta_take_pixel_receipt_candidate(uuid)
  FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.pazo_meta_take_pixel_receipt_candidate(p_owner uuid)
RETURNS TABLE(event_id uuid,event_time timestamptz)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $meta_pixel_rpc$
  SELECT * FROM marketing_private.meta_take_pixel_receipt_candidate(p_owner)
$meta_pixel_rpc$;
REVOKE ALL ON FUNCTION public.pazo_meta_take_pixel_receipt_candidate(uuid)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_meta_take_pixel_receipt_candidate(uuid)
  TO service_role;

-- Enforce the *current* worker lease at each privacy recheck. A stale
-- worker cannot authorize a Meta request after a new worker takes over.
-- No email, IP address, user agent or matching field is exposed here.
CREATE FUNCTION marketing_private.meta_check_claim_candidate(
 p_event uuid,p_lease uuid
) RETURNS TABLE(owner_id uuid,event_time timestamptz,purpose text,
 version text,decision text,decided_at timestamptz,withdrawn_at timestamptz,
 gpc boolean,sharing_opt_out boolean,eligible boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $check$
 SELECT o.owner_id,o.event_time,p.purpose,p.version,p.decision,
        p.decided_at,p.withdrawn_at,p.gpc_at_last_request,
        p.sharing_opt_out,marketing_private.meta_send_eligible_candidate(o.owner_id)
 FROM marketing_private.meta_outbox_candidate o
 JOIN marketing_private.meta_purpose_candidate p ON p.owner_id=o.owner_id
 JOIN auth.users u ON u.id=o.owner_id
 WHERE o.event_id=p_event AND o.lease_id=p_lease
   AND o.status='leased' AND o.leased_until>statement_timestamp()
   AND u.email_confirmed_at=o.event_time
   AND marketing_private.meta_send_eligible_candidate(o.owner_id)
$check$;
REVOKE ALL ON FUNCTION marketing_private.meta_check_claim_candidate(uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.pazo_meta_check_claim_candidate(p_event uuid,p_lease uuid)
RETURNS TABLE(owner_id uuid,event_time timestamptz,purpose text,
 version text,decision text,decided_at timestamptz,withdrawn_at timestamptz,
 gpc boolean,sharing_opt_out boolean,eligible boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $check_rpc$
 SELECT * FROM marketing_private.meta_check_claim_candidate(p_event,p_lease)
$check_rpc$;
REVOKE ALL ON FUNCTION public.pazo_meta_check_claim_candidate(uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_meta_check_claim_candidate(uuid,uuid)
 TO service_role;

-- Opt-out/withdrawal does NOT require the Meta release switch, a matching
-- dataset, confirmed email, or an affirmative prior preference. The caller
-- still MUST authenticate the owner through a trusted Edge server.
-- This private write is atomic with cancellation of pending provider work.
CREATE FUNCTION marketing_private.meta_withdraw_candidate(p_owner uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $withdraw$
DECLARE v_now timestamptz := statement_timestamp();
BEGIN
 IF p_owner IS NULL OR NOT EXISTS(
   SELECT 1 FROM auth.users u WHERE u.id=p_owner
 ) THEN RETURN FALSE; END IF;

 INSERT INTO marketing_private.meta_purpose_candidate(
   owner_id,purpose,version,decision,decided_at,withdrawn_at,
   gpc_at_last_request,sharing_opt_out
 ) VALUES (
   p_owner,'meta_conversions_v1','pazo-meta-conversions-v1',
   'withdrawn',v_now,v_now,true,true
 )
 ON CONFLICT(owner_id) DO UPDATE SET
   decision='withdrawn',
   decided_at=CASE WHEN marketing_private.meta_purpose_candidate.decision='withdrawn'
                   THEN marketing_private.meta_purpose_candidate.decided_at
                   ELSE v_now END,
   withdrawn_at=COALESCE(marketing_private.meta_purpose_candidate.withdrawn_at,v_now),
   gpc_at_last_request=true,
   sharing_opt_out=true;

 UPDATE marketing_private.meta_outbox_candidate o SET
   status='suppressed',lease_id=NULL,leased_until=NULL
 WHERE o.owner_id=p_owner AND o.status <> 'sent';
 RETURN TRUE;
END
$withdraw$;
REVOKE ALL ON FUNCTION marketing_private.meta_withdraw_candidate(uuid)
 FROM PUBLIC,anon,authenticated,service_role;

-- Service-role-only bridge; never expose this from a public endpoint without
-- server-verified getUser(jwt) and same-origin CSRF controls.
CREATE FUNCTION public.pazo_meta_withdraw_candidate(p_owner uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $meta_wrapper$ SELECT marketing_private.meta_withdraw_candidate(p_owner) $meta_wrapper$;
REVOKE ALL ON FUNCTION public.pazo_meta_withdraw_candidate(uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_meta_withdraw_candidate(uuid)
 TO service_role;

COMMIT;
