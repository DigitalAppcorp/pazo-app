-- PAZO F14 A2: behavior-level SQL RLS regression, transaction-only.
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
 IF n<>1 THEN RAISE EXCEPTION 'Expired claim should not protect the object: %',n; END IF;
END $expiry$;
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
