-- F14 A2: report intake, moderator queue, database content withdrawal.
-- PREPARED ONLY: DO NOT APPLY to hosted Supabase without separate, explicit PO approval.
-- Media in public Storage/CDN is NOT removed by this migration; media_status is pending_review.
-- D1: lawful public anon access remains for non-moderated content.
BEGIN;
CREATE SCHEMA IF NOT EXISTS moderation_private;
REVOKE ALL ON SCHEMA moderation_private FROM PUBLIC, anon, authenticated;

CREATE TABLE moderation_private.moderator_grants (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE TABLE moderation_private.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_kind text NOT NULL CHECK (target_kind IN ('feed_post','feed_comment','pet_profile','community_post','community_comment')),
  target_id uuid NOT NULL,
  target_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('spam','harassment','unsafe','other')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','dismissed','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX f14_report_pending_dedupe
  ON moderation_private.reports(reporter_user_id,target_kind,target_id) WHERE status='pending';
CREATE INDEX f14_reports_queue ON moderation_private.reports(status,created_at,id);
CREATE INDEX f14_reports_retention ON moderation_private.reports(status,resolved_at);
CREATE INDEX f14_reports_reporter_rate ON moderation_private.reports(reporter_user_id,created_at DESC);

CREATE TABLE moderation_private.content_restrictions (
  target_kind text NOT NULL CHECK (target_kind IN ('feed_post','feed_comment','pet_profile','community_post','community_comment')),
  target_id uuid NOT NULL,
  report_id uuid REFERENCES moderation_private.reports(id) ON DELETE SET NULL,
  applied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  media_status text NOT NULL CHECK (media_status IN ('none','pending_review','purged')),
  PRIMARY KEY(target_kind,target_id)
);
CREATE TABLE moderation_private.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES moderation_private.reports(id),
  moderator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('dismiss','remove')),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX f14_moderation_actions_by_report ON moderation_private.moderation_actions(report_id,created_at);

REVOKE ALL ON ALL TABLES IN SCHEMA moderation_private FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA moderation_private TO service_role;
-- No automatic moderator assignment. A later, separately approved operation must grant the initial moderator.

