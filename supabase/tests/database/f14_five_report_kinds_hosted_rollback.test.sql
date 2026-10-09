-- PAZO F14 A2: hosted-only, reversible authenticated intake smoke.
-- Requires existing unmoderated Feed post/comment, active community post,
-- and a pet owned by a community post author. Does not delete any content.
-- Must never be used as a migration or run with COMMIT.
BEGIN;
DO $f14$
DECLARE owner_id uuid;community_post_id uuid;v_pet_id uuid;comment_id uuid;
        feed_post_id uuid;feed_comment_id uuid;
BEGIN
 SELECT cp.author_user_id,cp.id,pet.id INTO owner_id,community_post_id,v_pet_id
 FROM public.community_posts cp
 JOIN public.communities c ON c.id=cp.community_id AND c.status='active'
 JOIN public.pets pet ON pet.owner_id=cp.author_user_id
 LIMIT 1;
 SELECT fp.id INTO feed_post_id FROM public.posts fp WHERE fp.pet_id IS NOT NULL LIMIT 1;
 SELECT fc.id INTO feed_comment_id FROM public.post_comments fc LIMIT 1;
 IF owner_id IS NULL OR feed_post_id IS NULL OR feed_comment_id IS NULL
 THEN RAISE EXCEPTION 'Missing existing FK prerequisites for rollback smoke'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 INSERT INTO public.community_post_comments(post_id,author_pet_id,body)
 VALUES(community_post_id,v_pet_id,'F14 rollback-only moderation test') RETURNING id INTO comment_id;
 PERFORM set_config('f14.qa.feedpost',feed_post_id::text,true);
 PERFORM set_config('f14.qa.feedcomment',feed_comment_id::text,true);
 PERFORM set_config('f14.qa.pet',v_pet_id::text,true);
 PERFORM set_config('f14.qa.communitypost',community_post_id::text,true);
 PERFORM set_config('f14.qa.communitycomment',comment_id::text,true);
END $f14$;
SET LOCAL ROLE authenticated;
DO $reports$
DECLARE kind text;target uuid;new_id uuid;entry text;
BEGIN
 FOREACH kind IN ARRAY ARRAY[
   'feed_post','feed_comment','pet_profile','community_post','community_comment'
 ] LOOP
   entry:=CASE kind WHEN 'feed_post' THEN 'feedpost'
    WHEN 'feed_comment' THEN 'feedcomment'
    WHEN 'pet_profile' THEN 'pet'
    WHEN 'community_post' THEN 'communitypost'
    ELSE 'communitycomment' END;
   target:=current_setting('f14.qa.'||entry)::uuid;
   new_id:=public.f14_submit_report(kind,target,'spam','F14 rollback-only report');
   IF new_id IS NULL THEN RAISE EXCEPTION 'Report not created for %',kind; END IF;
 END LOOP;
END $reports$;
RESET ROLE;
DO $verify$
BEGIN
 IF (SELECT count(*) FROM moderation_private.reports
     WHERE details='F14 rollback-only report')<>5
 THEN RAISE EXCEPTION 'Report coverage count is not 5'; END IF;
END $verify$;
ROLLBACK;
