-- PAZO F16-P05 | PRIVATE INBOX CLAIM v1 | DRAFT / DISPOSABLE ONLY.
-- NEVER run in hosted. No payment records, refunds, period approvals or benefits.
-- Reconcile only NEW verified events after an independently approved cutoff.
\set ON_ERROR_STOP on
BEGIN;
DO $only_ci$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
   OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'P05 CLAIM DRAFT DISPOSABLE ONLY' USING ERRCODE='42501'; END IF;
 IF to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 THEN RAISE EXCEPTION 'P05 requires existing verified event inbox'; END IF;
END
$only_ci$;

-- New token is essential: a stalled worker cannot read a re-leased event.
-- In hosted this ALTER requires separate lock/impact assessment and GO.
ALTER TABLE supporter_private.paypal_verified_event_inbox
 ADD COLUMN p05_claim_token uuid;

-- Synthetic parent fixture has only 4 columns; populate the actual existing
-- hosted inbox shape for disposable tests without claiming hosted compatibility.
ALTER TABLE supporter_private.paypal_verified_event_inbox
 ADD COLUMN attempt_count integer NOT NULL DEFAULT 0
   CHECK (attempt_count >= 0),
 ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 ADD COLUMN processed_at timestamptz,
 ADD COLUMN retention_hold boolean NOT NULL DEFAULT true,
 ADD COLUMN last_error_code text
   CHECK (last_error_code IS NULL OR last_error_code ~ '^[a-z_]{1,48}$');

CREATE TABLE supporter_private.p05_inbox_worker_gate (
 id smallint PRIMARY KEY CHECK (id=1),
 enabled boolean NOT NULL DEFAULT false,
 not_before timestamptz,
 CONSTRAINT p05_gate_needs_cutoff CHECK (NOT enabled OR not_before IS NOT NULL)
);
INSERT INTO supporter_private.p05_inbox_worker_gate(id) VALUES (1);

ALTER TABLE supporter_private.p05_inbox_worker_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.p05_inbox_worker_gate FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supporter_private.p05_inbox_worker_gate
 FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE supporter_private.paypal_verified_event_inbox
 FROM PUBLIC, anon, authenticated, service_role;

-- A worker does not select any event by user-controlled ID. There are no
-- caller arguments. Existing historical events are ineligible by default.
-- Row locking prevents simultaneous claims of one event. Expired leases may
-- be reclaimed with a NEW token. This is at-least-once, not exactly-once.
CREATE FUNCTION public.f16_p05_draft_claim_next_verified_event()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $claim$
DECLARE r record; now_at timestamptz := pg_catalog.clock_timestamp();
BEGIN
 SELECT i.provider_event_id, i.event_type, i.verified_at, i.attempt_count
 INTO r
 FROM supporter_private.paypal_verified_event_inbox i
 JOIN supporter_private.p05_inbox_worker_gate g
   ON g.id=1 AND g.enabled AND g.not_before IS NOT NULL
 WHERE i.verified_at >= g.not_before
   AND i.next_attempt_at <= now_at
   AND i.attempt_count < 5
   AND (i.processing_state='pending' OR i.processing_state='processing')
 ORDER BY i.verified_at, i.provider_event_id
 LIMIT 1 FOR UPDATE OF i SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;

 UPDATE supporter_private.paypal_verified_event_inbox
 SET processing_state='processing',
     attempt_count=attempt_count+1,
     p05_claim_token=pg_catalog.gen_random_uuid(),
     next_attempt_at=now_at + interval '5 minutes'
 WHERE provider_event_id=r.provider_event_id
 RETURNING provider_event_id,event_type,verified_at,processing_state,
  attempt_count,p05_claim_token,next_attempt_at INTO r;
 RETURN pg_catalog.jsonb_build_object(
   'eventId',r.provider_event_id,
   'eventType',r.event_type,
   'verifiedAt',r.verified_at,
   'processingState',r.processing_state,
   'attemptCount',r.attempt_count,
   'leaseToken',r.p05_claim_token,
   'leaseExpiresAt',r.next_attempt_at
 );

END
$claim$;

