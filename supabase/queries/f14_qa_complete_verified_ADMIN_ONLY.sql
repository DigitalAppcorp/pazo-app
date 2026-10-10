-- PAZO / ONE-TIME QA ONLY / ADMINISTRATOR-ONLY
-- Phase 2 of 2: mark the already-processed disposable request completed.
-- Use ONLY after executing phase 1, deleting OWN avatar via Storage API,
-- cleaning OWN pet via verified ownership, deleting the user via Auth Admin,
-- independently checking all original six account IDs and provider objects.
-- Replace the ZERO UUID below ONLY with the test user's UUID saved privately
-- while the QA account still existed. Never paste credentials here or into Git.
-- Does NOT delete accounts or Storage and does NOT certify CDN/backups.
-- This is NOT a general-purpose admin endpoint. Failures ROLL BACK.
BEGIN;
DO $pazo_qa_complete$
DECLARE
  v_subject uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_changed integer;
BEGIN
  IF v_subject='00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION 'QA STOP: replace UUID placeholder with the specific disposable account ID';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id=v_subject)
     OR (SELECT count(*) FROM auth.users) <> 6 THEN
    RAISE EXCEPTION 'QA STOP: Auth deletion unverified or six original accounts not preserved';
  END IF;
  IF (SELECT count(*) FROM moderation_private.moderator_grants) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM moderation_private.moderator_grants g
       JOIN auth.users u ON u.id=g.user_id
       WHERE lower(u.email)='appdigital.corp@gmail.com'
     ) THEN
    RAISE EXCEPTION 'QA STOP: the sole authorized moderator must remain untouched';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id=v_subject)
     OR EXISTS (SELECT 1 FROM public.pets WHERE owner_id=v_subject)
     OR EXISTS (SELECT 1 FROM public.posts WHERE user_id=v_subject)
     OR EXISTS (SELECT 1 FROM public.community_posts WHERE author_user_id=v_subject)
     OR EXISTS (SELECT 1 FROM public.communities WHERE owner_user_id=v_subject)
     OR EXISTS (SELECT 1 FROM storage.objects WHERE owner_id=v_subject::text)
     OR EXISTS (SELECT 1 FROM moderation_private.media_claims WHERE snapshot->>'owner_id'=v_subject::text)
  THEN
    RAISE EXCEPTION 'QA STOP: direct account data, media or claims still present';
  END IF;
  -- Baseline measured BEFORE the test: one old pet and one old Storage object.
  -- These counts intentionally fail closed if QA objects survive or originals vanish.
  IF (SELECT count(*) FROM public.pets) <> 1
     OR (SELECT count(*) FROM storage.objects) <> 1
     OR (SELECT count(*) FROM public.posts) <> 0
     OR (SELECT count(*) FROM public.communities) <> 0
     OR (SELECT count(*) FROM public.community_posts) <> 0 THEN
    RAISE EXCEPTION 'QA STOP: product/media baseline not restored';
  END IF;
  IF (SELECT count(*) FROM account_requests_private.deletion_requests
      WHERE status IN ('requested','processing')) <> 1 THEN
    RAISE EXCEPTION 'QA STOP: concurrent or unrelated deletion requests present';
  END IF;
  UPDATE account_requests_private.deletion_requests
  SET status='completed',
      updated_at=pg_catalog.clock_timestamp(),
      processed_at=pg_catalog.clock_timestamp()
  WHERE subject_user_id=v_subject
    AND status='processing'
    AND processed_at IS NULL
    AND requested_at >= '2026-10-10'::timestamptz;
  GET DIAGNOSTICS v_changed=ROW_COUNT;
  IF v_changed <> 1 THEN
    RAISE EXCEPTION 'QA STOP: exactly one processing request must finish';
  END IF;
  RAISE NOTICE 'QA completion transition: PASS (one disposable request only)';
END
$pazo_qa_complete$;
COMMIT;
