-- PAZO F14 A2 installed 20261009061213 regression, synthetic rows only.
BEGIN;
DO $metadata$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger
 WHERE tgrelid='moderation_private.content_restrictions'::regclass
 AND tgname='f14_no_unverified_media_purge' AND tgenabled IN ('O','A')) THEN
  RAISE EXCEPTION 'Fail-closed media purged trigger absent';
 END IF;
END $metadata$;
DO $actions$
DECLARE target uuid:=gen_random_uuid(); blocked boolean:=false;
BEGIN
 INSERT INTO moderation_private.content_restrictions(target_kind,target_id,media_status)
 VALUES('feed_post',target,'none');
 UPDATE moderation_private.content_restrictions SET media_status='pending_review'
 WHERE target_kind='feed_post' AND target_id=target;
 BEGIN
  UPDATE moderation_private.content_restrictions SET media_status='purged'
  WHERE target_kind='feed_post' AND target_id=target;
 EXCEPTION WHEN check_violation THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Unverified purged transition accepted'; END IF;
 IF (SELECT media_status FROM moderation_private.content_restrictions WHERE target_id=target AND target_kind='feed_post')<>'pending_review' THEN
  RAISE EXCEPTION 'Pending-review media status unexpectedly altered';
 END IF;
END $actions$;
ROLLBACK;
