-- PAZO F14 A3 — INSTALLER-ONLY OPERATOR ENROLLMENT, NOT APPLIED.
-- The Product Owner nominated one existing, confirmed Auth account.
-- Audit confirmed exactly one matching Auth identity on 2026-10-10.
-- Do not store the nominated email or Auth UUID in git, migration history,
-- browser bundles, server logs or a client-accessible table.
--
-- DEPENDENCY: review_operators table created by a separately approved,
-- tested and installed A3 review migration. This file does NOT create it.
-- The trusted migration runner supplies the verified exact email OUT-OF-BAND
-- inside the transaction using SET LOCAL pazo.a3_operator_email = '<email>'.
-- This script MUST NOT be called through PostgREST / a browser JWT.
-- It MUST NOT be run as service_role; only a trusted DBA/migration runner
-- can enroll or revoke reviewers.
BEGIN;

DO $not_applied$
BEGIN
  RAISE EXCEPTION 'A3 OPERATOR ENROLLMENT DRAFT: DO NOT RUN BEFORE A3 RELEASE GATE';
END
$not_applied$;

DO $enroll$
DECLARE
  v_email text := pg_catalog.lower(pg_catalog.btrim(
    pg_catalog.current_setting('pazo.a3_operator_email',true)
  ));
  v_id uuid;
  v_match_count bigint;
BEGIN
  IF current_user NOT IN ('postgres') THEN
    RAISE EXCEPTION 'Trusted migration operator required' USING ERRCODE='42501';
  END IF;
  IF v_email IS NULL OR v_email=''
    OR pg_catalog.length(v_email)>320
    OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Exactly one verified operator email is required'
      USING ERRCODE='22023';
  END IF;

  SELECT pg_catalog.count(*),pg_catalog.min(id)
    INTO v_match_count,v_id
  FROM auth.users
  WHERE pg_catalog.lower(pg_catalog.btrim(email))=v_email
    AND email_confirmed_at IS NOT NULL
    AND deleted_at IS NULL;

  IF v_match_count<>1 OR v_id IS NULL THEN
    RAISE EXCEPTION 'No unique, confirmed, active Auth operator'
      USING ERRCODE='42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='account_requests_private'
      AND table_name='deletion_review_operators'
  ) THEN
    RAISE EXCEPTION 'A3 private reviewer registry has not been installed'
      USING ERRCODE='55000';
  END IF;

  INSERT INTO account_requests_private.deletion_review_operators
    (operator_user_id)
  VALUES (v_id)
  ON CONFLICT (operator_user_id) DO NOTHING;

  IF NOT EXISTS(
    SELECT 1 FROM account_requests_private.deletion_review_operators
    WHERE operator_user_id=v_id
  ) THEN
    RAISE EXCEPTION 'Operator registry verification failed'
      USING ERRCODE='42501';
  END IF;
END
$enroll$;

COMMIT;

-- After installation, inspect only aggregates. Do not expose the subject
-- account's email/id through a public API:
-- SELECT count(*) FROM account_requests_private.deletion_review_operators;
--
-- Grant authorizes review only. No Auth admin privilege, service_role
-- credentials, direct write grants, Storage delete or bypass is granted.
-- The subject and reviewer must remain distinct in each reviewed request.
-- Revoke via an audited separate DBA transaction if the PO changes operator.