CREATE FUNCTION moderation_private.is_removed(p_kind text,p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(
    SELECT 1 FROM moderation_private.content_restrictions r
    WHERE r.target_kind=p_kind AND r.target_id=p_id
  );
$$;
REVOKE ALL ON FUNCTION moderation_private.is_removed(text,uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.f14_content_visible(p_kind text,p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT p_id IS NOT NULL AND NOT moderation_private.is_removed(p_kind,p_id);
$$;
REVOKE ALL ON FUNCTION public.f14_content_visible(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.f14_content_visible(text,uuid) TO anon, authenticated;

-- Restrictive policies combine with existing permissive policies; replacing neither anon nor existing owner grants.
CREATE POLICY f14_moderated_pets_select ON public.pets AS RESTRICTIVE FOR SELECT TO PUBLIC
USING (public.f14_content_visible('pet_profile',id));
CREATE POLICY f14_moderated_posts_select ON public.posts AS RESTRICTIVE FOR SELECT TO PUBLIC
USING (public.f14_content_visible('feed_post',id) AND (pet_id IS NULL OR public.f14_content_visible('pet_profile',pet_id)));
CREATE POLICY f14_moderated_comments_select ON public.post_comments AS RESTRICTIVE FOR SELECT TO PUBLIC
USING (public.f14_content_visible('feed_comment',id)
       AND public.f14_content_visible('feed_post',post_id)
       AND public.f14_content_visible('pet_profile',author_pet_id));
CREATE POLICY f14_moderated_community_posts_select ON public.community_posts AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.f14_content_visible('community_post',id)
       AND public.f14_content_visible('pet_profile',author_pet_id));
CREATE POLICY f14_moderated_community_comments_select ON public.community_post_comments AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.f14_content_visible('community_comment',id)
       AND public.f14_content_visible('community_post',post_id)
       AND public.f14_content_visible('pet_profile',author_pet_id));

CREATE FUNCTION public.f14_is_moderator() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
   SELECT 1 FROM moderation_private.moderator_grants g WHERE g.user_id=auth.uid()
 );
$$;
REVOKE ALL ON FUNCTION public.f14_is_moderator() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.f14_is_moderator() TO authenticated;

CREATE FUNCTION public.f14_submit_report(
  p_kind text,p_target uuid,p_reason text,p_details text DEFAULT ''
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
  v_details text := btrim(coalesce(p_details,''));
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000'; END IF;
  IF p_kind NOT IN ('feed_post','feed_comment','pet_profile','community_post','community_comment')
     OR p_target IS NULL
     OR p_reason NOT IN ('spam','harassment','unsafe','other')
     OR char_length(v_details)>500 THEN
    RAISE EXCEPTION 'Invalid report parameters' USING ERRCODE='22023';
  END IF;
  IF moderation_private.is_removed(p_kind,p_target) THEN
    RAISE EXCEPTION 'Content not available' USING ERRCODE='22023';
  END IF;
  CASE p_kind
    WHEN 'feed_post' THEN
      SELECT user_id INTO v_owner FROM public.posts WHERE id=p_target
      AND (pet_id IS NULL OR NOT moderation_private.is_removed('pet_profile',pet_id));
    WHEN 'feed_comment' THEN
      SELECT pet.owner_id INTO v_owner FROM public.post_comments pc
      JOIN public.pets pet ON pet.id=pc.author_pet_id
      JOIN public.posts post ON post.id=pc.post_id
      WHERE pc.id=p_target
       AND NOT moderation_private.is_removed('feed_post',post.id)
       AND NOT moderation_private.is_removed('pet_profile',pet.id);
    WHEN 'pet_profile' THEN
      SELECT owner_id INTO v_owner FROM public.pets WHERE id=p_target;
    WHEN 'community_post' THEN
      SELECT cp.author_user_id INTO v_owner FROM public.community_posts cp
      JOIN public.communities c ON c.id=cp.community_id
      WHERE cp.id=p_target AND c.status='active'
        AND NOT moderation_private.is_removed('pet_profile',cp.author_pet_id);
    WHEN 'community_comment' THEN
      SELECT pet.owner_id INTO v_owner FROM public.community_post_comments cc
      JOIN public.community_posts cp ON cp.id=cc.post_id
      JOIN public.communities c ON c.id=cp.community_id
      JOIN public.pets pet ON pet.id=cc.author_pet_id
      WHERE cc.id=p_target AND c.status='active'
       AND NOT moderation_private.is_removed('community_post',cp.id)
       AND NOT moderation_private.is_removed('pet_profile',cc.author_pet_id);
  END CASE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Content not available' USING ERRCODE='22023'; END IF;
  -- Serialize attempts from the same reporter to make rate limiting consistent under concurrency.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor::text,20261008));
  IF (SELECT count(*) FROM moderation_private.reports r
      WHERE r.reporter_user_id=v_actor AND r.created_at>now()-interval '24 hours')>=5 THEN
    RAISE EXCEPTION 'Report limit reached' USING ERRCODE='22023';
  END IF;
  INSERT INTO moderation_private.reports
    (reporter_user_id,target_kind,target_id,target_owner_user_id,reason,details)
  VALUES(v_actor,p_kind,p_target,v_owner,p_reason,v_details)
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Report already pending' USING ERRCODE='23505';
END;
$$;
REVOKE ALL ON FUNCTION public.f14_submit_report(text,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.f14_submit_report(text,uuid,text,text) TO authenticated;

CREATE FUNCTION public.f14_moderation_queue(p_limit integer DEFAULT 20,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_items jsonb;
BEGIN
  IF NOT public.f14_is_moderator() THEN
    RAISE EXCEPTION 'Moderator access required' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) INTO v_items
  FROM (
    SELECT id,target_kind,target_id,reason,details,created_at
    FROM moderation_private.reports
    WHERE status='pending'
    ORDER BY created_at ASC,id ASC
    LIMIT least(greatest(coalesce(p_limit,20),1),30)
    OFFSET greatest(coalesce(p_offset,0),0)
  ) q;
  RETURN v_items;
END;
$$;
REVOKE ALL ON FUNCTION public.f14_moderation_queue(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.f14_moderation_queue(integer,integer) TO authenticated;

CREATE FUNCTION public.f14_review_report(p_report uuid,p_action text,p_note text DEFAULT '')
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_record moderation_private.reports%ROWTYPE;
DECLARE v_media text;
BEGIN
  IF NOT public.f14_is_moderator() THEN RAISE EXCEPTION 'Moderator access required' USING ERRCODE='42501'; END IF;
  IF p_action NOT IN ('dismiss','remove') OR char_length(coalesce(p_note,''))>500 THEN
    RAISE EXCEPTION 'Invalid moderation action' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_record FROM moderation_private.reports WHERE id=p_report FOR UPDATE;
  IF NOT FOUND OR v_record.status<>'pending' THEN
    RAISE EXCEPTION 'Report is not pending' USING ERRCODE='22023';
  END IF;
  IF p_action='remove' THEN
    v_media := CASE WHEN v_record.target_kind IN ('feed_post','pet_profile','community_post')
      THEN 'pending_review' ELSE 'none' END;
    INSERT INTO moderation_private.content_restrictions
      (target_kind,target_id,report_id,applied_by,media_status)
    VALUES (v_record.target_kind,v_record.target_id,p_report,auth.uid(),v_media)
    ON CONFLICT(target_kind,target_id) DO NOTHING;

    -- Historical PAZO comments are duplicated in posts.comments JSONB.
    -- Their canonical rows remain in post_comments for moderation evidence;
    -- remove ONLY the public JSON copy when a comment or its pet profile is withdrawn.
    IF v_record.target_kind IN ('feed_comment','pet_profile') THEN
      UPDATE public.posts p
      SET comments = (
        SELECT coalesce(jsonb_agg(item.elem ORDER BY item.ordinal),'[]'::jsonb)
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.comments)='array' THEN p.comments ELSE '[]'::jsonb END
        ) WITH ORDINALITY AS item(elem,ordinal)
        LEFT JOIN public.post_comments legacy
          ON legacy.legacy_id = item.elem ->> 'id'
        WHERE legacy.id IS NULL
          OR NOT (
            (v_record.target_kind='feed_comment' AND legacy.id=v_record.target_id)
            OR (v_record.target_kind='pet_profile' AND legacy.author_pet_id=v_record.target_id)
          )
      )
      WHERE jsonb_typeof(p.comments)='array'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(p.comments) item
          JOIN public.post_comments legacy ON legacy.legacy_id = item ->> 'id'
          WHERE (v_record.target_kind='feed_comment' AND legacy.id=v_record.target_id)
             OR (v_record.target_kind='pet_profile' AND legacy.author_pet_id=v_record.target_id)
        );
    END IF;
  END IF;
  UPDATE moderation_private.reports
    SET status=CASE WHEN p_action='remove' THEN 'removed' ELSE 'dismissed' END,
        resolved_at=now(),resolved_by=auth.uid()
    WHERE id=p_report;
  INSERT INTO moderation_private.moderation_actions
    (report_id,moderator_user_id,action,note)
    VALUES(p_report,auth.uid(),p_action,btrim(coalesce(p_note,'')));
  RETURN CASE WHEN p_action='remove' THEN 'depublished_pending_media_review' ELSE 'dismissed' END;
