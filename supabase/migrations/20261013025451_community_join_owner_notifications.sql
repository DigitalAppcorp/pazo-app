-- F13 Communities | owner notification on actual membership INSERT.
-- Prepared only. Requires explicit Product Owner authorization to apply hosted.
-- Existing RLS keeps notifications readable only by their recipient; no client INSERT grant.
-- Never persist the joining pet's name or UUID in notification text or event metadata.
-- A rejoin following a genuine leave is a new event; an attempted duplicate INSERT fails on PK.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('sighting', 'system', 'community_join'));

CREATE OR REPLACE FUNCTION community_private.notify_owner_on_member_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_owner_id uuid;
  v_community_name text;
BEGIN
  -- Creating a community also inserts an 'owner' membership. That must NOT notify.
  -- Updates to display_pet_id or role must not create new notifications.
  IF NEW.role <> 'member' THEN
    RETURN NEW;
  END IF;

  SELECT c.owner_user_id, c.name
    INTO v_owner_id, v_community_name
  FROM public.communities AS c
  WHERE c.id = NEW.community_id
    AND c.status = 'active';

  -- Owner deletion/archival and self-join should never notify.
  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id, pet_id, type, title, body, source_id
  ) VALUES (
    v_owner_id,
    NULL,
    'community_join',
    'Nuevo miembro en tu comunidad',
    'Alguien se unió a tu comunidad «' || left(v_community_name, 80) || '».',
    NEW.community_id
  );

  RETURN NEW;
END;
$function$;

ALTER FUNCTION community_private.notify_owner_on_member_join() OWNER TO postgres;
REVOKE ALL ON FUNCTION community_private.notify_owner_on_member_join()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_community_memberships_notify_owner
  ON public.community_memberships;

CREATE TRIGGER trg_community_memberships_notify_owner
AFTER INSERT ON public.community_memberships
FOR EACH ROW
EXECUTE FUNCTION community_private.notify_owner_on_member_join();

-- No backfill. Only successful joins after this migration generate new notices.
-- On an INSERT rollback (including PK/RLS failure) its notification rolls back too.
