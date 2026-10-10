-- PAZO F14 A3 / REVIEW CONTRACT ONLY
-- NOT APPLIED / NEVER RUN DIRECTLY. This is NOT a migration or an executor.
-- To install, a future explicit PO database gate MUST review, remove the
-- unconditional guard, regenerate a versioned migration, verify RLS and run
-- all DB/Storage/Auth tests. No account or file is deleted by this draft.
BEGIN;

DO $a3_not_applied$
BEGIN
  RAISE EXCEPTION 'F14 A3 REVIEW DRAFT ONLY: requires separate PO DB authorization';
END
$a3_not_applied$;

-- Dependencies: existing, installed account_requests_private.deletion_requests
-- and the user-owned public.pazo_deletion_request/status/cancel() intake RPCs.
-- Do not recreate the intake or grant its underlying table to browser roles.

CREATE TABLE IF NOT EXISTS account_requests_private.deletion_review_operators (
  operator_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
-- Intentionally EMPTY. A service_role key is not, by itself, an
-- authorization to choose which human can approve an irreversible deletion.
-- No INSERT policy/grant is provided. Separate PO gate required to enroll an
-- exact verified operator without exposing their identity to the client.

CREATE TABLE IF NOT EXISTS account_requests_private.deletion_review_jobs (
  subject_user_id uuid PRIMARY KEY
    REFERENCES account_requests_private.deletion_requests(subject_user_id)
    ON DELETE RESTRICT,
  phase text NOT NULL DEFAULT 'review_request'
    CHECK (phase IN ('review_request','freeze_writes','preserve_others',
      'remove_media','clean_private_data','revoke_sessions','await_auth_final')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  reviewer_user_id uuid REFERENCES account_requests_private.deletion_review_operators(operator_user_id)
    ON DELETE RESTRICT,
  lease_token uuid,
  lease_expires_at timestamptz,
  reauthenticated_at timestamptz,
  reviewed_at timestamptz,
  last_issue text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CHECK ((lease_token IS NULL) = (lease_expires_at IS NULL)),
  CHECK ((reviewer_user_id IS NULL) = (lease_token IS NULL)),
  CHECK (reauthenticated_at IS NULL OR reauthenticated_at <= updated_at)
);

CREATE TABLE IF NOT EXISTS account_requests_private.deletion_review_events (
  subject_user_id uuid NOT NULL
    REFERENCES account_requests_private.deletion_review_jobs(subject_user_id)
    ON DELETE RESTRICT,
  revision bigint NOT NULL CHECK (revision > 0),
  phase text NOT NULL,
  result text NOT NULL CHECK (result IN ('requested','blocked','reviewed','failed')),
  issue_code text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY (subject_user_id, revision),
  CHECK ((result = 'blocked' OR result = 'failed') = (issue_code IS NOT NULL))
);

ALTER TABLE account_requests_private.deletion_review_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_requests_private.deletion_review_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_requests_private.deletion_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_requests_private.deletion_review_operators FROM PUBLIC,anon,authenticated;
REVOKE ALL ON account_requests_private.deletion_review_jobs FROM PUBLIC,anon,authenticated;
REVOKE ALL ON account_requests_private.deletion_review_events FROM PUBLIC,anon,authenticated;
REVOKE ALL ON account_requests_private.deletion_review_operators FROM service_role;
REVOKE ALL ON account_requests_private.deletion_review_jobs FROM service_role;
REVOKE ALL ON account_requests_private.deletion_review_events FROM service_role;
GRANT SELECT ON account_requests_private.deletion_review_operators TO service_role;
GRANT SELECT ON account_requests_private.deletion_review_jobs TO service_role;
GRANT SELECT ON account_requests_private.deletion_review_events TO service_role;

-- Privileged, purely READ-ONLY inventory. Non-zero values block blind cascade
-- until a future server executor proves third-party archival and media cleanup.
-- This is deliberately NOT a full deletion-ready determination.
CREATE OR REPLACE FUNCTION public.f14_a3_review_inventory(p_subject_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_inv$
DECLARE
  v_pets bigint;
  v_posts bigint;
  v_communities bigint;
  v_comments_third_party bigint;
  v_community_posts_third_party bigint;
  v_documents bigint;
  v_care bigint;
  v_storage bigint;
BEGIN
  IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role', true),'') <> 'service_role'
      OR p_subject_user_id IS NULL THEN
    RAISE EXCEPTION 'Service reviewer required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM account_requests_private.deletion_requests
    WHERE subject_user_id=p_subject_user_id AND status IN ('requested','processing')) THEN
    RAISE EXCEPTION 'No reviewable request' USING ERRCODE='42501';
  END IF;
  SELECT count(*) INTO v_pets FROM public.pets WHERE owner_id=p_subject_user_id;
  SELECT count(*) INTO v_posts FROM public.posts WHERE user_id=p_subject_user_id;
  SELECT count(*) INTO v_communities FROM public.communities
    WHERE owner_user_id=p_subject_user_id;
  SELECT count(*) INTO v_comments_third_party
    FROM public.post_comments c
    JOIN public.posts p ON p.id=c.post_id
    JOIN public.pets pet ON pet.id=c.author_pet_id
    WHERE p.user_id=p_subject_user_id AND pet.owner_id<>p_subject_user_id;
  SELECT count(*) INTO v_community_posts_third_party
    FROM public.community_posts p JOIN public.communities c ON c.id=p.community_id
    WHERE c.owner_user_id=p_subject_user_id AND p.author_user_id<>p_subject_user_id;
  SELECT count(*) INTO v_documents FROM public.pet_documents d
    JOIN public.pets p ON p.id=d.pet_id WHERE p.owner_id=p_subject_user_id;
  SELECT count(*) INTO v_care FROM public.care_items c
    JOIN public.pets p ON p.id=c.pet_id WHERE p.owner_id=p_subject_user_id;
  -- Count all Storage (conservative) until object ownership can be proved.
  SELECT count(*) INTO v_storage FROM storage.objects;

  RETURN pg_catalog.jsonb_build_object(
    'owned_pets',v_pets, 'owned_posts',v_posts,
    'owned_communities',v_communities,
    'third_party_feed_comments',v_comments_third_party,
    'third_party_community_posts',v_community_posts_third_party,
    'owned_documents',v_documents,'owned_care_items',v_care,
    'total_storage_objects_needing_ownership_review',v_storage,
    'destructive_execution_allowed',false
  );
END
$a3_inv$;

REVOKE ALL ON FUNCTION public.f14_a3_review_inventory(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_review_inventory(uuid) TO service_role;

-- Private reviewer membership check. Called ONLY after a trusted Edge server
-- independently verifies operator JWT via auth.getUser(jwt). The operator id
-- must NOT be taken directly from browser JSON or unverified user metadata.
CREATE OR REPLACE FUNCTION public.f14_a3_review_operator_authorized(
  p_operator_user_id uuid,
  p_subject_user_id uuid
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_operator$
BEGIN
  IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role', true),'') <> 'service_role'
    OR p_operator_user_id IS NULL OR p_subject_user_id IS NULL THEN
    RAISE EXCEPTION 'Service reviewer required' USING ERRCODE='42501';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM account_requests_private.deletion_review_operators o
    JOIN auth.users u ON u.id = o.operator_user_id
    WHERE o.operator_user_id = p_operator_user_id
      AND o.operator_user_id <> p_subject_user_id
  ) AND EXISTS (
    SELECT 1 FROM account_requests_private.deletion_requests req
    JOIN auth.users subject ON subject.id = req.subject_user_id
    WHERE req.subject_user_id = p_subject_user_id
      AND req.status IN ('requested','processing')
  );
END
$a3_operator$;

REVOKE ALL ON FUNCTION public.f14_a3_review_operator_authorized(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_review_operator_authorized(uuid,uuid)
  TO service_role;

-- Durable, leased reviewer claim (NOT a deletion approval). The request row
-- serializes competing reviewers. Existing users stay active; no write fence,
-- reauthentication receipt, or account deletion follows from this function.
CREATE OR REPLACE FUNCTION public.f14_a3_review_claim(
  p_operator_user_id uuid,
  p_subject_user_id uuid,
  p_expected_revision bigint DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_claim$
DECLARE
  v_request_status text;
  v_previous bigint;
  v_token uuid;
  v_until timestamptz;
  v_revision bigint;
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role', true),'') <> 'service_role'
    OR p_operator_user_id IS NULL OR p_subject_user_id IS NULL
    OR p_operator_user_id = p_subject_user_id
    OR (p_expected_revision IS NOT NULL AND p_expected_revision < 1) THEN
    RAISE EXCEPTION 'Reviewer access denied' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM account_requests_private.deletion_review_operators o
    JOIN auth.users op ON op.id=o.operator_user_id
    WHERE o.operator_user_id=p_operator_user_id
  ) THEN
    RAISE EXCEPTION 'Reviewer access denied' USING ERRCODE='42501';
  END IF;

  SELECT r.status INTO v_request_status
  FROM account_requests_private.deletion_requests r
  JOIN auth.users subject ON subject.id=r.subject_user_id
  WHERE r.subject_user_id=p_subject_user_id FOR UPDATE;
  IF v_request_status IS DISTINCT FROM 'requested' THEN
    RAISE EXCEPTION 'Request not reviewable' USING ERRCODE='42501';
  END IF;

  INSERT INTO account_requests_private.deletion_review_jobs(subject_user_id)
  VALUES (p_subject_user_id) ON CONFLICT (subject_user_id) DO NOTHING;

  -- This row lock plus revision compare-and-set prevents two claims owning
  -- the same revision and makes re-entry explicit after an expired lease.
  SELECT revision INTO v_previous
  FROM account_requests_private.deletion_review_jobs
  WHERE subject_user_id=p_subject_user_id FOR UPDATE;
  IF p_expected_revision IS NULL AND v_previous <> 1 THEN
    RAISE EXCEPTION 'Revision required to reclaim' USING ERRCODE='40001';
  END IF;
  IF p_expected_revision IS NOT NULL AND p_expected_revision <> v_previous THEN
    RAISE EXCEPTION 'Stale reviewer revision' USING ERRCODE='40001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM account_requests_private.deletion_review_jobs j
    WHERE j.subject_user_id=p_subject_user_id
      AND j.lease_expires_at>v_now
  ) THEN
    RAISE EXCEPTION 'Review lease still active' USING ERRCODE='42501';
  END IF;

  v_token := pg_catalog.gen_random_uuid();
  v_until := v_now + INTERVAL '5 minutes';
  UPDATE account_requests_private.deletion_review_jobs j
  SET reviewer_user_id=p_operator_user_id,
      lease_token=v_token,
      lease_expires_at=v_until,
      revision=j.revision+1,
      updated_at=v_now
  WHERE j.subject_user_id=p_subject_user_id AND j.revision=v_previous
  RETURNING j.revision INTO v_revision;
  IF v_revision IS NULL THEN
    RAISE EXCEPTION 'Reviewer revision changed' USING ERRCODE='40001';
  END IF;

  INSERT INTO account_requests_private.deletion_review_events
    (subject_user_id,revision,phase,result)
  VALUES (p_subject_user_id,v_revision,'review_request','reviewed');
  RETURN pg_catalog.jsonb_build_object(
    'revision',v_revision,'lease_token',v_token,
    'expires_at',v_until,'stage','review_request',
    'destructive_execution_allowed',false
  );
END
$a3_claim$;

CREATE OR REPLACE FUNCTION public.f14_a3_review_lease_valid(
  p_operator_user_id uuid,
  p_subject_user_id uuid,
  p_lease_token uuid,
  p_revision bigint
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_lease$
BEGIN
  IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role'
    OR p_operator_user_id IS NULL OR p_subject_user_id IS NULL
    OR p_lease_token IS NULL OR p_revision IS NULL THEN
    RAISE EXCEPTION 'Service reviewer required' USING ERRCODE='42501';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM account_requests_private.deletion_review_jobs j
    JOIN account_requests_private.deletion_review_operators op
      ON op.operator_user_id=j.reviewer_user_id
    JOIN account_requests_private.deletion_requests req
      ON req.subject_user_id=j.subject_user_id
    WHERE j.subject_user_id=p_subject_user_id
      AND j.reviewer_user_id=p_operator_user_id
      AND j.lease_token=p_lease_token
      AND j.revision=p_revision
      AND j.lease_expires_at>pg_catalog.clock_timestamp()
      AND j.phase='review_request'
      AND req.status='requested'
  );
END
$a3_lease$;

REVOKE ALL ON FUNCTION public.f14_a3_review_claim(uuid,uuid,bigint)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.f14_a3_review_lease_valid(uuid,uuid,uuid,bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_review_claim(uuid,uuid,bigint)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.f14_a3_review_lease_valid(uuid,uuid,uuid,bigint)
  TO service_role;

-- No destructive stage-transition RPC, DELETE or UPDATE of intake is included:
-- the freeze of all writes and per-account reauthentication proof have NOT
-- been independently verified. A proposed stage cannot grant delete access.
-- Required next: private leased/CAS transition, operator enrollment,
-- real Auth reauthentication binding, FK/third-party tombstone reconciliation,
-- media manifest + Storage/CDN origin verification, Auth-session revocation,
-- then a separately authorized executor and its end-to-end tests.
COMMIT;