END;
$$;
REVOKE ALL ON FUNCTION public.f14_review_report(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.f14_review_report(uuid,text,text) TO authenticated;

-- Preserve audit trail. No users are provisioned as moderators in this migration.
COMMENT ON TABLE moderation_private.reports IS 'Reporter identity restricted; D3-B requires eventual retention cleanup and review.';
COMMENT ON TABLE moderation_private.content_restrictions IS 'Denies reads at RLS. Public Storage/CDN media requires an independently verified purge.';
-- Moderator-only media status; frontend cannot designate a purge as completed.
CREATE FUNCTION public.f14_pending_media(p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $
DECLARE v_items jsonb;
BEGIN
 IF NOT public.f14_is_moderator() THEN RAISE EXCEPTION 'Moderator access required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO v_items FROM (
   SELECT target_kind,target_id,applied_at FROM moderation_private.content_restrictions
   WHERE media_status='pending_review'
   ORDER BY applied_at ASC,target_id ASC
   LIMIT least(greatest(coalesce(p_limit,20),1),30)
 ) t;
 RETURN v_items;
END;
$;
REVOKE ALL ON FUNCTION public.f14_pending_media(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.f14_pending_media(integer) TO authenticated;

CREATE FUNCTION public.f14_media_task(p_kind text,p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $
DECLARE v_url text; v_bucket text; v_path text;
DECLARE v_owner uuid; v_pet uuid; v_community uuid;
BEGIN
 IF NOT public.f14_is_moderator() THEN RAISE EXCEPTION 'Moderator access required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM moderation_private.content_restrictions
   WHERE target_kind=p_kind AND target_id=p_id AND media_status='pending_review') THEN
   RAISE EXCEPTION 'No pending media task' USING ERRCODE='22023';
 END IF;
 CASE p_kind
  WHEN 'feed_post' THEN
    SELECT photo_url,user_id,pet_id INTO v_url,v_owner,v_pet FROM public.posts WHERE id=p_id;
    v_bucket:='post-photos';
  WHEN 'pet_profile' THEN
    SELECT photo_url,owner_id INTO v_url,v_owner FROM public.pets WHERE id=p_id;
    v_bucket:='pet-avatars';
  WHEN 'community_post' THEN
    SELECT photo_storage_path,photo_url,author_user_id,community_id
    INTO v_path,v_url,v_owner,v_community FROM public.community_posts WHERE id=p_id;
    v_bucket:='community-post-photos';
  ELSE RAISE EXCEPTION 'No removable media for this target' USING ERRCODE='22023';
 END CASE;
 RETURN jsonb_build_object('bucket',v_bucket,'url',v_url,'path',v_path,
  'owner',v_owner,'pet',v_pet,'community',v_community);
END;
$;
REVOKE ALL ON FUNCTION public.f14_media_task(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.f14_media_task(text,uuid) TO authenticated;

-- Only a trusted backend with service_role can mark the cleanup finished.
CREATE FUNCTION public.f14_confirm_media_cleanup(p_kind text,p_id uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'Service role required' USING ERRCODE='42501';
 END IF;
 UPDATE moderation_private.content_restrictions
 SET media_status='purged'
 WHERE target_kind=p_kind AND target_id=p_id AND media_status='pending_review';
 RETURN FOUND;
END;
$;
REVOKE ALL ON FUNCTION public.f14_confirm_media_cleanup(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_confirm_media_cleanup(text,uuid) TO service_role;

COMMIT;
