-- PAZO F14 A2 — PREVENT UNVERIFIED MEDIA PURGE STATE.
-- Independent safeguard: no code path may set media_status='purged'
-- until a future claim+object/version-backed protocol is approved.
-- Does not delete files, reclassify moderation or alter existing records.
BEGIN;
CREATE FUNCTION moderation_private.f14_reject_unverified_purged()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $body$
BEGIN
  IF NEW.media_status='purged' THEN
    RAISE EXCEPTION 'F14 media purge state is disabled until exact-object verification is implemented'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION moderation_private.f14_reject_unverified_purged() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER f14_no_unverified_media_purge
BEFORE INSERT OR UPDATE OF media_status
ON moderation_private.content_restrictions
FOR EACH ROW
EXECUTE FUNCTION moderation_private.f14_reject_unverified_purged();
COMMIT;
