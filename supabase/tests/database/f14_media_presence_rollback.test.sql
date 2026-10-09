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
-- Reversible five-case integration check, never committed to hosted database.
-- Test fixture for F14 A2 media-classification migration; attach after draft CREATE OR REPLACE FUNCTION inside BEGIN, ends ROLLBACK.

DO $seed$
DECLARE owner_id uuid; pet_id uuid; group_id uuid; plain uuid; image_post uuid; cplain uuid; cimage uuid; x record;
BEGIN
 SELECT user_id INTO STRICT owner_id FROM moderation_private.moderator_grants LIMIT 1;
 IF (SELECT count(*) FROM moderation_private.moderator_grants)<>1 THEN RAISE EXCEPTION 'Non-unique moderator'; END IF;
 PERFORM set_config('pazo.f14.owner',owner_id::text,true);
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 INSERT INTO public.pets(owner_id,name,species) VALUES(owner_id,'F14 ROLLBACK ONLY','perro') RETURNING id INTO pet_id;
 INSERT INTO public.posts(user_id,pet_id,text,photo_url) VALUES(owner_id,pet_id,'F14 text-only',NULL) RETURNING id INTO plain;
 INSERT INTO public.posts(user_id,pet_id,text,photo_url) VALUES(owner_id,pet_id,'F14 with media','https://example.invalid/f14-photo.jpg') RETURNING id INTO image_post;
 INSERT INTO public.communities(owner_user_id,name,description,category) VALUES(owner_id,'F14 TEMP COMMUNITY','Rollback-only','Mascotas') RETURNING id INTO group_id;
 INSERT INTO public.community_memberships(community_id,user_id,display_pet_id,role) VALUES(group_id,owner_id,pet_id,'owner');
 INSERT INTO public.community_posts(community_id,author_user_id,author_pet_id,body) VALUES(group_id,owner_id,pet_id,'F14 text-only') RETURNING id INTO cplain;
 INSERT INTO public.community_posts(community_id,author_user_id,author_pet_id,body,photo_url,photo_storage_path)
 VALUES(group_id,owner_id,pet_id,'F14 with media','https://example.invalid/f14-photo.webp','f14-test/photo.webp') RETURNING id INTO cimage;
 PERFORM set_config('pazo.f14.plain',plain::text,true);
 PERFORM set_config('pazo.f14.image',image_post::text,true);
 PERFORM set_config('pazo.f14.cplain',cplain::text,true);
 PERFORM set_config('pazo.f14.cimage',cimage::text,true);
 PERFORM set_config('pazo.f14.pet',pet_id::text,true);
 FOR x IN SELECT * FROM (VALUES
 ('feed_post'::text,plain),('feed_post',image_post),('community_post',cplain),('community_post',cimage),('pet_profile',pet_id)) v(kind,target)
 LOOP
 INSERT INTO moderation_private.reports(reporter_user_id,target_kind,target_id,target_owner_user_id,reason,details)
 VALUES(NULL,x.kind,x.target,owner_id,'spam','F14_PRESENCE_TEST_REVERT');
 END LOOP;
END $seed$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('pazo.f14.owner'),true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
DO $assert$
DECLARE item record; rid uuid; answer text; hit boolean; total integer:=0;
BEGIN
 IF NOT public.f14_is_moderator() THEN RAISE EXCEPTION 'Moderator missing'; END IF;
 FOR item IN SELECT * FROM (VALUES
 ('feed_post'::text,current_setting('pazo.f14.plain')::uuid,false,'depublished_no_media_review'::text),
 ('feed_post',current_setting('pazo.f14.image')::uuid,true,'depublished_pending_media_review'),
 ('community_post',current_setting('pazo.f14.cplain')::uuid,false,'depublished_no_media_review'),
 ('community_post',current_setting('pazo.f14.cimage')::uuid,true,'depublished_pending_media_review'),
 ('pet_profile',current_setting('pazo.f14.pet')::uuid,true,'depublished_pending_media_review')
 ) v(kind,target,should_queue,should_return)
 LOOP
  SELECT (e->>'id')::uuid INTO STRICT rid FROM jsonb_array_elements(public.f14_moderation_queue(20,0)) e
  WHERE e->>'target_kind'=item.kind AND e->>'target_id'=item.target::text;
  answer:=public.f14_review_report(rid,'remove','ROLLED BACK');
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(public.f14_pending_media(30)) e
    WHERE e->>'target_kind'=item.kind AND e->>'target_id'=item.target::text) INTO hit;
  IF answer IS DISTINCT FROM item.should_return OR hit IS DISTINCT FROM item.should_queue THEN
    RAISE EXCEPTION 'Test mismatch for % answer % expected %, queue % expected %',item.kind,answer,item.should_return,hit,item.should_queue;
  END IF;
  total:=total+1;
 END LOOP;
 IF total<>5 THEN RAISE EXCEPTION 'Missing cases: %',total; END IF;
END $assert$;
ROLLBACK;