BEGIN;
DO $preflight$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='moderation_private.content_restrictions'::regclass AND tgname='f14_no_unverified_media_purge')
 THEN RAISE EXCEPTION 'Guard already present'; END IF;
END $preflight$;
CREATE FUNCTION moderation_private.f14_reject_unverified_purged() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $body$
BEGIN
 IF NEW.media_status='purged' THEN
  RAISE EXCEPTION 'F14 media purge state is disabled until exact-object verification is implemented' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;$body$;
REVOKE ALL ON FUNCTION moderation_private.f14_reject_unverified_purged() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER f14_no_unverified_media_purge
BEFORE INSERT OR UPDATE OF media_status ON moderation_private.content_restrictions
FOR EACH ROW EXECUTE FUNCTION moderation_private.f14_reject_unverified_purged();
DO $synthetic$
DECLARE target uuid:=gen_random_uuid();target2 uuid:=gen_random_uuid(); denied boolean:=false;
BEGIN
 INSERT INTO moderation_private.content_restrictions(target_kind,target_id,media_status)
 VALUES ('feed_post',target,'none');
 UPDATE moderation_private.content_restrictions SET media_status='pending_review'
 WHERE target_kind='feed_post' AND target_id=target;
 IF (SELECT media_status FROM moderation_private.content_restrictions
     WHERE target_kind='feed_post' AND target_id=target)<>'pending_review'
 THEN RAISE EXCEPTION 'Pending-review transition regressed'; END IF;
 BEGIN
   UPDATE moderation_private.content_restrictions SET media_status='purged'
   WHERE target_kind='feed_post' AND target_id=target;
 EXCEPTION WHEN check_violation THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Unverified UPDATE purged was not blocked'; END IF;
 denied:=false;
 BEGIN
   INSERT INTO moderation_private.content_restrictions(target_kind,target_id,media_status)
   VALUES ('community_post',target2,'purged');
 EXCEPTION WHEN check_violation THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Unverified INSERT purged was not blocked'; END IF;
END $synthetic$;
ROLLBACK;
