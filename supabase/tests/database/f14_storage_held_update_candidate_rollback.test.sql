-- PAZO F14 A2: CANDIDATE RLS fail-closed hold + UPDATE behavior regression.
-- Proof runs in BEGIN/ROLLBACK and DOES NOT apply a permanent migration.
-- Tested hosted with BEGIN/ROLLBACK. Never creates Storage bytes or calls Storage API.
-- Temporary permissive UPDATE exists ONLY inside the transaction to simulate
-- possible future upsert grants; permanent production UPDATE is currently denied.
-- This is not a concurrency, CDN or service_role bypass test.
BEGIN;

DO $preflight$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
  AND policyname IN ('f14_media_claim_restrict_update','f14_test_update_permission')) THEN
   RAISE EXCEPTION 'Test policy already exists: refusing collision';
 END IF;
END $preflight$;

CREATE OR REPLACE FUNCTION public.f14_storage_media_path_unclaimed(p_bucket text,p_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
 SELECT CASE
 WHEN p_bucket NOT IN ('post-photos','community-post-photos') THEN true
 WHEN p_path IS NULL OR p_path='' THEN false
 ELSE NOT EXISTS (
   SELECT 1
   FROM moderation_private.media_claims c
   WHERE c.bucket=p_bucket AND c.snapshot->>'path'=p_path
     AND c.status='held'
 )
 END;
$$;
-- Existing narrow EXECUTE grants remain unchanged by CREATE OR REPLACE.
-- Do not broaden role grants or leak claim identifiers.

CREATE OR REPLACE FUNCTION public.f14_recheck_media_claim(p_claim uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $f14_recheck$
DECLARE v_claim moderation_private.media_claims%ROWTYPE; v_now jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_claim FROM moderation_private.media_claims
    WHERE claim_id=p_claim FOR UPDATE;
  IF NOT FOUND OR v_claim.status<>'held' THEN RETURN false; END IF;
  IF v_claim.expires_at<=clock_timestamp() THEN
    RETURN false;
  END IF;
  v_now:=moderation_private.f14_media_probe(v_claim.target_kind,v_claim.target_id);
  IF v_now IS NULL OR v_now IS DISTINCT FROM v_claim.snapshot THEN
    RETURN false;
  END IF;
  UPDATE moderation_private.media_claims SET checked_at=now() WHERE claim_id=p_claim;
  INSERT INTO moderation_private.media_claim_events(claim_id,event) VALUES(p_claim,'rechecked');
  RETURN true;
END;
$f14_recheck$;

CREATE POLICY f14_media_claim_restrict_update ON storage.objects AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (public.f14_storage_media_path_unclaimed(bucket_id,name))
WITH CHECK (public.f14_storage_media_path_unclaimed(bucket_id,name));

CREATE POLICY f14_test_update_permission ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id='post-photos' AND owner_id=(select auth.uid())::text)
WITH CHECK (bucket_id='post-photos' AND owner_id=(select auth.uid())::text);

DO $fixtures$
DECLARE uid uuid; target uuid:=gen_random_uuid(); rid uuid;
hid uuid:=gen_random_uuid(); fid uuid:=gen_random_uuid();
path_held text; path_free text;
BEGIN
 SELECT user_id INTO STRICT uid FROM moderation_private.moderator_grants LIMIT 1;
 path_held:=uid::text||'/f14-held-rls-'||gen_random_uuid()::text||'.png';
 path_free:=uid::text||'/f14-free-rls-'||gen_random_uuid()::text||'.png';
 INSERT INTO moderation_private.reports
 (reporter_user_id,target_kind,target_id,target_owner_user_id,reason,status,resolved_at,resolved_by)
 VALUES(uid,'feed_post',target,uid,'spam','removed',now(),uid) RETURNING id INTO rid;
 -- These are transaction-local metadata rows; there are no Storage bytes.
 INSERT INTO storage.objects (id,bucket_id,name,owner_id,version)
 VALUES (hid,'post-photos',path_held,uid::text,'1'),
        (fid,'post-photos',path_free,uid::text,'1');
 INSERT INTO moderation_private.media_claims
 (target_kind,target_id,report_id,bucket,storage_object_id,snapshot,status)
 VALUES ('feed_post',target,rid,'post-photos',hid,jsonb_build_object('path',path_held),'held');
 PERFORM set_config('pazo.f14.qa.uid',uid::text,true);
 PERFORM set_config('pazo.f14.qa.held',path_held,true);
 PERFORM set_config('pazo.f14.qa.free',path_free,true);
END $fixtures$;

SELECT set_config('request.jwt.claim.sub',current_setting('pazo.f14.qa.uid'),true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;

DO $assertions$
DECLARE n int;
BEGIN
 UPDATE storage.objects SET metadata='{"qa":"unheld_allowed"}'::jsonb
 WHERE bucket_id='post-photos' AND name=current_setting('pazo.f14.qa.free');
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Unheld UPDATE should be permitted: %',n; END IF;

 UPDATE storage.objects SET metadata='{"qa":"held_blocked"}'::jsonb
 WHERE bucket_id='post-photos' AND name=current_setting('pazo.f14.qa.held');
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Held UPDATE must affect zero rows: %',n; END IF;
END $assertions$;

RESET ROLE;

-- An expired hold no longer protects bytes. This is an INTENTIONAL risk
-- demonstration, not an endorsement of expiring claims mid-deletion.
UPDATE moderation_private.media_claims
SET created_at=now()-interval '10 minutes',
    expires_at=now()-interval '1 minute'
WHERE snapshot->>'path'=current_setting('pazo.f14.qa.held');
SET LOCAL ROLE authenticated;
DO $expiry$
DECLARE n int;
BEGIN
 UPDATE storage.objects SET metadata='{"qa":"expired_claim_allows_write"}'::jsonb
 WHERE bucket_id='post-photos' AND name=current_setting('pazo.f14.qa.held');
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Candidate: held claim must still protect after TTL expiry: %',n; END IF;
END $expiry$;
RESET ROLE;

-- Service-role recheck must fail closed without invalidating an expired hold.
SELECT set_config('pazo.f14.qa.claim',(
 SELECT claim_id::text FROM moderation_private.media_claims
 WHERE snapshot->>'path'=current_setting('pazo.f14.qa.held')),true);
SELECT set_config('request.jwt.claim.role','service_role',true);
SET LOCAL ROLE service_role;
DO $expired_recheck$
BEGIN
 IF public.f14_recheck_media_claim(current_setting('pazo.f14.qa.claim')::uuid) THEN
   RAISE EXCEPTION 'Expired claim recheck must return false';
 END IF;
END $expired_recheck$;
RESET ROLE;
DO $held_after_expiry_recheck$
BEGIN
 IF (SELECT status FROM moderation_private.media_claims
     WHERE claim_id=current_setting('pazo.f14.qa.claim')::uuid)<>'held' THEN
   RAISE EXCEPTION 'Expiry recheck must NOT automatically invalidate the hold';
 END IF;
END $held_after_expiry_recheck$;

-- A valid-time claim whose source disappeared is also fail-closed.
UPDATE moderation_private.media_claims
SET created_at=now(), expires_at=now()+interval '5 minutes'
WHERE claim_id=current_setting('pazo.f14.qa.claim')::uuid;
SET LOCAL ROLE service_role;
DO $drift_recheck$
BEGIN
 IF public.f14_recheck_media_claim(current_setting('pazo.f14.qa.claim')::uuid) THEN
   RAISE EXCEPTION 'Missing source must not be accepted as valid';
 END IF;
END $drift_recheck$;
RESET ROLE;
DO $held_after_drift_recheck$
BEGIN
 IF (SELECT status FROM moderation_private.media_claims
     WHERE claim_id=current_setting('pazo.f14.qa.claim')::uuid)<>'held' THEN
   RAISE EXCEPTION 'Source drift recheck must NOT automatically invalidate hold';
 END IF;
END $held_after_drift_recheck$;

-- The guard deliberately releases a path only after explicit invalidation.
-- Real future workers still need serialization against in-flight HTTP deletes.
UPDATE moderation_private.media_claims SET status='invalidated'
WHERE snapshot->>'path'=current_setting('pazo.f14.qa.held');
SET LOCAL ROLE authenticated;
DO $release$
DECLARE n int;
BEGIN
 UPDATE storage.objects SET metadata='{"qa":"explicit_invalidation"}'::jsonb
 WHERE bucket_id='post-photos' AND name=current_setting('pazo.f14.qa.held');
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Invalidated claim must release path: %',n; END IF;
END $release$;
RESET ROLE;

DO $invariants$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
  AND policyname='f14_media_claim_restrict_update' AND permissive='RESTRICTIVE'
  AND cmd='UPDATE' AND with_check LIKE '%f14_storage_media_path_unclaimed%'
  AND qual LIKE '%f14_storage_media_path_unclaimed%';
 IF n<>1 THEN RAISE EXCEPTION 'Guard USING+WITH CHECK metadata invalid'; END IF;
END $invariants$;

ROLLBACK;
