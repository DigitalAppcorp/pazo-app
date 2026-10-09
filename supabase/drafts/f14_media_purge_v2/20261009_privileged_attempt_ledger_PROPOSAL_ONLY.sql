-- PAZO F14 A2 / D3-A — ARCHITECTURAL DRAFT ONLY. DO NOT APPLY.
-- No API/Edge integration, purge authorization, or remote migration approved.
-- This is a proposed PRIVATE journal schema, not a cross-service fence.
-- A service_role key bypasses Storage RLS: no SQL table can fence an
-- unregistered privileged Storage client that calls HTTP directly.
--
-- If reviewed later: move to a unique canonical supabase/migrations/ timestamp,
-- test rollback first, explicitly authorize remote DDL, apply, and verify ACL.
-- No DML below, no DELETE capability, no public or service grants.
BEGIN;

CREATE TABLE moderation_private.media_purge_attempts (
  operation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL UNIQUE
    REFERENCES moderation_private.media_claims(claim_id) ON DELETE RESTRICT,
  storage_object_id uuid NOT NULL,
  bucket text NOT NULL
    CHECK (bucket IN ('post-photos', 'community-post-photos')),
  object_path text NOT NULL
    CHECK (
      octet_length(object_path) BETWEEN 1 AND 1024
      AND object_path ~ '^[A-Za-z0-9_./-]+$'
      AND left(object_path,1) <> '/'
      AND position('..' in object_path) = 0
      AND position('//' in object_path) = 0
    ),
  object_version text NOT NULL
    CHECK (object_version ~ '^[A-Za-z0-9_-]{8,128}$'),
  fence_generation bigint NOT NULL CHECK (fence_generation > 0),
  fence_token uuid NOT NULL,
  UNIQUE(operation_id,bucket,object_path),
  phase text NOT NULL DEFAULT 'prepared_unverified'
    CHECK (phase IN (
      'prepared_unverified',
      'possibly_in_flight',
      'unknown_after_dispatch',
      'awaiting_origin_check',
      'origin_absent_observed',
      'manual_review'
    )),
  dispatch_count smallint NOT NULL DEFAULT 0
    CHECK (dispatch_count IN (0,1)),
  origin_absent_observed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  dispatch_recorded_at timestamptz NULL,
  checked_at timestamptz NULL,
  CHECK (dispatch_recorded_at IS NULL OR dispatch_recorded_at >= created_at),
  CHECK (
    (phase='prepared_unverified' AND dispatch_count=0 AND dispatch_recorded_at IS NULL)
    OR (phase IN ('possibly_in_flight','unknown_after_dispatch','awaiting_origin_check',
                 'origin_absent_observed','manual_review')
        AND dispatch_count IN (0,1))
  ),
  CHECK (NOT origin_absent_observed OR phase IN ('origin_absent_observed','manual_review'))
);
-- In the draft there is deliberately only ONE attempt per Storage path until
-- a separately reviewed recovery/close migration is approved.
-- This intentionally prefers a stuck path to deleting the wrong object.
CREATE UNIQUE INDEX media_purge_attempts_path_once
  ON moderation_private.media_purge_attempts(bucket,object_path);
CREATE UNIQUE INDEX media_purge_attempts_path_generation
  ON moderation_private.media_purge_attempts(bucket,object_path,fence_generation);
CREATE UNIQUE INDEX media_purge_attempts_fence_token
  ON moderation_private.media_purge_attempts(fence_token);

-- Durable row which a FUTURE coordinated service would lock/advance using
-- an atomic compare-and-set; no service writes or CAS RPC exist in this draft.
CREATE TABLE moderation_private.media_writer_fences (
  bucket text NOT NULL
    CHECK (bucket IN ('post-photos','community-post-photos')),
  object_path text NOT NULL
    CHECK (
      octet_length(object_path) BETWEEN 1 AND 1024
      AND object_path ~ '^[A-Za-z0-9_./-]+$'
      AND left(object_path,1) <> '/'
      AND position('..' in object_path) = 0
      AND position('//' in object_path) = 0
    ),
  generation bigint NOT NULL DEFAULT 0 CHECK (generation >= 0),
  state text NOT NULL DEFAULT 'quarantined'
    CHECK (state IN ('quarantined','possibly_in_flight','manual_review')),
  active_operation_id uuid UNIQUE,
  CONSTRAINT media_writer_fences_attempt_identity_fkey
    FOREIGN KEY (active_operation_id,bucket,object_path)
    REFERENCES moderation_private.media_purge_attempts(operation_id,bucket,object_path)
    ON DELETE RESTRICT,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(bucket,object_path),
  CHECK (state <> 'possibly_in_flight' OR active_operation_id IS NOT NULL)
);

-- Append-only intended events. No unbounded payload or report text.
CREATE TABLE moderation_private.media_purge_attempt_events (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operation_id uuid NOT NULL
    REFERENCES moderation_private.media_purge_attempts(operation_id)
    ON DELETE RESTRICT,
  event_type text NOT NULL
    CHECK (event_type IN (
      'prepared','dispatch_recorded','http_timeout','http_error',
      'http_success_observed','origin_absence_observed',
      'fence_rejected','manual_review_requested'
    )),
  event_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  fence_generation bigint NOT NULL CHECK (fence_generation > 0),
  UNIQUE(operation_id,event_type,fence_generation)
);
CREATE INDEX media_purge_attempt_events_op_at
  ON moderation_private.media_purge_attempt_events(operation_id,event_at);

ALTER TABLE moderation_private.media_purge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_private.media_purge_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE moderation_private.media_writer_fences ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_private.media_writer_fences FORCE ROW LEVEL SECURITY;
ALTER TABLE moderation_private.media_purge_attempt_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_private.media_purge_attempt_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE moderation_private.media_purge_attempts
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE moderation_private.media_writer_fences
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE moderation_private.media_purge_attempt_events
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SEQUENCE moderation_private.media_purge_attempt_events_event_id_seq
  FROM PUBLIC,anon,authenticated,service_role;

COMMIT;
-- CAUTION: No phase 'purged', no automatic retry, no hold expiry release,
-- no direct authenticated/service grants, no SECURITY DEFINER RPC, no Edge DELETE.