-- Fencing: no stale token can read the event after lease expiration/reclaim.
-- This reveals exactly ONE previously claimed reference, never event bodies,
-- subscription IDs, payer identities, raw metadata or general inbox scans.
CREATE FUNCTION public.f16_p05_draft_read_claimed_event(
 p_event_id text,p_claim_token uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path=''
AS $reader$
 SELECT pg_catalog.jsonb_build_object(
  'id',i.provider_event_id,'type',i.event_type,
  'verifiedAt',i.verified_at,'processingState',i.processing_state
 )
 FROM supporter_private.paypal_verified_event_inbox i
 JOIN supporter_private.p05_inbox_worker_gate g
 ON g.id=1 AND g.enabled AND g.not_before IS NOT NULL
 WHERE i.provider_event_id=p_event_id
   AND i.verified_at >= g.not_before
   AND i.p05_claim_token=p_claim_token
   AND i.processing_state='processing'
   AND i.next_attempt_at > pg_catalog.clock_timestamp()
$reader$;

-- NO payment approval/processed event transition: only retry or quarantine.
-- A stale claim token is invalid, including when the original lease expired.
CREATE FUNCTION public.f16_p05_draft_finish_claimed_event(
 p_event_id text,p_claim_token uuid,p_outcome text,p_reason_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $finish$
DECLARE touched_id text;
        now_at timestamptz := pg_catalog.clock_timestamp();
BEGIN
 IF p_claim_token IS NULL OR p_event_id IS NULL
    OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$'
 THEN RETURN false; END IF;
 IF p_outcome='retry' THEN
  IF p_reason_code IS NULL OR p_reason_code NOT IN
   ('merchant_unavailable','read_unavailable','temporarily_incomplete')
  THEN RAISE EXCEPTION 'p05_finish_reason_not_allowed' USING ERRCODE='22023';
  END IF;
 ELSIF p_outcome='review' THEN
  IF p_reason_code IS NULL OR p_reason_code NOT IN
   ('foreign_reference','missing_evidence','reversal_possible',
    'cycle_unproven','manual_review')
  THEN RAISE EXCEPTION 'p05_finish_reason_not_allowed' USING ERRCODE='22023';
  END IF;
 ELSE
  RAISE EXCEPTION 'p05_finish_outcome_not_allowed' USING ERRCODE='22023';
 END IF;

 UPDATE supporter_private.paypal_verified_event_inbox AS i
 SET processing_state=CASE
      WHEN p_outcome='review' OR i.attempt_count>=5
       THEN 'quarantined' ELSE 'pending' END,
     next_attempt_at=CASE
      WHEN p_outcome='review' OR i.attempt_count>=5
       THEN now_at
      ELSE now_at + LEAST(60,(2^LEAST(i.attempt_count,5))::integer)
                      * interval '1 minute' END,
     last_error_code=CASE
      WHEN p_outcome='retry' AND i.attempt_count>=5
       THEN 'retry_exhausted' ELSE p_reason_code END,
     p05_claim_token=NULL,
     retention_hold=true
 FROM supporter_private.p05_inbox_worker_gate AS g
 WHERE g.id=1 AND g.enabled AND g.not_before IS NOT NULL
   AND i.verified_at>=g.not_before
   AND i.provider_event_id=p_event_id
   AND i.p05_claim_token=p_claim_token
   AND i.processing_state='processing'
   AND i.next_attempt_at>now_at
 RETURNING i.provider_event_id INTO touched_id;
 RETURN touched_id IS NOT NULL;
END
$finish$;

-- New PostgreSQL functions default to PUBLIC EXECUTE; revoke atomically
-- before COMMIT, even though the draft is confined to a disposable DB.
REVOKE ALL ON FUNCTION public.f16_p05_draft_claim_next_verified_event()
 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.f16_p05_draft_read_claimed_event(text,uuid)
 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.f16_p05_draft_finish_claimed_event(text,uuid,text,text)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p05_draft_claim_next_verified_event()
 TO service_role;
GRANT EXECUTE ON FUNCTION public.f16_p05_draft_read_claimed_event(text,uuid)
 TO service_role;
GRANT EXECUTE ON FUNCTION public.f16_p05_draft_finish_claimed_event(text,uuid,text,text)
 TO service_role;
COMMIT;
