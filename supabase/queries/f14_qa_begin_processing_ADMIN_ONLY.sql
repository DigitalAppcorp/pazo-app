-- PAZO / ONE-TIME QA ONLY / ADMINISTRATOR-ONLY
-- Phase 1 of 2: accept a deletion request for the one NEW disposable QA account.
-- This is NOT a migration, RPC, scheduled job or general account executor.
-- Run ONLY in the trusted Supabase SQL Editor after:
--   (1) creating and confirming the account via official Auth;
--   (2) requesting deletion from its own PAZO session;
--   (3) running the READ-ONLY preflight and checking no third-party dependency.
-- Never edit the exact QA email below or use this on an existing user.
-- Any failure ROLLS BACK. This changes only the private request's status.
BEGIN;
DO $pazo_qa_processing$
DECLARE
  v_subject uuid;
  v_changed integer;
BEGIN
  IF (SELECT count(*) FROM auth.users) <> 7 THEN
    RAISE EXCEPTION 'QA STOP: expected six original Auth users plus one disposable';
  END IF;
  SELECT u.id INTO STRICT v_subject
  FROM auth.users u
  WHERE lower(u.email) = 'appdigital.corp+pazo-baja-qa@gmail.com'
    AND u.email_confirmed_at IS NOT NULL
    AND u.created_at >= '2026-10-10'::timestamptz;
  IF (SELECT count(*) FROM moderation_private.moderator_grants) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM moderation_private.moderator_grants g
       JOIN auth.users u ON u.id=g.user_id
       WHERE lower(u.email)='appdigital.corp@gmail.com'
     ) OR EXISTS (
       SELECT 1 FROM moderation_private.moderator_grants g WHERE g.user_id=v_subject
     ) THEN
    RAISE EXCEPTION 'QA STOP: moderator assignment changed or test user has moderator role';
  END IF;
  IF EXISTS (SELECT 1 FROM public.posts WHERE user_id=v_subject)
     OR EXISTS (SELECT 1 FROM public.community_posts WHERE author_user_id=v_subject)
     OR EXISTS (SELECT 1 FROM public.communities WHERE owner_user_id=v_subject)
  THEN
    RAISE EXCEPTION 'QA STOP: disposable case must not contain social/third-party threads';
  END IF;
  IF (SELECT count(*) FROM account_requests_private.deletion_requests
      WHERE status IN ('requested','processing')) <> 1 THEN
    RAISE EXCEPTION 'QA STOP: unexpected outstanding deletion requests';
  END IF;
  UPDATE account_requests_private.deletion_requests
  SET status='processing', updated_at=pg_catalog.clock_timestamp()
  WHERE subject_user_id=v_subject AND status='requested' AND processed_at IS NULL;
  GET DIAGNOSTICS v_changed=ROW_COUNT;
  IF v_changed <> 1 THEN
    RAISE EXCEPTION 'QA STOP: exactly one requested row must move to processing';
  END IF;
  RAISE NOTICE 'QA processing transition: PASS (no account/Storage deleted)';
END
$pazo_qa_processing$;
COMMIT;
