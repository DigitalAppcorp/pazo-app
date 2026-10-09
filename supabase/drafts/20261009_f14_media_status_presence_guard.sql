-- F14 A2 proposed patch: no-media depublishing classification. NOT APPLIED.
-- Preview/rehearsal only until PO confirms production migration gate.
-- Does NOT enable Storage deletion, alter security grants or change moderation privacy.
-- Keep pet_profile pending_review until its associated posts/media are audited.
BEGIN;
CREATE OR REPLACE FUNCTION public.f14_review_report(p_report uuid,p_action text,p_note text DEFAULT '')
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_record moderation_private.reports%ROWTYPE;
v_media text;
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
    -- Conservative media classification: blank/null URLs do not need cleanup.
    -- Pet profiles stay pending: posts published by the pet may contain other
    -- media and a profile-only check would silently miss those objects.
    v_media := CASE v_record.target_kind
      WHEN 'feed_post' THEN CASE WHEN EXISTS (
        SELECT 1 FROM public.posts p WHERE p.id=v_record.target_id
          AND nullif(btrim(p.photo_url),'') IS NOT NULL
      ) THEN 'pending_review' ELSE 'none' END
      WHEN 'community_post' THEN CASE WHEN EXISTS (
        SELECT 1 FROM public.community_posts cp WHERE cp.id=v_record.target_id
          AND (nullif(btrim(cp.photo_url),'') IS NOT NULL
               OR nullif(btrim(cp.photo_storage_path),'') IS NOT NULL)
      ) THEN 'pending_review' ELSE 'none' END
      WHEN 'pet_profile' THEN 'pending_review'
      ELSE 'none'
    END;
    INSERT INTO moderation_private.content_restrictions
      (target_kind,target_id,report_id,applied_by,media_status)
    VALUES (v_record.target_kind,v_record.target_id,p_report,auth.uid(),v_media)
    ON CONFLICT(target_kind,target_id) DO NOTHING;
    -- Report the stored restriction status, even if a prior restriction
    -- won the unique constraint for this target.
    SELECT r.media_status INTO STRICT v_media
    FROM moderation_private.content_restrictions r
    WHERE r.target_kind=v_record.target_kind AND r.target_id=v_record.target_id;

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
  RETURN CASE
    WHEN p_action='dismiss' THEN 'dismissed'
    WHEN v_media='pending_review' THEN 'depublished_pending_media_review'
    ELSE 'depublished_no_media_review'
  END;
END;
$$;
COMMIT;
